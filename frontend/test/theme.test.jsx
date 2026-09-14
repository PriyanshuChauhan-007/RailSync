import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
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
