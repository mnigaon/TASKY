// src/components/dashboard/Dashboard.jsx
import { useAuth } from "../../firebase/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/firebase";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

import "./Dashboard.css";

import DashboardHome from "./DashboardHome"; // 메인 카드 화면
import WorkspaceList from "./WorkspaceList";
import Tasks from "./Tasks";
import TimerPage from "../timer/TimerPage"; // Timer 탭
import FloatingTimer from "../timer/FloatingTimer";
import { TimerProvider, useTimer } from "../../context/TimerContext";

export default function Dashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("home"); // home, tasks, workspace, timer
  const [activeWorkspace, setActiveWorkspace] = useState(null); // 선택된 워크스페이스

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/"); // 로그아웃 시 메인페이지로 이동
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const renderContent = () => {
    if (activeTab === "workspace") {
      if (activeWorkspace) {
        return <Tasks workspaceId={activeWorkspace.id} />;
      } else {
        return <WorkspaceList onSelectWorkspace={(ws) => setActiveWorkspace(ws)} />;
      }
    } else if (activeTab === "tasks") {
      return <Tasks />;
    } else if (activeTab === "timer") {
      return <TimerPage />; // Dashboard 내부 Timer 탭
    } else if (activeTab === "home") {
      return <DashboardHome />;
    } else {
      return null;
    }
  };

  return (
    <TimerProvider>
      <div className="dashboard">
        <aside className="sidebar">
          <h2
            className="logo"
            onClick={() => {
              setActiveTab("home");
              setActiveWorkspace(null);
            }}
          >
            TASKY
          </h2>

          <ul>
            <li
              className={activeTab === "tasks" ? "active" : ""}
              onClick={() => {
                setActiveTab("tasks");
                setActiveWorkspace(null);
              }}
            >
              Tasks
            </li>
            <li
              className={activeTab === "workspace" ? "active" : ""}
              onClick={() => {
                setActiveTab("workspace");
                setActiveWorkspace(null);
              }}
            >
              Work Space
            </li>
            <li
              className={activeTab === "timer" ? "active" : ""}
              onClick={() => {
                setActiveTab("timer");
                setActiveWorkspace(null);
              }}
            >
              Timer
            </li>
            <li
              className={activeTab === "settings" ? "active" : ""}
              onClick={() => setActiveTab("settings")}
            >
              Settings
            </li>
            <li onClick={handleLogout} className="logout-btn">
              Logout
            </li>
          </ul>
        </aside>

        <main className="main-content">
          <h1>Welcome, {currentUser?.displayName || currentUser?.email}!</h1>
          {renderContent()}
        </main>

        {/* Timer가 실행 중이면 FloatingTimer 표시 */}
        <FloatingTimer onClick={() => setActiveTab("timer")} />
      </div>
    </TimerProvider>
  );
}


