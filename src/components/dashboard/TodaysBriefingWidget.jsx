import React, { useMemo } from 'react';


export default function TodaysBriefingWidget({ tasks, onToggleTask, onTaskClick }) {

    // Filter tasks
    const { todaysTasks, progress, tomorrowStats } = useMemo(() => {
        const now = new Date();
        const todayStr = now.toDateString();

        // Tomorrow for sneak peek
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toDateString();

        const todayList = [];
        const tomorrowList = [];

        tasks.forEach(t => {
            if (!t.dueDate) return;
            const d = t.dueDate.toDate();
            const dStr = d.toDateString();

            if (dStr === todayStr) {
                todayList.push(t);
            } else if (dStr === tomorrowStr) {
                tomorrowList.push(t);
            }
        });

        // Calculate Today's Progress
        const completed = todayList.filter(t => t.status === 'completed').length;
        const total = todayList.length;
        const prog = total === 0 ? 0 : (completed / total) * 100;

        // Sort Today: Pending first
        todayList.sort((a, b) => {
            if (a.status === b.status) {
                if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
                return 0;
            }
            return a.status === 'completed' ? 1 : -1;
        });

        // Sort Tomorrow: By time
        tomorrowList.sort((a, b) => {
            if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
            return 0;
        });

        return {
            todaysTasks: todayList,
            progress: prog,
            tomorrowStats: {
                count: tomorrowList.length,
                firstTask: tomorrowList[0]
            }
        };
    }, [tasks]);

    // Quick Memo State
    const [memo, setMemo] = React.useState(() => localStorage.getItem("tasky_daily_memo") || "");

    const handleMemoChange = (e) => {
        const val = e.target.value;
        setMemo(val);
        localStorage.setItem("tasky_daily_memo", val);
    };

    const todayDisplay = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    return (
        <div className="stats-card user-briefing-widget">
            <div className="widget-header">
                <div>
                    <span className="label">📅 Today's Briefing</span>
                    <div className="date-display">{todayDisplay}</div>
                </div>
                <div className="mini-progress-ring">
                    <svg viewBox="0 0 36 36" className="circular-chart">
                        <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path
                            className="circle"
                            strokeDasharray={`${progress}, 100`}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            style={{ stroke: '#648cff' }}
                        />
                        <text x="18" y="20.35" className="percentage" style={{ fontSize: '8px' }}>{Math.round(progress)}%</text>
                    </svg>
                </div>
            </div>

            {todaysTasks.length === 0 ? (
                <div className="empty-state">
                    <p>No tasks scheduled for today. 🍃</p>
                    <small>Time to relax or plan ahead!</small>
                </div>
            ) : (
                <div className="briefing-task-list">
                    {todaysTasks.map(task => (
                        <div
                            key={task.id}
                            className={`briefing-item ${task.status}`}
                            onClick={() => onTaskClick && onTaskClick(task)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div
                                className={`custom-checkbox ${task.status === 'completed' ? 'checked' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleTask(task);
                                }}
                            >
                                {task.status === 'completed' && <span className="checkmark">✔</span>}
                            </div>
                            <div className="task-content">
                                <div className="task-text">{task.title}</div>
                                {task.startTime && <div className="task-time">⏰ {task.startTime}</div>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="widget-divider"></div>

            {/* Tomorrow's Sneak Peek */}
            <div className="sneak-peek-section">
                <div className="section-label">👀 Tomorrow's Sneak Peek</div>
                {tomorrowStats.count > 0 ? (
                    <div className="peek-content">
                        <span className="count-badge">{tomorrowStats.count} tasks</span>
                        <span className="first-task">
                            Starts with: <strong>{tomorrowStats.firstTask.title}</strong>
                        </span>
                    </div>
                ) : (
                    <div className="peek-content empty">No tasks for tomorrow yet.</div>
                )}
            </div>

            <div className="widget-divider"></div>

            {/* Quick Memo */}
            <div className="quick-memo-section">
                <div className="section-label">📝 Quick Memo</div>
                <textarea
                    className="memo-input"
                    placeholder="Jot down a quick thought..."
                    value={memo}
                    onChange={handleMemoChange}
                />
            </div>

            <style jsx>{`
                .user-briefing-widget {
                    min-height: 150px;
                    display: flex;
                    flex-direction: column;
                    background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
                    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.5);
                }
                .widget-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 20px;
                }
                .label {
                    font-size: 0.85rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: #888;
                    font-weight: 600;
                }
                .date-display {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #2c3e50;
                    margin-top: 4px;
                }
                .mini-progress-ring {
                    width: 44px;
                    height: 44px;
                    filter: drop-shadow(0 2px 4px rgba(100, 140, 255, 0.2));
                }
                .empty-state {
                    text-align: center;
                    color: #888;
                    padding: 30px 0;
                    font-size: 0.95rem;
                    background: rgba(255, 255, 255, 0.5);
                    border-radius: 12px;
                    border: 1px dashed #ddd;
                }
                
                /* Briefing List */
                .briefing-task-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    max-height: 220px;
                    overflow-y: auto;
                    padding-right: 4px;
                }
                .briefing-task-list::-webkit-scrollbar {
                    width: 4px;
                }
                .briefing-task-list::-webkit-scrollbar-thumb {
                    background: #e0e0e0;
                    border-radius: 4px;
                }
                .briefing-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px 12px;
                    background: white;
                    border-radius: 10px;
                    border: 1px solid #eee;
                    transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
                }
                .briefing-item:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 5px 12px rgba(0,0,0,0.06);
                    border-color: #e0e7ff;
                }
                .briefing-item.completed {
                    opacity: 0.7;
                    background: #f8f9fa;
                    box-shadow: none;
                }
                .briefing-item.completed .task-text {
                    text-decoration: line-through;
                    color: #999;
                }
                
                /* Checkbox */
                .custom-checkbox {
                    width: 20px;
                    height: 20px;
                    border: 2px solid #ddd;
                    border-radius: 6px; /* Squircle */
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    flex-shrink: 0;
                    background: white;
                }
                .custom-checkbox:hover {
                    border-color: #648cff;
                }
                .custom-checkbox.checked {
                    background-color: #648cff;
                    border-color: #648cff;
                    animation: checkPop 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                @keyframes checkPop {
                    0% { transform: scale(0.8); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }
                .checkmark {
                    color: white;
                    font-size: 12px;
                }

                .task-content {
                    flex: 1;
                    min-width: 0;
                }
                .task-text {
                    font-size: 0.95rem;
                    color: #333;
                    font-weight: 500;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .task-time {
                    font-size: 0.75rem;
                    color: #666;
                    margin-top: 3px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                
                /* Divider */
                .widget-divider {
                    height: 1px;
                    background: linear-gradient(to right, transparent, rgba(0,0,0,0.06), transparent);
                    margin: 20px 0;
                }
                
                /* Section Labels */
                .section-label {
                    font-size: 0.8rem;
                    font-weight: 700;
                    color: #6c757d;
                    margin-bottom: 10px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                
                /* Sneak Peek */
                .sneak-peek-section {
                    background: #f8faff;
                    padding: 12px;
                    border-radius: 10px;
                    border: 1px solid #eef2ff;
                }
                .peek-content {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .peek-content.empty {
                    color: #a0a0a0;
                    font-style: italic;
                    font-size: 0.85rem;
                    text-align: center;
                }
                .count-badge {
                    display: inline-block;
                    background: #e0e7ff;
                    color: #4f46e5;
                    padding: 3px 8px;
                    border-radius: 6px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    align-self: flex-start;
                }
                .first-task {
                    font-size: 0.9rem;
                    color: #4b5563;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .first-task strong {
                    color: #1f2937;
                }
                
                /* Quick Memo */
                .quick-memo-section .memo-input {
                    width: 100%;
                    height: 90px;
                    border: none;
                    border-radius: 0 0 10px 10px;
                    padding: 12px;
                    font-size: 0.9rem;
                    line-height: 1.4;
                    resize: none;
                    background: #fff9c4; /* Softer yellow */
                    color: #444;
                    font-family: 'Gaegu', sans-serif;
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.03);
                    border-top: 3px solid #fbc02d; /* Header accent */
                    transition: all 0.2s;
                }
                .quick-memo-section {
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.05));
                }
                .quick-memo-section .memo-input:focus {
                    outline: none;
                    background: #fffde7;
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.03), 0 0 0 2px rgba(251, 192, 45, 0.2);
                }
                .quick-memo-section .memo-input::placeholder {
                    color: rgba(0,0,0,0.3);
                }
            `}</style>
        </div>
    );
}
