import { useState } from 'react';
import MobileHeader from './common/MobileHeader';
import './KanbanBoardMobile.css';

export default function KanbanBoardMobile({
    logic,
    workspaceId,
    categoryId,
    onSelectTask,
}) {
    const {
        customColumns,
        systemColumns,
        getTasksByColumn,
        updateTaskStatus,
        addColumn,
        deleteColumn,
        updateColumn
    } = logic;

    // Combine columns
    const allColumns = [...systemColumns, ...customColumns];
    const [activeTabId, setActiveTabId] = useState(systemColumns[0].id);

    // Helper to get active column index
    const activeIndex = allColumns.findIndex(c => c.id === activeTabId);

    // Swipe handlers (Basic)
    const handleTouchStart = (e) => {
        // Implement swipe logic later or rely on clicking tabs
    };

    return (
        <div className="kanban-mobile">
            {/* Tab Navigation */}
            <div className="kanban-mobile-tabs">
                {allColumns.map(col => (
                    <button
                        key={col.id}
                        className={`kanban-tab ${activeTabId === col.id ? 'active' : ''}`}
                        onClick={() => setActiveTabId(col.id)}
                    >
                        {col.title}
                        <span className="tab-count">{getTasksByColumn(col.id).length}</span>
                    </button>
                ))}
                <button className="kanban-add-col-btn" onClick={addColumn}>+</button>
            </div>

            {/* Active Column View */}
            <div className="kanban-mobile-content">
                {allColumns.map(col => {
                    if (col.id !== activeTabId) return null;

                    return (
                        <div key={col.id} className="kanban-mobile-column fade-in">
                            <div className="column-header-mobile">
                                <h3>{col.title}</h3>
                                {!systemColumns.find(sc => sc.id === col.id) && (
                                    <button onClick={() => deleteColumn(col.id)}>🗑️</button>
                                )}
                            </div>

                            {/* Reuse KanbanColumn internal list logic or rebuild? 
                  KanbanColumn has drag-drop logic which might break on mobile or be heavy.
                  Let's rebuild a simple list for mobile first, reusing MobileCard style ideally.
              */}
                            <div className="kanban-mobile-task-list">
                                {getTasksByColumn(col.id).length === 0 ? (
                                    <div className="empty-column-state">No tasks here</div>
                                ) : (
                                    getTasksByColumn(col.id).map(task => (
                                        <div
                                            key={task.id}
                                            className="kanban-mobile-card"
                                            onClick={() => onSelectTask(task)} // Open modal
                                        >
                                            <div className="card-top">
                                                <span className={`status-dot ${task.status}`}></span>
                                                <span className="card-title">{task.title}</span>
                                            </div>
                                            <div className="card-actions">
                                                {/* Move Button as select */}
                                                <select
                                                    value={task.status}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                                                    className="move-select"
                                                >
                                                    {allColumns.map(c => (
                                                        <option key={c.id} value={c.id}>{c.title}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
