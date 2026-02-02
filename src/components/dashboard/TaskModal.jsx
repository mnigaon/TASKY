// src/components/dashboard/TaskModal.jsx
import { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { db, storage } from "../../firebase/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  onSnapshot,
  orderBy,
  serverTimestamp,
  Timestamp,
  getDoc,
  where,
  getDocs,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import "./TaskModal.css";
import CommentEditModal from "./CommentEditModal";
import { formatDate } from "../../utils/dateFormat";

/* 🔥 GOOGLE MAPS */
import { GoogleMap, Marker, Autocomplete, useJsApiLoader } from "@react-google-maps/api";

const LIBRARIES = ["places"];
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

export default function TaskModal({
  task,
  onClose,
  currentUser,
  workspaceTitle,
  workspaceMap,
  setActiveTab,
  setActiveWorkspace,
  categoryId, // New prop
}) {
  const header = workspaceTitle || (task.workspaceId ? workspaceMap?.[task.workspaceId] : null) || "Individual";

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");

  // Replace recurrence with category
  // const [recurrence, setRecurrence] = useState("none"); 
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [color, setColor] = useState("#648cff");
  const [status, setStatus] = useState("pending");
  const [endDueDate, setEndDueDate] = useState("");

  const [showMap, setShowMap] = useState(false);
  const [mapPosition, setMapPosition] = useState(null);

  // 🔹 API Key Safety Check
  const apiKey = GOOGLE_MAPS_API_KEY || "";
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
    preventGoogleFontsLoading: true // Optional optimization
  });
  const [autocomplete, setAutocomplete] = useState(null);

  const onAutocompleteLoad = (autocomp) => setAutocomplete(autocomp);
  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setMapPosition({ lat, lng });
        setLocation(place.formatted_address || place.name);
      }
    }
  };
  const onMapClick = (e) => setMapPosition({ lat: e.latLng.lat(), lng: e.latLng.lng() });

  const [existingFiles, setExistingFiles] = useState([]);
  const [newFiles, setNewFiles] = useState([]);

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [commentUserMap, setCommentUserMap] = useState({}); // { userId: { name, email } }
  const [file, setFile] = useState(null);
  const [editingComment, setEditingComment] = useState(null);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title || "");
    setDesc(task.description || "");
    setStatus(task.status || "pending");
    setStartTime(task.startTime || "");
    setEndTime(task.endTime || "");
    setLocation(task.location || "");

    // Set Category
    let initialCatId = task.categoryId || categoryId || "";
    if (initialCatId === "uncategorized") initialCatId = "";
    setSelectedCategoryId(initialCatId); // Use prop as default for new tasks
    setColor(task.color || "#648cff");
    if (task.locationLat && task.locationLng) setMapPosition({ lat: task.locationLat, lng: task.locationLng });
    const d = task.dueDate?.toDate?.();
    if (d) setDueDate(d.toISOString().slice(0, 10));
    const ed = task.endDueDate?.toDate?.();
    if (ed) setEndDueDate(ed.toISOString().slice(0, 10));
    else setEndDueDate("");
    setExistingFiles(task.attachments || (task.attachmentUrl ? [{ url: task.attachmentUrl, name: task.attachmentName }] : []));
    setNewFiles([]);
  }, [task]);

  // 🔹 댓글 실시간 구독 및 유저 정보 매핑
  useEffect(() => {
    if (!task?.id) return;
    const q = query(collection(db, "tasks", task.id, "comments"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, async (snap) => {
      const fetchedComments = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.(),
      }));
      setComments(fetchedComments);

      // 작성자들의 정보가 commentUserMap에 없는 경우 실시간 조회
      const uniqueUserIds = [...new Set(fetchedComments.map(c => c.userId))].filter(id => id && !commentUserMap[id]);
      if (uniqueUserIds.length > 0) {
        try {
          const newMap = { ...commentUserMap };
          for (const uid of uniqueUserIds) {
            const uDoc = await getDoc(doc(db, "users", uid));
            if (uDoc.exists()) {
              newMap[uid] = {
                name: uDoc.data().displayName,
                email: uDoc.data().email
              };
            }
          }
          setCommentUserMap(newMap);
        } catch (err) {
          console.error("Error fetching comment users:", err);
        }
      }
    });
    return () => unsubscribe();
  }, [task?.id]);


  // Load Categories
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "categories"), where("userId", "==", currentUser.uid));
    getDocs(q).then(snap => {
      const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      loaded.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setCategories(loaded);
    });
  }, [currentUser]);

  const handleSave = async () => {
    const uploadedFiles = [];
    for (const f of newFiles) {
      const r = ref(storage, `tasks/${currentUser.uid}/${Date.now()}_${f.name}`);
      await uploadBytes(r, f);
      const url = await getDownloadURL(r);
      uploadedFiles.push({ url, name: f.name });
    }
    const finalAttachments = [...existingFiles, ...uploadedFiles];
    let finalDueDate = null;
    if (dueDate) {
      const [y, m, d] = dueDate.split('-').map(Number);
      finalDueDate = Timestamp.fromDate(new Date(y, m - 1, d));
    }
    let finalEndDueDate = null;
    if (endDueDate) {
      const [y, m, d] = endDueDate.split('-').map(Number);
      finalEndDueDate = Timestamp.fromDate(new Date(y, m - 1, d));
    }
    const taskData = {
      title, description: desc, status, dueDate: finalDueDate, endDueDate: finalEndDueDate, startTime, endTime, location,
      locationLat: mapPosition ? mapPosition.lat : null, locationLng: mapPosition ? mapPosition.lng : null,
      recurrence: "none", // Deprecated
      categoryId: selectedCategoryId, // Save Category ID
      color, attachments: finalAttachments,
      attachmentUrl: finalAttachments[0]?.url || "", attachmentName: finalAttachments[0]?.name || ""
    };
    if (task.id) await updateDoc(doc(db, "tasks", task.id), taskData);
    else await addDoc(collection(db, "tasks"), { ...taskData, userId: currentUser.uid, workspaceId: task.workspaceId || null, createdAt: serverTimestamp(), order: Date.now() });
    onClose();
  };

  const handleDeleteTask = async () => {
    if (!task.id) { onClose(); return; }
    if (!window.confirm("Deleted files cannot be recovered 😈")) return;
    await deleteDoc(doc(db, "tasks", task.id));
    onClose();
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (existingFiles.length + newFiles.length + files.length > 3) { alert("Up to 3 files can be uploaded. 📁"); return; }
    setNewFiles(prev => [...prev, ...files]);
  };

  const addComment = async () => {
    if (!task?.id) { alert("Please save the task first."); return; }
    if (!newComment && !file) return;
    let fileUrl = "", fileName = "";
    if (file) {
      const r = ref(storage, `comments/${currentUser.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(r, file);
      fileUrl = await getDownloadURL(r);
      fileName = file.name;
    }
    await addDoc(collection(db, "tasks", task.id, "comments"), {
      text: newComment,
      userId: currentUser.uid,
      userName: currentUser.displayName || currentUser.email.split('@')[0], // 백업용 저장
      userEmail: currentUser.email,
      attachmentUrl: fileUrl,
      attachmentName: fileName,
      createdAt: serverTimestamp(),
    });
    setNewComment(""); setFile(null);
  };

  const formatTime = (d) => (d ? d.toLocaleString() : "");

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-paper">
          <button className="close-x" onClick={onClose}>✕</button>

          <div className="task-modal-scroll-area">
            <header className={`modal-workspace-header ${task.workspaceId ? 'clickable' : ''}`} onClick={() => {
              if (task.workspaceId && setActiveTab && setActiveWorkspace) {
                setActiveWorkspace({ id: task.workspaceId, name: workspaceMap?.[task.workspaceId] || workspaceTitle });
                setActiveTab("workspace"); onClose();
              }
            }}>
              {task.workspaceId ? "📁" : "👤"} <span>{header}</span>
            </header>

            <div className="task-section">
              <input className="task-title-input" placeholder="What needs to be done?" value={title} onChange={e => setTitle(e.target.value)} />
              <textarea className="task-desc-textarea" placeholder="Add some details..." value={desc} onChange={e => setDesc(e.target.value)} />
              <div className="task-row">
                <div className="input-group">
                  <label>📅 Start Date</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
                <div className="input-group">
                  <label>🏁 End Date</label>
                  <input type="date" value={endDueDate} onChange={e => setEndDueDate(e.target.value)} />
                </div>
                <div className="input-group">
                  <label>🕒 From</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
                <div className="input-group">
                  <label>🕒 To</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
              </div>
              <div className="task-location-container">
                <div className="task-location-row">
                  <input type="text" placeholder="📍 Add a location or click map" value={location} onChange={e => setLocation(e.target.value)} />
                  <button className="btn ghost" onClick={() => setShowMap(!showMap)}>{showMap ? "Hide Map" : "🗺 Map"}</button>
                </div>
              </div>
              {showMap && (
                <div className="map-wrapper">
                  {!isLoaded ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                      Loading Maps... {apiKey ? "" : "(Check API Key)"}
                    </div>
                  ) : (
                    <>
                      <div className="map-search-box" style={{ marginBottom: '10px' }}>
                        <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
                          <input type="text" placeholder="🔍 Search for a place..." />
                        </Autocomplete>
                      </div>
                      <div style={{ height: "200px", borderRadius: "12px", overflow: "hidden" }}>
                        <GoogleMap
                          mapContainerStyle={{ width: "100%", height: "100%" }}
                          center={mapPosition || { lat: 37.5665, lng: 126.9780 }}
                          zoom={15}
                          onClick={onMapClick}
                          options={{ disableDefaultUI: true, zoomControl: true }}
                        >
                          {mapPosition && <Marker position={mapPosition} />}
                        </GoogleMap>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="task-row">
              <select
                value={selectedCategoryId}
                onChange={e => setSelectedCategoryId(e.target.value)}
                style={{ fontWeight: '600', color: '#555' }}
              >
                <option value="">📂 No Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>📂 {cat.name}</option>
                ))}
              </select>

              <select value={color} onChange={e => setColor(e.target.value)} style={{ color, fontWeight: '800' }}>
                <option value="#648cff">🔵 Blue Label</option><option value="#10b981">🟢 Green Label</option><option value="#ef4444">🔴 Red Label</option><option value="#f59e0b">🟠 Orange Label</option><option value="#8b5cf6">🟣 Purple Label</option>
              </select>
              <select value={status} onChange={e => setStatus(e.target.value)}>
                <option value="pending">📝 To-do</option><option value="progress">⏳ In Progress</option><option value="completed">✅ Done</option>
              </select>
            </div>
            <div className="file-section">
              <div className="file-list">
                {existingFiles.map((f, i) => (
                  <div key={`exist-${i}`} className="file-item">
                    <a href={f.url} target="_blank" rel="noreferrer" className="file-name" title={f.name}>📎 {f.name}</a>
                    <button className="remove-file-btn" onClick={() => setExistingFiles(prev => prev.filter((_, idx) => idx !== i))}>✕</button>
                  </div>
                ))}
                {newFiles.map((f, i) => (
                  <div key={`new-${i}`} className="file-item" style={{ borderColor: 'var(--modal-accent)' }}>
                    <span className="file-name" title={f.name}>📄 {f.name}</span>
                    <button className="remove-file-btn" onClick={() => setNewFiles(prev => prev.filter((_, idx) => idx !== i))}>✕</button>
                  </div>
                ))}
              </div>
              {existingFiles.length + newFiles.length < 3 && (
                <div className="upload-button-wrapper">
                  <label className="custom-file-upload">
                    <span>➕ Add File (Max 3)</span>
                    <input type="file" multiple className="hidden-file-input" onChange={handleFileChange} />
                  </label>
                </div>
              )}
            </div>
            <div className="task-actions">
              {task.id && <button className="btn danger" onClick={handleDeleteTask}>Delete Task</button>}
              <button className="btn primary" onClick={handleSave}>{task.id ? "Update Task" : "Create Task"}</button>
            </div>

            <hr className="task-modal-divider" />

            <section className="comments-section">
              <h3>Comments</h3>
              <ul className="comments-list">
                {comments.map((c) => {
                  const isMe = c.userId === currentUser.uid;
                  const userInfo = commentUserMap[c.userId] || { name: c.userName, email: c.userEmail };
                  const displayName = isMe ? "You" : (userInfo.name || "User");
                  const initial = (userInfo.email?.[0] || userInfo.name?.[0] || "U").toUpperCase();

                  return (
                    <li key={c.id}>
                      <div className="avatar" title={userInfo.email || displayName}>{initial}</div>
                      <div className="comment-body">
                        <header className="comment-meta"><strong>{displayName}</strong> • {formatTime(c.createdAt)}</header>
                        <p>{c.text}</p>
                        {c.attachmentUrl && <div className="file-list" style={{ marginTop: '8px' }}><div className="file-item"><a href={c.attachmentUrl} target="_blank" rel="noreferrer">📎 {c.attachmentName}</a></div></div>}
                        {isMe && (
                          <div className="comment-actions">
                            <button className="icon-btn" onClick={() => setEditingComment(c)} title="Edit">✏️</button>
                            <button className="icon-btn delete" onClick={() => deleteDoc(doc(db, "tasks", task.id, "comments", c.id))} title="Delete">🗑</button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="add-comment">
                <div className="comment-input-area">
                  <textarea placeholder="Write a thought or update..." rows="2" value={newComment} onChange={e => setNewComment(e.target.value)} />
                  <div className="add-comment-actions">
                    <label className="custom-file-upload mini" style={{ padding: '6px 12px', fontSize: '11px', borderStyle: 'solid', borderWidth: '1px' }}>
                      <span>{file ? "📄 " + file.name : "📎 Attach File"}</span>
                      <input type="file" className="hidden-file-input" onChange={e => setFile(e.target.files[0])} />
                    </label>
                    <button onClick={addComment} className="btn primary" style={{ padding: '8px 20px', fontSize: '12px' }}>Post Comment</button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
      {editingComment && <CommentEditModal taskId={task.id} comment={editingComment} currentUser={currentUser} onClose={() => setEditingComment(null)} />}
    </div>,
    document.body
  );
}
