import { useState } from "react";
import KanbanCard from "./KanbanCard";
import "./KanbanColumn.css";

export default function KanbanColumn({
  title,
  status,
  tasks,
  onSelectTask,
  onDropTask,
  isSystem = false,
  onDeleteColumn,
  onUpdateColumn,
}) {
  const [isOver, setIsOver] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);

  const allowDrop = (e) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsOver(false);

    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;

    onDropTask?.(taskId, status);
  };

  const handleTitleSubmit = () => {
    if (editedTitle.trim() && editedTitle !== title) {
      onUpdateColumn?.(status, editedTitle);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleTitleSubmit();
    if (e.key === "Escape") {
      setEditedTitle(title);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={`kanban-column ${isOver ? "drop-over" : ""}`}
      onDragOver={allowDrop}
      onDragLeave={() => setIsOver(false)}
      onDrop={handleDrop}
    >
      <div className="kanban-column-header">
        <div className="kanban-title-area">
          {isEditing && !isSystem ? (
            <input
              autoFocus
              className="column-title-input"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={handleKeyDown}
            />
          ) : (
            <h3
              onClick={() => !isSystem && setIsEditing(true)}
              style={{ cursor: !isSystem ? "pointer" : "default" }}
            >
              {title}
            </h3>
          )}
        </div>

        <div className="kanban-header-right">
          <span className="count">{tasks.length}</span>
          {!isSystem && (
            <button
              className="delete-column-btn"
              onClick={() => onDeleteColumn?.(status)}
              title="Delete Column"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="kanban-column-body">
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            onClick={() => onSelectTask?.(task)}
          />
        ))}
      </div>
    </div>
  );
}

