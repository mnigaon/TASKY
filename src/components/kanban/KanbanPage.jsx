import { useState, useEffect } from "react";
import { doc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useAuth } from "../../firebase/AuthContext";
import KanbanBoard from "./KanbanBoard";
import CategoryList from "./CategoryList"; // Import CategoryList
import TaskModal from "../dashboard/TaskModal";
import "./KanbanPage.css";

export default function KanbanPage({
  workspaceId = null,
  setActiveTab,
  setActiveWorkspace
}) {
  const { currentUser } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState(null); // Track selected category
  const [selectedTask, setSelectedTask] = useState(null);

  /* ✅ workspace 이름 매핑 */
  const [workspaceMap, setWorkspaceMap] = useState({});

  /* =========================
     workspace 목록 로딩
  ========================= */
  useEffect(() => {
    const load = async () => {
      const q = query(collection(db, "workspaces"), where("userId", "==", currentUser.uid));
      const snap = await getDocs(q);
      const map = {};

      snap.forEach((d) => {
        map[d.id] = d.data().name;
      });

      setWorkspaceMap(map);
    };

    load();
  }, []);

  /* =========================
     칸반 드롭 → status 변경
  ========================= */
  const handleDropTask = async (taskId, status) => {
    try {
      await updateDoc(doc(db, "tasks", taskId), { status });
    } catch (e) {
      console.error(e);
    }
  };

  /* =========================
     UI
  ========================= */
  return (
    <div className="kanban-page">
      <div className="kanban-header">
        <h2>
          {selectedCategory ? (
            <>
              <span
                className="back-arrow"
                onClick={() => setSelectedCategory(null)}
                style={{ cursor: 'pointer', marginRight: '10px', fontSize: '0.8em', color: '#888' }}
              >
                ◀ Categories
              </span>
              {selectedCategory.name} Board
            </>
          ) : (
            workspaceId ? "📁 Workspace Board" : "📂 My Categories"
          )}
        </h2>
      </div>

      {!selectedCategory && !workspaceId ? (
        <CategoryList onSelectCategory={setSelectedCategory} />
      ) : (
        <KanbanBoard
          workspaceId={workspaceId}
          categoryId={selectedCategory?.id} // Pass category ID
          onSelectTask={setSelectedTask}
          onDropTask={handleDropTask}
        />
      )}

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          currentUser={currentUser}
          workspaceTitle={
            selectedTask.workspaceId
              ? workspaceMap[selectedTask.workspaceId] || "Workspace"
              : "Individual"
          }
          workspaceMap={workspaceMap}
          setActiveTab={setActiveTab}
          setActiveWorkspace={setActiveWorkspace}
          categoryId={selectedCategory?.id} // Pass current category for new task default
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}

