import React from 'react';
import './MobileRestrictedView.css';
import { FaDesktop } from 'react-icons/fa';
import logo from '../../assets/logo.png'; // Assuming logo path

const MobileRestrictedView = () => {
    return (
        <div className="mobile-restricted-container">
            <div className="mobile-restricted-content">
                <div className="logo-container">
                    {/* If logo image exists, use it. Otherwise uses text */}
                    <img src={logo} alt="Tasky Logo" className="restricted-logo" onError={(e) => { e.target.style.display = 'none' }} />
                </div>

                <div className="icon-wrapper">
                    <FaDesktop className="desktop-icon" />
                </div>

                <h1 className="restricted-title">Desktop Only</h1>

                <p className="restricted-message">
                    We're sorry, but <strong>Dayzzy</strong> is currently optimized for desktop use only.
                </p>

                <p className="restricted-submessage">
                    Please access our website from a PC or laptop for the best experience.
                </p>

                <div className="stickers-decoration">
                    {/* Decorative elements can be added here if needed */}
                </div>
            </div>
        </div>
    );
};

export default MobileRestrictedView;
