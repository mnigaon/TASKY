// src/components/timer/TimerPage.jsx
import React, { useState, useEffect } from "react";
import { useTimer } from "../../context/TimerContext";
import ReportModal from "./ReportModal";
import TimerSettingsModal from "./TimerSettingsModal";
import FocusGarden from "./FocusGarden"; // Added import
import "./TimerPage.css";

export default function TimerPage() {
  const {
    mode,
    secondsLeft,
    isRunning,
    start,
    pause,
    reset,
    focusTask,
    setFocusTask,
    customPomodoro,
    customBreak,
    totalRounds,
    currentRound,
    setTimerConfig,
    settings,
    setSettings
  } = useTimer();

  const [showReport, setShowReport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [progressDeg, setProgressDeg] = useState(360);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  // Progress Update
  useEffect(() => {
    const totalSeconds = mode === "pomodoro" ? (customPomodoro * 60) : (customBreak * 60);
    const progress = totalSeconds > 0 ? (secondsLeft / totalSeconds) * 360 : 0;
    setProgressDeg(progress);
  }, [secondsLeft, mode, customPomodoro, customBreak]);


  /* =================================================
     🔊 Audio Logic handled in TimerContext now
  ================================================= */


  return (
    <div
      className="timer-page-container"
      style={{
        "--timer-color": settings.timerColor,
      }}
    >

      {/* Side Panel Settings - Isolated */}
      {showSettings && (
        <div className="timer-settings-wrapper">
          <TimerSettingsModal
            settings={settings}
            onUpdateSettings={setSettings}
            onClose={() => setShowSettings(false)}
            timerConfig={{
              customPomodoro,
              customBreak,
              totalRounds,
            }}
            setTimerConfig={setTimerConfig}
          />
        </div>
      )}

      {/* Content Grid */}
      <div className="timer-grid">
        <div className="timer-card">
          {/* Header */}
          <div className="timer-header">
            <div className="header-left">
              <button
                className={`icon-btn ${showSettings ? 'active' : ''}`}
                onClick={() => setShowSettings(!showSettings)}
                style={{ background: showSettings ? 'rgba(0,0,0,0.05)' : 'transparent' }}
              >
                ⚙️
              </button>
              <h2>Pomodoro Timer</h2>
            </div>

            <button className="report-btn promo" onClick={() => setShowReport(true)}>
              📊 Show Report
            </button>
          </div>

          {/* Mode Badge & Round Counter */}
          <div className="timer-info-row">
            <span className={`timer-mode-badge ${mode}`}>
              {mode === "pomodoro" ? "Focus" : "Break"}
            </span>
            <span className="round-counter">
              Round {currentRound} / {totalRounds}
            </span>
          </div>

          {/* Task Input */}
          <div className="timer-task-input-wrapper">
            <input
              className="timer-task-input"
              placeholder="What are you focusing on?"
              value={focusTask}
              onChange={(e) => setFocusTask(e.target.value)}
            />
          </div>

          {/* Timer Circle */}
          <div
            className="timer-circle"
            style={{ "--progress": `${progressDeg}deg` }}
          >
            {minutes.toString().padStart(2, "0")}:
            {seconds.toString().padStart(2, "0")}
          </div>

          {/* Description Removed from circle label area to keep it clean */}

          {/* Controls */}
          <div className="timer-controls">
            {!isRunning ? (
              <button onClick={start} className="start-btn" style={{ background: settings.timerColor }}>
                Start
              </button>
            ) : (
              <button onClick={pause} className="pause-btn">Pause</button>
            )}
            <button onClick={reset} className="reset-btn">Reset</button>
          </div>

          {/* Description */}
          <p className="pomodoro-sentence">
            Stay focused on <strong>{focusTask || "your task"}</strong>.
          </p>
        </div>

        {/* 🌿 Focus Garden UI */}
        <FocusGarden />
      </div>

      {/* Modals */}
      {showReport && <ReportModal onClose={() => setShowReport(false)} />}
    </div>
  );
}
