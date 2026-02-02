import { useState, useEffect } from "react";
import { db } from "../../firebase/firebase";
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where, serverTimestamp, orderBy } from "firebase/firestore";
import { useAuth } from "../../firebase/AuthContext";
import "./Whiteboard.css";

// 나중에 Canvas 컴포넌트를 이 페이지 안에서 조건부 렌더링하거나 라우팅으로 연결할 예정
import WhiteboardCanvas from "./WhiteboardCanvas"; // (다음 단계에서 생성)

export default function WhiteboardPage() {
    const { currentUser } = useAuth();
    const [whiteboards, setWhiteboards] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState("");

    // 선택된 화이트보드 (null이면 목록 화면, 객체면 캔버스 화면)
    const [selectedBoard, setSelectedBoard] = useState(null);

    /* =========================
       🔥 Firestore 로드
    ================================ */
    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, "whiteboards"),
            where("userId", "==", currentUser.uid)
            // orderBy("createdAt", "desc") // 복합 인덱스 이슈 방지를 위해 잠시 제거
        );

        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            // 클라이언트 사이드 정렬
            data.sort((a, b) => {
                const timeA = a.createdAt?.seconds || 0;
                const timeB = b.createdAt?.seconds || 0;
                return timeB - timeA;
            });
            setWhiteboards(data);
        });

        return unsub;
    }, [currentUser]);

    /* =========================
       🔥 생성
    ================================ */
    const handleCreate = async () => {
        if (!newName.trim()) return setIsCreating(false);

        try {
            await addDoc(collection(db, "whiteboards"), {
                userId: currentUser.uid,
                title: newName,
                createdAt: serverTimestamp(),
                imageData: null, // 초기엔 빈 캔버스
            });
            setIsCreating(false);
            setNewName("");
        } catch (err) {
            console.error("Error creating whiteboard:", err);
            alert("Failed to create whiteboard");
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") handleCreate();
        if (e.key === "Escape") setIsCreating(false);
    };

    /* =========================
       🔥 삭제
    ================================ */
    const handleDelete = async (e, id) => {
        e.stopPropagation();
        console.log("Attempting to delete whiteboard with ID:", id);

        if (!window.confirm("Delete this whiteboard permanently? 🗑️")) return;

        try {
            await deleteDoc(doc(db, "whiteboards", id));
            console.log("Delete successful for ID:", id);
            alert("Deleted successfully! ✨");
        } catch (err) {
            console.error("Delete failed for ID:", id, err);
            alert("Delete failed: " + err.message);
        }
    };

    /* =========================
       🔥 캔버스 모드 렌더링
    ================================ */
    if (selectedBoard) {
        return (
            <WhiteboardCanvas
                board={selectedBoard}
                onClose={() => setSelectedBoard(null)}
            />
        );
    }

    /* =========================
       🔥 목록 모드 렌더링
    ================================ */
    return (
        <div className="whiteboard-container">
            <div className="whiteboard-header">
                <h2>🎨 Design & Sketch</h2>
                <p>Your creative space. Draw, plan, and visualize.</p>
            </div>

            <div className="whiteboard-grid">
                {/* 생성 카드 */}
                <div
                    className="new-whiteboard-card"
                    onClick={() => !isCreating && setIsCreating(true)}
                >
                    {isCreating ? (
                        <input
                            autoFocus
                            className="new-whiteboard-input"
                            placeholder="Board Name..."
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onBlur={handleCreate}
                            onKeyDown={handleKeyDown}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <>
                            <span>➕</span>
                            <p>Create New Board</p>
                        </>
                    )}
                </div>

                {/* 목록 */}
                {whiteboards.map((wb) => (
                    <div
                        key={wb.id}
                        className="whiteboard-card"
                        onClick={() => setSelectedBoard(wb)}
                    >
                        <button
                            className="delete-wb-btn"
                            onClick={(e) => handleDelete(e, wb.id)}
                        >
                            ×
                        </button>

                        <div className="whiteboard-preview">
                            {wb.imageData ? (
                                <img src={wb.imageData} alt="preview" />
                            ) : (
                                <span className="whiteboard-preview-empty">🎨</span>
                            )}
                        </div>

                        <div className="whiteboard-info">
                            <h3>{wb.title}</h3>
                            <p>{wb.createdAt?.toDate().toLocaleDateString()}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
