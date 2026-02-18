import { useState, useEffect } from "react";
import { db } from "../../firebase/firebase";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "../../firebase/AuthContext";
import "./CategoryList.css";

export default function CategoryList({ onSelectCategory }) {
    const { currentUser } = useAuth();
    const [categories, setCategories] = useState([]);
    const [tasks, setTasks] = useState([]);

    // Fetch Tasks for Progress Calculation
    useEffect(() => {
        if (!currentUser) return;
        const q = query(collection(db, "tasks"), where("userId", "==", currentUser.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setTasks(snapshot.docs.map(d => d.data()));
        });
        return () => unsubscribe();
    }, [currentUser]);

    const getProgress = (catId) => {
        const catTasks = tasks.filter(t =>
            catId === "uncategorized" ? !t.categoryId : t.categoryId === catId
        );
        if (catTasks.length === 0) return 0;
        const completed = catTasks.filter(t => t.status === "completed").length;
        return Math.round((completed / catTasks.length) * 100);
    };

    const CircularProgress = ({ percent }) => {
        const radius = 18;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percent / 100) * circumference;

        return (
            <div className="progress-circle">
                <svg width="44" height="44" viewBox="0 0 44 44">
                    <circle
                        className="bg"
                        cx="22" cy="22" r={radius}
                        fill="none" strokeWidth="4"
                    />
                    <circle
                        className="fg"
                        cx="22" cy="22" r={radius}
                        fill="none" strokeWidth="4"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                    />
                </svg>
                <span className="progress-text">{percent}%</span>
            </div>
        );
    };

    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, "categories"),
            where("userId", "==", currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Client-side sort to avoid composite index requirement
            loaded.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
            setCategories(loaded);
        }, (error) => {
            console.error("Error fetching categories:", error);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleCreateCategory = async () => {
        const name = prompt("Enter category name:");
        if (!name || !name.trim()) return;

        try {
            await addDoc(collection(db, "categories"), {
                userId: currentUser.uid,
                name: name.trim(),
                createdAt: serverTimestamp(),
                color: "#ffeb3b" // Default connection color
            });
        } catch (error) {
            console.error("Error creating category:", error);
            alert("Failed to create category");
        }
    };

    const handleDeleteCategory = async (e, catId) => {
        e.stopPropagation();
        if (!window.confirm("Delete this category? Associated tasks won't be deleted but will be hidden from this view.")) return;

        try {
            await deleteDoc(doc(db, "categories", catId));
        } catch (error) {
            console.error("Error deleting category:", error);
        }
    };

    return (
        <div className="category-list-container">
            <div className="category-grid">
                {/* No Category Card */}
                <div
                    className="category-card sticky-note no-category"
                    onClick={() => onSelectCategory({ id: "uncategorized", name: "No Category", color: "#e0e0e0" })}
                    style={{ "--cat-color": "#e0e0e0", "--rotate": "-2deg" }}
                >
                    <div className="pin">📍</div>
                    <h3>🚫 No Category</h3>
                    <CircularProgress percent={getProgress("uncategorized")} />
                    <div className="cat-footer">
                        <span className="open-btn">Open Board ➔</span>
                    </div>
                </div>

                {/* Existing Categories */}
                {categories.map((cat, index) => (
                    <div
                        key={cat.id}
                        className="category-card sticky-note"
                        onClick={() => onSelectCategory(cat)}
                        style={{
                            "--cat-color": cat.color || "#ffeb3b",
                            "--rotate": `${(index % 4 - 1.5) * 2}deg`
                        }}
                    >
                        <div className="tape"></div>
                        <h3>{cat.name}</h3>
                        <CircularProgress percent={getProgress(cat.id)} />
                        <div className="cat-footer">
                            <span className="open-btn">Open Board ➔</span>
                            <button className="delete-btn" onClick={(e) => handleDeleteCategory(e, cat.id)}>✕</button>
                        </div>
                    </div>
                ))}

                {/* Create New Card (Moved to End, Icon Only) */}
                <div
                    className="category-card sticky-note create-card"
                    onClick={handleCreateCategory}
                    style={{ "--cat-color": "#fff", "--rotate": "1deg" }}
                    title="Create New Category"
                >
                    <div className="plus-icon">+</div>
                </div>
            </div>
        </div>
    );
}
