import React, { useState, useEffect, useMemo } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import enUS from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./CalendarView.css";

import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import { db } from "../../firebase/firebase";
import { collection, query, where, onSnapshot, getDocs, updateDoc, doc, Timestamp, or } from "firebase/firestore";
import { useAuth } from "../../firebase/AuthContext";
import TaskModal from "./TaskModal";
import DiaryReaderModal from "./DiaryReaderModal"; // Import Diary Modal

const locales = {
    "en-US": enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

const DnDCalendar = withDragAndDrop(Calendar);

export default function CalendarView({ setActiveTab, setActiveWorkspace }) {
    const { currentUser } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [events, setEvents] = useState([]);
    const [selectedTask, setSelectedTask] = useState(null);
    const [workspaceMap, setWorkspaceMap] = useState({});

    // Diary State
    const [diaryEntries, setDiaryEntries] = useState({});
    const [selectedDiary, setSelectedDiary] = useState(null); // { date, content }

    // 1. Load Workspaces for mapping
    useEffect(() => {
        if (!currentUser) return;
        const load = async () => {
            const q = query(
                collection(db, "workspaces"),
                or(
                    where("userId", "==", currentUser.uid),
                    where("members", "array-contains", currentUser.email)
                )
            );
            const snap = await getDocs(q);
            const map = {};
            snap.forEach((d) => (map[d.id] = d.data().name));
            setWorkspaceMap(map);
        };
        load();
    }, [currentUser]);

    // 2. Load Tasks
    useEffect(() => {
        if (!currentUser) return;

        // 모든 접근 가능한 워크스페이스 ID 가져오기 (태스크 쿼리용)
        const allWsIds = Object.keys(workspaceMap);

        let q;
        if (allWsIds.length > 0) {
            q = query(
                collection(db, "tasks"),
                or(
                    where("userId", "==", currentUser.uid),
                    where("workspaceId", "in", allWsIds.slice(0, 30))
                )
            );
        } else {
            q = query(
                collection(db, "tasks"),
                where("userId", "==", currentUser.uid)
            );
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const taskList = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setTasks(taskList);
        });

        return () => unsubscribe();
    }, [currentUser, workspaceMap]);

    // 2.5 Load Diary Entries (Firestore Realtime)
    useEffect(() => {
        if (!currentUser) return;

        const unsub = onSnapshot(collection(db, "users", currentUser.uid, "diary_entries"), (snapshot) => {
            const fetched = {};
            snapshot.forEach((doc) => {
                fetched[doc.id] = doc.data();
            });
            setDiaryEntries(fetched);
        });

        return () => unsub();
    }, [currentUser]);

    // 3. Convert tasks to events
    useEffect(() => {
        const newEvents = tasks
            .filter((t) => t.dueDate) // Must have a date
            .map((t) => {
                const startDate = t.dueDate.toDate();
                const endDate = t.endDueDate ? t.endDueDate.toDate() : t.dueDate.toDate();

                let start = new Date(startDate);
                let end = new Date(endDate);
                let allDay = !t.startTime; // startTime이 없으면 종일 일정으로 간주

                if (t.startTime) {
                    const [h, m] = t.startTime.split(":");
                    start.setHours(parseInt(h), parseInt(m));
                }

                if (t.endTime) {
                    const [h, m] = t.endTime.split(":");
                    end.setHours(parseInt(h), parseInt(m));
                } else if (!allDay) {
                    // startTime은 있는데 endTime이 없으면 기본 +1시간
                    if (!t.endDueDate) {
                        end.setHours(start.getHours() + 1);
                        end.setMinutes(start.getMinutes());
                    } else {
                        // 날짜가 다른데 시간이 없는 경우 시작 시간 기준 +1시간 유지
                        end.setHours(start.getHours() + 1);
                        end.setMinutes(start.getMinutes());
                    }
                }

                return {
                    title: t.title,
                    start,
                    end,
                    allDay,
                    resource: t, // Store full task here
                    color: t.color || "#648cff", // Use task color
                    type: 'task',
                    // Diary Events Logic Removed (Moved to Custom Header)
                };
            });

        setEvents(newEvents);
    }, [tasks]);

    // Custom Month Date Header Component
    const components = useMemo(() => ({
        month: {
            dateHeader: ({ date, label }) => {
                const dateStr = date.toDateString();
                const hasDiary = diaryEntries[dateStr];

                return (
                    <div className="custom-date-header">
                        <span className="rbc-date-label">{label}</span>
                        {hasDiary && (
                            <span
                                className="diary-header-icon"
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent slot selection (click)
                                    setSelectedDiary({ date: dateStr, content: hasDiary.content });
                                }}
                                onMouseDown={(e) => e.stopPropagation()} // Prevent drag selection start
                                onTouchStart={(e) => e.stopPropagation()} // Prevent touch selection start
                                title="Read Diary"
                            >
                                📖
                            </span>
                        )}
                    </div>
                );
            },
        },
    }), [diaryEntries]);

    // Event Style Getter
    const eventStyleGetter = (event) => {
        let eventColor = event.color || "#648cff";
        let textDecoration = "none";
        let opacity = 1;

        if (event.resource.status === "completed") {
            eventColor = "#a0a0a0"; // Gray for done
            textDecoration = "line-through";
            opacity = 0.6;
        }

        return {
            style: {
                "--event-color": eventColor, // Pass color to CSS
                textDecoration,
                opacity,
                backgroundColor: "transparent", // Let CSS handle marker look
                color: "#333",
                border: "none"
            },
        };
    };

    // Event Drop & Resize (Unify logic)
    const moveEvent = async (args) => {
        const { event, start, end } = args;
        // isAllDay (drop) vs allDay (resize) - react-big-calendar API 대응
        const isAllDay = args.allDay !== undefined ? args.allDay : args.isAllDay;
        const { resource } = event;
        if (!resource || !resource.id) return;

        const updates = {};

        // 1. Update Start Date (dueDate)
        const newStartDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        updates.dueDate = Timestamp.fromDate(newStartDate);

        // 2. Update End Date (endDueDate) - 여러 날에 걸친 일정 지원
        const newEndDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        // 시간 단위 조절 시 같은 날이면 null, 다른 날이면 저장
        if (newStartDate.getTime() !== newEndDate.getTime()) {
            updates.endDueDate = Timestamp.fromDate(newEndDate);
        } else {
            updates.endDueDate = null;
        }

        // 3. 시간 정보 처리
        if (!isAllDay) {
            const h = start.getHours().toString().padStart(2, '0');
            const min = start.getMinutes().toString().padStart(2, '0');
            updates.startTime = `${h}:${min}`;

            const endH = end.getHours().toString().padStart(2, '0');
            const endMin = end.getMinutes().toString().padStart(2, '0');
            updates.endTime = `${endH}:${endMin}`;
        } else {
            // 종일 일정으로 드롭/리사이즈 된 경우 시간 정보 초기화
            updates.startTime = "";
            updates.endTime = "";
        }

        try {
            await updateDoc(doc(db, "tasks", resource.id), updates);
        } catch (error) {
            console.error("Failed to move event:", error);
            alert("Failed to move event 😢");
        }
    };

    const handleSelectSlot = (slotInfo) => {
        // 빈 슬롯 클릭 시 새 태스크 모달 띄우기
        const d = slotInfo.start;
        const timeStr = d.toTimeString().slice(0, 5); // HH:MM

        const newTaskTemplate = {
            title: "",
            dueDate: { toDate: () => d },
            startTime: timeStr,
            endTime: "",
            status: "pending",
            color: "#648cff",
        };
        setSelectedTask(newTaskTemplate);
    };

    const handleSelectEvent = (event) => {
        setSelectedTask(event.resource);
    };


    return (
        <div className="calendar-container">
            <div className="calendar-header">
                <h2>Calendar</h2>
                <button
                    className="btn primary"
                    onClick={() => {
                        const now = new Date();
                        handleSelectSlot({ start: now });
                    }}
                >
                    + Add Task
                </button>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                <DnDCalendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: "100%" }}
                    onSelectEvent={handleSelectEvent}
                    onSelectSlot={handleSelectSlot}
                    onEventDrop={moveEvent}
                    onEventResize={moveEvent} // Also allow resizing to change duration/end time
                    selectable
                    resizable
                    eventPropGetter={eventStyleGetter}
                    components={components} // Inject custom components
                    views={["month", "week", "day"]}
                    defaultView="month"
                />
            </div>

            {selectedTask && (
                <TaskModal
                    task={selectedTask}
                    currentUser={currentUser}
                    workspaceMap={workspaceMap}
                    onClose={() => setSelectedTask(null)}
                    setActiveTab={setActiveTab}
                    setActiveWorkspace={setActiveWorkspace}
                />
            )}

            {selectedDiary && (
                <DiaryReaderModal
                    date={selectedDiary.date}
                    content={selectedDiary.content}
                    onClose={() => setSelectedDiary(null)}
                />
            )}

            {/* ✂️ Perforation Detail */}
            <div className="calendar-view-perforation"></div>
        </div>
    );
}
