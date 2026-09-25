import { useContext } from "react";
import { ThemeContext } from "./ThemeContext.js";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const night = theme === "dark";
  return <button className="theme-toggle" type="button" onClick={toggleTheme}
    aria-label={`Switch to ${night ? "Day" : "Night"} mode`} aria-pressed={night}
    title={`${night ? "Night" : "Day"} mode · switch appearance`}>
    <span aria-hidden="true">{night ? "☾" : "☀"}</span> {night ? "Night" : "Day"}
  </button>;
}
