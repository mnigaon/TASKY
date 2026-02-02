//src/components/Headerr.jsx
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import "./Headerr.css";

function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        {/* Left: Logo */}
        <Link
          to="/"
          className="logo"
          onClick={() => {
            if (window.location.pathname === "/") {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
        >
          <img src={logo} alt="Dayzzy Logo" className="logo-img" />
        </Link>

        {/* Right: Nav */}
        <nav className="nav">
          <Link to="/contact" className="nav-link">
            Contact
          </Link>
          <Link to="/auth" className="nav-button">
            Go To My Account
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default Header;
