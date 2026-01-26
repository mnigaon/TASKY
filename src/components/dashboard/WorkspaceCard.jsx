// src/components/dashboard/WorkspaceCard.jsx
import React from "react";
import "./WorkspaceList.css"; // CSS 포함

export default function WorkspaceCard({ workspace, onSelectWorkspace, onDeleteWorkspace, onTogglePin }) {
  if (!workspace) return null;

  return (
    <div
      className="workspace-card"
      onClick={() => onSelectWorkspace(workspace)}
    >
      <span className="icon">{workspace.icon || "📁"}</span>
      <span className="name">{workspace.name || "Unnamed Workspace"}</span>

      <div className="workspace-card-buttons">
        <button
          className="pin-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (onTogglePin) onTogglePin(workspace);
          }}
        >
          {workspace.pinned ? "📌" : "📍"}
        </button>

        <button
          className="delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (onDeleteWorkspace) onDeleteWorkspace(workspace.id);
          }}
        >
          X
        </button>
      </div>
    </div>
  );
}

