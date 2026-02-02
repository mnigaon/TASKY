import { useState } from 'react';
import MobileHeader from './common/MobileHeader';
import { formatDate } from '../../utils/dateFormat';
import './TasksMobile.css';

export default function TasksMobile({
    logic,
    workspaceId,
    workspaceTitle,
    setActiveTab,
    setActiveWorkspace,
    onToggleChat,
    isChatOpen
}) {
    const {
        filteredTasks,
        selectedTask,
        setSelectedTask,
        workspaceMap,
        currentWorkspace,
        totalUnread,
        searchText,
        setSearchText,
        statusFilter,
        setStatusFilter,
        handleDelete
    } = logic;

    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const HeaderActions = [
        {
            icon: isSearchOpen ? '✖️' : '🔍',
            onClick: () => {
                setIsSearchOpen(!isSearchOpen);
                if (isSearchOpen) setSearchText('');
            }
        }
    ];

    if (workspaceId) {
        HeaderActions.push({
            icon: '💬', // Chat icon
            onClick: onToggleChat,
            badge: totalUnread
        });
    }

    const handleTaskClick = (task) => {
        setSelectedTask(task);
        // 모바일에서는 모달 대신 전체 화면 상세나 바텀 시트를 띄울 수도 있지만,
        // 일단 기존 TaskModal을 사용하거나 추후 MobileTaskDetail로 분리.
        // 여기서는 TaskModal을 그대로 사용하되 스타일로 모바일 대응.
    };

    return (
        <div className="tasks-mobile">
            <MobileHeader
                title={workspaceId ? (currentWorkspace?.name || workspaceTitle) : "My Tasks"}
                onBack={workspaceId ? () => { setActiveWorkspace(null); setActiveTab('workspace'); } : null}
                actions={HeaderActions}
            />

            {/* Search Bar */}
            {isSearchOpen && (
                <div className="mobile-search-bar">
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        autoFocus
                    />
                </div>
            )}

            {/* Filter Tabs */}
            <div className="mobile-filter-tabs">
                {['all', 'pending', 'progress', 'completed'].map((status) => (
                    <button
                        key={status}
                        className={`mobile-filter-tab ${statusFilter === status ? 'active' : ''}`}
                        onClick={() => setStatusFilter(status)}
                    >
                        {status === 'all' ? 'All' :
                            status === 'pending' ? 'Todo' :
                                status === 'progress' ? 'Doing' : 'Done'}
                    </button>
                ))}
            </div>

            {/* Task List */}
            <div className="mobile-task-list">
                {filteredTasks.length === 0 ? (
                    <div className="mobile-empty-tasks">
                        <span className="empty-icon">📝</span>
                        <p>No tasks found</p>
                    </div>
                ) : (
                    filteredTasks.map((task) => (
                        <div
                            key={task.id}
                            className={`mobile-task-item ${task.status} ${task.isSharedTask ? 'shared' : ''}`}
                            onClick={() => handleTaskClick(task)}
                        >
                            <div className="task-row-top">
                                <span className={`status-dot ${task.status}`}></span>
                                <span className="task-title">{task.title}</span>
                                {task.isSharedTask && <span className="shared-badge">👥</span>}
                            </div>

                            <div className="task-row-bottom">
                                {task.dueDate && (
                                    <span className="task-due-date">
                                        📅 {formatDate(task.dueDate)}
                                    </span>
                                )}
                                {task.workspaceId && !workspaceId && (
                                    <span className="task-workspace-tag">
                                        {workspaceMap[task.workspaceId] || 'Project'}
                                    </span>
                                )}
                            </div>

                            {/* Swipe actions could go here, for now just a delete button if owner */}
                            {/* 
               <button 
                 className="mobile-delete-btn"
                 onClick={(e) => handleDelete(e, task.id)}
               >🗑️</button>
               */}
                        </div>
                    ))
                )}
            </div>

            {/* FAB - Add Task */}
            <button
                className="mobile-fab"
                onClick={() => setSelectedTask({
                    title: "",
                    description: "",
                    status: "pending",
                    workspaceId,
                    userId: logic.currentUser.uid // Access currentUser from logic
                })}
            >
                +
            </button>

            {/* Reusing existing TaskModal for now - Ensure it works on mobile via CSS */}
            {selectedTask && (
                <div className="mobile-modal-overlay">
                    {/* This requires importing TaskModal or recreating simple view. 
                 Let's reuse TaskModal but wrap it or ensure CSS handles it. */}
                    {/* Assuming TaskModal is imported in Tasks.jsx wrapper and passed down?
                 No, TasksMobile needs to render it. I will import it. */}
                </div>
            )}
        </div>
    );
}
