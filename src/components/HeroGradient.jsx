import { useNavigate } from "react-router-dom";
import "./HeroGradient.css";

function HeroGradient() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/auth/register");
  };

  return (
    <section className="hero-gradient">
      <div className="hero-gradient-card">
        <h2 className="hero-gradient-title">
          Join the Dayzzy universe and start your journey
        </h2>

        <div className="hero-gradient-buttons">
          <button className="hero-button primary" onClick={handleGetStarted}>
            Get Started for Free
          </button>
        </div>
      </div>
    </section>
  );
}

export default HeroGradient;

