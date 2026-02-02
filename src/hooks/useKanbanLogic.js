import { useState, useEffect } from "react";
import {
    collection,
    onSnapshot,
    addDoc,
    doc,
    updateDoc,
    query,
    where,
    writeBatch,
    or,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "../firebase/AuthContext";

const SYSTEM_COLUMNS = [
    { id: "pending", title: "To-Do" },
    { id: "progress", title: "In Progress" },
    { id: "completed", title: "Done" },
    { id: "archived", title: "Archived" } // Added Archived logic potentially
];

export function useKanbanLogic({ workspaceId, categoryId }) {
    const { currentUser } = useAuth();

    const [tasks, setTasks] = useState([]);
    const [customColumns, setCustomColumns] = useState([]);

    /* =========================
       🔥 Tasks 구독
    ========================= */
    useEffect(() => {
        if (!currentUser) return;

        let unsubTasks = null;
        let unsubWorkspaces = null;

        // 1. 워크스페이스 실시간 감시 (협업 상태 추적용)
        const wsQuery = query(
            collection(db, "workspaces"),
            or(
                where("userId", "==", currentUser.uid),
                where("members", "array-contains", currentUser.email)
            )
        );

        unsubWorkspaces = onSnapshot(wsQuery, (wsSnap) => {
            const collaborativeWsIds = wsSnap.docs
                .filter(d => {
                    const data = d.data();
                    return (data.members && data.members.length > 0) || data.userId !== currentUser.uid;
                })
                .map(d => d.id);

            const allWsIds = wsSnap.docs.map(d => d.id);

            // 2. 태스크 쿼리 설정
            let q;
            if (workspaceId) {
                q = query(collection(db, "tasks"), where("workspaceId", "==", workspaceId));
            } else if (categoryId) {
                if (categoryId === "uncategorized") {
                    q = query(collection(db, "tasks"), where("categoryId", "==", ""), where("userId", "==", currentUser.uid));
                } else {
                    q = query(collection(db, "tasks"), where("categoryId", "==", categoryId));
                }
            } else {
                if (allWsIds.length > 0) {
                    q = query(
                        collection(db, "tasks"),
                        or(
                            where("userId", "==", currentUser.uid),
                            where("workspaceId", "in", allWsIds.slice(0, 30))
                        )
                    );
                } else {
                    q = query(collection(db, "tasks"), where("userId", "==", currentUser.uid));
                }
            }

            // 3. 리스너 연결
            if (unsubTasks) unsubTasks();
            unsubTasks = onSnapshot(q, (snap) => {
                const data = snap.docs.map(d => {
                    const taskData = d.data();
                    const isShared = taskData.workspaceId && collaborativeWsIds.includes(taskData.workspaceId);
                    return {
                        id: d.id,
                        ...taskData,
                        isSharedTask: isShared
                    };
                });
                setTasks(data);
            });
        }, (err) => console.error("Workspace listener error:", err));

        return () => {
            if (unsubTasks) unsubTasks();
            if (unsubWorkspaces) unsubWorkspaces();
        };
    }, [currentUser, workspaceId, categoryId]);

    /* =========================
       🔥 Columns 구독
    ========================= */
    useEffect(() => {
        if (!currentUser) return;

        let q;
        if (workspaceId) {
            q = query(collection(db, "columns"), where("workspaceId", "==", workspaceId));
        } else if (categoryId) {
            const targetCatId = categoryId === "uncategorized" ? "" : categoryId;
            q = query(
                collection(db, "columns"),
                where("userId", "==", currentUser.uid),
                where("categoryId", "==", targetCatId),
                where("workspaceId", "==", null)
            );
        } else {
            q = query(
                collection(db, "columns"),
                where("userId", "==", currentUser.uid),
                where("workspaceId", "==", null),
                where("categoryId", "==", "")
            );
        }

        const unsubscribe = onSnapshot(q, (snap) => {
            setCustomColumns(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }, (err) => console.error(err));

        return () => unsubscribe();
    }, [currentUser, workspaceId, categoryId]);

    /* =========================
       Handlers
    ========================= */
    const addColumn = async () => {
        const title = prompt("Enter the column name");
        if (!title || !title.trim()) return;

        await addDoc(collection(db, "columns"), {
            title: title.trim(),
            userId: currentUser.uid,
            workspaceId: workspaceId || null,
            categoryId: categoryId === "uncategorized" ? "" : (categoryId || ""),
        });
    };

    const deleteColumn = async (id) => {
        if (!window.confirm("Do you want to delete this column? All tasks in this column will be moved to 'To-Do'.")) return;

        try {
            const batch = writeBatch(db);
            const tasksToMove = tasks.filter(t => t.status === id);
            tasksToMove.forEach(task => {
                const taskRef = doc(db, "tasks", task.id);
                batch.update(taskRef, { status: "pending" });
            });

            const colRef = doc(db, "columns", id);
            batch.delete(colRef);
            await batch.commit();
        } catch (error) {
            console.error("Error deleting column:", error);
            alert("Failed to delete column properly.");
        }
    };

    const updateColumn = async (id, newTitle) => {
        if (!newTitle || !newTitle.trim()) return;
        await updateDoc(doc(db, "columns", id), {
            title: newTitle.trim(),
        });
    };

    const updateTaskStatus = async (taskId, status) => {
        await updateDoc(doc(db, "tasks", taskId), { status });
    };

    const getTasksByColumn = (colId) =>
        tasks.filter((t) => (t.status || "pending") === colId);

    /* Progress Calculation */
    const completedCount = tasks.filter(t => t.status === "completed").length;
    const totalCount = tasks.length;
    const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

    return {
        currentUser,
        tasks,
        customColumns,
        systemColumns: SYSTEM_COLUMNS.slice(0, 3), // Only 3 by default
        addColumn,
        deleteColumn,
        updateColumn,
        updateTaskStatus,
        getTasksByColumn,
        progressPercent
    };
}
