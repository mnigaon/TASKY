import { useNavigate } from "react-router-dom";
import "./Hero.css";

function Hero() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/auth/register");
  };

  return (
    <section className="hero" id="hero">
      <div className="hero-container">
        {/* Left: Text Content */}
        <div className="hero-text">
          <h1 className="hero-title">
            Decorate Your Day.<br />
            <span className="text-gradient">Master Your Life.</span>
          </h1>
          <p className="hero-subtitle">
            Dayzzy is your kitsch workspace where productivity meets aesthetic. <br />
            Plan, deco, and focus in your own zazzy style.
          </p>
          <button className="hero-button" onClick={handleGetStarted}>
            Start Your Journey
          </button>
        </div>

        {/* Right: Floating Planner Visual */}
        <div className="hero-visual">
          <div className="planner-scene">
            {/* 1. Floating Clipboard */}
            <div className="float-item clipboard">
              <div className="clip-top"></div>
              <div className="paper">
                <div className="line title"></div>
                <div className="check-row">
                  <div className="box checked">✔</div>
                  <div className="line"></div>
                </div>
                <div className="check-row">
                  <div className="box checked">✔</div>
                  <div className="line"></div>
                </div>
                <div className="check-row">
                  <div className="box"></div>
                  <div className="line"></div>
                </div>
              </div>
            </div>

            {/* 2. Floating Calendar */}
            <div className="float-item calendar">
              <div className="cal-header">
                <span className="cal-month">MAY</span>
              </div>
              <div className="cal-grid">
                <div className="cal-day"></div><div className="cal-day"></div>
                <div className="cal-day"></div><div className="cal-day active"></div>
                <div className="cal-day"></div><div className="cal-day"></div>
              </div>
            </div>

            {/* 3. Sticky Notes */}
            <div className="float-item sticky-note pink">
              <span>Goal!</span>
            </div>
            <div className="float-item sticky-note yellow">
              <span>★</span>
            </div>

            {/* 4. Floating Pencil */}
            <div className="float-item pencil">
              <div className="eraser"></div>
              <div className="body"></div>
              <div className="tip"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
