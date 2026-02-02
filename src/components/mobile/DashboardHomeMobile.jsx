// src/components/mobile/DashboardHomeMobile.jsx
import { useState, useEffect } from 'react';
import { db } from '../../firebase/firebase';
import { collection, query, where, getDocs, or } from 'firebase/firestore';
import { useAuth } from '../../firebase/AuthContext';
import { useTimer } from '../../context/TimerContext';
import MobileStatCard from './common/MobileStatCard';
import MobileCard from './common/MobileCard';
import './DashboardHomeMobile.css';

export default function DashboardHomeMobile({ setActiveTab, setActiveWorkspace }) {
    const { currentUser } = useAuth();
    const { getTodayFocusTime } = useTimer();

    const [stats, setStats] = useState({ tasks: 0, projects: 0, completed: 0 });
    const [recentProjects, setRecentProjects] = useState([]);

    // Fetch statistics
    useEffect(() => {
        if (!currentUser) return;

        const fetchStats = async () => {
            try {
                // Fetch tasks
                const tasksQuery = query(
                    collection(db, 'tasks'),
                    where('userId', '==', currentUser.uid)
                );
                const tasksSnap = await getDocs(tasksQuery);
                const allTasks = tasksSnap.docs.map(d => d.data());
                const activeTasks = allTasks.filter(t => t.status !== 'completed').length;
                const completedTasks = allTasks.filter(t => t.status === 'completed').length;

                // Fetch projects
                const projectsQuery = query(
                    collection(db, 'workspaces'),
                    or(
                        where('userId', '==', currentUser.uid),
                        where('members', 'array-contains', currentUser.email)
                    )
                );
                const projectsSnap = await getDocs(projectsQuery);
                const projects = projectsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                // Sort by recent
                projects.sort((a, b) => {
                    const timeA = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
                    const timeB = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
                    return timeB - timeA;
                });

                setStats({
                    tasks: activeTasks,
                    projects: projects.length,
                    completed: completedTasks
                });

                setRecentProjects(projects.slice(0, 3));
            } catch (err) {
                console.error('Failed to fetch stats', err);
            }
        };

        fetchStats();
    }, [currentUser]);

    const todayFocusTime = Math.floor((getTodayFocusTime?.() || 0) / 60);

    const handleProjectClick = (project) => {
        setActiveWorkspace(project);
        setActiveTab('workspace');
    };

    const handleNewTask = () => {
        setActiveTab('tasks');
    };

    const handleTimer = () => {
        setActiveTab('timer');
    };

    return (
        <div className="dashboard-home-mobile">
            {/* Welcome Section */}
            <div className="mobile-welcome-section">
                <div className="mobile-date">
                    {new Date().toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric'
                    })}
                </div>
                <h1 className="mobile-greeting">
                    Hello, {currentUser?.displayName || currentUser?.email?.split('@')[0]}! 👋
                </h1>
                <p className="mobile-subtitle">Ready to focus? Here's your summary for today.</p>
            </div>

            {/* Quick Stats */}
            <section className="mobile-section">
                <h2 className="mobile-section-title">📊 Quick Stats</h2>
                <div className="mobile-stats-grid">
                    <MobileStatCard
                        icon="📝"
                        value={stats.tasks}
                        label="Tasks"
                        color="#648cff"
                    />
                    <MobileStatCard
                        icon="📁"
                        value={stats.projects}
                        label="Projects"
                        color="#48bb78"
                    />
                    <MobileStatCard
                        icon="✅"
                        value={stats.completed}
                        label="Done"
                        color="#9f7aea"
                    />
                </div>
            </section>

            {/* Focus Time */}
            <section className="mobile-section">
                <h2 className="mobile-section-title">⏱️ Today's Focus</h2>
                <div className="mobile-focus-card" onClick={handleTimer}>
                    <div className="mobile-focus-time">{todayFocusTime} min</div>
                    <div className="mobile-focus-label">Total focus time today</div>
                    <div className="mobile-focus-action">Tap to start timer →</div>
                </div>
            </section>

            {/* Recent Projects */}
            {recentProjects.length > 0 && (
                <section className="mobile-section">
                    <div className="mobile-section-header">
                        <h2 className="mobile-section-title">📌 Recent Projects</h2>
                        <button
                            className="mobile-see-all-btn"
                            onClick={() => {
                                setActiveWorkspace(null);
                                setActiveTab('workspace');
                            }}
                        >
                            See all →
                        </button>
                    </div>
                    <div className="mobile-projects-list">
                        {recentProjects.map(project => (
                            <MobileCard
                                key={project.id}
                                icon={project.icon || '📁'}
                                title={project.name}
                                subtitle={`${(project.members?.length || 0) + 1} members`}
                                onClick={() => handleProjectClick(project)}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Quick Actions */}
            <section className="mobile-section">
                <h2 className="mobile-section-title">⚡ Quick Actions</h2>
                <div className="mobile-quick-actions">
                    <button className="mobile-action-btn primary" onClick={handleNewTask}>
                        <span className="mobile-action-icon">+</span>
                        <span className="mobile-action-label">New Task</span>
                    </button>
                    <button className="mobile-action-btn secondary" onClick={handleTimer}>
                        <span className="mobile-action-icon">⏱️</span>
                        <span className="mobile-action-label">Timer</span>
                    </button>
                </div>
            </section>

            {/* Empty State */}
            {recentProjects.length === 0 && (
                <div className="mobile-empty-state">
                    <div className="mobile-empty-icon">📂</div>
                    <h3 className="mobile-empty-title">No projects yet</h3>
                    <p className="mobile-empty-text">Create your first project to get started!</p>
                    <button
                        className="mobile-empty-btn"
                        onClick={() => {
                            setActiveWorkspace(null);
                            setActiveTab('workspace');
                        }}
                    >
                        Create Project
                    </button>
                </div>
            )}
        </div>
    );
}
