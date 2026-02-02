/* MobileBottomSheet.jsx */
import { useEffect, useState } from 'react';
import './MobileBottomSheet.css';

export default function MobileBottomSheet({ isOpen, onClose, children, title }) {
    const [active, setActive] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setActive(true), 10);
            document.body.style.overflow = 'hidden';
        } else {
            setActive(false);
            document.body.style.overflow = '';
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <>
            <div
                className={`bottom-sheet-overlay ${active ? 'active' : ''}`}
                onClick={onClose}
            ></div>
            <div className={`bottom-sheet-container ${active ? 'active' : ''}`}>
                <div className="bottom-sheet-handle-bar">
                    <div className="handle"></div>
                </div>
                {title && <div className="bottom-sheet-header">{title}</div>}
                <div className="bottom-sheet-content">
                    {children}
                </div>
            </div>
        </>
    );
}
