import KanbanColumn from "../kanban/KanbanColumn";
import "../kanban/KanbanBoard.css";

export default function KanbanBoardDesktop({
    logic,
    onSelectTask,
}) {
    const {
        tasks,
        customColumns,
        systemColumns,
        getTasksByColumn,
        updateTaskStatus,
        addColumn,
        deleteColumn,
        updateColumn,
        progressPercent
    } = logic;

    const radius = 24;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progressPercent / 100) * circumference;

    return (
        <div className="kanban-board">
            {systemColumns.map((col) => (
                <KanbanColumn
                    key={col.id}
                    title={col.title}
                    status={col.id}
                    tasks={getTasksByColumn(col.id)}
                    onSelectTask={onSelectTask}
                    onDropTask={updateTaskStatus} // logic uses updateTaskStatus
                    isSystem
                />
            ))}

            {customColumns.map((col) => (
                <KanbanColumn
                    key={col.id}
                    title={col.title}
                    status={col.id}
                    tasks={getTasksByColumn(col.id)}
                    onSelectTask={onSelectTask}
                    onDropTask={updateTaskStatus}
                    onDeleteColumn={deleteColumn}
                    onUpdateColumn={updateColumn}
                />
            ))}

            <button className="add-column-btn" onClick={addColumn}>
                <span className="plus">＋</span>
                Add Column
            </button>

            {/* Fixed Progress Indicator */}
            <div className="kanban-progress-indicator">
                <svg width="60" height="60" viewBox="0 0 60 60">
                    <circle
                        className="bg"
                        cx="30" cy="30" r={radius}
                        fill="none" strokeWidth="5"
                    />
                    <circle
                        className="fg"
                        cx="30" cy="30" r={radius}
                        fill="none" strokeWidth="5"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                    />
                </svg>
                <span className="progress-text">{progressPercent}%</span>
            </div>
        </div>
    );
}
