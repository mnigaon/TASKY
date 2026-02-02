import React from "react";
import "./TimerSettingsModal.css";



const TIMER_COLORS = [
    // Reds & Pinks
    { name: "Focus Red", value: "#ff6b6b" },
    { name: "Crimson", value: "#dc143c" },
    { name: "Orange Red", value: "#ff4500" },
    { name: "Coral", value: "#ff7f50" },
    { name: "Hot Pink", value: "#f06595" },
    { name: "Deep Pink", value: "#ff1493" },
    { name: "Magenta", value: "#ff00ff" },
    // Oranges & Yellow
    { name: "Sunny Orange", value: "#ff922b" },
    { name: "Chocolate", value: "#d2691e" },
    { name: "Gold", value: "#ffd700" },
    { name: "Yellow", value: "#fcc419" },
    // Greens
    { name: "Lime", value: "#94d82d" },
    { name: "Chartreuse", value: "#7fff00" },
    { name: "Zen Green", value: "#51cf66" },
    { name: "Spring Green", value: "#00ff7f" },
    { name: "Teal", value: "#20c997" },
    // Blues & Cyans
    { name: "Cyan", value: "#22b8cf" },
    { name: "Turquoise", value: "#40e0d0" },
    { name: "Dodger Blue", value: "#1e90ff" },
    { name: "Tasky Blue", value: "#648cff" },
    { name: "Steel Blue", value: "#4682b4" },
    // Purples
    { name: "Slate Blue", value: "#6a5acd" },
    { name: "Royal Purple", value: "#845ef7" },
    { name: "Indigo", value: "#4b0082" },
];

const AMBIENT_SOUNDS = [
    { id: "none", name: "🔇 No Sound" },
    { id: "rain", name: "🌧️ Rain" },
    { id: "cafe", name: "☕ Cafe" },
    { id: "fireplace", name: "🔥 Fireplace" },
    { id: "waves", name: "🌊 Waves" },
    { id: "forest", name: "🌲 Forest" },
    { id: "city", name: "🏙️ City" },
    { id: "wind", name: "🌬️ Wind" },
    { id: "stream", name: "🏞️ Stream" },
    { id: "space", name: "🚀 Space" },
];

const ALARM_SOUNDS = [
    { id: "alarm", name: "🚨 Alarm" }, // Expects alarm.mp3
    { id: "digital", name: "⏰ Digital" }, // Expects digital.mp3
    { id: "funny", name: " funny" }, // Expects funny.mp3
    { id: "siren", name: " siren" }, // Expects siren.mp3
    { id: "beep", name: " beep" }, // Expects beep.mp3
    { id: "buzz", name: " buzz" }, // Expects buzz.mp3
];

export default function TimerSettingsModal({
    settings,
    onUpdateSettings,
    onClose,
    timerConfig,
    setTimerConfig,
}) {
    // Local state for input values to avoid resetting context on every keystroke
    const [localConfig, setLocalConfig] = React.useState({
        pomodoro: timerConfig.customPomodoro,
        break: timerConfig.customBreak,
        rounds: timerConfig.totalRounds,
    });

    const handleConfigChange = (key, value) => {
        const val = parseInt(value) || 0;
        setLocalConfig(prev => ({ ...prev, [key]: val }));
    };

    const applyConfig = () => {
        setTimerConfig(localConfig);
    };

    // Direct Update for Real-time Preview
    const handleChange = (key, value) => {
        onUpdateSettings((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <div className="settings-panel">
            <div className="panel-header">
                <h2>⚙️ Timer Settings</h2>
                <button className="close-btn" onClick={onClose}>
                    ×
                </button>
            </div>

            <div className="panel-content">
                {/* 1. Custom Timer Configuration - Analog Sticky Note Style */}
                <div className="setting-section sticky-note-config">
                    <div className="sticky-tape"></div>
                    <h3>📒 Timer Configuration</h3>
                    <div className="config-grid">
                        <div className="config-item">
                            <label>Focus (min)</label>
                            <input
                                type="number"
                                value={localConfig.pomodoro}
                                onChange={(e) => handleConfigChange("pomodoro", e.target.value)}
                                min="1"
                                max="120"
                            />
                        </div>
                        <div className="config-item">
                            <label>Break (min)</label>
                            <input
                                type="number"
                                value={localConfig.break}
                                onChange={(e) => handleConfigChange("break", e.target.value)}
                                min="1"
                                max="60"
                            />
                        </div>
                        <div className="config-item">
                            <label>Rounds</label>
                            <input
                                type="number"
                                value={localConfig.rounds}
                                onChange={(e) => handleConfigChange("rounds", e.target.value)}
                                min="1"
                                max="20"
                            />
                        </div>
                    </div>
                    <button className="apply-config-btn" onClick={applyConfig}>
                        Apply Settings
                    </button>
                </div>

                {/* 2. Timer Color */}
                <div className="setting-section">
                    <h3>⏱️ Timer Color</h3>
                    <div className="color-grid">
                        {TIMER_COLORS.map((c) => (
                            <button
                                key={c.value}
                                className={`color-btn ${settings.timerColor === c.value ? "active" : ""}`}
                                style={{ backgroundColor: c.value }}
                                onClick={() => handleChange("timerColor", c.value)}
                                title={c.name}
                            />
                        ))}
                    </div>
                </div>

                {/* 3. Ambient Sound */}
                <div className="setting-section">
                    <h3>🎧 Focus Sound</h3>
                    <div className="sound-options">
                        {AMBIENT_SOUNDS.map((s) => (
                            <label key={s.id} className={`sound-card ${settings.ambientSound === s.id ? "active" : ""}`}>
                                <input
                                    type="radio"
                                    name="ambient"
                                    value={s.id}
                                    checked={settings.ambientSound === s.id}
                                    onChange={() => handleChange("ambientSound", s.id)}
                                />
                                {s.name}
                            </label>
                        ))}
                    </div>
                </div>

                {/* 4. Alarm Sound */}
                <div className="setting-section">
                    <h3>🔔 Alarm Sound</h3>
                    <select
                        value={settings.alarmSound}
                        onChange={(e) => handleChange("alarmSound", e.target.value)}
                        className="sound-select"
                    >
                        {ALARM_SOUNDS.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
}
