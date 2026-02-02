// src/components/dashboard/CommentEditModal.jsx

import { useState } from "react";
import ReactDOM from "react-dom";
import { db, storage } from "../../firebase/firebase";
import {
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import "./TaskModal.css";

export default function CommentEditModal({
  taskId,
  comment,
  currentUser,
  onClose,
}) {
  const [text, setText] = useState(comment.text);

  /* ⭐ 파일 상태 */
  const [file, setFile] = useState(null);
  const [removeOldFile, setRemoveOldFile] = useState(false);

  /* =========================
     저장
  ========================= */
  const handleSave = async () => {
    let fileUrl = comment.attachmentUrl || "";
    let fileName = comment.attachmentName || "";

    /* ⭐ 기존 파일 삭제 체크 */
    if (removeOldFile) {
      fileUrl = "";
      fileName = "";
    }

    /* ⭐ 새 파일 업로드 시 교체 */
    if (file) {
      const r = ref(
        storage,
        `comments/${currentUser.uid}/${Date.now()}_${file.name}`
      );

      await uploadBytes(r, file);
      fileUrl = await getDownloadURL(r);
      fileName = file.name;
    }

    await updateDoc(
      doc(db, "tasks", taskId, "comments", comment.id),
      {
        text,
        attachmentUrl: fileUrl,
        attachmentName: fileName,
      }
    );

    onClose();
  };

  /* =========================
     삭제
  ========================= */
  const handleDelete = async () => {
    if (!window.confirm("Would you like to delete this comment?")) return;

    await deleteDoc(doc(db, "tasks", taskId, "comments", comment.id));
    onClose();
  };

  /* =========================
     Enter = Save
  ========================= */
  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10001 }}>
      <div className="modal-content" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-paper">
          <header className="modal-workspace-header">
            💬 <span>Edit Comment</span>
          </header>

          <div className="task-modal-scroll-area" style={{ padding: '30px', overflow: 'hidden' }}>
            {/* Textarea */}
            <div className="input-group">
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '8px', display: 'block' }}>YOUR THOUGHTS</label>
              <textarea
                className="task-desc-textarea"
                value={text}
                rows={4}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Edit your comment..."
              />
            </div>

            {/* Attachment Management */}
            <div className="file-section">
              {comment.attachmentUrl && !removeOldFile && (
                <div className="file-list">
                  <div className="file-item">
                    <a
                      href={comment.attachmentUrl}
                      className="file-name"
                      target="_blank"
                      rel="noreferrer"
                      title={comment.attachmentName}
                    >
                      📎 {comment.attachmentName}
                    </a>
                    <button
                      className="remove-file-btn"
                      onClick={() => setRemoveOldFile(true)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              <div className="upload-button-wrapper" style={{ marginTop: '8px' }}>
                <label className="custom-file-upload">
                  <span>{file ? "📄 " + file.name : "➕ Change File"}</span>
                  <input
                    type="file"
                    className="hidden-file-input"
                    onChange={(e) => setFile(e.target.files[0])}
                  />
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="task-actions" style={{ marginTop: '16px' }}>
              <button className="btn ghost" onClick={onClose}>
                Cancel
              </button>
              <button className="btn danger" onClick={handleDelete}>
                Delete
              </button>
              <button className="btn primary" onClick={handleSave}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
