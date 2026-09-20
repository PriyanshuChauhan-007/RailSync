"""Render PNG timelines from saved golden fixtures and reference results."""

from datetime import datetime, timedelta
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "optimizer" / "fixtures" / "golden_recovery"
EVIDENCE = ROOT / "artifacts" / "golden-recovery"
OUT = EVIDENCE / "figures"
CASES = (
    ("case_01_shared_machine.json", "golden_01_shared_machine", "case-01-hero.png"),
    ("case_02_resource_expansion.json", "golden_02_resource_expansion", "case-02-expansion.png"),
    ("case_03_no_service_floor.json", "golden_03_no_service_floor", "case-03-honest-failure.png"),
)


def font(size, bold=False):
    name = "arialbd.ttf" if bold else "arial.ttf"
    path = Path("C:/Windows/Fonts") / name
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def minute(timestamp):
    instant = datetime.fromisoformat(timestamp)
    return instant.hour * 60 + instant.minute


def render(name, stem, filename):
    fixture = json.loads((FIXTURES / name).read_text(encoding="utf-8"))
    saved = json.loads((EVIDENCE / "reference-solutions" /
                        f"{stem}-restricted.json").read_text(encoding="utf-8"))
    trace_path = EVIDENCE / "traces" / f"{stem}-restricted.json"
    trace = json.loads(trace_path.read_text(encoding="utf-8")) if trace_path.exists() else []
    candidate = saved["plan"]
    before = {block["block_id"]: block for block in fixture["parent_blocks"]}
    after = ({block["block_id"]: block for block in candidate["blocks"]}
             if candidate else {})
    ids = [item for item in ("P_A", "P_B", "P_C", "P_U", "P_I", "P_H") if item in before]
    width, height = 1320, 280 + len(ids) * 92
    image = Image.new("RGB", (width, height), "#f5f8fc")
    draw = ImageDraw.Draw(image)
    navy, dark, muted = "#172a46", "#263c56", "#52677e"
    draw.text((48, 28), stem.replace("_", " ").upper(), fill=navy, font=font(27, True))
    draw.text((48, 67), "SYNTHETIC_GOLDEN_RECOVERY_FIXTURE", fill="#125a70", font=font(17, True))
    outcome = saved["row"]["outcome"]
    draw.text((48, 99), f"Restricted reference outcome: {outcome}", fill=dark, font=font(18))
    start_x, end_x = 195, width - 60
    scale = (end_x - start_x) / (14 * 60 - 8 * 60)
    def x(timestamp):
        return round(start_x + (minute(timestamp) - 8 * 60) * scale)
    for hour in range(8, 15):
        xpos = round(start_x + (hour - 8) * 60 * scale)
        draw.line((xpos, 166, xpos, height - 80), fill="#d2dce8", width=2)
        draw.text((xpos - 18, 143), f"{hour:02d}:00", fill=muted, font=font(14))
    colors = {"P_A": "#d96739", "P_B": "#2f75b5", "P_C": "#7e56a0",
              "P_U": "#23896c", "P_I": "#8d9aa9", "P_H": "#6d798a"}
    for index, block_id in enumerate(ids):
        top = 190 + index * 92
        draw.text((48, top + 20), block_id, fill=navy, font=font(19, True))
        parent = before[block_id]
        draw.rounded_rectangle((x(parent["start_time"]), top,
                                x(parent["end_time"]), top + 29),
                               radius=5, fill="#c8d3df")
        draw.text((x(parent["start_time"]) + 5, top + 5), "parent", fill=dark, font=font(12))
        if block_id in after:
            block = after[block_id]
            draw.rounded_rectangle((x(block["start_time"]), top + 35,
                                    x(block["end_time"]), top + 66),
                                   radius=5, fill=colors[block_id])
            draw.text((x(block["start_time"]) + 5, top + 42), "recovered",
                      fill="white", font=font(12, True))
            if block.get("status") == "IN_PROGRESS":
                residual = max(block["remaining_handback_minutes"],
                               *block["remaining_minutes_by_task"].values())
                residual_end = (datetime.fromisoformat(fixture["snapshot_as_of"])
                                + timedelta(minutes=residual)).isoformat()
                left, right = x(fixture["snapshot_as_of"]), x(residual_end)
                draw.rectangle((left, top + 35, right, top + 66), fill="#e4a23d")
                for stripe in range(left - 35, right + 35, 13):
                    draw.line((stripe, top + 66, stripe + 30, top + 35),
                              fill="#6e481c", width=2)
                draw.text((left + 4, top + 42), "residual", fill="#172a46", font=font(12, True))
        else:
            if block_id == ids[0]:
                draw.text((start_x + 7, top + 42), "No validated recovered plan; parent remains unchanged",
                          fill="#b32632", font=font(14, True))
    stages = "  →  ".join(f"{item['tier']}: {item['status']}" for item in trace)
    draw.text((48, height - 53), stages or "No recovery trace", fill=dark, font=font(17, True))
    OUT.mkdir(parents=True, exist_ok=True)
    image.save(OUT / filename)


if __name__ == "__main__":
    for args in CASES:
        render(*args)
        print(OUT / args[2])
