import "./TestimonialWall.css";

const testimonials = [
  {
    title: "Vibey & Productive",
    content: "Dayzzy made my life so much more aesthetic. Managing tasks feels like a mood now!",
    author: "Sophie"
  },
  {
    title: "Sticker Obsessed",
    content: "I love how I can deco my day. It's the only app that doesn't feel like a chore.",
    author: "Mina"
  },
  {
    title: "Focus is Real",
    content: "The focus garden is so cute. I've actually started finishing my assignments on time LOL.",
    author: "Kevin"
  },
  {
    title: "Actually Zazzy",
    content: "Total game changer. No more boring lists, just pure zazzy vibes.",
    author: "Zoe"
  }
];


function TestimonialWall() {
  return (
    <section className="testimonial-wall">
      <h2 className="testimonial-header">Loved by the Dayzzy Community</h2>
      <div className="testimonial-grid">
        {testimonials.map((t, index) => (
          <div className="testimonial-card" key={index}>
            <h3>{t.title}</h3>
            <p>{t.content}</p>
            <span className="author">- {t.author}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default TestimonialWall;
