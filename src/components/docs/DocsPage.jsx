import React, { useState, useEffect } from "react";
import { db } from "../../firebase/firebase";
import { collection, query, where, onSnapshot, serverTimestamp, deleteDoc, doc, setDoc } from "firebase/firestore";
import { useAuth } from "../../firebase/AuthContext";
import DocEditor from "./DocEditor";
import "./Docs.css";

export default function DocsPage() {
    const { currentUser } = useAuth();
    const [docs, setDocs] = useState([]);
    const [selectedDocId, setSelectedDocId] = useState(() => localStorage.getItem("tasky_last_doc_id"));
    const [isInitialLoad, setIsInitialLoad] = useState(true); // 🔹 초기 로딩 상태 추가

    // Persist selected doc
    useEffect(() => {
        if (selectedDocId) {
            localStorage.setItem("tasky_last_doc_id", selectedDocId);
        }
    }, [selectedDocId]);

    // 1. Load Docs List
    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, "documents"),
            where("userId", "==", currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));

            list.sort((a, b) => {
                const getTime = (val) => {
                    if (!val) return 0;
                    if (val.seconds) return val.seconds * 1000;
                    if (val instanceof Date) return val.getTime();
                    const parsed = new Date(val).getTime();
                    return isNaN(parsed) ? 0 : parsed;
                };
                return getTime(b.updatedAt) - getTime(a.updatedAt);
            });

            setDocs(list);
            setIsInitialLoad(false); // 🔹 로딩 완료 표시
        }, (error) => {
            console.error("Firestore Error in DocsPage:", error);
            setIsInitialLoad(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    // 2. Validate Selected Doc (로딩 완료 후에만 수행)
    useEffect(() => {
        if (isInitialLoad) return; // 🔹 아직 로딩 중이면 건너뜀

        if (docs.length === 0) {
            setSelectedDocId(null);
            localStorage.removeItem("tasky_last_doc_id");
        } else if (selectedDocId && !docs.some(d => d.id === selectedDocId)) {
            setSelectedDocId(null);
        }
    }, [docs, selectedDocId, isInitialLoad]);

    // 3. Create New Doc
    const handleCreateDoc = async () => {
        if (!currentUser) return;
        try {
            const newDocRef = doc(collection(db, "documents")); // Generate ID locally
            const newDocData = {
                userId: currentUser.uid,
                title: "Untitled Doc",
                content: "",
                updatedAt: serverTimestamp(), // Use serverTimestamp for consistency
                createdAt: serverTimestamp(),
            };

            // Immediate UI update (Optimistic)
            const newDoc = { id: newDocRef.id, ...newDocData, updatedAt: new Date() }; // UI dummy date
            setDocs((prev) => [newDoc, ...prev]);
            setSelectedDocId(newDocRef.id);

            // Sync to DB
            await setDoc(newDocRef, newDocData);

        } catch (error) {
            console.error("Error creating doc:", error);
            alert("Failed to create document.");
        }
    };

    // 3. Delete Doc
    const handleDeleteDoc = async (e, id) => {
        e.stopPropagation();
        e.preventDefault();

        if (!window.confirm("Are you sure you want to delete this document?")) return;

        try {
            // Optimistic UI Update: Remove from list immediately
            setDocs((prev) => prev.filter((d) => d.id !== id));

            // First clear selection if deleting current doc
            if (selectedDocId === id) {
                setSelectedDocId(null);
            }
            await deleteDoc(doc(db, "documents", id));
        } catch (err) {
            console.error("Delete failed", err);
            alert("Failed to delete document.");
        }
    }

    // 4. Optimistic Title Update
    const updateLocalDocTitle = (id, newTitle) => {
        setDocs((prev) => prev.map((d) => d.id === id ? { ...d, title: newTitle } : d));
    };

    return (
        <div className="docs-container">
            {/* Editor Area - Desk Surface */}
            <main className="docs-main">
                {selectedDocId ? (
                    <DocEditor
                        key={selectedDocId}
                        docId={selectedDocId}
                        onTitleChange={updateLocalDocTitle}
                    />
                ) : (
                    <div className="no-doc-selected">
                        <h2>Select a draft to edit</h2>
                    </div>
                )}
            </main>

            {/* Sidebar List - Wire Tray (Moved to Right) */}
            <aside className="docs-sidebar">
                <div className="docs-sidebar-header">
                    <h3>📑 INBOX</h3>
                    <button onClick={handleCreateDoc} className="btn-new-doc" title="New Draft">+</button>
                </div>

                <ul className="docs-list">
                    {docs.map((d) => (
                        <li
                            key={d.id}
                            className={selectedDocId === d.id ? "active" : ""}
                            onClick={() => setSelectedDocId(d.id)}
                        >
                            <div className="doc-info">
                                {/* Removed icon, let CSS do the paper stack look */}
                                <span className="doc-title">{d.title || "Untitled Draft"}</span>
                            </div>
                            <button className="btn-delete-doc" onClick={(e) => handleDeleteDoc(e, d.id)}>×</button>
                        </li>
                    ))}
                    {docs.length === 0 && <li className="empty-msg">Inbox Empty</li>}
                </ul>
            </aside>
        </div>
    );
}
