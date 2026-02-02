// src/components/diary/DiaryPage.jsx
import React, { useState, useEffect } from "react";
import "./DiaryPage.css";
// import diaryCover from "../../assets/diary_3d_cover.png";
import { useAuth } from "../../firebase/AuthContext";
import { db } from "../../firebase/firebase";
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

const DiaryPage = () => {
    const { currentUser } = useAuth(); // ⭐ Get Current User

    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    const [activeEntryDate, setActiveEntryDate] = useState(new Date().toDateString());
    const [entries, setEntries] = useState({}); // ⭐ Local State synced with Firestore
    const [diaryContent, setDiaryContent] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isPaging, setIsPaging] = useState(false);
    const [pageDirection, setPageDirection] = useState(""); // "prev" or "next"
    const [showHistory, setShowHistory] = useState(false);

    // ⭐ 1. Firestore Realtime Sync
    useEffect(() => {
        if (!currentUser) return;

        // Path: users/{uid}/diary_entries/{dateString}
        const unsub = onSnapshot(collection(db, "users", currentUser.uid, "diary_entries"), (snapshot) => {
            const fetchedEntries = {};
            snapshot.forEach((doc) => {
                fetchedEntries[doc.id] = doc.data();
            });
            setEntries(fetchedEntries);
        });

        return () => unsub();
    }, [currentUser]);

    // ⭐ 2. Update Content when Active Date or Entries Change
    useEffect(() => {
        const entry = entries[activeEntryDate];
        if (entry) {
            setDiaryContent(entry.content || "");
        } else {
            setDiaryContent("");
        }
    }, [activeEntryDate, entries]);

    const handleOpen = () => {
        setIsOpen(true);
        setIsClosing(false);
    };

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsOpen(false);
            setIsClosing(false);
        }, 600);
    };

    // ⭐ 3. Save to Firestore
    const handleSave = async () => {
        if (!currentUser) return;
        setIsSaving(true);
        try {
            await setDoc(doc(db, "users", currentUser.uid, "diary_entries", activeEntryDate), {
                content: diaryContent,
                updatedAt: serverTimestamp(), // Use server timestamp
            });
            // State update is handled by onSnapshot
            setTimeout(() => {
                setIsSaving(false);
                alert("Your thoughts are safe now. ✨");
            }, 800);
        } catch (err) {
            console.error("Failed to save diary:", err);
            setIsSaving(false);
            alert("Failed to save... check your connection.");
        }
    };

    const historyDates = Object.keys(entries).sort((a, b) => new Date(b) - new Date(a));

    // ⭐ 4. Delete from Firestore
    const handleDelete = async (e, dateToDelete) => {
        e.stopPropagation(); // 부모 클릭 이벤트(날짜 선택) 방지
        if (!currentUser) return;

        if (window.confirm("Do you want to erase this memory forever? 🕯️")) {
            try {
                await deleteDoc(doc(db, "users", currentUser.uid, "diary_entries", dateToDelete));
                // State update by onSnapshot

                // 만약 현재 삭제한 날짜를 보고 있었다면 오늘 날짜로 이동
                if (activeEntryDate === dateToDelete) {
                    setActiveEntryDate(new Date().toDateString());
                }
            } catch (err) {
                console.error("Failed to delete diary:", err);
            }
        }
    };

    const goToPreviousDay = () => {
        if (isPaging) return;
        setIsPaging(true);
        setPageDirection("prev");

        setTimeout(() => {
            const currentDate = new Date(activeEntryDate);
            currentDate.setDate(currentDate.getDate() - 1);
            setActiveEntryDate(currentDate.toDateString());

            setTimeout(() => {
                setIsPaging(false);
                setPageDirection("");
            }, 300);
        }, 400);
    };

    const goToNextDay = () => {
        if (isPaging) return;
        setIsPaging(true);
        setPageDirection("next");

        setTimeout(() => {
            const currentDate = new Date(activeEntryDate);
            currentDate.setDate(currentDate.getDate() + 1);
            setActiveEntryDate(currentDate.toDateString());

            setTimeout(() => {
                setIsPaging(false);
                setPageDirection("");
            }, 300);
        }, 400);
    };

    const formatDateLabel = (dateStr) => {
        const target = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);

        if (target.toDateString() === today.toDateString()) return "Today ✨";
        if (target.toDateString() === yesterday.toDateString()) return "Yesterday";
        if (target.toDateString() === tomorrow.toDateString()) return "Tomorrow";

        return target.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            weekday: 'short'
        });
    };

    return (
        <div className="diary-room-container">
            {/* Ambient Elements */}
            <div className="curtain-overlay left"></div>
            <div className="curtain-overlay right"></div>
            <div className="lamp-glow"></div>

            {/* Room Interaction: The Diary on Table (Click Area) */}
            {!isOpen && (
                <div
                    className="diary-3d-trigger-area"
                    onClick={handleOpen}
                >
                </div>
            )}

            {/* Opened Diary Modal */}
            {isOpen && (
                <div className="diary-overlay-modal">
                    <button className="close-diary-btn" onClick={handleClose}>✖</button>

                    {/* Toggle History Button */}
                    <button
                        className={`toggle-history-btn ${showHistory ? 'active' : ''}`}
                        onClick={() => setShowHistory(!showHistory)}
                        title="View Archive"
                    >
                        📜
                    </button>

                    <div className={`diary-open-wrapper ${isClosing ? 'is-closing' : ''} ${isPaging ? `is-paging-${pageDirection}` : ''}`}>

                        {/* History Side (Conditional Render) */}
                        {showHistory && (
                            <div className="history-sidebar">
                                <h4 style={{ color: '#5d4037', marginBottom: '10px' }}>Memories</h4>

                                <div
                                    className={`history-item ${activeEntryDate === new Date().toDateString() ? 'active' : ''}`}
                                    onClick={() => setActiveEntryDate(new Date().toDateString())}
                                >
                                    {formatDateLabel(new Date().toDateString())}
                                </div>

                                {historyDates.filter(d => d !== new Date().toDateString()).slice(0, 10).map(date => (
                                    <div
                                        key={date}
                                        className={`history-item ${activeEntryDate === date ? 'active' : ''}`}
                                        onClick={() => setActiveEntryDate(date)}
                                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                    >
                                        <span>{formatDateLabel(date)}</span>
                                        <button
                                            className="delete-entry-btn"
                                            onClick={(e) => handleDelete(e, date)}
                                            title="Delete memory"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Left Page: Header & Info */}
                        <div className="diary-page diary-page-left">
                            <div className="diary-date-header">
                                {new Date(activeEntryDate).toLocaleDateString('en-US', {
                                    month: 'long',
                                    day: 'numeric',
                                    weekday: 'long'
                                })}
                            </div>
                            <div style={{ marginTop: '20px', color: '#8d6e63', fontStyle: 'italic', fontFamily: 'Nanum Pen Script', fontSize: '1.4rem' }}>
                                "The moon is beautiful tonight, isn't it?"
                            </div>
                            <div style={{ marginTop: 'auto', fontSize: '0.9rem', color: '#a0aec0' }}>
                                Writing keeps the soul warm.
                            </div>
                        </div>

                        {/* Right Page: Content Area */}
                        <div className="diary-page diary-page-right">
                            <textarea
                                className="diary-content-area"
                                placeholder="Write your night thoughts here..."
                                value={diaryContent}
                                onChange={(e) => setDiaryContent(e.target.value)}
                            />
                            <div className="diary-footer">
                                <button className="save-btn" onClick={handleSave} disabled={isSaving}>
                                    {isSaving ? "Saving..." : "Keep ✨"}
                                </button>
                            </div>
                        </div>

                        {/* Page Navigation Buttons */}
                        <button className="nav-page-btn prev" onClick={goToPreviousDay} title="Previous Day">
                            ‹
                        </button>
                        <button className="nav-page-btn next" onClick={goToNextDay} title="Next Day">
                            ›
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DiaryPage;
