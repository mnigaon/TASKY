// src/components/dashboard/WorkspaceTasksView.jsx

import { useState, useEffect } from "react";
import { db } from "../../firebase/firebase";
import { collection, query, onSnapshot, orderBy, deleteDoc, doc } from "firebase/firestore";
import Tasks from "./Tasks";
import "./WorkspaceTasksView.css";

export default function WorkspaceTasksView({ workspace, onBack }) {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "tasks"), orderBy("dueDate", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const filtered = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(task => task.workspaceId === workspace.id);
      setTasks(filtered);
    });
    return () => unsubscribe();
  }, [workspace]);

  const handleDeleteWorkspace = async () => {
    if (!window.confirm("Delete this workspace?")) return;
    await deleteDoc(doc(db, "workspaces", workspace.id));
    onBack();
  };

  return (
    <div className="workspace-tasks-view">
      <div className="workspace-header">
        <button onClick={onBack}>← Back</button>
        <h2>{workspace.name}</h2>
        <button className="delete-btn" onClick={handleDeleteWorkspace}>Delete</button>
      </div>
      <Tasks workspaceId={workspace.id} tasks={tasks} />
    </div>
  );
}
