// src/context/TimerContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef } from "react";

const TimerContext = createContext();

export const TimerProvider = ({ children }) => {
  const [secondsLeft, setSecondsLeft] = useState(25 * 60); // 25분
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState("work"); // work / break
  const audioRef = useRef(null);

  // 타이머 인터벌
  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          audioRef.current?.play();

          // 오늘 집중 시간 업데이트
          if (mode === "work") {
            const today = new Date().toISOString().slice(0,10);
            const prevTime = Number(localStorage.getItem(`focusTime_${today}`)) || 0;
            localStorage.setItem(`focusTime_${today}`, prevTime + 25*60);
          }

          // 모드 전환
          const nextMode = mode === "work" ? "break" : "work";
          setMode(nextMode);
          setSecondsLeft(nextMode === "work" ? 25*60 : 5*60);
          setIsRunning(false);
          return prev;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, mode]);

  const start = () => setIsRunning(true);
  const pause = () => setIsRunning(false);
  const reset = () => {
    setSecondsLeft(mode === "work" ? 25*60 : 5*60);
    setIsRunning(false);
  };

  const getTodayFocusTime = () => {
    const today = new Date().toISOString().slice(0,10);
    return Number(localStorage.getItem(`focusTime_${today}`)) || 0;
  };

  return (
    <TimerContext.Provider value={{
      secondsLeft,
      isRunning,
      mode,
      start,
      pause,
      reset,
      getTodayFocusTime,
    }}>
      {children}
      <audio ref={audioRef} src="/alarm.mp3" preload="auto" />
    </TimerContext.Provider>
  );
};

export const useTimer = () => useContext(TimerContext);
