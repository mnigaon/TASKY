import { formatDate } from "../../utils/dateFormat";
import TaskModal from "../dashboard/TaskModal";
import "../dashboard/Tasks.css";

export default function TasksDesktop({
    logic, // useTasksLogic에서 반환된 객체
    workspaceId,
    workspaceTitle,
    setActiveTab,
    setActiveWorkspace,
    isChatOpen,
    onToggleChat
}) {
    const {
        currentUser,
        filteredTasks,
        selectedTask,
        setSelectedTask,
        workspaceMap,
        currentWorkspace,
        realtimeTitle,
        isEditingTitle,
        editingTitle,
        setEditingTitle,
        handleTitleClick,
        handleTitleSave,
        handleTitleKeyDown,
        totalUnread,
        searchText,
        setSearchText,
        statusFilter,
        setStatusFilter,
        workspaceFilter,
        setWorkspaceFilter,
        sortType,
        setSortType,
        wsStats,
        urgentTask,
        handleDelete
    } = logic;

    const isShared = currentWorkspace && (currentWorkspace.userId !== currentUser.uid || (currentWorkspace.members && currentWorkspace.members.length > 0));

    return (
        <div className={`tasks-page-layout ${workspaceId ? 'with-sidebar' : ''}`}>
            <div className="tasks">
                <div className="workspace-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    {isEditingTitle ? (
                        <div style={{ flex: 1 }}>
                            <input
                                className="workspace-title-edit-input"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onBlur={handleTitleSave}
                                onKeyDown={handleTitleKeyDown}
                                autoFocus
                            />
                        </div>
                    ) : (
                        <h3
                            onClick={handleTitleClick}
                            style={{ cursor: workspaceId ? "pointer" : "default" }}
                            title={workspaceId ? "Click to edit name" : ""}
                            className="workspace-editable-header"
                        >
                            {workspaceId ? (
                                <>
                                    📁 {realtimeTitle || workspaceTitle}
                                    <span className="edit-hint-icon">✏️</span>
                                </>
                            ) : (
                                "All Tasks"
                            )}
                        </h3>
                    )}

                    <div className="header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button
                            className="btn primary"
                            style={{ padding: '8px 16px', fontSize: '1rem' }}
                            onClick={() => setSelectedTask({
                                title: "",
                                description: "",
                                status: "pending",
                                workspaceId,
                                userId: currentUser.uid
                            })}
                        >
                            + Add Task
                        </button>

                        {/* ⭐ 채팅 버튼 (공동 작업 프로젝트인 경우에만 표시) */}
                        {workspaceId && isShared && (
                            <button
                                className="chat-toggle-btn"
                                onClick={onToggleChat}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #007aff 0%, #00c6ff 100%)',
                                    color: 'white',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)',
                                    position: 'relative'
                                }}
                            >
                                💬 {isChatOpen ? "Close Chat" : "Open Chat"}
                                {!isChatOpen && totalUnread > 0 && (
                                    <span style={{
                                        position: 'absolute',
                                        top: '-8px',
                                        right: '-8px',
                                        background: '#ff3b30',
                                        color: 'white',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        minWidth: '20px',
                                        height: '20px',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '0 4px',
                                        boxShadow: '0 2px 6px rgba(255, 59, 48, 0.5)',
                                        border: '2px solid white'
                                    }}>
                                        {totalUnread}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* ================= 필터 바 (Index Tabs & Sticky Search) ================= */}
                <div className="tasks-controls-wrapper">
                    <div className="tasks-filter-tabs">
                        <button
                            className={`filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('all')}
                        >
                            All
                        </button>
                        <button
                            className={`filter-tab pending ${statusFilter === 'pending' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('pending')}
                        >
                            Todo
                        </button>
                        <button
                            className={`filter-tab progress ${statusFilter === 'progress' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('progress')}
                        >
                            In-Progress
                        </button>
                        <button
                            className={`filter-tab completed ${statusFilter === 'completed' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('completed')}
                        >
                            Done
                        </button>
                    </div>

                    <div className="tasks-secondary-filters">
                        <div className="search-sticker">
                            <input
                                placeholder="Search..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                            />
                            <span className="search-icon">🔍</span>
                        </div>

                        <div className="select-wrapper">
                            <select value={workspaceFilter} onChange={(e) => setWorkspaceFilter(e.target.value)}>
                                <option value="all">All Workspaces</option>
                                {Object.entries(workspaceMap)
                                    .filter(([id]) => !id.includes("_"))
                                    .map(([id, name]) => (
                                        <option key={id} value={id}>{name}</option>
                                    ))}
                            </select>
                        </div>

                        <div className="select-wrapper">
                            <select value={sortType} onChange={(e) => setSortType(e.target.value)}>
                                <option value="dueAsc">Oldest First</option>
                                <option value="dueDesc">Newest First</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* ================= 리스트 ================= */}
                <ul className="tasks-list">
                    {filteredTasks.map((task) => {
                        const workspaceName = task.workspaceId ? workspaceMap[task.workspaceId] : "Individual";

                        const header = task.workspaceId
                            ? `📁 ${workspaceName}`
                            : "👤 Individual";

                        return (
                            <li
                                className={`task-item ${task.status} ${task.isSharedTask ? 'shared' : ''}`}
                                key={task.id}
                                onClick={() => setSelectedTask(task)}
                            >  <span>

                                    <div
                                        className={`task-card-header ${task.workspaceId ? 'clickable' : ''}`}
                                        onClick={(e) => {
                                            if (task.workspaceId && setActiveTab && setActiveWorkspace) {
                                                e.stopPropagation();
                                                setActiveWorkspace({ id: task.workspaceId, name: workspaceMap[task.workspaceId] });
                                                setActiveTab("workspace");
                                            }
                                        }}
                                    >
                                        {header}
                                    </div>

                                    <div className="task-title-row">
                                        <div className="task-title-wrapper">
                                            <strong>{task.title}</strong>
                                        </div>

                                        <span className={`status-pill ${task.status}`}>
                                            {task.status === "pending" && "Todo"}
                                            {task.status === "progress" && "In Progress"}
                                            {task.status === "completed" && "Done"}
                                        </span>
                                    </div>

                                    {task.description && <p>{task.description}</p>}

                                    {formatDate(task.dueDate) && (
                                        <small>Due: {formatDate(task.dueDate)}</small>
                                    )}

                                    {task.attachmentUrl && (
                                        <a
                                            href={task.attachmentUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            📎 {task.attachmentName}
                                        </a>
                                    )}

                                </span>

                                <div className="task-buttons">
                                    {/* 🔹 본인이 만든 태스크이거나, 해당 워크스페이스의 주인인 경우 삭제 가능 */}
                                    {(task.userId === currentUser.uid || (task.workspaceId && workspaceMap[task.workspaceId + "_ownerId"] === currentUser.uid)) && (
                                        <button className="delete-btn" onClick={(e) => handleDelete(e, task.id)}>Delete</button>
                                    )}

                                    {/* ⭐ 클래스명을 고유하게 변경하여 충돌 방지 */}
                                    {task.isSharedTask && <span className="status-badge-shared">Shared Task</span>}
                                </div>
                            </li>
                        );
                    })}
                </ul>

                {
                    selectedTask && (
                        <TaskModal
                            task={selectedTask}
                            currentUser={currentUser}
                            workspaceMap={workspaceMap}
                            onClose={() => setSelectedTask(null)}
                            setActiveTab={setActiveTab}
                            setActiveWorkspace={setActiveWorkspace}
                        />
                    )
                }
            </div >

            {/* 🔴 RIGHT SECTION SIDEBAR (Same as WorkspaceList) */}
            {workspaceId && wsStats && (
                <aside className="workspace-right-section task-sidebar">
                    {/* Selected Project Card */}
                    <div className="stats-card selected-project-info">
                        <span className="label">Current Project</span>
                        <h3 className="project-title">{realtimeTitle || workspaceTitle}</h3>
                        <div className="project-badge">Active</div>
                    </div>

                    {/* Urgent Task Card */}
                    {urgentTask && (
                        <div className="stats-card urgent-task-info">
                            <span className="urgent-badge">🔥 Urgent Task</span>
                            <p className="task-title">{urgentTask.title}</p>
                            <div className="task-meta">
                                <span>📅 {formatDate(urgentTask.dueDate)}</span>
                            </div>
                        </div>
                    )}

                    {/* Circular Progress */}
                    <div className="stats-card progress-circle-info">
                        <div className="circular-progress-container">
                            <svg viewBox="0 0 36 36" className="circular-chart">
                                <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path
                                    className="circle"
                                    strokeDasharray={`${wsStats.progress}, 100`}
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <text x="18" y="20.35" className="percentage">{Math.round(wsStats.progress)}%</text>
                            </svg>
                        </div>
                    </div>

                    {/* Task Statistics Grid */}
                    <div className="category-section">
                        <h4 className="section-title">Statistics</h4>
                        <div className="category-grid">
                            <div className="cat-card total">
                                <span className="count">{wsStats.total}</span>
                                <span className="label">Total</span>
                            </div>
                            <div className="cat-card completed">
                                <span className="count">{wsStats.completed}</span>
                                <span className="label">Completed</span>
                            </div>
                            <div className="cat-card progress">
                                <span className="count">{wsStats.inProgress}</span>
                                <span className="label">Active</span>
                            </div>
                            <div className="cat-card waiting">
                                <span className="count">{wsStats.waiting}</span>
                                <span className="label">Waiting</span>
                            </div>
                        </div>
                    </div>
                </aside>
            )}
        </div>
    );
}
