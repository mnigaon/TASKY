import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../firebase/AuthContext";
import { auth } from "../../../firebase/firebase";
import {
  updateProfile,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";

export default function ProfileCard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser?.displayName) {
      setName(currentUser.displayName);
    }
  }, [currentUser]);

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      setLoading(true);
      await updateProfile(auth.currentUser, { displayName: name });
      alert("Name change completed 👍");
    } catch (err) {
      console.error(err);
      alert("Change failed 😢");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    try {
      await sendPasswordResetEmail(auth, currentUser?.email);
      alert("Password reset email sent 📬");
    } catch (err) {
      alert("Email transmission failed 😢");
    }
  };

  const handleLogout = async () => {
    if (!window.confirm("Logout?")) return;
    await signOut(auth);
    navigate("/", { replace: true });
  };

  if (!currentUser) return null;

  return (
    <div className="settings-card id-card">
      <div className="id-card-header">
        <span>👤 Profile ID Card</span>
        <span>DAYZZY OS v1.0</span>
      </div>

      <div className="id-card-body">
        <div className="id-photo-area">
          {name ? name[0].toUpperCase() : "👤"}
        </div>

        <div className="id-info-area">
          <h3 style={{ borderBottom: '2px dashed #e2e8f0', paddingBottom: '10px', marginBottom: '20px' }}>
            Profile Settings
          </h3>

          <div className="profile-field">
            <label>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="profile-field">
            <label>Email ID</label>
            <input value={currentUser.email} disabled style={{ opacity: 0.6 }} />
          </div>

          <div className="id-card-actions" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 15 }}>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={loading}
            >
              Save Changes
            </button>

            <button
              className="btn-ghost"
              onClick={handlePasswordReset}
            >
              Reset PW
            </button>

            <button
              className="btn-danger"
              onClick={handleLogout}
              style={{ marginLeft: "auto" }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
