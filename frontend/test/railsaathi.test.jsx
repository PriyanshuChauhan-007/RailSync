import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RailSaathi from "../src/components/assistant/RailSaathi.jsx";
import OperationalPanels from "../src/components/planning/OperationalPanels.jsx";
import * as api from "../src/services/api.js";

vi.mock("../src/services/api.js", () => ({
  askCopilot: vi.fn(), getRollingPlan: vi.fn(), getResources: vi.fn(), getAlerts: vi.fn(),
  getDataSources: vi.fn(), runWhatIf: vi.fn(), transitionPlan: vi.fn(), transitionBlock: vi.fn(),
  exportBlocksCsv: vi.fn(), openPrintReport: vi.fn(), validateTaskImport: vi.fn(),
}));

const block = { block_id: "B1", tasks: ["T1"], start_time: "2017-11-01T05:00:00", end_time: "2017-11-01T06:00:00" };
const task = { task_id: "T1", task_type: "Inspection", duration_minutes: 20 };
const plan = { blocks: [block], unscheduled_tasks: [], plan_identity: { plan_id: "P1", state: "DRAFT" } };
const props = { territoryId: "test", territory: { territory_id: "test", display_name: "Test corridor" }, plan, selectedBlock: block, selectedTask: task };
const reply = { answer: "The recorded window is 05:00–06:00.", engine: "GEMINI_PLAN_CONTEXT", grounding: { solver_verified: false } };

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  api.askCopilot.mockResolvedValue(reply);
  api.getRollingPlan.mockResolvedValue({ monthly: [] });
  api.getResources.mockResolvedValue({ crew: [], machines: [], power_windows: {} });
  api.getAlerts.mockResolvedValue({ alerts: [] });
  api.getDataSources.mockResolvedValue({ datasets: [], service_source_urls: [] });
});
afterEach(cleanup);

