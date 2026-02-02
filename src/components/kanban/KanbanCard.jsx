import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import "./KanbanCard.css";
import { formatDate } from "../../utils/dateFormat";

export default function KanbanCard({ task, onClick }) {
  const [title, setTitle] = useState(task.title);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setTitle(task.title);
  }, [task.title]);

  const onDragStart = (e) => {
    e.dataTransfer.setData("text/plain", task.id);
  };

  return (
    <div
      className={`kanban-card ${task.isSharedTask ? 'shared' : ''}`}
      draggable
      onDragStart={onDragStart}
      onClick={() => !editing && onClick?.()}
    >
      {/* ✅ 체크 → Done 이동 */}
      <input
        type="checkbox"
        checked={task.status === "completed"}
        onClick={(e) => e.stopPropagation()}
        onChange={async (e) => {
          e.stopPropagation();

          await updateDoc(doc(db, "tasks", task.id), {
            status: e.target.checked ? "completed" : "pending",
          });
        }}
      />

      {editing ? (
        <input
          value={title}
          autoFocus
          onChange={(e) => setTitle(e.target.value)}
          onBlur={async () => {
            setEditing(false);
            await updateDoc(doc(db, "tasks", task.id), { title });
          }}
        />
      ) : (
        <strong onDoubleClick={() => setEditing(true)}>{title}</strong>
      )}

      {task.dueDate && <span>📅 {formatDate(task.dueDate)}</span>}
    </div>
  );
}


