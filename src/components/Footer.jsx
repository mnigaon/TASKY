import "./Footer.css";
import logo from "../assets/logo.png";
import { Link } from "react-router-dom";
import { FaGithub, FaLinkedinIn, FaInstagram } from "react-icons/fa";
import { BsTwitterX } from "react-icons/bs";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-left">
        <Link
          to="/"
          className="footer-logo"
          onClick={() => {
            if (window.location.pathname === "/") {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
        >
          <img src={logo} alt="Dayzzy Logo" className="footer-logo-img" />
        </Link>
        <p className="footer-tagline">Decorate your day, master your life.</p>
        <div className="social-links">
          <a href="/" onClick={(e) => e.preventDefault()} aria-label="Instagram">
            <FaInstagram />
          </a>

          <a href="#" onClick={(e) => e.preventDefault()} aria-label="X">
            <BsTwitterX />
          </a>

          <a href="#" onClick={(e) => e.preventDefault()} aria-label="GitHub">
            <FaGithub />
          </a>

          <a href="#" onClick={(e) => e.preventDefault()} aria-label="LinkedIn">
            <FaLinkedinIn />
          </a>
        </div>
      </div>
      <div className="footer-right">
        <div className="footer-links">
          <div className="link-group">
            <h4>Features</h4>
            <ul>
              <li><a href="#">Sticker Planning</a></li>
              <li><a href="#">Garden Timer</a></li>
              <li><a href="#">Creative Journaling</a></li>
            </ul>
          </div>
          <div className="link-group">
            <h4>Universe</h4>
            <ul>
              <li><a href="#">Aesthetic Blog</a></li>
              <li><a href="#">Sticker Shop</a></li>
              <li><a href="#">Creator Community</a></li>
            </ul>
          </div>
          <div className="link-group">
            <h4>Support</h4>
            <ul>
              <li><a href="#">Help Center</a></li>
              <li><a href="#">Contact</a></li>
              <li><a href="#">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
