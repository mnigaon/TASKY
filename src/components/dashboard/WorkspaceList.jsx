import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../firebase/firebase";
import { collection, addDoc, deleteDoc, doc, onSnapshot, updateDoc, serverTimestamp, query, where, or } from "firebase/firestore";
import { useAuth } from "../../firebase/AuthContext";
import WorkspaceCard from "./WorkspaceCard";
import "./WorkspaceList.css";
import { formatDate } from "../../utils/dateFormat";

export default function WorkspaceList({ onSelectWorkspace }) {
  const { currentUser } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [currentPage, setCurrentPage] = useState(0); // 🔹 페이지네이션 상태
  const ITEMS_PER_PAGE = 6; // 🔹 한 페이지당 6개 (3x2)

  // 🔹 1. 워크스페이스 실시간 감시
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "workspaces"),
      or(
        where("userId", "==", currentUser.uid),
        where("members", "array-contains", currentUser.email.toLowerCase())
      )
    );
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isShared: doc.data().userId !== currentUser.uid
      }));
      setWorkspaces(data);
    });
  }, [currentUser]);

  // 🔹 2. 태스크 실시간 감시 (통계 및 진행률용)
  useEffect(() => {
    if (!currentUser || workspaces.length === 0) {
      setTasks([]);
      return;
    }
    const wsIds = workspaces.map(w => w.id);
    // Firestore 'in' query limit is 30.
    const q = query(collection(db, "tasks"), where("workspaceId", "in", wsIds.slice(0, 30)));
    return onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [currentUser, workspaces]);

  // 🔹 3. 데이터 가공 (진행률 및 통계)
  const workspacesWithStats = useMemo(() => {
    return workspaces.map(ws => {
      const wsTasks = tasks.filter(t => t.workspaceId === ws.id);
      const total = wsTasks.length;
      const done = wsTasks.filter(t => t.status === "completed").length;
      const progress = total > 0 ? (done / total) * 100 : 0;
      return { ...ws, progress, taskCount: total };
    }).sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0);
    });
  }, [workspaces, tasks]);

  const selectedProject = workspacesWithStats[0] || null;

  const globalStats = useMemo(() => {
    const total = workspaces.length;
    let completed = 0;
    let inProgress = 0;
    let empty = 0;

    workspaces.forEach(ws => {
      const wsTasks = tasks.filter(t => t.workspaceId === ws.id);
      if (wsTasks.length === 0) {
        empty++;
      } else {
        const allCompleted = wsTasks.every(t => t.status === "completed");
        if (allCompleted) {
          completed++;
        } else {
          inProgress++;
        }
      }
    });

    return { total, completed, inProgress, empty };
  }, [workspaces, tasks]);

  const urgentTask = useMemo(() => {
    if (!selectedProject) return null;
    const wsTasks = tasks.filter(t => t.workspaceId === selectedProject.id && t.status !== "completed" && t.dueDate);
    if (wsTasks.length === 0) return null;
    return wsTasks.sort((a, b) => a.dueDate.seconds - b.dueDate.seconds)[0];
  }, [selectedProject, tasks]);

  // Actions
  const handleAddWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    await addDoc(collection(db, "workspaces"), {
      name: newWorkspaceName,
      userId: currentUser.uid,
      ownerEmail: currentUser.email,
      ownerName: currentUser.displayName || currentUser.email.split('@')[0],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      icon: "📁",
      pinned: false,
      members: [],
    });
    setNewWorkspaceName("");
  };

  const handleSelectWorkspace = async (workspace) => {
    try {
      await updateDoc(doc(db, "workspaces", workspace.id), { updatedAt: serverTimestamp() });
    } catch (err) { }
    onSelectWorkspace(workspace);
  };

  const handleDeleteWorkspace = async (id) => {
    if (window.confirm("Are you sure?")) await deleteDoc(doc(db, "workspaces", id));
  };

  const handleTogglePin = async (ws) => {
    await updateDoc(doc(db, "workspaces", ws.id), { pinned: !ws.pinned });
  };

  return (
    <div className="workspace-page-layout">
      {/* 🟢 LEFT SECTION (7) */}
      <div className="workspace-left-section">
        <header className="workspace-header-main">
          <h2>Projects</h2>
          <div className="workspace-add">
            <input
              type="text"
              placeholder="Start a new creative project..."
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
            />
            <button onClick={handleAddWorkspace}>+</button>
          </div>
        </header>

        <div className="workspace-cards">
          {workspacesWithStats
            .slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE)
            .map((ws) => (
              <WorkspaceCard
                key={ws.id}
                workspace={ws}
                onSelectWorkspace={handleSelectWorkspace}
                onDeleteWorkspace={handleDeleteWorkspace}
                onTogglePin={handleTogglePin}
              />
            ))}
          {workspaces.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📂</div>
              <h3 className="empty-title">No Projects Yet</h3>
              <p className="empty-description">
                Start your journey by creating your first project above!
              </p>
            </div>
          )}
        </div>

        {/* 🔹 페이지네이션 버튼 */}
        {workspacesWithStats.length > ITEMS_PER_PAGE && (
          <div className="pagination-controls">
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
            >
              ← Previous
            </button>
            <span className="page-info">
              Page {currentPage + 1} of {Math.ceil(workspacesWithStats.length / ITEMS_PER_PAGE)}
            </span>
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(workspacesWithStats.length / ITEMS_PER_PAGE) - 1, prev + 1))}
              disabled={currentPage >= Math.ceil(workspacesWithStats.length / ITEMS_PER_PAGE) - 1}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* 🔴 RIGHT SECTION (3) */}
      <aside className="workspace-right-section">
        {selectedProject ? (
          <>
            {/* Selected Project Card */}
            <div className="stats-card selected-project-info" onClick={() => handleSelectWorkspace(selectedProject)}>
              <span className="label">Last Activity</span>
              <h3 className="project-title">{selectedProject.name}</h3>
              <div className="project-badge">Active</div>
            </div>

            {/* Urgent Task Card (Moved Up) */}
            {urgentTask && (
              <div className="stats-card urgent-task-info">
                <span className="urgent-badge">🔥 Urgent Task</span>
                <p className="task-title">{urgentTask.title}</p>
                <div className="task-meta">
                  <span>📅 {formatDate(urgentTask.dueDate)}</span>
                </div>
              </div>
            )}

            {/* Circular Progress UI */}
            <div className="stats-card progress-circle-info">
              <div className="circular-progress-container">
                <svg viewBox="0 0 36 36" className="circular-chart">
                  <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path
                    className="circle"
                    strokeDasharray={`${selectedProject.progress}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <text x="18" y="20.35" className="percentage">{Math.round(selectedProject.progress)}%</text>
                </svg>
              </div>
            </div>

            {/* Global Categories */}
            <div className="category-section">
              <h4 className="section-title">Projects</h4>
              <div className="category-grid">
                <div className="cat-card total">
                  <span className="count">{globalStats.total}</span>
                  <span className="label">Total</span>
                </div>
                <div className="cat-card completed">
                  <span className="count">{globalStats.completed}</span>
                  <span className="label">Completed</span>
                </div>
                <div className="cat-card progress">
                  <span className="count">{globalStats.inProgress}</span>
                  <span className="label">Active</span>
                </div>
                <div className="cat-card waiting">
                  <span className="count">{globalStats.empty}</span>
                  <span className="label">Empty</span>
                </div>
              </div>
            </div>


          </>
        ) : (
          <div className="stats-empty">
            <div className="empty-icon">📊</div>
            <h3 className="empty-title">No Project Selected</h3>
            <p className="empty-description">
              Create or select a project to view detailed insights and statistics.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
