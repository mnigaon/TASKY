// src/components/mobile/common/MobileCard.jsx
import './MobileCard.css';

export default function MobileCard({
    title,
    subtitle,
    badge,
    icon,
    onClick,
    children,
    className = ''
}) {
    return (
        <div className={`mobile-card ${className}`} onClick={onClick}>
            {icon && <div className="mobile-card-icon">{icon}</div>}
            <div className="mobile-card-content">
                <div className="mobile-card-header">
                    <h3 className="mobile-card-title">{title}</h3>
                    {badge && <span className="mobile-card-badge">{badge}</span>}
                </div>
                {subtitle && <p className="mobile-card-subtitle">{subtitle}</p>}
                {children}
            </div>
            {onClick && <div className="mobile-card-arrow">→</div>}
        </div>
    );
}
