// src/components/dashboard/DashboardHome.jsx
import "./DashboardHome.css";
import { useTimer } from "../../context/TimerContext";

export default function DashboardHome() {
  const { getTodayFocusTime, secondsLeft, mode } = useTimer();

  // 예시 데이터
  const todaysTasks = [
    { id: 1, title: "Finish project report", completed: false },
    { id: 2, title: "Team meeting at 2 PM", completed: true },
    { id: 3, title: "Update task board", completed: false },
  ];

  const recentActivity = [
    "Completed task: Design mockup",
    "Joined workspace: Marketing Team",
    "Started Pomodoro timer",
  ];

  const workspaces = [
    { id: 1, name: "Marketing" },
    { id: 2, name: "Development" },
  ];

  const todayFocusTime = Math.floor(getTodayFocusTime() / 60); // 분 단위
  const totalPomodoroTime = 25; // 기준 시간 (분) 예시
  const progress = Math.min(todayFocusTime / totalPomodoroTime, 1); // 0~1

  return (
    <div className="dashboard-home">
      <div className="cards">

        {/* 워크스페이스 카드 */}
        <div className="card">
          <h3>👥 My Workspaces</h3>
          <ul className="workspace-list">
            {workspaces.map(ws => (
              <li key={ws.id}>{ws.name}</li>
            ))}
          </ul>
        </div>

        {/* 오늘 집중 시간 카드 */}
        <div className="card focus-card">
          <h3>⏱️ Today's Focus Time</h3>
          <div className="progress-ring">
            <svg viewBox="0 0 36 36">
              <path
                className="circle-bg"
                d="M18 2.0845
                   a 15.9155 15.9155 0 0 1 0 31.831
                   a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="circle"
                strokeDasharray={`${progress * 100}, 100`}
                d="M18 2.0845
                   a 15.9155 15.9155 0 0 1 0 31.831
                   a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="focus-time">{todayFocusTime} min</div>
          </div>
          <p className="mode">{mode === "work" ? "Focus Mode" : "Rest Mode"}</p>
        </div>

      </div>
    </div>
  );
}
