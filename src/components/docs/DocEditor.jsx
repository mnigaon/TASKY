import React, { useState, useEffect, useRef, useMemo } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css"; // Basic style
import { db, storage } from "../../firebase/firebase";
import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import "./Docs.css"; // Reuse CSS file

export default function DocEditor({ docId, onTitleChange }) {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [lastSaved, setLastSaved] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const quillRef = useRef(null);

    const titleSaveTimeoutRef = useRef(null);
    const contentSaveTimeoutRef = useRef(null);

    // 1. Fetch Doc Data (Real-time)
    useEffect(() => {
        if (!docId) return;

        // 명시적으로 상태 초기화 (문서 전환 시 이전 내용이 보이는 것을 방지)
        setTitle("");
        setContent("");
        setLastSaved(null);

        const unsubscribe = onSnapshot(doc(db, "documents", docId), (snap) => {
            if (snap.exists()) {
                const data = snap.data();

                // 제목 업데이트 방지: 현재 제목 입력창에 포커스가 있으면 덮어씌우지 않음
                if (document.activeElement?.className?.includes("doc-title-input")) {
                    // skip
                } else {
                    setTitle(data.title || "");
                }

                // 내용 업데이트 방지: 에디터가 포커스 상태면 덮어씌우지 않음
                if (document.activeElement?.className?.includes("ql-editor")) {
                    // Skip content update if editing
                } else {
                    setContent(data.content || "");
                }
            }
        });

        return () => {
            unsubscribe();
            // 타임아웃 정리하여 메모리 누수 및 잘못된 저장 방지
            if (titleSaveTimeoutRef.current) clearTimeout(titleSaveTimeoutRef.current);
            if (contentSaveTimeoutRef.current) clearTimeout(contentSaveTimeoutRef.current);
        };
    }, [docId]);


    // 2. Handle Title Change
    const handleTitleChange = (e) => {
        const newTitle = e.target.value;
        setTitle(newTitle);
        // Instant update in parent list
        if (onTitleChange) {
            onTitleChange(docId, newTitle);
        }

        // 제목 전용 디바운스
        if (titleSaveTimeoutRef.current) clearTimeout(titleSaveTimeoutRef.current);
        titleSaveTimeoutRef.current = setTimeout(async () => {
            try {
                // 문서가 존재하는지 확인하며 업데이트 (삭제된 경우 에러 방지)
                await updateDoc(doc(db, "documents", docId), {
                    title: newTitle,
                    updatedAt: serverTimestamp()
                });
                setLastSaved(new Date());
            } catch (error) {
                // 에러 무시 (삭제된 문서인 경우 등)
                console.warn("Title auto-save skipped or failed:", error.message);
            }
        }, 1000);
    };

    // 3. Handle Content Change
    const handleContentChange = (value) => {
        setContent(value);

        // 내용 전용 디바운스
        if (contentSaveTimeoutRef.current) clearTimeout(contentSaveTimeoutRef.current);
        contentSaveTimeoutRef.current = setTimeout(async () => {
            try {
                await updateDoc(doc(db, "documents", docId), {
                    content: value,
                    updatedAt: serverTimestamp()
                });
                setLastSaved(new Date());
            } catch (error) {
                // 에러 무시 (삭제된 문서인 경우 등)
                console.warn("Content auto-save skipped or failed:", error.message);
                if (error.code === 'resource-exhausted' || error.message.includes("longer than")) {
                    alert("Document is too large to save! Please use smaller images or less content.");
                }
            }
        }, 1500); // 1.5s debounce
    };

    // Custom Image Handler
    const imageHandler = () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;

            try {
                const storageRef = ref(storage, `doc_images/${docId}/${Date.now()}_${file.name}`);
                const snapshot = await uploadBytes(storageRef, file);
                const url = await getDownloadURL(snapshot.ref);

                // Insert image into editor
                const quill = quillRef.current.getEditor();
                const range = quill.getSelection(true);
                quill.insertEmbed(range.index, 'image', url);
            } catch (error) {
                console.error("Image upload failed:", error);
                alert(`Failed to upload image. Error: ${error.message}`);
            }
        };
    };

    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [1, 2, false] }],
                ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
                ['link', 'image', 'video'],
                ['clean']
            ],
            handlers: {
                image: imageHandler
            }
        },
    }), [docId]);

    const formats = [
        'header',
        'bold', 'italic', 'underline', 'strike', 'blockquote',
        'list', 'bullet', 'indent',
        'link', 'image', 'video'
    ];

    // 4. Manual Save
    const handleManualSave = async () => {
        if (!docId || isSaving) return;

        setIsSaving(true);
        // Clear any pending timeouts
        if (titleSaveTimeoutRef.current) clearTimeout(titleSaveTimeoutRef.current);
        if (contentSaveTimeoutRef.current) clearTimeout(contentSaveTimeoutRef.current);

        try {
            await updateDoc(doc(db, "documents", docId), {
                title: title,
                content: content,
                updatedAt: serverTimestamp()
            });
            setLastSaved(new Date());
        } catch (err) {
            console.error("Manual save failed:", err);
            alert("Failed to save document.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="doc-editor-container">
            <div className="doc-editor-header">
                <div className="title-area">
                    <input
                        type="text"
                        className="doc-title-input"
                        value={title}
                        onChange={handleTitleChange}
                        placeholder="Untitled Draft..."
                    />
                </div>
                <div className="header-actions">
                    {lastSaved && <span className="save-status">Saved: {lastSaved.toLocaleTimeString()}</span>}
                    <button
                        className={`btn-save-doc ${isSaving ? 'saving' : ''}`}
                        onClick={handleManualSave}
                        disabled={isSaving}
                        title="Stamp to Save"
                    >
                        {isSaving ? "Stamping..." : "CONFIRM"}
                    </button>
                </div>
            </div>

            <div className="doc-quill-wrapper">
                <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={content || ""}
                    onChange={handleContentChange}
                    modules={modules}
                    formats={formats}
                    className="custom-quill"
                />
            </div>
        </div>
    );
}
