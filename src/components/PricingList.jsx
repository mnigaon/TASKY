import "./PricingList.css";

const plans = [
  {
    label: "Petal",
    name: "For the casual deco",
    price: "Free",
    features: ["Task Management", "Basic Deco", "Community Access"]
  },
  {
    label: "Bloom",
    name: "For the aesthetic pro",
    price: "$5/mo",
    features: ["Sticker Tasks", "Focus Garden Pro", "Custom Themes"]
  },
  {
    label: "Bouquet",
    name: "The full experience",
    price: "$12/mo",
    features: ["All Zazzy Tools", "Priority Support", "Exclusive Stickers"]
  }
];

function PricingList() {
  return (
    <section className="pricing-section">
      <h2 className="pricing-header">PRICING PLANS</h2>
      <div className="pricing-grid">
        {plans.map((plan, index) => (
          <div className="pricing-card" key={index}>
            <span className="plan-label">{plan.label}</span>
            <h3 className="plan-name">{plan.name}</h3>
            <p className="price">{plan.price}</p>
            <ul className="features">
              {plan.features.map((feature, idx) => (
                <li key={idx}>
                  <span className="check">✔</span>
                  {feature}
                </li>
              ))}
            </ul>
            <button className="pricing-button">Choose Plan</button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default PricingList;
