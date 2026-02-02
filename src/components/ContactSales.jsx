import { useRef } from "react";
import emailjs from "emailjs-com";
import "./ContactSales.css";

export default function ContactSales() {
  const form = useRef();

  const sendEmail = (e) => {
    e.preventDefault();

    emailjs.sendForm(
      "service_tga0uyi",
      "template_lhkjqsa",
      form.current,
      "fl41_kqu9IEPE1TlJ"
    ).then(
      () => {
        alert("Message sent successfully");
        form.current.reset();
      },
      (error) => {
        alert("Failed to send message");
        console.error(error);
      }
    );
  };

  return (
    <section className="contact-sales">
      <div className="contact-header">
        <h1>Say Hello to Dayzzy</h1>
        <p>Have ideas, vibes, or questions? <br />
          We’re all ears for your aesthetic feedback and feature dreams.</p>
      </div>

      <form ref={form} onSubmit={sendEmail} className="contact-form">
        <input type="text" name="user_name" placeholder="Your Name" required />
        <input type="email" name="user_email" placeholder="Your Email" required />
        <input type="text" name="subject" placeholder="What's the vibe? (Subject)" />
        <textarea name="message" placeholder="Write your magic here..." required />

        <button type="submit" className="contact-button">Send It!</button>
      </form>
    </section>
  );
}
