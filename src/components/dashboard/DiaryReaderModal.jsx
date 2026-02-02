import React from 'react';
import './DiaryReaderModal.css';

const DiaryReaderModal = ({ date, content, onClose }) => {
    // Format date for display
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="diary-reader-overlay" onClick={onClose}>
            <div className="diary-reader-modal" onClick={(e) => e.stopPropagation()}>
                <div className="diary-reader-tape"></div>

                <button className="diary-reader-close" onClick={onClose}>×</button>

                <div className="diary-reader-date">
                    {formattedDate}
                </div>

                <div className="diary-reader-content">
                    {content || "No entry for this day..."}
                </div>

                <div className="diary-reader-footer">
                    Dayzzy Diary Memory
                </div>
            </div>
        </div>
    );
};

export default DiaryReaderModal;
