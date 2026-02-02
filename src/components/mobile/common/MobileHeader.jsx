// src/components/mobile/common/MobileHeader.jsx
import './MobileHeader.css';

export default function MobileHeader({ title, onBack, actions = [] }) {
    return (
        <header className="mobile-header">
            {onBack && (
                <button className="mobile-header-back" onClick={onBack}>
                    ←
                </button>
            )}
            <h1 className="mobile-header-title">{title}</h1>
            <div className="mobile-header-actions">
                {actions.map((action, index) => (
                    <button
                        key={index}
                        className="mobile-header-action-btn"
                        onClick={action.onClick}
                        title={action.title}
                    >
                        {action.icon}
                    </button>
                ))}
            </div>
        </header>
    );
}
