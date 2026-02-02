// src/components/mobile/common/MobileStatCard.jsx
import './MobileStatCard.css';

export default function MobileStatCard({ icon, value, label, color = '#648cff' }) {
    return (
        <div className="mobile-stat-card" style={{ borderTopColor: color }}>
            <div className="mobile-stat-icon" style={{ color }}>
                {icon}
            </div>
            <div className="mobile-stat-value">{value}</div>
            <div className="mobile-stat-label">{label}</div>
        </div>
    );
}
