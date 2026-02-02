// src/components/dashboard/Dashboard.jsx
import { useAuth } from "../../firebase/AuthContext";
import { signOut } from "firebase/auth";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../../firebase/firebase";
import { doc, onSnapshot, collection, query, where, or } from "firebase/firestore";

import "./Dashboard.css";
import "@fontsource/chewy"; // Bubbly 로고 스타일 폰트

import DashboardHome from "./DashboardHome";
import WorkspaceList from "./WorkspaceList";
import Tasks from "./Tasks";
import TimerPage from "../timer/TimerPage";
import FloatingTimer from "../timer/FloatingTimer";
import DocsPage from "../docs/DocsPage";
import Settings from "../settings/Settings";
import KanbanPage from "../kanban/KanbanPage";
import CalendarView from "./CalendarView";
import WhiteboardPage from "../whiteboard/WhiteboardPage"; // ⭐ Added Whiteboard
import DiaryPage from "../diary/DiaryPage"; // 🎀 Added Diary
import logo from "../../assets/logo.png";
import Chat from "./Chat"; // ⭐ Global Chat

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  /* 🔹 Sidebar Toggle State */
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  /* 🔄 Tabs State (LocalStorage) */
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem("dashboard_activeTab") || "home");
  const [activeWorkspace, setActiveWorkspace] = useState(null);

  /* 💬 Global Persistent Chat State */
  const [chatState, setChatState] = useState({ isOpen: false, workspace: null });
  const [globalUnreadCount, setGlobalUnreadCount] = useState(0); // ⭐ Global Unread Count

  // Ref to access current chat state inside listeners without triggering re-subscription
  // This is CRITICAL to avoid "snapshot replay" and stale closures.
  const chatStateRef = useRef(chatState);
  useEffect(() => {
    chatStateRef.current = chatState;
  }, [chatState]);

  useEffect(() => {
    localStorage.setItem("dashboard_activeTab", activeTab);
  }, [activeTab]);

  /* ... (Existing useEffect for eviction check) ... */
  /* =================================================
    ⭐ 실시간 추방 감지 로직
 ================================================= */
  useEffect(() => {
    if (!currentUser || !activeWorkspace?.id || activeTab !== "workspace") return;

    // 현재 선택한 워크스페이스 문서를 감시
    const unsub = onSnapshot(doc(db, "workspaces", activeWorkspace.id), (snap) => {
      if (!snap.exists()) {
        alert(`The workspace "${activeWorkspace.name}" has been deleted.`);
        setActiveTab("home");
        setActiveWorkspace(null);
        return;
      }

      const data = snap.data();
      const isOwner = data.userId === currentUser.uid;
      const isMember = data.members && data.members.includes(currentUser.email);

      if (!isOwner && !isMember) {
        alert(`You are no longer a member of "${activeWorkspace.name}". Access to this workspace has been removed.`);
        setActiveTab("home");
        setActiveWorkspace(null);
      }
    });

    return () => unsub();
  }, [currentUser, activeWorkspace, activeTab]);

  /* 🔔 Global Background Sound & Badge Listener */
  useEffect(() => {
    if (!currentUser) return;

    const qWs = query(
      collection(db, "workspaces"),
      or(
        where("userId", "==", currentUser.uid),
        where("members", "array-contains", currentUser.email)
      )
    );

    let unsubMsg = null;
    let unsubStatus = null;

    const unsubWs = onSnapshot(qWs, async (wsSnap) => {
      const wsIds = wsSnap.docs.map(d => d.id);

      // Cleanup previous listeners
      if (unsubMsg) { unsubMsg(); unsubMsg = null; }
      if (unsubStatus) { unsubStatus(); unsubStatus = null; }

      if (wsIds.length === 0) {
        setGlobalUnreadCount(0);
        return;
      }

      // 2. Fetch Chat Status (Read Receipts)
      const qStatus = query(
        collection(db, "chat_status"),
        where("workspaceId", "in", wsIds.slice(0, 30))
      );

      // Shared Data Containers
      let localReadStatusMap = {};
      let localMessages = [];

      // Helper Calculation Function
      const recalculateUnread = () => {
        let totalUnread = 0;
        const currentChat = chatStateRef.current; // access ref

        localMessages.forEach(m => {
          if (m.senderEmail === currentUser.email) return;

          // ⭐ Check if this workspace is currently OPEN in chat
          // If so, we treat it as "read" logic (don't show badge) to prevent flashing
          if (currentChat.isOpen && currentChat.workspace?.id === m.workspaceId) return;

          // Identify Chat ID logic matching Tasks.jsx/Chat.jsx
          const targetChatId = (m.type === "direct") ? m.chatId : m.workspaceId;
          const lastRead = localReadStatusMap[targetChatId];

          if (lastRead && m.timestamp?.toDate() > lastRead) {
            totalUnread++;
          }
        });
        setGlobalUnreadCount(totalUnread);
      };

      unsubStatus = onSnapshot(qStatus, (statusSnap) => {
        const newMap = {};
        statusSnap.forEach(d => {
          if (d.id.startsWith(currentUser.uid)) {
            const chatIdPart = d.id.replace(`${currentUser.uid}_`, "");
            newMap[chatIdPart] = d.data().lastReadAt?.toDate() || new Date(0);
          }
        });
        localReadStatusMap = newMap;
        // ⭐ Trigger recalc when status updates (user read a message)
        recalculateUnread();
      });

      // 3. Listen to messages 
      const qMsg = query(
        collection(db, "messages"),
        where("workspaceId", "in", wsIds.slice(0, 30))
      );

      unsubMsg = onSnapshot(qMsg, (msgSnap) => {
        // Update local cache
        localMessages = msgSnap.docs.map(d => d.data());
        // ⭐ Trigger recalc when messages update
        recalculateUnread();

        // Sound Logic (New Messages Only)
        msgSnap.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            if (data.senderEmail === currentUser.email) return;
            const timeDiff = new Date() - (data.timestamp?.toDate() || new Date());
            if (timeDiff > 5000) return;
            const currentChat = chatStateRef.current; // access ref

            // ⭐ Unified Sound Logic
            // If the message is for the CURRENTLY OPEN chat, play 'swoosh' (reply sound)
            if (currentChat.isOpen && String(currentChat.workspace?.id) === String(data.workspaceId)) {
              const audio = new Audio("/message-swoosh.mp3");
              audio.volume = 0.5;
              audio.play().catch(() => { });
            } else {
              // Otherwise (closed or other room), play 'sound' (notification)
              const audio = new Audio("/message-sound.mp3");
              audio.volume = 0.6;
              audio.play().catch(() => { });
            }
          }
        });
      });
    });

    return () => {
      if (unsubMsg) unsubMsg();
      if (unsubStatus) unsubStatus();
      unsubWs();
    };
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  /* 💬 Global Chat Handlers */
  const handleToggleChat = (workspace) => {
    setChatState(prev => {
      // If currently open with SAME workspace, close it
      if (prev.isOpen && prev.workspace?.id === workspace.id) {
        return { isOpen: false, workspace: null };
      }
      // Otherwise open with new workspace
      return { isOpen: true, workspace };
    });
  };

  const renderContent = () => {
    if (activeTab === "workspace") {
      if (activeWorkspace) {
        return (
          <Tasks
            workspaceId={activeWorkspace.id}
            workspaceTitle={activeWorkspace.name}
            setActiveTab={setActiveTab}
            setActiveWorkspace={setActiveWorkspace}
            // 💬 Pass global chat props
            isChatOpen={chatState.isOpen && chatState.workspace?.id === activeWorkspace.id}
            onToggleChat={() => handleToggleChat(activeWorkspace)}
          />
        );
      } else {
        return (
          <WorkspaceList
            onSelectWorkspace={(ws) => setActiveWorkspace(ws)}
          />
        );
      }
    } else if (activeTab === "tasks") {
      return <Tasks setActiveTab={setActiveTab} setActiveWorkspace={setActiveWorkspace} />;
    } else if (activeTab === "kanban") {
      return <KanbanPage setActiveTab={setActiveTab} setActiveWorkspace={setActiveWorkspace} />;
    } else if (activeTab === "calendar") {
      return (
        <CalendarView
          setActiveTab={setActiveTab}
          setActiveWorkspace={setActiveWorkspace}
        />
      );
    } else if (activeTab === "docs") {
      return <DocsPage />;
    } else if (activeTab === "timer") {
      return <TimerPage />;
    } else if (activeTab === "whiteboard") {
      return <WhiteboardPage />;
    } else if (activeTab === "diary") {
      return <DiaryPage />;
    } else if (activeTab === "settings") {
      return <Settings />;
    } else if (activeTab === "home") {
      return (
        <DashboardHome
          setActiveTab={setActiveTab}
          setActiveWorkspace={setActiveWorkspace}
        />
      );
    } else {
      return null;
    }
  };

  return (
    <div className="dashboard">
      <h2
        className="logo fixed-logo"
        onClick={() => {
          if (!isSidebarOpen) {
            setIsSidebarOpen(true);
          } else {
            setActiveTab("home");
            setActiveWorkspace(null);
          }
        }}
        title="Click to Home / Open Menu"
      >
        <img src={logo} alt="Dayzzy Logo" className="logo-img" />
      </h2>

      {/* 모바일 오버레이 */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? "active" : ""}`}
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      <aside className={`sidebar ${!isSidebarOpen ? "closed" : ""}`}>
        <button className="close-sidebar-btn" onClick={() => setIsSidebarOpen(false)}>✕</button>

        {/* Spacer for fixed logo */}
        <div style={{ height: "60px", marginBottom: "30px" }}></div>

        <ul>
          <li
            className={activeTab === "tasks" ? "active" : ""}
            onClick={() => {
              setActiveTab("tasks");
              setActiveWorkspace(null);
              // 모바일에서 메뉴 클릭 시 사이드바 닫기
              if (window.innerWidth <= 768) setIsSidebarOpen(false);
            }}
          >
            Tasks
          </li>
          <li
            className={activeTab === "kanban" ? "active" : ""}
            onClick={() => {
              setActiveTab("kanban");
              setActiveWorkspace(null);
              if (window.innerWidth <= 768) setIsSidebarOpen(false);
            }}
          >
            Kanban
          </li>
          <li
            className={activeTab === "calendar" ? "active" : ""}
            onClick={() => {
              setActiveTab("calendar");
              setActiveWorkspace(null);
              if (window.innerWidth <= 768) setIsSidebarOpen(false);
            }}
          >
            Calendar
          </li>
          <li
            className={activeTab === "workspace" ? "active" : ""}
            onClick={() => {
              setActiveTab("workspace");
              setActiveWorkspace(null);
              if (window.innerWidth <= 768) setIsSidebarOpen(false);
            }}
          >
            Project
            {globalUnreadCount > 0 && (
              <span style={{
                marginLeft: 'auto',
                background: '#ff3b30',
                color: 'white',
                fontSize: '11px',
                fontWeight: 'bold',
                padding: '2px 8px',
                borderRadius: '12px',
                boxShadow: '0 2px 4px rgba(255, 59, 48, 0.4)'
              }}>
                {globalUnreadCount}
              </span>
            )}
          </li>
          <li
            className={activeTab === "docs" ? "active" : ""}
            onClick={() => {
              setActiveTab("docs");
              setActiveWorkspace(null);
              if (window.innerWidth <= 768) setIsSidebarOpen(false);
            }}
          >
            Docs
          </li>
          <li
            className={activeTab === "whiteboard" ? "active" : ""}
            onClick={() => {
              setActiveTab("whiteboard");
              if (window.innerWidth <= 768) setIsSidebarOpen(false);
            }}
          >
            Whiteboard
          </li>
          <li
            className={activeTab === "timer" ? "active" : ""}
            onClick={() => {
              setActiveTab("timer");
              setActiveWorkspace(null);
              if (window.innerWidth <= 768) setIsSidebarOpen(false);
            }}
          >
            Timer
          </li>
          <li
            className={activeTab === "diary" ? "active" : ""}
            onClick={() => {
              setActiveTab("diary");
              setActiveWorkspace(null);
              if (window.innerWidth <= 768) setIsSidebarOpen(false);
            }}
          >
            Diary
          </li>
          <li
            className={`${activeTab === "settings" ? "active" : ""} settings-btn`}
            onClick={() => {
              setActiveTab("settings");
              if (window.innerWidth <= 768) setIsSidebarOpen(false);
            }}
          >
            Settings
          </li>
          <li onClick={handleLogout} className="logout-btn">
            Logout
          </li>
        </ul>
      </aside>

      <main className="main-content">
        {renderContent()}
      </main>

      <FloatingTimer onClick={() => setActiveTab("timer")} />

      {/* 💬 Global Persistent Chat */}
      {chatState.isOpen && chatState.workspace && (
        <Chat
          workspace={chatState.workspace}
          currentUser={currentUser}
          onClose={() => setChatState({ isOpen: false, workspace: null })}
        />
      )}
    </div>
  );
}
