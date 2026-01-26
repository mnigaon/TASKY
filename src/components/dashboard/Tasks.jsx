// src/components/dashboard/Tasks.jsx
import { useState, useEffect } from "react";
import { db, storage } from "../../firebase/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "../../firebase/AuthContext";
import "./Tasks.css";

export default function Tasks({ workspaceId = null }) {
  const { currentUser } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [file, setFile] = useState(null);

  // 실시간 Task 불러오기
  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, "tasks"), orderBy("dueDate", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || "No title",
            description: data.description || "",
            status: data.status || "pending",
            userId: data.userId,
            workspaceId: data.workspaceId || null,
            attachmentUrl: data.attachmentUrl || "",
            attachmentName: data.attachmentName || "",
            dueDate: data.dueDate?.toDate ? data.dueDate.toDate() : null,
          };
        })
        .filter(task => task.userId === currentUser.uid)
        .filter(task => (workspaceId ? task.workspaceId === workspaceId : true)); // workspaceId 필터링

      setTasks(tasksData);
    });

    return () => unsubscribe();
  }, [currentUser, workspaceId]);

  // Task 추가
  const handleAddTask = async () => {
    if (!newTask || !newDueDate || !currentUser) return;

    let fileUrl = "";
    let fileName = "";

    if (file) {
      const storageRef = ref(storage, `tasks/${currentUser.uid}/${file.name}`);
      await uploadBytes(storageRef, file);
      fileUrl = await getDownloadURL(storageRef);
      fileName = file.name;
    }

    await addDoc(collection(db, "tasks"), {
      title: newTask,
      description: newDescription,
      dueDate: Timestamp.fromDate(new Date(newDueDate)),
      createdAt: serverTimestamp(),
      status: "pending",
      userId: currentUser.uid,
      workspaceId: workspaceId, // workspaceId 저장
      attachmentUrl: fileUrl,
      attachmentName: fileName,
    });

    setNewTask("");
    setNewDescription("");
    setNewDueDate("");
    setFile(null);
  };

  // 삭제
  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "tasks", id));
  };

  // 상태 토글
  const handleToggleStatus = async (task) => {
    await updateDoc(doc(db, "tasks", task.id), {
      status: task.status === "pending" ? "completed" : "pending",
    });
  };

  // 수정
  const handleEdit = async (task) => {
    const newTitle = prompt("New title", task.title);
    const newDue = prompt(
      "New due date (YYYY-MM-DD)",
      task.dueDate ? task.dueDate.toISOString().slice(0, 10) : ""
    );
    if (!newTitle || !newDue) return;

    await updateDoc(doc(db, "tasks", task.id), {
      title: newTitle,
      dueDate: Timestamp.fromDate(new Date(newDue)),
    });
  };

  return (
    <div className="tasks">
      <h2>{workspaceId ? "Workspace Tasks" : "All Tasks"}</h2>

      {/* Task 입력폼 */}
      <div className="tasks-input">
        <input
          type="text"
          placeholder="Task title"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
        />
        <input
          type="text"
          placeholder="Description"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
        />
        <input
          type="date"
          value={newDueDate}
          onChange={(e) => setNewDueDate(e.target.value)}
        />
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <button onClick={handleAddTask}>Add</button>
      </div>

      {/* Task 목록 */}
      <ul className="tasks-list">
        {tasks.map((task) => (
          <li
            key={task.id}
            className={task.status === "completed" ? "completed" : ""}
          >
            <span onClick={() => handleToggleStatus(task)}>
              <strong>{task.title}</strong>
              {task.dueDate && (
                <small>
                  &nbsp;•&nbsp;Due:{" "}
                  {new Date(task.dueDate).toLocaleDateString()}
                </small>
              )}
              <p>{task.description || "No description"}</p>
              {task.attachmentUrl && (
                <a href={task.attachmentUrl} target="_blank" rel="noreferrer">
                  📎 {task.attachmentName || "Attachment"}
                </a>
              )}
            </span>
            <div className="task-buttons">
              <button onClick={() => handleEdit(task)}>Edit</button>
              <button onClick={() => handleDelete(task.id)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
