import { createContext, useContext, useEffect, useRef, useState } from "react";

const SimulationTimeContext = createContext(null);

export function SimulationTimeProvider({ children }) {
  // Seconds since midnight (0 to 86399). Defaults to current IST wall-clock seconds.
  const [simulatedSeconds, setSimulatedSeconds] = useState(() => {
    const now = new Date();
    return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  });
  const [isPaused, setIsPaused] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // High resolution tick (every 200ms) for smooth train gliding and accurate integer second updates
    const tickIntervalMs = 200;
    timerRef.current = setInterval(() => {
      setSimulatedSeconds((prev) => {
        const delta = (multiplier * tickIntervalMs) / 1000;
        return (prev + delta) % 86400;
      });
    }, tickIntervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, multiplier]);

  const totalSec = Math.floor(simulatedSeconds);
  const hours = Math.floor(totalSec / 3600).toString().padStart(2, "0");
  const minutes = Math.floor((totalSec % 3600) / 60).toString().padStart(2, "0");
  const seconds = (totalSec % 60).toString().padStart(2, "0");
  const formattedTime = `${hours}:${minutes}:${seconds} IST`;
  const timeOfDayMinutes = totalSec / 60;

  const togglePause = () => setIsPaused((prev) => !prev);

  const jumpTo = (h, m) => {
    setSimulatedSeconds(h * 3600 + m * 60);
  };

  const handleSliderChange = (e) => {
    setSimulatedSeconds(parseInt(e.target.value, 10));
  };

  return (
    <SimulationTimeContext.Provider
      value={{
        simulatedSeconds,
        totalSec,
        hours,
        minutes,
        seconds,
        formattedTime,
        timeOfDayMinutes,
        isPaused,
        multiplier,
        togglePause,
        setMultiplier,
        setSimulatedSeconds,
        jumpTo,
        handleSliderChange,
      }}
    >
      {children}
    </SimulationTimeContext.Provider>
  );
}

export function useSimulationTime() {
  const context = useContext(SimulationTimeContext);
  if (!context) {
    const now = new Date();
    const sec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const timeStr = now.toTimeString().slice(0, 8);
    return {
      simulatedSeconds: sec,
      totalSec: sec,
      hours: now.getHours().toString().padStart(2, "0"),
      minutes: now.getMinutes().toString().padStart(2, "0"),
      seconds: now.getSeconds().toString().padStart(2, "0"),
      formattedTime: `${timeStr} IST`,
      timeOfDayMinutes: sec / 60,
      isPaused: false,
      multiplier: 1,
      togglePause: () => {},
      setMultiplier: () => {},
      setSimulatedSeconds: () => {},
      jumpTo: () => {},
      handleSliderChange: () => {},
    };
  }
  return context;
}
