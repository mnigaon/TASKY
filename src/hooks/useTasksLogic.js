import { useState, useEffect, useMemo } from "react";
import { db } from "../firebase/firebase";
import {
    collection,
    deleteDoc,
    updateDoc,
    doc,
    onSnapshot,
    query,
    serverTimestamp,
    getDocs,
    where,
    or,
} from "firebase/firestore";
import { useAuth } from "../firebase/AuthContext";

export function useTasksLogic({ workspaceId, workspaceTitle, isChatOpen }) {
    const { currentUser } = useAuth();

    const [tasks, setTasks] = useState([]);
    const [selectedTask, setSelectedTask] = useState(null);
    const [workspaceMap, setWorkspaceMap] = useState({});
    const [currentWorkspace, setCurrentWorkspace] = useState(null);

    /* 워크스페이스 이름 수정 */
    const [realtimeTitle, setRealtimeTitle] = useState(workspaceTitle);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editingTitle, setEditingTitle] = useState("");

    /* 채팅 알림 */
    const [totalUnread, setTotalUnread] = useState(0);

    /* 필터/정렬 상태 */
    const [searchText, setSearchText] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [workspaceFilter, setWorkspaceFilter] = useState("all");
    const [sortType, setSortType] = useState("dueAsc");

    // 1. 워크스페이스 실시간 정보 및 타이틀
    useEffect(() => {
        if (!workspaceId) {
            setRealtimeTitle(null);
            setCurrentWorkspace(null);
            return;
        }

        setRealtimeTitle(workspaceTitle);

        const unsub = onSnapshot(doc(db, "workspaces", workspaceId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setRealtimeTitle(data.name);
                setCurrentWorkspace({ id: docSnap.id, ...data });
            }
        });

        return () => unsub();
    }, [workspaceId, workspaceTitle]);

    // 2. 워크스페이스 이름 수정 핸들러
    const handleTitleClick = () => {
        if (!workspaceId) return;
        setIsEditingTitle(true);
        setEditingTitle(realtimeTitle || workspaceTitle);
    };

    const handleTitleSave = async () => {
        if (!editingTitle.trim()) return setIsEditingTitle(false);

        try {
            await updateDoc(doc(db, "workspaces", workspaceId), {
                name: editingTitle,
                updatedAt: serverTimestamp()
            });
            setIsEditingTitle(false);
        } catch (err) {
            console.error("Failed to update workspace name", err);
            alert("Failed to update name 😢");
        }
    };

    const handleTitleKeyDown = (e) => {
        if (e.key === "Enter") handleTitleSave();
        if (e.key === "Escape") setIsEditingTitle(false);
    };

    // 3. 채팅 알림 (Unread Count)
    useEffect(() => {
        if (!workspaceId || !currentUser?.uid) {
            setTotalUnread(0);
            return;
        }

        const qMessages = query(collection(db, "messages"), where("workspaceId", "==", workspaceId));
        const qStatus = query(collection(db, "chat_status"), where("workspaceId", "==", workspaceId));

        let allMsgs = [];
        const unsubMsgs = onSnapshot(qMessages, (snap) => {
            allMsgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            calculateTotal();
        });

        const unsubStatus = onSnapshot(qStatus, () => calculateTotal());

        const calculateTotal = async () => {
            const statusSnap = await getDocs(qStatus);
            const readStatusMap = {};
            statusSnap.forEach(d => {
                if (d.id.startsWith(currentUser.uid)) {
                    const cid = d.id.replace(`${currentUser.uid}_`, "");
                    readStatusMap[cid] = d.data().lastReadAt?.toDate() || new Date(0);
                }
            });

            let total = 0;
            allMsgs.forEach(m => {
                const targetChatId = (m.type === "direct") ? m.chatId : workspaceId;
                const lastRead = readStatusMap[targetChatId];

                if (lastRead && m.senderEmail?.toLowerCase() !== currentUser.email?.toLowerCase()) {
                    if (m.timestamp?.toDate() > lastRead) {
                        total++;
                    }
                }
            });
            setTotalUnread(total);
        };

        return () => {
            unsubMsgs();
            unsubStatus();
        };
    }, [workspaceId, currentUser, isChatOpen]);

    // 4. 워크스페이스 목록 로딩 (Owner/Member)
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
            const map = {};
            snap.forEach((d) => {
                const data = d.data();
                map[d.id] = data.name;
                map[d.id + "_ownerId"] = data.userId;
                map[d.id + "_isCollaborative"] = (data.members && data.members.length > 0) || data.userId !== currentUser.uid;
            });
            setWorkspaceMap(map);
        });

        return () => unsub();
    }, [currentUser]);

    // 5. 실시간 Tasks 로딩
    useEffect(() => {
        if (!currentUser) return;

        let q;
        if (workspaceId) {
            q = query(collection(db, "tasks"), where("workspaceId", "==", workspaceId));
        } else {
            const allWsIds = Object.keys(workspaceMap).filter(key => !key.endsWith("_ownerId") && !key.endsWith("_isCollaborative"));

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

        return onSnapshot(q, (snap) => {
            const data = snap.docs.map((d) => {
                const taskData = d.data();
                const wsId = taskData.workspaceId;
                const isShared = wsId && workspaceMap[wsId + "_isCollaborative"];

                return {
                    id: d.id,
                    ...taskData,
                    isSharedTask: isShared
                };
            });
            setTasks(data);
        });
    }, [currentUser, workspaceId, workspaceMap]);

    // 6. 필터링 및 정렬
    const filteredTasks = useMemo(() => {
        let result = [...tasks];

        if (searchText) {
            result = result.filter((t) =>
                t.title?.toLowerCase().includes(searchText.toLowerCase())
            );
        }

        if (statusFilter !== "all") {
            result = result.filter((t) => t.status === statusFilter);
        }

        if (workspaceFilter !== "all") {
            if (workspaceFilter === "individual") {
                result = result.filter((t) => !t.workspaceId);
            } else {
                result = result.filter((t) => t.workspaceId === workspaceFilter);
            }
        }

        result.sort((a, b) => {
            const da = a.dueDate?.toDate?.()?.getTime?.() || 0;
            const db = b.dueDate?.toDate?.()?.getTime?.() || 0;

            if (sortType === "dueAsc") return da - db;
            if (sortType === "dueDesc") return db - da;
            return 0;
        });

        return result;
    }, [tasks, searchText, statusFilter, workspaceFilter, sortType]);

    // 7. 통계 및 긴급 태스크
    const wsStats = useMemo(() => {
        if (!workspaceId) return null;
        const total = tasks.length;
        const completed = tasks.filter(t => t.status === "completed").length;
        const inProgress = tasks.filter(t => t.status === "progress").length;
        const waiting = tasks.filter(t => t.status === "pending").length;
        const progress = total > 0 ? (completed / total) * 100 : 0;
        return { total, completed, inProgress, waiting, progress };
    }, [tasks, workspaceId]);

    const urgentTask = useMemo(() => {
        if (!workspaceId) return null;
        const pendingTasks = tasks.filter(t => t.status !== "completed" && t.dueDate);
        if (pendingTasks.length === 0) return null;
        return pendingTasks.sort((a, b) => {
            const da = a.dueDate?.toDate?.()?.getTime?.() || 0;
            const db = b.dueDate?.toDate?.()?.getTime?.() || 0;
            return da - db;
        })[0];
    }, [tasks, workspaceId]);

    // 8. 태스크 삭제
    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this task? 🗑️")) return;
        await deleteDoc(doc(db, "tasks", id));
    };

    return {
        currentUser,
        tasks,
        filteredTasks,
        selectedTask,
        setSelectedTask,
        workspaceMap,
        currentWorkspace,
        realtimeTitle,
        isEditingTitle,
        setIsEditingTitle,
        editingTitle,
        setEditingTitle,
        handleTitleClick,
        handleTitleSave,
        handleTitleKeyDown,
        totalUnread,
        searchText,
        setSearchText,
        statusFilter,
        setStatusFilter,
        workspaceFilter,
        setWorkspaceFilter,
        sortType,
        setSortType,
        wsStats,
        urgentTask,
        handleDelete
    };
}
