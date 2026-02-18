// src/components/auth/Register.jsx
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import logo from "../../assets/logo.png";
import "./Register.css";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const auth = getAuth();

  const handleRegister = async () => {
    if (!name.trim()) {
      alert("Please enter your name.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 1. Auth Profile 업데이트
      await updateProfile(user, {
        displayName: name,
      });

      // 2. Firestore에 사용자 정보 저장
      await setDoc(doc(db, "users", user.uid), {
        displayName: name,
        email: user.email,
        createdAt: serverTimestamp(),
        uid: user.uid, // 명시적으로 uid 저장 (선택사항이나 유용함)
      });

      navigate("/dashboard");
    } catch (error) {
      console.error("Registration failed:", error);
      alert(error.message);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img src={logo} alt="Dayzzy Logo" className="auth-logo" />
        <h1>Create Account</h1>
        <p className="auth-subtitle">Join the kitsch workspace community ✨</p>

        <input
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Create Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="auth-button" onClick={handleRegister}>
          Sign Up Now
        </button>

        <p>
          Already a member?
          <span className="auth-link" onClick={() => navigate("/auth")}>
            Login here
          </span>
        </p>
      </div>
    </div>
  );
}

export default Register;

