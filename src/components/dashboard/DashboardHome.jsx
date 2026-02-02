// src/components/dashboard/DashboardHome.jsx
import "./DashboardHome.css";
import { useTimer } from "../../context/TimerContext";
import { useState, useEffect } from "react";
import { db } from "../../firebase/firebase";
import { collection, query, where, getDocs, limit, or, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, orderBy } from "firebase/firestore";
import { useAuth } from "../../firebase/AuthContext";
import { formatDate } from "../../utils/dateFormat";

const SHORTCUT_TYPES = [
  { id: 'tasks', label: 'My Tasks', icon: '📝', class: 'shortcut-tasks' },
  { id: 'kanban', label: 'Kanban Board', icon: '📋', class: 'shortcut-kanban' },
  { id: 'calendar', label: 'Calendar', icon: '📅', class: 'shortcut-calendar' },
  { id: 'docs', label: 'Documents', icon: '📄', class: 'shortcut-docs' },
  { id: 'whiteboard', label: 'Whiteboard', icon: '🖍️', class: 'shortcut-whiteboard' },
  { id: 'diary', label: 'Diary', icon: '📔', class: 'shortcut-diary' },
];

export default function DashboardHome({ setActiveTab, setActiveWorkspace }) {
  const { currentUser } = useAuth();
  const { getTodayFocusTime, mode, secondsLeft, isRunning } = useTimer();

  const [currentMinutes, setCurrentMinutes] = useState(0);
  const [currentSeconds, setCurrentSeconds] = useState(0);

  const [recentItem, setRecentItem] = useState(null);
  const [shortcuts, setShortcuts] = useState([]);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  /* ⭐ Fetch Recent Item Logic */
  useEffect(() => {
    if (!currentUser) return;

    const fetchData = async () => {
      try {
        const wsQuery = query(
          collection(db, "workspaces"),
          or(
            where("userId", "==", currentUser.uid),
            where("members", "array-contains", currentUser.email)
          )
        );
        const wsSnap = await getDocs(wsQuery);

        if (!wsSnap.empty) {
          const workspaces = wsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          workspaces.sort((a, b) => {
            const timeA = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
            const timeB = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
            return timeB - timeA;
          });
          setRecentItem({ type: "workspace", data: workspaces[0] });
        } else {
          const tQuery = query(
            collection(db, "tasks"),
            where("userId", "==", currentUser.uid)
          );
          const tSnap = await getDocs(tQuery);

          let tasks = tSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          tasks = tasks.filter((t) => t.status !== "completed" && t.dueDate);
          tasks.sort((a, b) => {
            const da = a.dueDate?.seconds || 0;
            const db = b.dueDate?.seconds || 0;
            return da - db;
          });

          if (tasks.length > 0) {
            setRecentItem({ type: "task", data: tasks[0] });
          } else {
            setRecentItem({ type: "empty" });
          }
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      }
    };
    fetchData();
  }, [currentUser]);

  /* ⭐ Fetch Shortcuts Logic */
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "users", currentUser.uid, "shortcuts"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedShortcuts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setShortcuts(fetchedShortcuts);
    });

    return () => unsubscribe();
  }, [currentUser]);

  /* ⭐ Timer Logic */
  const todayFocusTime = Math.floor((getTodayFocusTime?.() || 0) / 60);
  const totalSessionSeconds = mode === "pomodoro" ? 1500 : mode === "short" ? 300 : 900;
  const progress = isRunning
    ? (totalSessionSeconds - secondsLeft) / totalSessionSeconds
    : Math.min(todayFocusTime / 60, 1);

  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(() => {
        setCurrentMinutes(Math.floor(secondsLeft / 60));
        setCurrentSeconds(secondsLeft % 60);
      }, 500);
      return () => clearInterval(interval);
    } else {
      setCurrentMinutes(Math.floor(secondsLeft / 60));
      setCurrentSeconds(secondsLeft % 60);
    }
  }, [secondsLeft, isRunning]);

  /* ⭐ Handlers */
  const handleRecentClick = () => {
    if (recentItem?.type === "workspace") {
      setActiveWorkspace(recentItem.data);
      setActiveTab("workspace");
    } else if (recentItem?.type === "task") {
      setActiveTab("tasks");
    } else {
      setActiveWorkspace(null);
      setActiveTab("workspace");
    }
  };

  const handleAddShortcut = async (typeId) => {
    setIsAddMenuOpen(false);
    if (!currentUser) return;
    try {
      await addDoc(collection(db, "users", currentUser.uid, "shortcuts"), {
        type: typeId,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to add shortcut", err);
    }
  };

  const handleDeleteShortcut = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Remove this shortcut?")) return;
    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "shortcuts", id));
    } catch (err) {
      console.error("Failed to delete shortcut", err);
    }
  };

  const handleShortcutClick = (type) => {
    if (type === "workspace") {
      setActiveWorkspace(null); // Just go to the list
      setActiveTab("workspace");
    } else {
      setActiveTab(type);
    }
  };

  /* ⭐ Render Helpers */
  const renderRecentCardContent = () => {
    if (recentItem?.type === "workspace") {
      const ws = recentItem.data;
      const memberCount = ws.members ? ws.members.length : 0;
      return (
        <div className="recent-card-inner">
          <h3>📂 Recent Workspace</h3>
          <div className="bg-icon-large" style={{ fontSize: "48px", position: "static", marginBottom: "10px", opacity: "0.8", filter: "none" }}>
            {ws.icon || "📁"}
          </div>
          <p className="workspace-name-display" style={{ marginTop: "0", fontSize: "1.2rem", textAlign: "center" }}>
            {ws.name}
          </p>
          <div className="workspace-meta" style={{ marginTop: "8px" }}>
            <span>{memberCount + 1} Members</span>
          </div>
        </div>
      );
    } else if (recentItem?.type === "task") {
      const t = recentItem.data;
      return (
        <>
          <h3 style={{ color: "#e53e3e" }}>🔥 Upcoming Task</h3>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "4px" }}>
              {t.title}
            </p>
            <p style={{ fontSize: "0.9rem", color: "#718096" }}>
              {formatDate(t.dueDate)}
            </p>
          </div>
        </>
      );
    } else {
      return (
        <>
          <h3>👥 My Projects</h3>
          <p style={{ color: "#a0aec0" }}>No recent activity</p>
        </>
      );
    }
  };

  const getRecentHoverText = () => {
    if (recentItem?.type === "workspace") return "Open Workspace";
    if (recentItem?.type === "task") return "Check Tasks";
    return "Create Workspace";
  };

  return (
    <div className="dashboard-home">
      <header className="dashboard-welcome-header">
        <div className="dashboard-date-pill">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
        <h1 className="dashboard-welcome-title">
          Hello, {currentUser?.displayName || currentUser?.email?.split('@')[0]}! <span className="wave-emoji">👋</span>
        </h1>
        <p className="dashboard-welcome-subtitle">
          Ready to focus? Here's your summary for today.
        </p>
      </header>

      <div className="cards">

        {/* 1. Dynamic Recent Card */}
        <div
          className="card home-ws-card"
          onClick={handleRecentClick}
        >
          <div className="card-normal-content">
            {renderRecentCardContent()}
          </div>
          <div className="card-hover-overlay">
            {getRecentHoverText()}
          </div>
        </div>

        {/* 2. Focus Timer Card */}
        <div
          className="card focus-card"
          onClick={() => setActiveTab("timer")}
        >
          <div className="card-normal-content">
            <h3>⏱️ Today's Focus Time</h3>
            <div className="progress-ring">
              <svg viewBox="0 0 36 36">
                <path
                  className="circle-bg"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="circle"
                  strokeDasharray={`${progress * 100}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="focus-time">
                {isRunning
                  ? `${currentMinutes.toString().padStart(2, "0")}:${currentSeconds.toString().padStart(2, "0")}`
                  : `${todayFocusTime} min`}
              </div>
            </div>
            <p className="mode">{mode === "pomodoro" ? "Focus Mode" : "Rest Mode"}</p>
          </div>

          <div className="card-hover-overlay">
            Go to timer
          </div>
        </div>

        {/* 3. User Shortcuts */}
        {shortcuts.map(shortcut => {
          const config = SHORTCUT_TYPES.find(t => t.id === shortcut.type) || SHORTCUT_TYPES[0];
          return (
            <div
              key={shortcut.id}
              className={`card shortcut-card ${config.class}`}
              onClick={() => handleShortcutClick(shortcut.type)}
            >
              <button
                className="shortcut-delete-btn"
                onClick={(e) => handleDeleteShortcut(e, shortcut.id)}
                title="Remove shortcut"
              >✕</button>

              <div className="card-normal-content">
                <h3>{config.label}</h3>
                <div className="shortcut-icon">{config.icon}</div>
                <p style={{ fontSize: "0.9rem", opacity: 0.8 }}>Click to open</p>
              </div>
            </div>
          );
        })}

        {/* 4. Add Button (Always Last) */}
        <div className="card add-shortcut-card" onClick={() => setIsAddMenuOpen(true)} title="Add Shortcut">
          <div className="add-plus-icon">+</div>
        </div>

      </div>

      {/* Selection Menu Modal */}
      {isAddMenuOpen && (
        <>
          <div className="shortcut-menu-overlay" onClick={() => setIsAddMenuOpen(false)}></div>
          <div className="shortcut-menu">
            <div className="menu-header">Select Page to Pin</div>
            {SHORTCUT_TYPES.map(type => (
              <button
                key={type.id}
                className="menu-item"
                onClick={() => handleAddShortcut(type.id)}
              >
                <span>{type.icon}</span> {type.label}
              </button>
            ))}
          </div>
        </>
      )}

    </div>
  );
}
