import { db, auth } from "../../../firebase/firebase";
import { useAuth } from "../../../firebase/AuthContext";
import {
  collection,
  getDocs,
  writeBatch,
  doc,
  query,
  where,
} from "firebase/firestore";
import { deleteUser } from "firebase/auth";

export default function DangerCard() {
  const { currentUser } = useAuth();

  if (!currentUser) return null;

  /* =========================
     🔥 전체 Tasks 삭제
  ========================= */
  const deleteAllTasks = async () => {
    const ok = window.confirm(
      "Delete all Tasks.\nIrreversible 😈 Continue?"
    );
    if (!ok) return;

    try {
      // 쿼리로 내 태스크만 가져오기 (절대 전체 조회 금지)
      const q = query(collection(db, "tasks"), where("userId", "==", currentUser.uid));
      const snap = await getDocs(q);

      const batch = writeBatch(db);

      snap.docs.forEach((d) => {
        batch.delete(doc(db, "tasks", d.id));
      });

      await batch.commit();

      alert("All tasks deleted successfully 💀");
    } catch (err) {
      console.error(err);
      alert("Deletion failed");
    }
  };

  /* =========================
     🔥 계정 삭제 (전체 wipe)
  ========================= */
  const deleteAccount = async () => {
    const ok = window.confirm(
      "⚠️ Deleting your account will erase all your data.\nAre you sure you want to leave?"
    );
    if (!ok) return;

    try {
      const batch = writeBatch(db);

      /* 1️⃣ tasks 삭제 */
      const tasksQuery = query(collection(db, "tasks"), where("userId", "==", currentUser.uid));
      const tasksSnap = await getDocs(tasksQuery);

      tasksSnap.docs.forEach((d) => {
        batch.delete(doc(db, "tasks", d.id));
      });

      /* 2️⃣ workspaces 삭제 */
      const wsQuery = query(collection(db, "workspaces"), where("userId", "==", currentUser.uid));
      const wsSnap = await getDocs(wsQuery);

      wsSnap.docs.forEach((d) => {
        batch.delete(doc(db, "workspaces", d.id));
      });

      await batch.commit(); // 여기서 DB 삭제는 끝내고

      /* 3️⃣ Firebase 계정 삭제 */
      await deleteUser(auth.currentUser);

      alert("Account deletion complete 👋");
    } catch (err) {
      console.error(err);

      if (err.code === "auth/requires-recent-login") {
        alert("For security reasons, please log in again and try once more. 🔐");
      } else {
        alert("Deletion failed");
      }
    }
  };

  return (
    <div className="sticker-card danger-sticker">
      <h3>⚠️ Danger Zone (Critical)</h3>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          className="btn-danger"
          onClick={deleteAllTasks}
        >
          Delete All Tasks
        </button>

        <button
          className="btn-danger"
          onClick={deleteAccount}
        >
          Close Account
        </button>
      </div>
    </div>
  );
}
