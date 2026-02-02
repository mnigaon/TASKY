import { useRef, useState, useEffect } from "react";
import { doc, updateDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db, storage } from "../../firebase/firebase"; // Import storage
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import jsPDF from "jspdf";
import "./Whiteboard.css";

export default function WhiteboardCanvas({ board, onClose }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const fileInputRef = useRef(null);

    // Drawing State
    const [ctx, setCtx] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);

    // History
    const [history, setHistory] = useState([]);
    const [historyStep, setHistoryStep] = useState(-1);

    // Tools & Settings
    const [tool, setTool] = useState("pen");
    const [color, setColor] = useState("#000000");
    const [lineWidth, setLineWidth] = useState(3);
    const [zoom, setZoom] = useState(0.8);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [title, setTitle] = useState(board.title);

    // Objects (Text, Image) State
    const [elements, setElements] = useState([]);
    const [selectedId, setSelectedId] = useState(null);

    // Dragging State
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);

    /* =========================
       🔍 Init & Load Separate Layers
    ================================ */
    useEffect(() => {
        const canvas = canvasRef.current;
        canvas.width = 1920;
        canvas.height = 1080;

        const context = canvas.getContext("2d");
        context.lineCap = "round";
        context.lineJoin = "round";
        setCtx(context);

        // 1. Load Elements (Objects)
        if (board.elements) {
            setElements(board.elements);
        }

        // 2. Load Drawing Layer
        if (board.drawingData) {
            const img = new Image();
            img.crossOrigin = "Anonymous"; // Prevent tainted canvas
            img.src = board.drawingData;
            img.onload = () => {
                context.clearRect(0, 0, canvas.width, canvas.height);
                context.drawImage(img, 0, 0);
                saveHistory(context);
            };
        } else if (board.imageData && !board.elements) {
            // Fallback: If it's an old save (only imageData, no elements), 
            // load the whole thing as a background drawing
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = board.imageData;
            img.onload = () => {
                context.drawImage(img, 0, 0);
                saveHistory(context);
            };
        } else {
            // New board
            context.fillStyle = "rgba(0,0,0,0)"; // Transparent drawing layer
            context.clearRect(0, 0, canvas.width, canvas.height);
            saveHistory(context);
        }
    }, []);

    /* =========================
       History Logic (Canvas Only)
    ================================ */
    const saveHistory = (context = ctx) => {
        if (!context || !canvasRef.current) return;
        const dataUrl = canvasRef.current.toDataURL();

        const newHistory = history.slice(0, historyStep + 1);
        newHistory.push(dataUrl);
        // Limit history to 20 steps to save memory
        if (newHistory.length > 20) newHistory.shift();
        setHistory(newHistory);
        setHistoryStep(newHistory.length - 1);
    };

    const undo = () => {
        if (historyStep > 0) {
            const prevStep = historyStep - 1;
            const img = new Image();
            img.src = history[prevStep];
            img.onload = () => {
                ctx.clearRect(0, 0, 1920, 1080);
                ctx.drawImage(img, 0, 0);
                setHistoryStep(prevStep);
            };
        }
    };

    const redo = () => {
        if (historyStep < history.length - 1) {
            const nextStep = historyStep + 1;
            const img = new Image();
            img.src = history[nextStep];
            img.onload = () => {
                ctx.clearRect(0, 0, 1920, 1080);
                ctx.drawImage(img, 0, 0);
                setHistoryStep(nextStep);
            };
        }
    };

    /* =========================
       🎨 Tool Settings
    ================================ */
    useEffect(() => {
        if (!ctx) return;
        if (tool === "eraser") {
            ctx.globalCompositeOperation = "destination-out";
            ctx.lineWidth = lineWidth * 2;
        } else {
            ctx.globalCompositeOperation = "source-over";
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
        }
    }, [tool, color, lineWidth, ctx]);

    /* =========================
       ⌨️ Shortcuts
    ================================ */
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore key shortcuts if user is typing in an input (Title, etc.)
            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

            // Delete Object
            if ((e.key === "Backspace" || e.key === "Delete") && selectedId) {
                const el = elements.find(e => e.id === selectedId);
                // Don't delete if we are currently editing text (though TEXTAREA check handles most, explicit safety)
                if (el && el.isEditing) return;

                setElements((prev) => prev.filter(el => el.id !== selectedId));
                setSelectedId(null);
            }
            // Undo/Redo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                if (e.shiftKey) redo();
                else undo();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedId, elements, historyStep]);

    /* =========================
       🖱️ Canvas Interactions
    ================================ */
    const getCoords = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / zoom,
            y: (e.clientY - rect.top) / zoom
        };
    };

    const startInteraction = (e) => {
        // If Select Mode -> Clicking canvas means deselect
        if (tool === "select") {
            setSelectedId(null);
            return;
        }

        // 1. Add Text
        if (tool === "text") {
            const { x, y } = getCoords(e);
            const newId = Date.now();
            const newText = {
                id: newId,
                type: 'text',
                x, y,
                content: "",
                color: color,
                fontSize: Math.max(20, lineWidth * 3),
                isEditing: true // Start in edit mode
            };
            setElements(prev => [...prev, newText]);
            setSelectedId(newId);
            setTool("select");
            return;
        }

        // 2. Draw
        if (tool === "pen" || tool === "eraser") {
            const { x, y } = getCoords(e);
            ctx.beginPath();
            ctx.moveTo(x, y);
            setIsDrawing(true);
        }
    };

    const moveInteraction = (e) => {
        if ((tool === "pen" || tool === "eraser") && isDrawing) {
            const { x, y } = getCoords(e);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    };

    const endInteraction = () => {
        if (isDrawing) {
            ctx.closePath();
            setIsDrawing(false);
            saveHistory();
        }
    };

    /* =========================
       Objects Interaction
    ================================ */
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const maxSize = 400;
                const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
                setElements(prev => [...prev, {
                    id: Date.now(),
                    type: 'image',
                    src: event.target.result,
                    x: 960 - (img.width * ratio) / 2,
                    y: 540 - (img.height * ratio) / 2,
                    width: img.width * ratio,
                    height: img.height * ratio
                }]);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
        e.target.value = null;
    };

    const handleMouseDownObj = (e, id) => {
        if (tool !== "select") return; // Only select tool can move objects
        e.stopPropagation();

        // Deselect potentially editing text if switching to another object
        setElements(prev => prev.map(el => (el.id !== id && el.isEditing) ? { ...el, isEditing: false } : el));

        setSelectedId(id);
        setIsDragging(true);

        const el = elements.find(el => el.id === id);
        setDragOffset({
            startX: e.clientX,
            startY: e.clientY,
            origX: el.x,
            origY: el.y
        });
    };

    const handleMouseMoveObj = (e) => {
        if (!isDragging || !selectedId) return;

        // Drag logic
        const deltaX = (e.clientX - dragOffset.startX) / zoom;
        const deltaY = (e.clientY - dragOffset.startY) / zoom;

        setElements(prev => prev.map(el => {
            if (el.id === selectedId) {
                return { ...el, x: dragOffset.origX + deltaX, y: dragOffset.origY + deltaY };
            }
            return el;
        }));
    };

    const handleMouseUpObj = () => setIsDragging(false);

    // Text Editing
    const finishTextEdit = (id, newVal) => {
        setElements(prev => prev.map(el => {
            if (el.id === id) {
                return { ...el, content: newVal, isEditing: false };
            }
            return el;
        }));
    };

    const updateTextValue = (id, val) => {
        setElements(prev => prev.map(el => el.id === id ? { ...el, content: val } : el));
    }

    const deleteElement = (e, id) => {
        e.stopPropagation();
        setElements(prev => prev.filter(el => el.id !== id));
        if (selectedId === id) setSelectedId(null);
    };


    /* =========================
     💾 Saving Logic
  ================================ */
    // Combines Drawing + Elements into a single Canvas for export/preview
    const combineCanvas = async (currentElements = elements) => {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = 1920;
        tempCanvas.height = 1080;
        const tCtx = tempCanvas.getContext("2d");

        // 1. Background White
        tCtx.fillStyle = "white";
        tCtx.fillRect(0, 0, 1920, 1080);

        // 2. Draw Drawing Layer (Bitmap)
        if (canvasRef.current) {
            tCtx.drawImage(canvasRef.current, 0, 0);
        }

        // 3. Draw Elements (Vector-like)
        const promiseDraw = currentElements.map(async (el) => {
            if (el.type === 'image') {
                const img = new Image();
                img.crossOrigin = "Anonymous";
                img.src = el.src;

                const success = await new Promise((resolve) => {
                    img.onload = () => resolve(true);
                    img.onerror = () => {
                        console.warn("Failed to load image for canvas export:", el.src);
                        resolve(false);
                    };
                    // Check if already loaded
                    if (img.complete && img.naturalWidth !== 0) resolve(true);
                });

                if (success) {
                    try {
                        tCtx.drawImage(img, el.x, el.y, el.width, el.height);
                    } catch (e) {
                        console.error("Error drawing image element:", e);
                    }
                }
            } else if (el.type === 'text') {
                tCtx.font = `${el.fontSize}px sans - serif`;
                tCtx.fillStyle = el.color;
                tCtx.textBaseline = "top";
                tCtx.fillText(el.content, el.x, el.y);
            }
        });
        await Promise.all(promiseDraw);

        try {
            return tempCanvas.toDataURL("image/png");
        } catch (e) {
            console.error("Canvas Tainted", e);
            return null;
        }
    };

    const uploadImageToStorage = async (dataUrl, path) => {
        const storageRef = ref(storage, path);
        await uploadString(storageRef, dataUrl, 'data_url');
        return await getDownloadURL(storageRef);
    };

    const handleSaveFirebase = async () => {
        try {
            alert("Saving... Please wait ⏳");

            // 1. Upload Elements Images (convert Base64 -> Storage URL)
            // We create a new array to avoid mutating state directly during async ops
            const newElements = await Promise.all(elements.map(async (el) => {
                if (el.type === 'image' && el.src.startsWith('data:')) {
                    // It's a base64 image, upload it
                    const path = `whiteboard_assets/${board.id}/${el.id}_${Date.now()}.png`;
                    const url = await uploadImageToStorage(el.src, path);
                    return { ...el, src: url };
                }
                return el;
            }));

            // Update local state with new URLs effectively (so subsequent saves are fast)
            setElements(newElements);

            // 2. Upload Drawing Layer
            const drawingData = canvasRef.current.toDataURL("image/png");
            const drawingUrl = await uploadImageToStorage(drawingData, `whiteboards/${board.id}/drawing_${Date.now()}.png`);

            // 3. Upload Combined Preview
            // Use newElements because it has the properly crossOrigin URLs (if valid) or just src
            // Note: drawingData in combineCanvas comes from canvasRef, elements come from arg
            const previewData = await combineCanvas(newElements);
            let previewUrl = "";
            if (previewData) {
                previewUrl = await uploadImageToStorage(previewData, `whiteboards/${board.id}/preview_${Date.now()}.png`);
            }

            // 4. Update Firestore with URLs
            await updateDoc(doc(db, "whiteboards", board.id), {
                title: title,
                drawingData: drawingUrl, // URL
                elements: newElements,   // JSON with URLs
                imageData: previewUrl,   // URL
                updatedAt: serverTimestamp(),
            });

            alert("Saved! (Editable) 💾");

        } catch (err) {
            console.error("Save Error:", err);
            alert(`Save failed: ${err.message}`);
        }
    };

    const handleDownloadPDF = async () => {
        const dataUrl = await combineCanvas();
        const pdf = new jsPDF({
            orientation: "l",
            unit: "px",
            format: [1920, 1080]
        });
        pdf.addImage(dataUrl, 'PNG', 0, 0, 1920, 1080);
        pdf.save(`${board.title || "whiteboard"}.pdf`);
    };

    const handleClear = () => {
        if (window.confirm("Clear Everything?")) {
            ctx.clearRect(0, 0, 1920, 1080);
            setElements([]);
            saveHistory();
        }
    };

    const handleDeleteBoard = async () => {
        if (window.confirm("Are you sure you want to delete this whiteboard permanently? 🚨")) {
            try {
                await deleteDoc(doc(db, "whiteboards", board.id));
                onClose(); // Close canvas and go back to list
            } catch (err) {
                console.error("Delete failed:", err);
                alert("Failed to delete whiteboard.");
            }
        }
    };


    return (
        <div
            className={`whiteboard-workspace ${isDarkMode ? "dark-mode-wb" : ""}`}
            ref={containerRef}
            onMouseMove={handleMouseMoveObj}
            onMouseUp={handleMouseUpObj}
            // Handle Background Clicks: Only deselect if clicking the actual workspace background
            onMouseDown={(e) => {
                if (e.target === containerRef.current || e.target.classList.contains('wb-canvas-wrapper')) {
                    setSelectedId(null);
                }
            }}
        >
            {/* 🛠️ Toolbar */}
            <div className="wb-toolbar" onClick={e => e.stopPropagation()}>
                <div className="wb-toolbar-group">
                    <button onClick={onClose} className="wb-btn-back">←</button>
                    <input
                        className="wb-title-input"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                <div className="wb-toolbar-divider" />

                <div className="wb-toolbar-group">
                    <button onClick={undo} disabled={historyStep <= 0} className="wb-tool-btn">↩️</button>
                    <button onClick={redo} disabled={historyStep >= history.length - 1} className="wb-tool-btn">↪️</button>
                </div>

                <div className="wb-toolbar-divider" />

                <div className="wb-toolbar-group">
                    <button className={`wb-tool-btn ${tool === 'pen' ? 'active' : ''}`} onClick={() => setTool("pen")}>✏️</button>
                    <button className={`wb-tool-btn ${tool === 'eraser' ? 'active' : ''}`} onClick={() => setTool("eraser")}>🧽</button>
                    <button className={`wb-tool-btn ${tool === 'text' ? 'active' : ''}`} onClick={() => setTool("text")}>T</button>
                    <button className={`wb-tool-btn ${tool === 'select' ? 'active' : ''}`} onClick={() => setTool("select")}>✋</button>
                    <button className="wb-tool-btn" onClick={() => fileInputRef.current?.click()}>🖼️</button>
                    <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleImageUpload} />
                </div>

                <div className="wb-toolbar-divider" />

                <div className="wb-toolbar-group">
                    <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="wb-color-picker" />
                    <input type="range" min="1" max="50" value={lineWidth} onChange={(e) => setLineWidth(Number(e.target.value))} className="wb-range" />
                </div>

                <div className="wb-toolbar-group right">
                    <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="wb-tool-btn">➖</button>
                    <span style={{ fontSize: 12, minWidth: 40, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="wb-tool-btn">➕</button>

                    <button className={`wb-tool-btn ${isDarkMode ? 'active' : ''}`} onClick={() => setIsDarkMode(!isDarkMode)}>🌙</button>
                    <button onClick={handleClear} className="wb-tool-btn" title="Clear Canvas">🧹</button>
                    <button onClick={handleDeleteBoard} className="wb-tool-btn danger" title="Delete Whiteboard">🗑️</button>

                    <div className="wb-toolbar-divider" />

                    <button onClick={handleDownloadPDF} className="wb-action-btn secondary">PDF</button>
                    <button onClick={handleSaveFirebase} className="wb-action-btn primary">Save</button>
                </div>
            </div>

            {/* 🖼️ Canvas Area */}
            <div className="wb-canvas-wrapper">
                {/* Scaler Container: Matches the VISUAL dimensions of the zoomed canvas for proper layout flow and centering */}
                <div
                    style={{
                        width: 1920 * zoom,
                        height: 1080 * zoom,
                        margin: 'auto', // Centers this box in the flex container
                        position: 'relative',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
                        backgroundColor: 'white', // The "Paper" background
                        flexShrink: 0
                    }}
                >
                    <div
                        className="wb-canvas-transform"
                        style={{
                            transform: `scale(${zoom})`,
                            transformOrigin: "0 0", // Scale from top-left to fit perfectly in the Scaler
                            width: 1920,
                            height: 1080,
                            position: 'absolute',
                            top: 0,
                            left: 0
                        }}
                    >
                        {/* 1. Drawings */}
                        <canvas
                            ref={canvasRef}
                            onMouseDown={startInteraction}
                            onMouseMove={moveInteraction}
                            onMouseUp={endInteraction}
                            onMouseLeave={endInteraction}
                            className="wb-canvas"
                            style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
                        />

                        {/* 2. Text/Image Overlay */}
                        {elements.map((el) => {
                            const isSelected = selectedId === el.id;

                            if (el.type === 'text') {
                                return (
                                    <div
                                        key={el.id}
                                        style={{
                                            position: 'absolute',
                                            left: el.x, top: el.y,
                                            zIndex: 10,
                                            cursor: tool === 'select' ? 'move' : 'text',
                                            border: isSelected ? '1px dashed #648cff' : 'none'
                                        }}
                                        onMouseDown={(e) => {
                                            if (tool === 'select' || tool === 'text') handleMouseDownObj(e, el.id);
                                        }}
                                        onDoubleClick={() => {
                                            // Switch to edit mode
                                            setElements(prev => prev.map(item => item.id === el.id ? { ...item, isEditing: true } : item));
                                        }}
                                    >
                                        {el.isEditing ? (
                                            <div style={{ position: 'relative' }}>
                                                <textarea
                                                    autoFocus
                                                    value={el.content}
                                                    onChange={(e) => updateTextValue(el.id, e.target.value)}
                                                    onBlur={() => finishTextEdit(el.id, el.content)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            finishTextEdit(el.id, el.content);
                                                        }
                                                    }}
                                                    placeholder="Type here..."
                                                    style={{
                                                        fontSize: el.fontSize,
                                                        color: el.color,
                                                        border: '1px solid #648cff',
                                                        background: 'rgba(255,255,255,0.9)',
                                                        outline: 'none',
                                                        minWidth: '50px',
                                                        fontFamily: 'sans-serif',
                                                        padding: 0,
                                                        margin: 0,
                                                        resize: 'both' // allow manual resize
                                                    }}
                                                />
                                                <button
                                                    onClick={(e) => deleteElement(e, el.id)}
                                                    style={{
                                                        position: 'absolute', top: -15, right: -15,
                                                        background: '#fc8181', color: 'white',
                                                        borderRadius: '50%', width: 24, height: 24,
                                                        border: '2px solid white', cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontWeight: 'bold', fontSize: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                    }}
                                                    title="Delete text"
                                                >×</button>
                                            </div>
                                        ) : (
                                            <div
                                                style={{
                                                    fontSize: el.fontSize,
                                                    color: el.color,
                                                    whiteSpace: 'pre-wrap',
                                                    fontFamily: 'sans-serif',
                                                    pointerEvents: 'none' // Let events pass to parent div
                                                }}
                                            >
                                                {el.content || <span style={{ opacity: 0.5, fontStyle: 'italic' }}>Empty Text</span>}
                                            </div>
                                        )}
                                    </div>
                                );
                            } else if (el.type === 'image') {
                                return (
                                    <div
                                        key={el.id}
                                        style={{
                                            position: 'absolute',
                                            left: el.x, top: el.y,
                                            width: el.width, height: el.height,
                                            zIndex: 5,
                                            cursor: tool === 'select' ? 'move' : 'default',
                                            border: isSelected ? '2px dashed #648cff' : 'none',
                                        }}
                                        onMouseDown={(e) => handleMouseDownObj(e, el.id)}
                                        onWheel={(e) => {
                                            if (isSelected) {
                                                e.stopPropagation();
                                                const scale = e.deltaY > 0 ? 0.95 : 1.05;
                                                setElements(prev => prev.map(item => item.id === el.id ? { ...item, width: item.width * scale, height: item.height * scale } : item));
                                            }
                                        }}
                                    >
                                        <img src={el.src} alt="obj" style={{ width: '100%', height: '100%', pointerEvents: 'none', display: 'block' }} />
                                        {isSelected && <div className="resize-hint" style={{ bottom: 'auto', top: -25 }}>Wheel to Resize</div>}
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
