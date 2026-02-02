import { useEffect, useState } from "react";
import { db } from "../../../firebase/firebase";
import { useAuth } from "../../../firebase/AuthContext";
import {
  collection,
  onSnapshot,
  updateDoc,
  deleteDoc,
  addDoc,
  doc,
  query,
  where,
  or,
} from "firebase/firestore";

export default function WorkspaceCard() {
  const { currentUser } = useAuth();

  const [workspaces, setWorkspaces] = useState([]);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("📁");

  /* =========================
     실시간 로드
  ========================= */
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "workspaces"),
      or(
        where("userId", "==", currentUser.uid),
        where("members", "array-contains", currentUser.email)
      )
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }));

      setWorkspaces(data);
    });

    return unsub;
  }, [currentUser]);

  /* =========================
     이름 수정
  ========================= */
  const updateName = async (id, name) => {
    await updateDoc(doc(db, "workspaces", id), {
      name,
    });
  };

  /* =========================
     아이콘 수정
  ========================= */
  const updateIcon = async (id, icon) => {
    await updateDoc(doc(db, "workspaces", id), {
      icon,
    });
  };

  /* =========================
     핀 토글
  ========================= */
  const togglePin = async (ws) => {
    await updateDoc(doc(db, "workspaces", ws.id), {
      pinned: !ws.pinned,
    });
  };

  /* =========================
     삭제
  ========================= */
  const removeWorkspace = async (id) => {
    if (!window.confirm("Delete Workspace? 😈")) return;
    await deleteDoc(doc(db, "workspaces", id));
  };

  /* =========================
     생성
  ========================= */
  const createWorkspace = async () => {
    if (!newName.trim()) return;

    await addDoc(collection(db, "workspaces"), {
      name: newName,
      icon: newIcon || "📁",
      pinned: false,
      userId: currentUser.uid,
      createdAt: new Date(),
    });

    setNewName("");
    setNewIcon("📁");
  };

  if (!currentUser) return null;

  return (
    <div className="sticker-card">
      <h3>🗂 Workspace</h3>

      {/* =========================
         목록
      ========================= */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {workspaces.map((ws) => {
          const isOwner = ws.userId === currentUser.uid;

          return (
            <div
              key={ws.id}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                padding: "10px",
                background: "rgba(255,255,255,0.5)",
                border: "1px dashed #cbd5e0",
                borderRadius: "8px",
                opacity: isOwner ? 1 : 0.8,
              }}
            >
              {/* 아이콘 */}
              <input
                className="settings-emoji-input"
                value={ws.icon || "📁"}
                onChange={(e) => updateIcon(ws.id, e.target.value)}
                disabled={!isOwner}
                title={!isOwner ? "Only the leader can change the icon" : ""}
              />

              {/* 이름 */}
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  style={{ marginBottom: 0, border: "none", background: "transparent", fontWeight: "600" }}
                  value={ws.name + (isOwner ? "" : " (Member)")}
                  onChange={(e) => updateName(ws.id, e.target.value)}
                  disabled={!isOwner}
                  title={!isOwner ? "Only the leader can rename the workspace" : ""}
                />
              </div>

              {/* 핀 */}
              <button
                className="btn-ghost"
                onClick={() => togglePin(ws)}
                style={{ padding: "4px 8px", fontSize: "1.2rem" }}
              >
                {ws.pinned ? "📌" : "📍"}
              </button>

              {/* 삭제 (Leader 전용) */}
              {isOwner && (
                <button
                  className="btn-danger"
                  onClick={() => removeWorkspace(ws.id)}
                  style={{ padding: "6px 12px", fontSize: "0.9rem" }}
                >
                  Delete
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* =========================
         생성
      ========================= */}
      <div style={{ display: "flex", gap: 12, marginTop: 24, padding: "20px 0 0", borderTop: "2px dashed #edf2f7" }}>
        <input
          className="settings-emoji-input"
          value={newIcon}
          onChange={(e) => setNewIcon(e.target.value)}
          placeholder="📁"
        />

        <input
          placeholder="New workspace label..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          style={{ marginBottom: 0 }}
        />

        <button
          className="btn-primary"
          onClick={createWorkspace}
          style={{ whiteSpace: "nowrap" }}
        >
          Add Label
        </button>
      </div>
    </div>
  );
}
