import "./FeatureCards.css";
import Img1 from "../assets/Featurecard-1.png";
import Img2 from "../assets/Featurecard-2.png";
import Img3 from "../assets/Featurecard-3.png";

function FeatureCard() {
  const cards = [
    {
      img: Img1,
      title: "AESTHETIC DECO",
      description:
        "Beautiful and kitsch design that makes organization feel like decorating your favorite journal.",
    },
    {
      img: Img2,
      title: "ZAZZY TOOLS",
      description:
        "From sticker tasks to focus gardens, everything you need to build your dream routine.",
    },
    {
      img: Img3,
      title: "CREATIVE FOCUS",
      description:
        "Stay productive while staying inspired. The only workspace that understands your style.",
    },
  ];

  return (
    <section className="callout">

      <h1 className="callout-header">
        Designed for creators. Built for your best self.
      </h1>

      <p className="callout-sub">
        Dayzzy keeps things fun so you can plan your day, stay inspired,
        and get more done in style.
      </p>

      <div className="callout-container">
        {cards.map((card, index) => (
          <div className="callout-card" key={index}>
            <div className="card-image">
              <img src={card.img} alt={card.title} />
            </div>
            <h3 className="card-title">{card.title}</h3>
            <p className="card-description">{card.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default FeatureCard;
