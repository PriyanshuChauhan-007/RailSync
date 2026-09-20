import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import ThemeProvider from "../src/theme/ThemeProvider.jsx";
import Navbar from "../src/components/layout/Navbar.jsx";
import RailSaathi from "../src/components/assistant/RailSaathi.jsx";

beforeEach(() => { localStorage.clear(); document.documentElement.dataset.theme = "light"; });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function View() { return <ThemeProvider><Navbar workspace /><RailSaathi territoryId="test" /></ThemeProvider>; }

it("toggles Day/Night, persists the explicit choice and keeps RailSaathi mounted", () => {
  render(<View />);
  fireEvent.click(screen.getByRole("button", { name: "Open RailSaathi" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Ask RailSaathi" }), { target: { value: "Keep this draft" } });
  fireEvent.click(screen.getByRole("button", { name: "Switch to Night mode" }));
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(localStorage.getItem("railsync-theme")).toBe("dark");
  expect(screen.getByRole("textbox", { name: "Ask RailSaathi" }).value).toBe("Keep this draft");
  fireEvent.click(screen.getByRole("button", { name: "Switch to Day mode" }));
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(localStorage.getItem("railsync-theme")).toBe("light");
});

it("restores a saved Night choice on remount", () => {
  localStorage.setItem("railsync-theme", "dark");
  const view = render(<View />);
  expect(document.documentElement.dataset.theme).toBe("dark");
  view.unmount(); render(<View />);
  expect(screen.getByRole("button", { name: "Switch to Day mode" })).toBeTruthy();
});

it("uses system preference until an explicit choice and cleans up its listener", () => {
  const query = { matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal("matchMedia", vi.fn(() => query));
  render(<View />);
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(localStorage.getItem("railsync-theme")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Switch to Day mode" }));
  expect(query.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
});

it("defines semantic color roles in both themes without a blanket surface override", () => {
  const css = readFileSync("src/theme/theme.css", "utf8");
  const darkStart = css.indexOf(':root[data-theme="dark"]');
  const light = css.slice(0, darkStart);
  const dark = css.slice(darkStart, css.indexOf("body {", darkStart));
  const roles = [
    "--page-bg", "--surface-primary", "--surface-secondary", "--surface-elevated",
    "--surface-subtle", "--text-primary", "--text-secondary", "--text-muted",
    "--border-primary", "--border-subtle", "--accent", "--accent-muted",
    "--success", "--warning", "--danger", "--info",
  ];
  for (const role of roles) {
    expect(light).toContain(role);
    expect(dark).toContain(role);
  }
  expect(css).not.toContain("Cover legacy literal surfaces");
  expect(css).toContain('[data-theme="dark"] :is(.navbar-overlay.scrolled, .navbar-solid, .navbar.open)');
});

it("keeps workspace surface backgrounds bound to semantic theme roles", () => {
  const files = [
    "src/pages/planner/planner.css",
    "src/pages/analysis/analysis.css",
    "src/pages/scenario/scenario.css",
  ];
  const literalSurface = /background(?:-color)?:\s*(?:#fff(?:fff)?|#fdfdfb|#f8fafb|#f5f4ef|#f3f5f6|#f3f7fa|#f2f7f3)\b/gi;

  for (const file of files) {
    expect(readFileSync(file, "utf8")).not.toMatch(literalSurface);
  }
  const rescue = readFileSync("src/rescue.css", "utf8");
  expect(rescue).not.toContain("HOMEPAGE: PURE WHITE");
});

it("reserves enough timeline label width for the full train lane name", () => {
  const css = readFileSync("src/pages/planner/planner.css", "utf8");
  expect(css).toMatch(/\.timeline-axis-row,[\s\S]*?grid-template-columns:\s*140px\s+minmax\(0,\s*1fr\)/);
});
