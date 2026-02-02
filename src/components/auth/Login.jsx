import { useEffect } from "react"; // Added useEffect
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../../firebase/firebase";
import { useAuth } from "../../firebase/AuthContext"; // Added useAuth
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const { currentUser } = useAuth(); // AuthContext에서 사용자 상태 가져오기

  // 사용자가 로그인된 상태라면 대시보드로 이동
  useEffect(() => {
    if (currentUser) {
      navigate("/dashboard");
    }
  }, [currentUser, navigate]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      // 여기서는 navigate 하지 않음 (useEffect가 처리)
    } catch (error) {
      console.error("Login failed:", error);
      alert("Login failed. Try again.");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img src={logo} alt="Dayzzy Logo" className="auth-logo" />
        <h1>Welcome Back</h1>
        <p className="auth-subtitle">Plan your day with aesthetic joy ✨</p>

        <button className="auth-button google" onClick={handleGoogleLogin}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" width="20" />
          Sign in with Google
        </button>

        <p>
          Need a fresh start?
          <span className="auth-link" onClick={() => navigate("/auth/register")}>
            Create Account
          </span>
        </p>
      </div>
    </div>
  );
}

export default Login;
