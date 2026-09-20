import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import HowItWorks from "../src/sections/HowItWorks.jsx";
import IntegratedPossessionSection from "../src/sections/IntegratedPossessionSection.jsx";
import SolutionPreview from "../src/sections/SolutionPreview.jsx";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});

it("keeps one corridor mounted while accessible stage controls reveal the evidence chain", () => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  render(<HowItWorks />);

  const scene = screen.getByRole("img", { name: "Saktigarh to Memari railway schematic" });
  const track = screen.getByTestId("persistent-track");
  expect(screen.getAllByRole("tab")).toHaveLength(5);
  for (const label of ["Train Traffic", "Maintenance Demand", "Conflict", "CP-SAT", "Coordinated Plan"]) {
    const tab = screen.getByRole("tab", { name: new RegExp(label) });
    fireEvent.click(tab);
    expect(tab.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("img", { name: "Saktigarh to Memari railway schematic" })).toBe(scene);
    expect(screen.getByTestId("persistent-track")).toBe(track);
  }
  expect(screen.getByRole("tabpanel").textContent).toContain("One shared possession");
  fireEvent.keyDown(screen.getByRole("tab", { name: /Coordinated Plan/ }), { key: "Home" });
  expect(screen.getByRole("tab", { name: /Train Traffic/ }).getAttribute("aria-selected")).toBe("true");
  expect(screen.getByText(/not a live solver run/)).toBeTruthy();
});

it("lets users inspect rejected and accepted candidate windows without changing the corridor", () => {
  render(<HowItWorks />);
  fireEvent.click(screen.getByRole("tab", { name: /CP-SAT/ }));
  fireEvent.click(screen.getByRole("button", { name: /Candidate A/ }));
  expect(screen.getByRole("status").textContent).toMatch(/37814.*04:16–04:19/);
  fireEvent.click(screen.getByRole("button", { name: /Candidate B/ }));
  expect(screen.getByRole("status").textContent).toContain("clearance");
  fireEvent.click(screen.getByRole("button", { name: /Candidate C/ }));
  expect(screen.getByRole("status").textContent).toContain("illustrative feasible window");
  fireEvent.focus(screen.getByRole("button", { name: /Candidate A/ }));
  expect(screen.getByRole("status").textContent).toContain("overlaps all three minutes");
  fireEvent.click(screen.getByRole("tab", { name: /Train Traffic/ }));
  expect(screen.queryByRole("button", { name: /Candidate A/ })).toBeNull();
});

it("leaves the selected stage under user control instead of autoplaying", () => {
  vi.useFakeTimers();
  try {
    render(<HowItWorks />);
    fireEvent.click(screen.getByRole("tab", { name: /Conflict/ }));
    vi.advanceTimersByTime(30_000);
    expect(screen.getByRole("tab", { name: /Conflict/ }).getAttribute("aria-selected")).toBe("true");
  } finally {
    vi.useRealTimers();
  }
});

it("labels fixed landing examples separately from active solver results", () => {
  render(<><IntegratedPossessionSection /><SolutionPreview /></>);

  expect(screen.getByText(/Illustrative coordination example · not active plan results/i)).toBeTruthy();
  expect(screen.getByText(/Static public-demo walkthrough · not active session data/i)).toBeTruthy();
});
