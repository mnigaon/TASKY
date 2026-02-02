// src/components/auth/Register.jsx
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";
import "./Register.css";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const auth = getAuth();

  const handleRegister = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
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

