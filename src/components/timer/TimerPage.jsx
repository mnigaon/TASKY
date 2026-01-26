// src/components/timer/TimerPage.jsx
import React, { useEffect, useState } from "react";
import { useTimer } from "../../context/TimerContext";
import "./TimerPage.css";

export default function TimerPage() {
  const { secondsLeft, isRunning, mode, start, pause, reset, getTodayFocusTime } = useTimer();
  const [progress, setProgress] = useState(0); // 진행률

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const focusedTime = getTodayFocusTime();

  // 진행률 업데이트
  useEffect(() => {
    const totalSeconds = mode === "work" ? 25 * 60 : 5 * 60;
    setProgress((secondsLeft / totalSeconds) * 360);
  }, [secondsLeft, mode]);

  return (
        <div className="timer-page-container">
        <div className="timer-header">
            <h2>🍅 Pomodoro Timer 🍅</h2>
        <div className="pomodoro-info">
            25 minutes of focus + 5 minutes of rest
        </div>
            <p className="mode">{mode === "work" ? "Focus Mode" : "Rest Mode"}</p>
        </div>

        <div
            className="timer-circle"
            style={{
                "--progress": `${(secondsLeft / (mode === "work" ? 1500 : 300)) * 360}deg`,
            }}
            >
            {minutes.toString().padStart(2,"0")}:{seconds.toString().padStart(2,"0")}
        </div>

        <div className="timer-controls">
            {!isRunning ? (
            <button onClick={start}>Start</button>
            ) : (
            <button onClick={pause}>Pause</button>
            )}
            <button onClick={reset}>Reset</button>
        </div>

        <div className="focused-time">
            Today's Focus Time: {Math.floor(focusedTime / 60)} min {focusedTime % 60} sec
        </div>
        <p className="pomodoro-sentence">Work quickly and efficiently.<br/>Activate your brain with proven methods to <br/>become the ultimate master of schedule management.</p>
        </div>
        );
    }

