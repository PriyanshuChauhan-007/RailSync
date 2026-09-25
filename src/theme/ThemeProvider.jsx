import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ThemeContext } from "./ThemeContext.js";

const STORAGE_KEY = "railsync-theme";

function initialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return { theme: saved, explicit: true };
  } catch { /* Storage may be blocked; the in-memory toggle still works. */ }
  return { theme: window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light", explicit: false };
}

export default function ThemeProvider({ children }) {
  const [choice, setChoice] = useState(initialTheme);
  useLayoutEffect(() => { document.documentElement.dataset.theme = choice.theme; }, [choice.theme]);
  useEffect(() => {
    if (choice.explicit) return;
    const query = window.matchMedia?.("(prefers-color-scheme: dark)");
    const update = (event) => setChoice({ theme: event.matches ? "dark" : "light", explicit: false });
    query?.addEventListener("change", update);
    return () => query?.removeEventListener("change", update);
  }, [choice.explicit]);
  const value = useMemo(() => ({
    theme: choice.theme,
    toggleTheme() {
      const theme = choice.theme === "light" ? "dark" : "light";
      setChoice({ theme, explicit: true });
      try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* Optional persistence. */ }
    },
  }), [choice.theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
