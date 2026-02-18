import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css"; // Basic style
import { db, storage } from "../../firebase/firebase";
import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import "./Docs.css"; // Reuse CSS file
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Custom Toolbar Component (Memoized to prevent re-renders wiping Quill icons)
const CustomToolbar = React.memo(() => (
    <div id="toolbar" className="ql-toolbar ql-snow">
        <span className="ql-formats">
            <select className="ql-header" defaultValue="">
                <option value="1">Heading 1</option>
                <option value="2">Heading 2</option>
                <option value="3">Heading 3</option>
                <option value="">Normal</option>
            </select>
        </span>
        <span className="ql-formats">
            <button className="ql-bold"></button>
            <button className="ql-italic"></button>
            <button className="ql-underline"></button>
            <button className="ql-strike"></button>
            <button className="ql-blockquote"></button>
        </span>
        <span className="ql-formats">
            <button className="ql-list" value="ordered"></button>
            <button className="ql-list" value="bullet"></button>
        </span>
        <span className="ql-formats">
            <button className="ql-link"></button>
            <button className="ql-image"></button>
        </span>
        <span className="ql-formats">
            <button className="ql-clean"></button>
        </span>
    </div>
));

export default function DocEditor({ docId, onTitleChange }) {
    const [title, setTitle] = useState("");
    const [subtitle, setSubtitle] = useState(""); // [NEW]
    const [content, setContent] = useState("");
    const [lastSaved, setLastSaved] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const quillRef = useRef(null);

    // Refs for auto-saving
    const titleSaveTimeoutRef = useRef(null);
    const subtitleSaveTimeoutRef = useRef(null); // [NEW]
    const contentSaveTimeoutRef = useRef(null);

    // 1. Fetch Doc Data (Real-time)
    useEffect(() => {
        if (!docId) return;

        // 명시적으로 상태 초기화 (문서 전환 시 이전 내용이 보이는 것을 방지)
        setTitle("");
        setSubtitle("");
        setContent("");
        setLastSaved(null);

        const unsubscribe = onSnapshot(doc(db, "documents", docId), (snap) => {
            if (snap.exists()) {
                const data = snap.data();

                // 제목 업데이트 방지: 현재 제목 입력창에 포커스가 있으면 덮어씌우지 않음
                if (!document.activeElement?.className?.includes("doc-title-input")) {
                    setTitle(data.title || "");
                }

                // 소제목 업데이트 방지
                if (!document.activeElement?.className?.includes("doc-subtitle-input")) {
                    setSubtitle(data.subtitle || "");
                }

                // 내용 업데이트 방지: 에디터가 포커스 상태면 덮어씌우지 않음
                if (!document.activeElement?.className?.includes("ql-editor")) {
                    setContent(data.content || "");
                }
            }
        });

        return () => {
            unsubscribe();
            // 타임아웃 정리하여 메모리 누수 및 잘못된 저장 방지
            if (titleSaveTimeoutRef.current) clearTimeout(titleSaveTimeoutRef.current);
            if (subtitleSaveTimeoutRef.current) clearTimeout(subtitleSaveTimeoutRef.current);
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
                await updateDoc(doc(db, "documents", docId), {
                    title: newTitle,
                    updatedAt: serverTimestamp()
                });
                setLastSaved(new Date());
            } catch (error) {
                console.warn("Title auto-save skipped or failed:", error.message);
            }
        }, 1000);
    };

    // Handle Subtitle Change
    const handleSubtitleChange = (e) => {
        const newSubtitle = e.target.value;
        setSubtitle(newSubtitle);

        if (subtitleSaveTimeoutRef.current) clearTimeout(subtitleSaveTimeoutRef.current);
        subtitleSaveTimeoutRef.current = setTimeout(async () => {
            if (docId) {
                await updateDoc(doc(db, "documents", docId), { subtitle: newSubtitle, updatedAt: serverTimestamp() });
                setLastSaved(new Date());
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
                console.warn("Content auto-save skipped or failed:", error.message);
                if (error.code === 'resource-exhausted' || error.message.includes("longer than")) {
                    alert("Document is too large to save! Please use smaller images or less content.");
                }
            }
        }, 1500); // 1.5s debounce
    };

    // Custom Image Handler
    const imageHandler = useCallback(() => {
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
    }, [docId]);

    // Custom Toolbar Def (Defined outside or inside, but needs to be in JSX to render)
    // We render it in JSX, so we tell modules to use "#toolbar"
    const modules = useMemo(() => ({
        toolbar: {
            container: "#toolbar",
            handlers: {
                image: imageHandler
            }
        }
    }), [imageHandler]);

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
        if (subtitleSaveTimeoutRef.current) clearTimeout(subtitleSaveTimeoutRef.current);
        if (contentSaveTimeoutRef.current) clearTimeout(contentSaveTimeoutRef.current);

        try {
            await updateDoc(doc(db, "documents", docId), {
                title: title,
                subtitle: subtitle,
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

    // 5. Download PDF (Clean Postype Method)
    const handleDownloadPDF = async () => {
        try {
            // 1. Create a temporary container for valid HTML structure
            const printContainer = document.createElement("div");
            printContainer.className = "doc-editor-container pdf-export-container";

            // Apply styles to match the Postype look
            printContainer.style.position = "absolute";
            printContainer.style.top = "-9999px";
            printContainer.style.left = "-9999px";
            printContainer.style.width = "800px"; // Fixed A4-ish width
            printContainer.style.height = "auto";
            printContainer.style.zIndex = "-1000";
            printContainer.style.overflow = "visible";
            printContainer.style.backgroundColor = "#ffffff"; // Clean White
            printContainer.style.padding = "60px"; // Generous padding
            printContainer.style.boxShadow = "none";

            // 2. Build the Document Content
            // Title
            const titleEl = document.createElement("h1");
            titleEl.innerText = title || "Untitled Doc";
            titleEl.style.fontFamily = "'Noto Serif KR', serif";
            titleEl.style.fontSize = "36px";
            titleEl.style.fontWeight = "700";
            titleEl.style.marginBottom = "10px";
            titleEl.style.color = "#111";
            titleEl.style.lineHeight = "1.3";

            // Subtitle
            const subtitleEl = document.createElement("h2");
            subtitleEl.innerText = subtitle || "";
            subtitleEl.style.fontFamily = "'Noto Sans KR', sans-serif";
            subtitleEl.style.fontSize = "18px";
            subtitleEl.style.fontWeight = "400";
            subtitleEl.style.color = "#888"; // Muted
            subtitleEl.style.marginBottom = "40px";
            subtitleEl.style.marginTop = "0";

            // Content (Quill HTML)
            const contentEl = document.createElement("div");
            contentEl.className = "ql-editor"; // Re-use Quill styles
            contentEl.innerHTML = content;
            contentEl.style.padding = "0";
            contentEl.style.overflow = "visible";
            contentEl.style.height = "auto";
            contentEl.style.fontFamily = "'Noto Serif KR', serif";
            contentEl.style.fontSize = "16px";
            contentEl.style.lineHeight = "1.8";
            contentEl.style.color = "#333";

            // Assemble
            printContainer.appendChild(titleEl);
            if (subtitle) printContainer.appendChild(subtitleEl);
            printContainer.appendChild(contentEl);
            document.body.appendChild(printContainer);

            // 3. Capture
            const canvas = await html2canvas(printContainer, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
                logging: false,
                windowWidth: 800,
                height: printContainer.scrollHeight + 100 // Ensure full height cap
            });

            // 4. Generate PDF
            const imgData = canvas.toDataURL("image/png");

            // A4 dimensions
            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

            // Handle content height
            if (imgHeight > pdfHeight) {
                // Custom long page
                const customPdf = new jsPDF("p", "mm", [pdfWidth, imgHeight]);
                customPdf.addImage(imgData, "PNG", 0, 0, pdfWidth, imgHeight);
                customPdf.save(`${title || "document"}.pdf`);
            } else {
                // Standard A4
                pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, imgHeight);
                pdf.save(`${title || "document"}.pdf`);
            }

            // 5. Cleanup
            document.body.removeChild(printContainer);

        } catch (err) {
            console.error("PDF generation failed:", err);
            alert("Failed to generate PDF.");
        }
    };



    return (
        <div className="doc-editor-container">
            {/* Top Bar: Toolbar + Actions */}
            <div className="editor-top-bar">
                <CustomToolbar />

                <div className="header-actions">
                    {lastSaved && <span className="save-status">Saved: {lastSaved.toLocaleTimeString()}</span>}
                    <button
                        className="btn-pdf-doc"
                        onClick={handleDownloadPDF}
                        title="Save as PDF"
                    >
                        PDF
                    </button>
                    <button
                        className={`btn-save-doc ${isSaving ? 'saving' : ''}`}
                        onClick={handleManualSave}
                        disabled={isSaving}
                        title="Save to Cloud"
                    >
                        {isSaving ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>

            {/* Title & Subtitle Area */}
            <div className="title-area" style={{ marginTop: '20px', marginBottom: '40px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
                <input
                    type="text"
                    className="doc-title-input"
                    placeholder="Enter a title"
                    value={title}
                    onChange={handleTitleChange}
                />
                <input
                    type="text"
                    className="doc-subtitle-input"
                    placeholder="Enter a subtitle"
                    value={subtitle}
                    onChange={handleSubtitleChange}
                />
            </div>

            {/* Editor */}
            <div className="doc-quill-wrapper">
                <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={content}
                    onChange={handleContentChange}
                    modules={modules}
                    formats={formats}
                />
            </div>
        </div>
    );
};
