import { useAuth } from "../../firebase/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/firebase";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

export default function Dashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate(); // navigate 추가

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/"); // 로그아웃 후 메인페이지로 이동
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <h2>TASKY</h2>
        <ul>
          <li>Tasks</li>
          <li>Projects</li>
          <li>Settings</li>
          <li onClick={handleLogout} className="logout-btn">Logout</li>
        </ul>
      </aside>

      <main className="main-content">
        <h1>Welcome, {currentUser?.displayName || currentUser?.email}</h1>

        <div className="cards">
          <div className="card">Today's Tasks</div>
          <div className="card">Ongoing Projects</div>
          <div className="card">Recent Activity</div>
        </div>
      </main>
    </div>
  );
}
