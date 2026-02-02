import React, { useState } from "react";
import "./WorkspaceList.css";
import MemberModal from "./MemberModal";
import { useAuth } from "../../firebase/AuthContext";

export default function WorkspaceCard({ workspace, onSelectWorkspace, onDeleteWorkspace, onTogglePin }) {
  const { currentUser } = useAuth();
  const [showMemberModal, setShowMemberModal] = useState(false);

  if (!workspace) return null;

  const isOwner = workspace.userId === currentUser.uid;
  const isShared = workspace.isShared || (workspace.members && workspace.members.length > 0);

  return (
    <>
      <div
        className={`workspace-card ${workspace.pinned ? 'pinned' : ''} ${isShared ? 'shared' : ''}`}
        onClick={() => onSelectWorkspace(workspace)}
      >
        {isShared && <div className="shared-badge">Co-op</div>}
        <span className="icon">{workspace.icon || "📁"}</span>
        <span className="name">
          {workspace.name || "Unnamed Workspace"}
          {!isOwner && <span className="lead-tag"> (Member)</span>}
        </span>

        {/* 📊 Progress Bar in Card */}
        <div className="workspace-card-progress">
          <span className="progress-text">{Math.round(workspace.progress || 0)}% Done</span>
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{ width: `${workspace.progress || 0}%` }}
            ></div>
          </div>
        </div>

        <div className="workspace-card-buttons" style={{ zIndex: 20 }}>
          {/* 멤버 관리 버튼 */}
          <button
            className="member-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowMemberModal(true);
            }}
            title="Manage Members"
          >
            👥
          </button>

          <button
            className="pin-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (onTogglePin) onTogglePin(workspace);
            }}
          >
            {workspace.pinned ? "📌" : "📍"}
          </button>

          {isOwner && (
            <button
              className="delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (onDeleteWorkspace) onDeleteWorkspace(workspace.id);
              }}
            >
              X
            </button>
          )}
        </div>
      </div>

      {showMemberModal && (
        <MemberModal
          workspace={workspace}
          currentUser={currentUser}
          onClose={() => setShowMemberModal(false)}
        />
      )}
    </>
  );
}

