// src/components/dashboard/Tasks.jsx
import { useState, useEffect, useMemo } from "react";
import { db } from "../../firebase/firebase";
import {
  collection,
  deleteDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  getDocs,
  where,
  or,
} from "firebase/firestore";
import { useAuth } from "../../firebase/AuthContext";
import { formatDate } from "../../utils/dateFormat";
import TaskModal from "./TaskModal";
import TodaysBriefingWidget from "./TodaysBriefingWidget";
import "./Tasks.css";

export default function Tasks({
  workspaceId = null,
  workspaceTitle = null,
  setActiveTab,
  setActiveWorkspace,
  isChatOpen,
  onToggleChat
}) {
  const { currentUser } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [workspaceMap, setWorkspaceMap] = useState({});
  const [currentWorkspace, setCurrentWorkspace] = useState(null);

  /* 워크스페이스 이름 수정 */
  const [realtimeTitle, setRealtimeTitle] = useState(workspaceTitle);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState("");

  /* 채팅 알림 */
  const [totalUnread, setTotalUnread] = useState(0);

  /* 필터/정렬 상태 */
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [workspaceFilter, setWorkspaceFilter] = useState("all");
  const [sortType, setSortType] = useState("dueAsc");

  // 1. 워크스페이스 실시간 정보 및 타이틀
  useEffect(() => {
    if (!workspaceId) {
      setRealtimeTitle(null);
      setCurrentWorkspace(null);
      return;
    }

    setRealtimeTitle(workspaceTitle);

    const unsub = onSnapshot(doc(db, "workspaces", workspaceId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRealtimeTitle(data.name);
        setCurrentWorkspace({ id: docSnap.id, ...data });
      }
    });

    return () => unsub();
  }, [workspaceId, workspaceTitle]);

  // 2. 워크스페이스 이름 수정 핸들러
  const handleTitleClick = () => {
    if (!workspaceId) return;
    setIsEditingTitle(true);
    setEditingTitle(realtimeTitle || workspaceTitle);
  };

  const handleTitleSave = async () => {
    if (!editingTitle.trim()) return setIsEditingTitle(false);

    try {
      await updateDoc(doc(db, "workspaces", workspaceId), {
        name: editingTitle,
        updatedAt: serverTimestamp()
      });
      setIsEditingTitle(false);
    } catch (err) {
      console.error("Failed to update workspace name", err);
      alert("Failed to update name 😢");
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === "Enter") handleTitleSave();
    if (e.key === "Escape") setIsEditingTitle(false);
  };

  // 3. 채팅 알림 (Unread Count)
  useEffect(() => {
    if (!workspaceId || !currentUser?.uid) {
      setTotalUnread(0);
      return;
    }

    const qMessages = query(collection(db, "messages"), where("workspaceId", "==", workspaceId));
    const qStatus = query(collection(db, "chat_status"), where("workspaceId", "==", workspaceId));

    let allMsgs = [];
    const unsubMsgs = onSnapshot(qMessages, (snap) => {
      allMsgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      calculateTotal();
    });

    const unsubStatus = onSnapshot(qStatus, () => calculateTotal());

    const calculateTotal = async () => {
      const statusSnap = await getDocs(qStatus);
      const readStatusMap = {};
      statusSnap.forEach(d => {
        if (d.id.startsWith(currentUser.uid)) {
          const cid = d.id.replace(`${currentUser.uid}_`, "");
          readStatusMap[cid] = d.data().lastReadAt?.toDate() || new Date(0);
        }
      });

      let total = 0;
      allMsgs.forEach(m => {
        const targetChatId = (m.type === "direct") ? m.chatId : workspaceId;
        const lastRead = readStatusMap[targetChatId];

        if (lastRead && m.senderEmail?.toLowerCase() !== currentUser.email?.toLowerCase()) {
          if (m.timestamp?.toDate() > lastRead) {
            total++;
          }
        }
      });
      setTotalUnread(total);
    };

    return () => {
      unsubMsgs();
      unsubStatus();
    };
  }, [workspaceId, currentUser, isChatOpen]);

  // 4. 워크스페이스 목록 로딩 (Owner/Member)
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "workspaces"),
      or(
        where("userId", "==", currentUser.uid),
        where("members", "array-contains", currentUser.email.toLowerCase())
      )
    );

    const unsub = onSnapshot(q, (snap) => {
      const map = {};
      snap.forEach((d) => {
        const data = d.data();
        map[d.id] = data.name;
        map[d.id + "_ownerId"] = data.userId;
        map[d.id + "_isCollaborative"] = (data.members && data.members.length > 0) || data.userId !== currentUser.uid;
      });
      setWorkspaceMap(map);
    });

    return () => unsub();
  }, [currentUser]);

  // 5. 실시간 Tasks 로딩
  useEffect(() => {
    if (!currentUser) return;

    let q;
    if (workspaceId) {
      q = query(collection(db, "tasks"), where("workspaceId", "==", workspaceId));
    } else {
      const allWsIds = Object.keys(workspaceMap).filter(key => !key.endsWith("_ownerId") && !key.endsWith("_isCollaborative"));

      if (allWsIds.length > 0) {
        q = query(
          collection(db, "tasks"),
          or(
            where("userId", "==", currentUser.uid),
            where("workspaceId", "in", allWsIds.slice(0, 30))
          )
        );
      } else {
        q = query(collection(db, "tasks"), where("userId", "==", currentUser.uid));
      }
    }

    return onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => {
        const taskData = d.data();
        const wsId = taskData.workspaceId;
        const isShared = wsId && workspaceMap[wsId + "_isCollaborative"];

        return {
          id: d.id,
          ...taskData,
          isSharedTask: isShared
        };
      });
      setTasks(data);
    });
  }, [currentUser, workspaceId, workspaceMap]);

  // 6. 필터링 및 정렬
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    if (searchText) {
      result = result.filter((t) =>
        t.title?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (workspaceFilter !== "all") {
      if (workspaceFilter === "individual") {
        result = result.filter((t) => !t.workspaceId);
      } else {
        result = result.filter((t) => t.workspaceId === workspaceFilter);
      }
    }

    result.sort((a, b) => {
      const da = a.dueDate?.toDate?.()?.getTime?.() || 0;
      const db = b.dueDate?.toDate?.()?.getTime?.() || 0;

      if (sortType === "dueAsc") return da - db;
      if (sortType === "dueDesc") return db - da;
      return 0;
    });

    return result;
  }, [tasks, searchText, statusFilter, workspaceFilter, sortType]);

  // 7. 통계 및 긴급 태스크
  const wsStats = useMemo(() => {
    if (!workspaceId) return null;
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "completed").length;
    const inProgress = tasks.filter(t => t.status === "progress").length;
    const waiting = tasks.filter(t => t.status === "pending").length;
    const progress = total > 0 ? (completed / total) * 100 : 0;
    return { total, completed, inProgress, waiting, progress };
  }, [tasks, workspaceId]);

  const urgentTask = useMemo(() => {
    if (!workspaceId) return null;
    const pendingTasks = tasks.filter(t => t.status !== "completed" && t.dueDate);
    if (pendingTasks.length === 0) return null;
    return pendingTasks.sort((a, b) => {
      const da = a.dueDate?.toDate?.()?.getTime?.() || 0;
      const db = b.dueDate?.toDate?.()?.getTime?.() || 0;
      return da - db;
    })[0];
  }, [tasks, workspaceId]);

  // 8. 태스크 삭제
  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this task? 🗑️")) return;
    await deleteDoc(doc(db, "tasks", id));
  };

  // 9. 태스크 완료 토글 (위젯용)
  const handleToggleComplete = async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await updateDoc(doc(db, "tasks", task.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Failed to toggle task status:", error);
    }
  };


  const isShared = currentWorkspace && (currentWorkspace.userId !== currentUser.uid || (currentWorkspace.members && currentWorkspace.members.length > 0));

  return (
    <div className={`tasks-page-layout ${workspaceId ? 'with-sidebar' : ''}`}>
      <div className="tasks">
        <div className="workspace-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          {isEditingTitle ? (
            <div style={{ flex: 1 }}>
              <input
                className="workspace-title-edit-input"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
                autoFocus
              />
            </div>
          ) : (
            <h3
              onClick={handleTitleClick}
              style={{ cursor: workspaceId ? "pointer" : "default" }}
              title={workspaceId ? "Click to edit name" : ""}
              className="workspace-editable-header"
            >
              {workspaceId ? (
                <>
                  📁 {realtimeTitle || workspaceTitle}
                  <span className="edit-hint-icon">✏️</span>
                </>
              ) : (
                "All Tasks"
              )}
            </h3>
          )}

          <div className="header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              className="btn primary"
              style={{ padding: '8px 16px', fontSize: '1rem' }}
              onClick={() => setSelectedTask({
                title: "",
                description: "",
                status: "pending",
                workspaceId,
                userId: currentUser.uid
              })}
            >
              + Add Task
            </button>

            {/* ⭐ 채팅 버튼 (공동 작업 프로젝트인 경우에만 표시) */}
            {workspaceId && isShared && (
              <button
                className="chat-toggle-btn"
                onClick={onToggleChat}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #007aff 0%, #00c6ff 100%)',
                  color: 'white',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)',
                  position: 'relative'
                }}
              >
                💬 {isChatOpen ? "Close Chat" : "Open Chat"}
                {!isChatOpen && totalUnread > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    background: '#ff3b30',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: '700',
                    minWidth: '20px',
                    height: '20px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    boxShadow: '0 2px 6px rgba(255, 59, 48, 0.5)',
                    border: '2px solid white'
                  }}>
                    {totalUnread}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ================= 필터 바 (Index Tabs & Sticky Search) ================= */}
        <div className="tasks-controls-wrapper">
          <div className="tasks-filter-tabs">
            <button
              className={`filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
            <button
              className={`filter-tab pending ${statusFilter === 'pending' ? 'active' : ''}`}
              onClick={() => setStatusFilter('pending')}
            >
              Todo
            </button>
            <button
              className={`filter-tab progress ${statusFilter === 'progress' ? 'active' : ''}`}
              onClick={() => setStatusFilter('progress')}
            >
              In-Progress
            </button>
            <button
              className={`filter-tab completed ${statusFilter === 'completed' ? 'active' : ''}`}
              onClick={() => setStatusFilter('completed')}
            >
              Done
            </button>
          </div>

          <div className="tasks-secondary-filters">
            <div className="search-sticker">
              <input
                placeholder="Search..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <span className="search-icon">🔍</span>
            </div>

            <div className="select-wrapper">
              <select value={workspaceFilter} onChange={(e) => setWorkspaceFilter(e.target.value)}>
                <option value="all">All Workspaces</option>
                {Object.entries(workspaceMap)
                  .filter(([id]) => !id.includes("_"))
                  .map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
              </select>
            </div>

            <div className="select-wrapper">
              <select value={sortType} onChange={(e) => setSortType(e.target.value)}>
                <option value="dueAsc">Oldest First</option>
                <option value="dueDesc">Newest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* ================= 리스트 ================= */}
        <ul className="tasks-list">
          {filteredTasks.map((task) => {
            const workspaceName = task.workspaceId ? workspaceMap[task.workspaceId] : "Individual";

            const header = task.workspaceId
              ? `📁 ${workspaceName}`
              : "👤 Individual";

            return (
              <li
                className={`task-item ${task.status} ${task.isSharedTask ? 'shared' : ''}`}
                key={task.id}
                onClick={() => setSelectedTask(task)}
              >  <span>

                  <div
                    className={`task-card-header ${task.workspaceId ? 'clickable' : ''}`}
                    onClick={(e) => {
                      if (task.workspaceId && setActiveTab && setActiveWorkspace) {
                        e.stopPropagation();
                        setActiveWorkspace({ id: task.workspaceId, name: workspaceMap[task.workspaceId] });
                        setActiveTab("workspace");
                      }
                    }}
                  >
                    {header}
                  </div>

                  <div className="task-title-row">
                    <div className="task-title-wrapper">
                      <strong>{task.title}</strong>
                    </div>

                    <span className={`status-pill ${task.status}`}>
                      {task.status === "pending" && "Todo"}
                      {task.status === "progress" && "In Progress"}
                      {task.status === "completed" && "Done"}
                    </span>
                  </div>

                  {task.description && <p>{task.description}</p>}

                  {formatDate(task.dueDate) && (
                    <small>Due: {formatDate(task.dueDate)}</small>
                  )}

                  {task.attachmentUrl && (
                    <a
                      href={task.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      📎 {task.attachmentName}
                    </a>
                  )}

                </span>

                <div className="task-buttons">
                  {/* 🔹 본인이 만든 태스크이거나, 해당 워크스페이스의 주인인 경우 삭제 가능 */}
                  {(task.userId === currentUser.uid || (task.workspaceId && workspaceMap[task.workspaceId + "_ownerId"] === currentUser.uid)) && (
                    <button className="delete-btn" onClick={(e) => handleDelete(e, task.id)}>Delete</button>
                  )}

                  {/* ⭐ 클래스명을 고유하게 변경하여 충돌 방지 */}
                  {task.isSharedTask && <span className="status-badge-shared">Shared Task</span>}
                </div>
              </li>
            );
          })}
        </ul>

        {
          selectedTask && (
            <TaskModal
              task={selectedTask}
              currentUser={currentUser}
              workspaceMap={workspaceMap}
              onClose={() => setSelectedTask(null)}
              setActiveTab={setActiveTab}
              setActiveWorkspace={setActiveWorkspace}
            />
          )
        }
      </div >

      {/* 🔴 RIGHT SECTION SIDEBAR (Same as WorkspaceList) */}
      {!workspaceId ? (
        <aside className="workspace-right-section task-sidebar">
          <TodaysBriefingWidget
            tasks={tasks}
            onToggleTask={handleToggleComplete}
            onTaskClick={setSelectedTask}
          />

          {/* Task Statistics Grid for Individual */}
          {wsStats && (
            <div className="category-section" style={{ marginTop: '20px' }}>
              <h4 className="section-title">My Stats</h4>
              <div className="category-grid">
                <div className="cat-card total">
                  <span className="count">{wsStats.total}</span>
                  <span className="label">Total</span>
                </div>
                <div className="cat-card completed">
                  <span className="count">{wsStats.completed}</span>
                  <span className="label">Done</span>
                </div>
                <div className="cat-card waiting">
                  <span className="count">{wsStats.waiting}</span>
                  <span className="label">Todo</span>
                </div>
              </div>
            </div>
          )}
        </aside>
      ) : (wsStats && (
        <aside className="workspace-right-section task-sidebar">
          {/* Selected Project Card */}
          <div className="stats-card selected-project-info">
            <span className="label">Current Project</span>
            <h3 className="project-title">{realtimeTitle || workspaceTitle}</h3>
            <div className="project-badge">Active</div>
          </div>

          {/* Urgent Task Card */}
          {urgentTask && (
            <div className="stats-card urgent-task-info">
              <span className="urgent-badge">🔥 Urgent Task</span>
              <p className="task-title">{urgentTask.title}</p>
              <div className="task-meta">
                <span>📅 {formatDate(urgentTask.dueDate)}</span>
              </div>
            </div>
          )}

          {/* Circular Progress */}
          <div className="stats-card progress-circle-info">
            <div className="circular-progress-container">
              <svg viewBox="0 0 36 36" className="circular-chart">
                <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path
                  className="circle"
                  strokeDasharray={`${wsStats.progress}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <text x="18" y="20.35" className="percentage">{Math.round(wsStats.progress)}%</text>
              </svg>
            </div>
          </div>

          {/* Task Statistics Grid */}
          <div className="category-section">
            <h4 className="section-title">Statistics</h4>
            <div className="category-grid">
              <div className="cat-card total">
                <span className="count">{wsStats.total}</span>
                <span className="label">Total</span>
              </div>
              <div className="cat-card completed">
                <span className="count">{wsStats.completed}</span>
                <span className="label">Completed</span>
              </div>
              <div className="cat-card progress">
                <span className="count">{wsStats.inProgress}</span>
                <span className="label">Active</span>
              </div>
              <div className="cat-card waiting">
                <span className="count">{wsStats.waiting}</span>
                <span className="label">Waiting</span>
              </div>
            </div>
          </div>
        </aside>
      ))}
    </div>
  );
}
