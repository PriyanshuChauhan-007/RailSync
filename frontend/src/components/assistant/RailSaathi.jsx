import { useEffect, useRef, useState } from "react";
import { askCopilot } from "../../services/api.js";
import { clearChat, loadChat, saveChat, storageKey } from "../../utils/chatStorage.js";
import { defaultPreferences, loadPreferences, savePreferences } from "../../utils/prefStorage.js";
import "./railsaathi.css";

const LABELS = {
  GEMINI_PLAN_CONTEXT: "AI explanation · current RailSync context",
  CP_SAT_VERIFIED_WHAT_IF: "CP-SAT verified preview",
  FACTUAL_FALLBACK: "RailSync factual fallback",
};

function RailIcon() {
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <rect x="5" y="3" width="14" height="15" rx="4" /><path d="M5 11h14M12 3v8M8 18l-3 4m11-4 3 4M7 21h10" />
    <circle cx="8.5" cy="14.5" r=".8" /><circle cx="15.5" cy="14.5" r=".8" />
  </svg>;
}

export default function RailSaathi({ territoryId, territory, plan, selectedBlock, selectedTask, onPreview, onOpenPlanning }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState(() => loadChat(territoryId, plan?.plan_identity?.plan_id ?? null));
  const [busy, setBusy] = useState(false);
  const [failedQuestion, setFailedQuestion] = useState("");
  // Communication preferences are global (not per-territory/plan).
  // They control HOW RailSaathi speaks, not railway facts.
  const [prefs, setPrefs] = useState(() => loadPreferences());
  const controller = useRef(null);
  const launcher = useRef(null);
  const input = useRef(null);
  const log = useRef(null);

  // Plan identity key for localStorage: territory + plan ID only.
  // Changing selected block/task is a selection change, not a new conversation context.
  const planId = plan?.plan_identity?.plan_id ?? null;
  const chatKey = storageKey(territoryId, planId);

  // Selection affects the next request, but never defines conversation identity.
  const contextKey = `${territoryId}:${planId ?? "none"}:${plan?.plan_identity?.state ?? ""}:${selectedBlock?.block_id ?? ""}:${selectedTask?.task_id ?? ""}`;
  const [chatContext, setChatContext] = useState({ contextKey, chatKey });

  if (chatContext.contextKey !== contextKey || chatContext.chatKey !== chatKey) {
    const scopeChanged = chatContext.chatKey !== chatKey;
    setChatContext({ contextKey, chatKey });
    if (scopeChanged) {
      setMessages(loadChat(territoryId, planId));
      setQuestion("");
      setFailedQuestion("");
    }
    // A selection change cancels stale work, not the visible conversation.
    setBusy(false);
  }

  // Persist messages whenever they change. Transient error messages are filtered inside saveChat.
  useEffect(() => {
    saveChat(territoryId, planId, messages);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, chatKey]);

  // Abort any in-flight request when selection context changes.
  useEffect(() => () => {
    controller.current?.abort();
    controller.current = null;
  }, [contextKey]);

  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages, busy, open]);

  function close() {
    setOpen(false);
    launcher.current?.focus();
  }

  function handleClearChat() {
    // Clears only the current territory/plan conversation.
    // Does NOT delete the plan, change selected block, modify solver data, or change territory.
    clearChat(territoryId, planId);
    setMessages([]);
    setFailedQuestion("");
  }

  async function send(value) {
    const text = value.trim();
    if (!text || controller.current || !territoryId) return;
    const requestController = new AbortController();
    controller.current = requestController;
    const history = messages.filter((message) => !message.error).slice(-10).map(({ role, content }) => ({ role, content: content.slice(0, 4000) }));
    setMessages((current) => [...current, { role: "user", content: text }].slice(-12));
    setQuestion("");
    setFailedQuestion("");
    setBusy(true);
    try {
      const response = await askCopilot({
        conversation_version: 1, territory_id: territoryId, question: text,
        parent_plan_id: plan?.plan_identity?.plan_id,
        selected_block_id: selectedBlock?.block_id, selected_task_id: selectedTask?.task_id,
        current_plan: plan ? { blocks: plan.blocks, unscheduled_tasks: plan.unscheduled_tasks } : null,
        history,
        // Pass current saved preferences so the backend can inject them into Gemini instructions.
        user_preferences: prefs,
      }, { signal: requestController.signal });
      if (requestController.signal.aborted) return;
      if (typeof response?.answer !== "string" || !response.answer.trim()) throw new Error("Empty reply");
      const verifiedPreview = response.grounding?.solver_verified === true && response.action_preview?.result;
      const engine = response.engine === "CP_SAT_VERIFIED_WHAT_IF" && !verifiedPreview ? "FACTUAL_FALLBACK" : response.engine;
      setMessages((current) => [...current, { role: "assistant", content: response.answer, engine, preview: Boolean(verifiedPreview) }].slice(-12));
      if (verifiedPreview) onPreview?.(response.action_preview.result);
      // Handle persistent preference update returned by the backend.
      // One-turn style overrides never produce a preference_update (null).
      // Clear chat does NOT touch preferences — only explicit reset commands do.
      if (response.preference_update) {
        const pu = response.preference_update;
        const newPrefs = pu.is_reset ? defaultPreferences() : { ...prefs, ...(pu.detected ?? {}) };
        setPrefs(newPrefs);
        savePreferences(newPrefs);
      }
    } catch (error) {
      if (error.name === "AbortError" || requestController.signal.aborted) return;
      setMessages((current) => [...current, { role: "assistant", content: "RailSaathi couldn't reach the backend. Your plan is unchanged. Please retry.", error: true }].slice(-12));
      setFailedQuestion(text);
    } finally {
      if (controller.current === requestController) {
        controller.current = null;
        setBusy(false);
        if (!requestController.signal.aborted) input.current?.focus();
      }
    }
  }

  const canExtend = Boolean(plan && (selectedTask && (!selectedBlock || selectedBlock.tasks.includes(selectedTask.task_id)) || selectedBlock?.tasks?.length === 1));
  const prompts = [
    { text: "Why this window?", disabled: !selectedBlock },
    { text: "Explain this simply", disabled: !plan && !selectedTask },
    { text: "What if +15 min?", disabled: !canExtend },
    { text: "Can S&T + TRD share this block?", disabled: !selectedBlock },
  ];
  return <div className="railsaathi">
    {open ? <section id="railsaathi-panel" className="railsaathi-panel" role="dialog" aria-label="RailSaathi chat" onKeyDown={(event) => { if (event.key === "Escape") close(); }}>
      <header className="railsaathi-header">
        <span className="railsaathi-mark"><RailIcon /></span>
        <div><h2>RailSaathi</h2><p>RailSync Planning Assistant</p></div>
        {messages.length > 0 ? <button type="button" className="railsaathi-clear" aria-label="Clear chat history" disabled={busy} onClick={handleClearChat} title="Clear this conversation (does not affect your plan)">Clear chat</button> : null}
        <button type="button" className="railsaathi-close" aria-label="Minimize RailSaathi" onClick={close}>×</button>
      </header>
      <div className="railsaathi-context"><span className="railsaathi-dot" />{territory?.display_name ?? "Loading territory…"}
        {selectedBlock ? <small>Block {selectedBlock.block_id}</small> : null}
        {selectedTask ? <small>Task {selectedTask.task_id}</small> : null}
      </div>
      <div ref={log} className="railsaathi-messages" role="log" aria-live="polite" aria-relevant="additions" aria-label="RailSaathi messages">
        <div className="railsaathi-welcome"><strong>A little clarity, right on track.</strong><p>{plan ? "Ask about your prototype plan in English or Hinglish. Select a block for its window details." : "I can help you explore this territory. Generate a plan and select a block to discuss its timing."}</p></div>
        {messages.map((message, index) => <article key={index} className={`railsaathi-message is-${message.role}`}>
          <small className="railsaathi-speaker">{message.role === "user" ? "You" : "RailSaathi"}</small>
          <p>{message.content}</p>
          {message.role === "assistant" && !message.error ? <small className="railsaathi-grounding">{LABELS[message.engine] ?? LABELS.FACTUAL_FALLBACK}</small> : null}
          {message.preview ? <button type="button" className="railsaathi-review" onClick={() => { close(); onOpenPlanning?.(); }}>Review preview in Planning</button> : null}
        </article>)}
        {busy ? <p className="railsaathi-loading" role="status">Checking the current context…</p> : null}
        {failedQuestion ? <button className="railsaathi-retry" type="button" disabled={busy} onClick={() => send(failedQuestion)}>Retry last question</button> : null}
      </div>
      <div className="railsaathi-prompts" aria-label="Suggested questions">{prompts.map(({ text, disabled }) => <button key={text} type="button" disabled={busy || disabled} onClick={() => send(text)} title={disabled ? "Select a plan, block or task in Planning first" : text}>{text}</button>)}</div>
      <form className="railsaathi-form" onSubmit={(event) => { event.preventDefault(); send(question); }}>
        <input ref={input} aria-label="Ask RailSaathi" placeholder="Ask RailSaathi..." maxLength={2000} value={question} onChange={(event) => setQuestion(event.target.value)} />
        <button type="submit" disabled={busy || !question.trim() || !territoryId} aria-label="Send question">Send <span aria-hidden="true">↗</span></button>
      </form>
      <p className="railsaathi-note">Prototype planning guidance · Changes stay previews.</p>
    </section> : null}
    <button ref={launcher} type="button" className="railsaathi-launcher" aria-label={open ? "Minimize RailSaathi" : "Open RailSaathi"} aria-expanded={open} aria-controls="railsaathi-panel" onClick={() => open ? close() : setOpen(true)}><RailIcon /><span>RailSaathi</span><span className="railsaathi-launcher-dot" /></button>
  </div>;
}
