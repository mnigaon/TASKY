// src/components/timer/ReportModal.jsx
import React, { useState, useMemo, useEffect } from "react";
import { useTimer } from "../../context/TimerContext";
import { db } from "../../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import "./ReportModal.css";
import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  CartesianGrid,
} from "recharts";

export default function ReportModal({ onClose }) {
  const [filter, setFilter] = useState("week");
  const { getSummaryStats, getAllFocusData } = useTimer();

  const { totalHours, daysAccessed, streak } = getSummaryStats();
  const allData = getAllFocusData();

  const isDark = document.body.classList.contains("dark");
  const barColor = isDark ? "#F0B6B6" : "#800000";

  // =================
  // Focus Hours 차트
  // =================
  const chartData = useMemo(() => {
    const today = new Date();
    const filtered = [];

    if (filter === "week") {
      const startOfWeek = new Date();
      startOfWeek.setDate(today.getDate() - 6);
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        const dateStr = d.toISOString().slice(0, 10);
        const dataItem = allData.find(item => item.date === dateStr);
        filtered.push({
          date: d.toLocaleDateString("en-US", { weekday: "short" }),
          hours: dataItem ? (dataItem.seconds / 3600).toFixed(2) : 0,
        });
      }
    } else if (filter === "month") {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      for (let i = 0; i < daysInMonth; i++) {
        const d = new Date(startOfMonth);
        d.setDate(startOfMonth.getDate() + i);
        const dateStr = d.toISOString().slice(0, 10);
        const dataItem = allData.find(item => item.date === dateStr);
        filtered.push({
          date: d.getDate().toString(),
          hours: dataItem ? (dataItem.seconds / 3600).toFixed(2) : 0,
        });
      }
    } else if (filter === "year") {
      for (let m = 0; m < 12; m++) {
        const monthStart = new Date(today.getFullYear(), m, 1);
        const monthEnd = new Date(today.getFullYear(), m + 1, 0);
        const monthStr = monthStart.toLocaleString("default", { month: "short" });
        const totalSeconds = allData
          .filter(item => {
            const d = new Date(item.date);
            return d >= monthStart && d <= monthEnd;
          })
          .reduce((sum, item) => sum + item.seconds, 0);
        filtered.push({ date: monthStr, hours: (totalSeconds / 3600).toFixed(2) });
      }
    }

    return filtered;
  }, [filter, allData]);


  return (
    <div className="report-overlay">
      <div className="report-modal">
        <div className="report-header">
          <h3>📊 Report</h3>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="report-content">
          <h4>🔥 Active Summary</h4>
          <div className="summary-cards">
            <div className="summary-card">🔥 {totalHours} hrs focused</div>
            <div className="summary-card">📅 {daysAccessed} days accessed</div>
            <div className="summary-card">⚡ {streak} day streak</div>
          </div>

          <h4 style={{ marginTop: "1.5rem" }}>📈 Focus Hours</h4>
          <div className="report-filter" style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <button className={filter === "week" ? "active" : ""} onClick={() => setFilter("week")}>Week</button>
            <button className={filter === "month" ? "active" : ""} onClick={() => setFilter("month")}>Month</button>
            <button className={filter === "year" ? "active" : ""} onClick={() => setFilter("year")}>Year</button>
          </div>

          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid stroke="#eee" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="hours"
                  fill={barColor}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
