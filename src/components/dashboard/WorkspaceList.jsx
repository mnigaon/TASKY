// src/components/dashboard/WorkspaceList.jsx
import React, { useState, useEffect } from "react";
import { db } from "../../firebase/firebase";
import { collection, addDoc, deleteDoc, doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../../firebase/AuthContext";
import WorkspaceCard from "./WorkspaceCard";
import "./WorkspaceList.css";

export default function WorkspaceList({ onSelectWorkspace }) {
  const { currentUser } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");

  // 🔹 실시간 워크스페이스 불러오기
  useEffect(() => {
    if (!currentUser) return;
    const q = collection(db, "workspaces");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((ws) => ws.userId === currentUser.uid);

      // pinned 먼저, 그 다음 알파벳순
      data.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return a.name.localeCompare(b.name);
      });

      setWorkspaces(data);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // 🔹 새 워크스페이스 생성
  const handleAddWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    if (workspaces.length >= 50) {
      alert("You can create up to 50 workspaces.");
      return;
    }

    await addDoc(collection(db, "workspaces"), {
      name: newWorkspaceName,
      userId: currentUser.uid,
      createdAt: serverTimestamp(),
      icon: "📁",
      pinned: false, // 새 워크스페이스는 기본적으로 unpinned
    });
    setNewWorkspaceName("");
  };

  // 🔹 워크스페이스 삭제
  const handleDeleteWorkspace = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this workspace?");
    if (!confirmDelete) return;
    await deleteDoc(doc(db, "workspaces", id));
  };

  // 🔹 핀 토글
  const handleTogglePin = async (workspace) => {
    await updateDoc(doc(db, "workspaces", workspace.id), {
      pinned: !workspace.pinned,
    });
  };

  return (
    <div className="workspace-list-container">
      <h2>Workspaces</h2>

      {/* 새 워크스페이스 입력 */}
      <div className="workspace-add">
        <input
          type="text"
          placeholder="New Workspace Name"
          value={newWorkspaceName}
          onChange={(e) => setNewWorkspaceName(e.target.value)}
        />
        <button onClick={handleAddWorkspace}>+</button>
      </div>

      {/* 워크스페이스 카드 목록 */}
      <div className="workspace-cards">
        {workspaces.map((ws) => (
          <WorkspaceCard
            key={ws.id}
            workspace={ws}
            onSelectWorkspace={onSelectWorkspace}
            onDeleteWorkspace={handleDeleteWorkspace}
            onTogglePin={handleTogglePin} // 핀 기능 전달
          />
        ))}
      </div>
    </div>
  );
}
