import { useState } from "react";
import { FiPlus, FiMinus } from "react-icons/fi";
import "./FAQ.css";

const faqData = [
  {
    q: "What is Dayzzy?",
    a: "Dayzzy is your aesthetic productivity companion. It's a kitsch workspace designed for creators, students, and anyone who wants to organize their day with style."
  },
  {
    q: "Is it really free?",
    a: "Yas! All our core zazzy features are completely free. We want everyone to enjoy a more beautiful and organized life."
  },
  {
    q: "Can I deco my workspace?",
    a: "Absolutely! From custom workspaces to sticker-style tasks, Dayzzy is built for you to express your unique vibe while staying on top of your goals."
  },
  {
    q: "Will it help me focus?",
    a: "Definitely. Our aesthetic Focus Garden timer and clean Kanban boards are designed to keep you in the zone without the boring clutter."
  },
  {
    q: "Is my data safe?",
    a: "100%. We take security seriously, so your personal journey is always protected."
  },
  {
    q: "Can I collaborate with my team?",
    a: "Yes! In co-op projects, you can chat with your teammates in real-time. Share ideas, discuss tasks, and stay connected while working together on your goals."
  }
];


export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section className="faq-section">
      <h2 className="faq-title">Any Questions?</h2>

      {faqData.map((item, index) => {
        const isOpen = openIndex === index;

        return (
          <div
            key={index}
            className={`faq-item ${isOpen ? "open" : ""}`}
            onClick={() => setOpenIndex(isOpen ? null : index)}
          >
            <div className="faq-question-row">
              <span className="faq-question">{item.q}</span>
              <span className="faq-icon">
                {isOpen ? <FiMinus /> : <FiPlus />}
              </span>
            </div>

            <div
              className="faq-answer-wrapper"
              style={{
                maxHeight: isOpen ? "200px" : "0px"
              }}
            >
              <div className="faq-answer">{item.a}</div>
            </div>
          </div>
        );
      })}
    </section>
  );
}

