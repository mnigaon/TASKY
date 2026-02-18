// src/components/dashboard/Chat.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { db } from "../../firebase/firebase";
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import "./Chat.css";

export default function Chat({ workspace, currentUser, onClose }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [chatType, setChatType] = useState("group");
    const [selectedTarget, setSelectedTarget] = useState(null);
    const [userNameMap, setUserNameMap] = useState({});
    const [allMemberEmails, setAllMemberEmails] = useState([]);
    const [unreadCounts, setUnreadCounts] = useState({});

    const [allWorkspaceMessages, setAllWorkspaceMessages] = useState([]);
    const [readStatusMap, setReadStatusMap] = useState({});
    const [hasLoadedStatus, setHasLoadedStatus] = useState(false); // ⭐ 상태 로드 여부

    const scrollRef = useRef();

    // ⭐ Safe values for hooks dependencies
    const myEmail = currentUser?.email?.toLowerCase();
    const workspaceId = workspace?.id;

    const getChatId = useCallback((targetEmail) => {
        if (!targetEmail || !workspaceId) return workspaceId;
        return [myEmail, targetEmail.toLowerCase()].sort().join("_");
    }, [myEmail, workspaceId]);

    const currentChatId = chatType === "group" ? workspaceId : getChatId(selectedTarget);

    // 1. 멤버 정보 및 이름 로드
    useEffect(() => {
        const fetchMemberDetails = async () => {
            if (!workspaceId) return;
            const emails = new Set();
            // ⭐ Safe access to members array
            if (workspace?.members && Array.isArray(workspace.members)) {
                workspace.members.forEach(m => emails.add(m.trim().toLowerCase()));
            }

            let leaderEmail = (workspace?.ownerEmail || "").toLowerCase();
            if (!leaderEmail && workspace?.userId) {
                try {
                    const uDoc = await getDoc(doc(db, "users", workspace.userId));
                    if (uDoc.exists()) leaderEmail = uDoc.data().email?.toLowerCase();
                } catch (e) { }
            }
            if (leaderEmail) emails.add(leaderEmail);
            const emailList = Array.from(emails);
            setAllMemberEmails(emailList);
            if (emailList.length > 0) {
                const uSnap = await getDocs(query(collection(db, "users"), where("email", "in", emailList.slice(0, 30))));
                const newMap = {};
                uSnap.forEach(d => { newMap[d.data().email.toLowerCase()] = d.data().displayName; });
                setUserNameMap(newMap);
            }
        };
        fetchMemberDetails();
    }, [workspaceId, workspace?.members, workspace?.ownerEmail, workspace?.userId]);

    // 2. 워크스페이스 내 모든 메시지 실시간 감시 (알림용 & 소리)
    const isInitialLoad = useRef(true);

    useEffect(() => {
        if (!workspaceId) return;
        const q = query(collection(db, "messages"), where("workspaceId", "==", workspaceId));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setAllWorkspaceMessages(msgs);

            // 🔔 Message Receive Sound logic
            if (isInitialLoad.current) {
                isInitialLoad.current = false;
                return;
            }

            // Check for added changes
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const data = change.doc.data();
                    // Play sound logic moved to Dashboard.jsx for centralization
                    // if (data.senderEmail !== myEmail) { ... }
                }
            });
        });
        return () => unsubscribe();
    }, [workspaceId, myEmail]);

    // 3. 내 읽음 상태 실시간 감시 (알림용)
    useEffect(() => {
        if (!workspaceId || !currentUser?.uid) return;
        const q = query(collection(db, "chat_status"), where("workspaceId", "==", workspaceId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newStatusMap = {};
            snapshot.forEach(d => {
                if (d.id.startsWith(currentUser.uid)) {
                    const cid = d.id.replace(`${currentUser.uid}_`, "");
                    newStatusMap[cid] = d.data().lastReadAt?.toDate() || new Date(0);
                }
            });
            setReadStatusMap(newStatusMap);
            setHasLoadedStatus(true); // ⭐ 상태 로드 완료
        });
        return () => unsubscribe();
    }, [workspaceId, currentUser?.uid]);

    // 4. 미확인 개수 통합 계산
    useEffect(() => {
        if (!hasLoadedStatus || !workspaceId) return; // ⭐ 상태가 로드되기 전에는 계산하지 않음

        const newCounts = {};

        // 그룹 채팅
        const groupLastRead = readStatusMap[workspaceId];
        if (groupLastRead) {
            newCounts[workspaceId] = allWorkspaceMessages.filter(m =>
                (m.type === "group" || !m.type) &&
                m.senderEmail !== myEmail &&
                m.timestamp?.toDate() > groupLastRead
            ).length;
        }

        // 1:1 채팅
        allMemberEmails.forEach(email => {
            const cid = getChatId(email);
            const lastRead = readStatusMap[cid];
            if (lastRead) {
                newCounts[cid] = allWorkspaceMessages.filter(m =>
                    m.type === "direct" &&
                    m.chatId === cid &&
                    m.senderEmail !== myEmail &&
                    m.timestamp?.toDate() > lastRead
                ).length;
            }
        });

        setUnreadCounts(newCounts);
    }, [allWorkspaceMessages, readStatusMap, allMemberEmails, myEmail, workspaceId, hasLoadedStatus, getChatId]);

    const markAsRead = useCallback(async (chatId) => {
        if (!chatId || !currentUser?.uid || !workspaceId) return;

        // 즉시 로컬 상태를 업데이트하여 UI 깜빡임 방지 (Optimistic Update는 아니지만, Firestore 쓰기 후 리스너가 돌기 전 시점 보강)
        try {
            await setDoc(doc(db, "chat_status", `${currentUser.uid}_${chatId}`), {
                lastReadAt: serverTimestamp(),
                workspaceId: workspaceId
            }, { merge: true });
        } catch (e) { }
    }, [currentUser?.uid, workspaceId]);

    // 5. 현재 대화방 메시지 정렬 표시
    useEffect(() => {
        let msgs = allWorkspaceMessages.filter(m => {
            if (chatType === "group") return m.type === "group" || !m.type;
            return m.type === "direct" && m.chatId === currentChatId;
        });
        msgs.sort((a, b) => {
            const timeA = a.timestamp?.seconds || (Date.now() / 1000); // 로컬 메시지는 현재 시간으로 처리
            const timeB = b.timestamp?.seconds || (Date.now() / 1000);
            return timeA - timeB;
        });
        setMessages(msgs);

        // ⭐ 메인 컴포넌트 mount 또는 방 이동 시 즉시 읽음 처리
        if (msgs.length > 0 || chatType) {
            markAsRead(currentChatId);
        }
    }, [allWorkspaceMessages, chatType, currentChatId, markAsRead]);

    useEffect(() => {
        if (workspaceId) {
            markAsRead(currentChatId);
        }
    }, [currentChatId, workspaceId, markAsRead]);

    useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser?.uid || !workspaceId) return;
        try {
            await addDoc(collection(db, "messages"), {
                senderId: currentUser.uid,
                senderEmail: myEmail,
                senderName: currentUser.displayName || myEmail.split('@')[0],
                text: newMessage.trim(),
                timestamp: serverTimestamp(),
                type: chatType,
                workspaceId: workspaceId,
                chatId: chatType === "direct" ? currentChatId : null,
            });
            setNewMessage("");
            markAsRead(currentChatId);

            // 📤 Send Sound
            const sendAudio = new Audio("/sent-message.mp3");
            sendAudio.volume = 0.5;
            sendAudio.play().catch(() => { });
        } catch (err) { console.error(err); }
    };

    const getDisplayName = (email) => {
        if (!email) return "Unknown";
        const baseName = userNameMap[email.toLowerCase()] || email.split('@')[0];
        return email.toLowerCase() === (workspace?.ownerEmail || "").toLowerCase() ? `${baseName} (Leader)` : baseName;
    };

    const filteredMembers = allMemberEmails.filter(e => e !== myEmail);

    // ⭐ Final Null Check BEFORE Render
    if (!currentUser || !workspace) return null;

    return (
        <div className="chat-container">
            <div className="chat-sidebar">
                <h4>Members</h4>
                <div
                    className={`sidebar-item ${chatType === 'group' ? 'active' : ''}`}
                    onClick={() => { setChatType('group'); setSelectedTarget(null); }}
                >
                    🌐 Group Chat
                    {hasLoadedStatus && chatType !== 'group' && unreadCounts[workspaceId] > 0 && (
                        <span className="unread-badge">{unreadCounts[workspaceId]}</span>
                    )}
                </div>
                <div className="direct-header">1:1 Chat</div>
                {filteredMembers.map(email => {
                    const cid = getChatId(email);
                    const isSelected = chatType === 'direct' && selectedTarget === email;
                    return (
                        <div key={email} className={`sidebar-item ${isSelected ? 'active' : ''}`} onClick={() => { setChatType('direct'); setSelectedTarget(email); }}>
                            <span className="name-trunc">👤 {getDisplayName(email)}</span>
                            {hasLoadedStatus && !isSelected && unreadCounts[cid] > 0 && (
                                <span className="unread-badge">{unreadCounts[cid]}</span>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="chat-main">
                <div className="chat-header">
                    <div className="header-info">
                        <h3>{chatType === 'group' ? "Group Chat" : `${getDisplayName(selectedTarget)}`}</h3>
                    </div>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="chat-messages">
                    {messages.map((msg, index) => {
                        const isMe = msg.senderEmail?.toLowerCase() === myEmail;
                        const prevMsg = messages[index - 1];
                        const showName = !isMe && chatType === 'group' && (!prevMsg || prevMsg.senderEmail !== msg.senderEmail);
                        return (
                            <div key={msg.id} className={`message-wrapper ${isMe ? "me" : "other"}`}>
                                {showName && <span className="sender-name">{getDisplayName(msg.senderEmail)}</span>}
                                <div className="message-bubble">{msg.text}</div>
                            </div>
                        );
                    })}
                    <div ref={scrollRef} />
                </div>
                <form className="chat-input" onSubmit={handleSendMessage}>
                    <input type="text" placeholder="Enter your message..." value={newMessage} onChange={e => setNewMessage(e.target.value)} />
                    <button type="submit">Send</button>
                </form>
            </div>
        </div>
    );
}
