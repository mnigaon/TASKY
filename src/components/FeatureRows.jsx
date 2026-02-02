import "./FeatureRows.css";
import feature1 from "../assets/FeatureRow-1.png";
import feature2 from "../assets/FeatureRow-2.png";
import feature3 from "../assets/FeatureRow-3.png";
import feature4 from "../assets/FeatureRow-4.png";

function FeatureRows() {
  return (
    <section className="feature-rows">

      {/* ================= Row 1 ================= */}
      <div className="feature-row">
        <div className="feature-block feature-text">
          <h2>Design Your Perfect Day</h2>
          <p>
            Organization doesn't have to be boring. Use our kitsch Kanban boards
            to drag, drop, and decorate your way to a more productive you.
          </p>
        </div>
        <div className="feature-block feature-image">
          <img src={feature1} alt="Task organization" />
        </div>
      </div>


      {/* ================= Row 2 ================= */}
      <div className="feature-row">
        <div className="feature-block feature-image">
          <img src={feature2} alt="Focus timer" />
        </div>
        <div className="feature-block feature-text">
          <h2>Grow Your Focus Garden</h2>
          <p>
            Plant seeds of productivity with our aesthetic Pomodoro timer.
            Watch your focus bloom into beautiful results.
          </p>
        </div>
      </div>


      {/* ================= Row 3 ================= */}
      <div className="feature-row">
        <div className="feature-block feature-text">
          <h2>Curated Workspaces</h2>
          <p>
            Create unique zones for your hobbies, studies, and life.
            Every space is a fresh canvas for your creativity.
          </p>
        </div>
        <div className="feature-block feature-image">
          <img src={feature3} alt="Workspaces" />
        </div>
      </div>


      {/* ================= Row 4 ================= */}
      <div className="feature-row">
        <div className="feature-block feature-image">
          <img src={feature4} alt="Reports and stats" />
        </div>
        <div className="feature-block feature-text">
          <h2>Celebrate Your Zazzy Stats</h2>
          <p>
            Track your journey with pretty charts and reports.
            See how much you've grown and keep that momentum going!
          </p>
        </div>
      </div>

    </section>
  );
}

export default FeatureRows;
