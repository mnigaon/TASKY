import "./Logoslider.css";
import stickers from "../assets/stickers.png";

function Logoslider() {
  return (
    <section className="testimonial">
      <p className="testimonial-text">
        Loved by 10,000+ Aesthetic Creators & Journal Lovers
      </p>
      <div className="logo-slider">
        <div className="slider-track">
          {[...Array(10)].map((_, index) => (
            <div className="logo-item" key={index}>
              <img src={stickers} alt={`sticker-${index}`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Logoslider;