function open() { fireEvent.click(screen.getByRole("button", { name: "Open RailSaathi" })); }
function submit(text = "Why this window?") {
  fireEvent.change(screen.getByRole("textbox", { name: "Ask RailSaathi" }), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Send question" }));
}

describe("RailSaathi", () => {
  it("renders, opens, minimizes and restores keyboard focus", () => {
    render(<RailSaathi {...props} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    open();
    expect(screen.getByRole("dialog", { name: "RailSaathi chat" })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Ask RailSaathi" }));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Open RailSaathi" }));
    open();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Minimize RailSaathi" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("submits current selection and renders the answer and grounding label", async () => {
    render(<RailSaathi {...props} />); open(); submit();
    expect(await screen.findByText(reply.answer)).toBeTruthy();
    expect(screen.getByText("AI explanation · current RailSync context")).toBeTruthy();
    expect(api.askCopilot.mock.calls[0][0]).toMatchObject({ territory_id: "test", parent_plan_id: "P1", selected_block_id: "B1", selected_task_id: "T1", question: "Why this window?", history: [] });
    expect(api.askCopilot.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it("sends each quick prompt literally without inventing overrides", async () => {
    render(<RailSaathi {...props} />); open();
    for (const prompt of ["Why this window?", "Explain this simply", "What if +15 min?", "Can S&T + TRD share this block?"]) {
      fireEvent.click(screen.getByRole("button", { name: prompt }));
      await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
      expect(api.askCopilot.mock.lastCall[0].question).toBe(prompt);
      expect(api.askCopilot.mock.lastCall[0].task_overrides).toBeUndefined();
    }
  });

  it("disables task and block prompts when data is missing and explains the next step", () => {
    render(<RailSaathi territoryId="test" />); open();
    expect(screen.getByText(/Generate a plan and select a block/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "What if +15 min?" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Why this window?" }).disabled).toBe(true);
  });

  it("renders factual fallback and preserves the conversation through minimize", async () => {
    api.askCopilot.mockResolvedValue({ ...reply, engine: "FACTUAL_FALLBACK" });
    render(<RailSaathi {...props} />); open(); submit();
    expect(await screen.findByText("RailSync factual fallback")).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" }); open();
    expect(screen.getByText(reply.answer)).toBeTruthy();
  });

  it("stages an actual verified preview without applying it", async () => {
    const onPreview = vi.fn(); const onOpenPlanning = vi.fn();
    const preview = { ...plan, plan_identity: { plan_id: "P2", parent_plan_id: "P1" } };
    api.askCopilot.mockResolvedValue({ ...reply, engine: "CP_SAT_VERIFIED_WHAT_IF", grounding: { solver_verified: true }, action_preview: { result: preview } });
    render(<RailSaathi {...props} onPreview={onPreview} onOpenPlanning={onOpenPlanning} />); open(); submit("What if +15 min?");
    expect(await screen.findByText("CP-SAT verified preview")).toBeTruthy();
    expect(onPreview).toHaveBeenCalledWith(preview);
    expect(plan.plan_identity.plan_id).toBe("P1");
    fireEvent.click(screen.getByRole("button", { name: "Review preview in Planning" }));
    expect(onOpenPlanning).toHaveBeenCalledOnce();
  });

  it("does not label an unverified response as a verified preview", async () => {
    api.askCopilot.mockResolvedValue({ ...reply, engine: "CP_SAT_VERIFIED_WHAT_IF" });
    render(<RailSaathi {...props} />); open(); submit();
    expect(await screen.findByText("RailSync factual fallback")).toBeTruthy();
    expect(screen.queryByText("CP-SAT verified preview")).toBeNull();
  });

  it("handles backend failure without exposing its message and offers retry", async () => {
    api.askCopilot.mockRejectedValueOnce(new Error("private stack trace"));
    render(<RailSaathi {...props} />); open(); submit();
    fireEvent.click(await screen.findByRole("button", { name: "Retry last question" }));
    expect(await screen.findByText(reply.answer)).toBeTruthy();
    expect(screen.queryByText(/private stack/)).toBeNull();
    expect(api.askCopilot).toHaveBeenCalledTimes(2);
  });

  it("prevents duplicate submissions and aborts when selection changes", async () => {
    let resolve;
    api.askCopilot.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const view = render(<RailSaathi {...props} />); open(); submit();
    expect(screen.getByRole("button", { name: "Send question" }).disabled).toBe(true);
    const signal = api.askCopilot.mock.lastCall[1].signal;
    view.rerender(<RailSaathi {...props} selectedBlock={{ ...block, block_id: "B2" }} />);
    expect(signal.aborted).toBe(true);
    await act(async () => resolve(reply));
    expect(screen.queryByText(reply.answer)).toBeNull();
    submit("New selection question");
    expect(await screen.findByText(reply.answer)).toBeTruthy();
    expect(api.askCopilot.mock.lastCall[0].history).toEqual([]);
  });

  it("bounds history to 12 messages in memory and in storage", async () => {
    render(<RailSaathi {...props} />); open();
    for (let i = 0; i < 8; i += 1) {
      submit(`Question ${i}`);
      await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    }
    expect(api.askCopilot.mock.lastCall[0].history).toHaveLength(10);
    expect(screen.getByRole("log").querySelectorAll("article")).toHaveLength(12);
    // localStorage is now used intentionally for persistence; verify it was written.
    const key = `railsync:railsaathi:v1:${props.territoryId}:${props.plan.plan_identity.plan_id}`;
    const stored = JSON.parse(localStorage.getItem(key) ?? "[]");
    expect(stored.length).toBeLessThanOrEqual(12);
    expect(stored.length).toBeGreaterThan(0);
  });
});

it("uses the existing Apply preview control only after an explicit click", async () => {
  const onApplyPlan = vi.fn();
  const preview = { ...plan, proof_state: "FEASIBLE_BOUNDED", plan_identity: { plan_id: "P2", parent_plan_id: "P1" } };
  render(<OperationalPanels territory={props.territory} plan={plan} tasks={[task]} selectedTaskId="T1" selectedBlock={block} assistantPreview={preview} onApplyPlan={onApplyPlan} />);
  fireEvent.click(screen.getByText("Plan Tools · RailSaathi preview ready"));
  const button = await screen.findByRole("button", { name: "Apply preview as new draft" });
  expect(onApplyPlan).not.toHaveBeenCalled();
  fireEvent.click(button);
  expect(onApplyPlan).toHaveBeenCalledWith(preview);
});

// ── Persistence tests ──────────────────────────────────────────────────────────

describe("RailSaathi localStorage persistence", () => {
  const chatKey = `railsync:railsaathi:v1:${props.territoryId}:${props.plan.plan_identity.plan_id}`;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    api.askCopilot.mockResolvedValue(reply);
    api.getRollingPlan.mockResolvedValue({ monthly: [] });
    api.getResources.mockResolvedValue({ crew: [], machines: [], power_windows: {} });
    api.getAlerts.mockResolvedValue({ alerts: [] });
    api.getDataSources.mockResolvedValue({ datasets: [], service_source_urls: [] });
  });

  afterEach(() => {
    localStorage.clear();
    cleanup();
  });

  it("saves conversation to localStorage after sending a message", async () => {
    render(<RailSaathi {...props} />); open(); submit();
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    const stored = JSON.parse(localStorage.getItem(chatKey) ?? "[]");
    expect(stored.length).toBeGreaterThan(0);
    expect(stored[0].role).toBe("user");
    expect(stored[0].content).toBe("Why this window?");
  });

  it("restores conversation after remount (simulated browser refresh)", async () => {
    const { unmount } = render(<RailSaathi {...props} />); open(); submit();
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    unmount();
    render(<RailSaathi {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Open RailSaathi" }));
    // "Why this window?" appears in both the message list and the prompt buttons.
    const messages = screen.getAllByText("Why this window?");
    expect(messages.length).toBeGreaterThan(0);
    // The assistant reply appears in the message log.
    expect(screen.getAllByText(reply.answer).length).toBeGreaterThan(0);
  });

  it("keeps bounded history in storage (max 12 messages)", async () => {
    render(<RailSaathi {...props} />); open();
    for (let i = 0; i < 8; i += 1) {
      submit(`Question ${i}`);
      await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    }
    const stored = JSON.parse(localStorage.getItem(chatKey) ?? "[]");
    expect(stored.length).toBeLessThanOrEqual(12);
  });

  it("does not load another territory's chat history", async () => {
    // Seed Eastern territory conversation.
    localStorage.setItem("railsync:railsaathi:v1:eastern:P1", JSON.stringify([
      { role: "user", content: "Eastern question" },
      { role: "assistant", content: "Eastern answer", engine: "FACTUAL_FALLBACK" },
    ]));
    // Render for Northern territory.
    render(<RailSaathi {...props} territoryId="northern" />);
    fireEvent.click(screen.getByRole("button", { name: "Open RailSaathi" }));
    expect(screen.queryByText("Eastern question")).toBeNull();
    expect(screen.queryByText("Eastern answer")).toBeNull();
  });

  it("does not load stale plan history when plan ID changes", async () => {
    const oldPlanKey = `railsync:railsaathi:v1:${props.territoryId}:OLD_PLAN`;
    localStorage.setItem(oldPlanKey, JSON.stringify([
      { role: "user", content: "Old plan question" },
      { role: "assistant", content: "Old plan answer", engine: "FACTUAL_FALLBACK" },
    ]));
    render(<RailSaathi {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Open RailSaathi" }));
    expect(screen.queryByText("Old plan question")).toBeNull();
    expect(screen.queryByText("Old plan answer")).toBeNull();
  });

  it("clear chat removes stored history and clears the UI", async () => {
    render(<RailSaathi {...props} />); open(); submit();
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    // Stored before clear.
    expect(JSON.parse(localStorage.getItem(chatKey) ?? "[]").length).toBeGreaterThan(0);
    // Click Clear chat.
    fireEvent.click(screen.getByRole("button", { name: "Clear chat history" }));
    // Storage is empty (either null or "[]") after clear.
    const afterClear = JSON.parse(localStorage.getItem(chatKey) ?? "[]");
    expect(afterClear.length).toBe(0);
    // Messages gone from UI — check within the message log, not the prompt buttons.
    const log = screen.getByRole("log");
    expect(log.querySelectorAll("article").length).toBe(0);
  });

  it("does not crash when localStorage contains malformed JSON", async () => {
    localStorage.setItem(chatKey, "NOT_VALID_JSON{{{");
    expect(() => {
      render(<RailSaathi {...props} />);
      fireEvent.click(screen.getByRole("button", { name: "Open RailSaathi" }));
    }).not.toThrow();
    // Should render with empty conversation (graceful degradation).
    expect(screen.getByRole("dialog", { name: "RailSaathi chat" })).toBeTruthy();
  });

  it("does not persist transient error messages to storage", async () => {
    api.askCopilot.mockRejectedValueOnce(new Error("Network error"));
    render(<RailSaathi {...props} />); open(); submit();
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    const stored = JSON.parse(localStorage.getItem(chatKey) ?? "[]");
    // Error messages (role=assistant with error=true) must not appear in storage.
    expect(stored.every((m) => !m.error)).toBe(true);
    // The user question itself is stored (it was sent before the error).
    expect(stored.some((m) => m.role === "user")).toBe(true);
  });
});

// ─── Communication Preferences ───────────────────────────────────────────────

const PREF_KEY = "railsync:railsaathi:preferences:v1";

describe("RailSaathi communication preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    api.askCopilot.mockResolvedValue(reply);
  });
  afterEach(cleanup);

  it("passes current preferences to the API in every request", async () => {
    render(<RailSaathi {...props} />); open(); submit();
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    const callArg = api.askCopilot.mock.calls[0][0];
    expect(callArg).toHaveProperty("user_preferences");
    expect(typeof callArg.user_preferences).toBe("object");
    expect(callArg.user_preferences).toHaveProperty("language");
  });

  it("saves preference update returned by API into localStorage", async () => {
    const prefReply = {
      ...reply,
      preference_update: { detected: { language: "hinglish" }, is_reset: false, is_persistent: true },
    };
    api.askCopilot.mockResolvedValue(prefReply);
    render(<RailSaathi {...props} />); open(); submit("Abse Hinglish me baat karo");
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    const stored = JSON.parse(localStorage.getItem(PREF_KEY) ?? "{}");
    expect(stored.language).toBe("hinglish");
  });

  it("restores preferences after remount (simulated browser refresh)", async () => {
    localStorage.setItem(PREF_KEY, JSON.stringify({
      language: "hinglish", tone: "casual", detail: "balanced", explanation_style: "default", jargon: "normal",
    }));
    const { unmount } = render(<RailSaathi {...props} />); open(); submit();
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    unmount();
    render(<RailSaathi {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Open RailSaathi" }));
    submit("RailSync kya hai?");
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    const callArg = api.askCopilot.mock.calls.at(-1)[0];
    expect(callArg.user_preferences?.language).toBe("hinglish");
  });

  it("retains preferences when territory switches", async () => {
    localStorage.setItem(PREF_KEY, JSON.stringify({
      language: "hindi", tone: "formal", detail: "balanced", explanation_style: "default", jargon: "normal",
    }));
    const { rerender } = render(<RailSaathi {...props} />); open(); submit();
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    rerender(<RailSaathi {...props} territoryId="eastern" />);
    submit("Test question");
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    const callArg = api.askCopilot.mock.calls.at(-1)[0];
    expect(callArg.user_preferences?.language).toBe("hindi");
    expect(callArg.user_preferences?.tone).toBe("formal");
  });

  it("retains preferences when plan changes", async () => {
    localStorage.setItem(PREF_KEY, JSON.stringify({
      language: "english", tone: "default", detail: "concise", explanation_style: "default", jargon: "normal",
    }));
    const newPlan = { ...plan, plan_identity: { plan_id: "P2", state: "DRAFT" } };
    const { rerender } = render(<RailSaathi {...props} />); open(); submit();
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    rerender(<RailSaathi {...props} plan={newPlan} />);
    submit("Another question");
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    const callArg = api.askCopilot.mock.calls.at(-1)[0];
    expect(callArg.user_preferences?.detail).toBe("concise");
  });

  it("clear chat does NOT clear communication preferences", async () => {
    const prefReply = {
      ...reply,
      preference_update: { detected: { tone: "casual" }, is_reset: false, is_persistent: true },
    };
    api.askCopilot.mockResolvedValue(prefReply);
    render(<RailSaathi {...props} />); open(); submit();
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    expect(JSON.parse(localStorage.getItem(PREF_KEY) ?? "{}").tone).toBe("casual");
    fireEvent.click(screen.getByRole("button", { name: "Clear chat history" }));
    expect(JSON.parse(localStorage.getItem(PREF_KEY) ?? "{}").tone).toBe("casual");
  });

  it("resets preferences when API returns is_reset=true", async () => {
    localStorage.setItem(PREF_KEY, JSON.stringify({
      language: "hinglish", tone: "casual", detail: "concise", explanation_style: "step_by_step", jargon: "minimal",
    }));
    const resetReply = {
      ...reply, answer: "Back to default!",
      preference_update: { detected: {}, is_reset: true, is_persistent: true },
    };
    api.askCopilot.mockResolvedValue(resetReply);
    render(<RailSaathi {...props} />); open(); submit("Reset my response style");
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    const stored = JSON.parse(localStorage.getItem(PREF_KEY) ?? "{}");
    expect(stored.language).toBe("auto");
    expect(stored.tone).toBe("default");
    expect(stored.detail).toBe("balanced");
  });

  it("does not update saved prefs for one-turn override (preference_update=null)", async () => {
    localStorage.setItem(PREF_KEY, JSON.stringify({
      language: "hinglish", tone: "casual", detail: "balanced", explanation_style: "default", jargon: "normal",
    }));
    api.askCopilot.mockResolvedValue({ ...reply, preference_update: null });
    render(<RailSaathi {...props} />); open(); submit("Explain this in formal English");
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    const stored = JSON.parse(localStorage.getItem(PREF_KEY) ?? "{}");
    expect(stored.language).toBe("hinglish");
    expect(stored.tone).toBe("casual");
  });

  it("does not crash when preference localStorage contains malformed JSON", async () => {
    localStorage.setItem(PREF_KEY, "INVALID{{JSON");
    expect(() => {
      render(<RailSaathi {...props} />);
      fireEvent.click(screen.getByRole("button", { name: "Open RailSaathi" }));
    }).not.toThrow();
    expect(screen.getByRole("dialog", { name: "RailSaathi chat" })).toBeTruthy();
    submit();
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    const callArg = api.askCopilot.mock.calls[0][0];
    expect(callArg.user_preferences?.language).toBe("auto");
  });
});
