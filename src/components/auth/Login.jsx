// src/components/auth/Login.jsx
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../../firebase/firebase";
import { useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      navigate("/dashboard"); // 로그인 성공 시 이동
    } catch (error) {
      console.error("Login failed:", error);
      alert("Login failed. Try again.");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Login to TASKY</h1>
        <button className="auth-button google" onClick={handleGoogleLogin}>
          Sign in with Google
        </button>
        <p>
          Don't have an account?{" "}
          <span className="auth-link" onClick={() => navigate("/auth/register")}>
            Register
          </span>
        </p>
      </div>
    </div>
  );
}

export default Login;
