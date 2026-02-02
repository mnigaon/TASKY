// src/components/dashboard/MemberModal.jsx
import React, { useState, useEffect } from "react";
import { db } from "../../firebase/firebase";
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import emailjs from "emailjs-com"; // ⭐ 추가
import "./MemberModal.css";

export default function MemberModal({ workspace, currentUser, onClose }) {
    const [email, setEmail] = useState("");
    const [members, setMembers] = useState(workspace.members || []);
    const [loading, setLoading] = useState(false);

    const isOwner = workspace.userId === currentUser.uid;

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!email.trim() || !isOwner) return;

        if (members.length >= 10) {
            alert("You can invite up to 10 people.");
            return;
        }

        if (members.includes(email.trim())) {
            alert("Already invited.");
            return;
        }

        setLoading(true);
        try {
            const wsRef = doc(db, "workspaces", workspace.id);
            await updateDoc(wsRef, {
                members: arrayUnion(email.trim())
            });

            // ⭐ EmailJS로 실제 초대 메일 발송
            try {
                await emailjs.send(
                    "service_tga0uyi", // ContactSales와 동일한 서비스 ID
                    "template_lhkjqsa", // 템플릿 ID (기존 템플릿 활용)
                    {
                        to_email: email.trim(),
                        to_name: email.trim().split('@')[0],

                        // Template variable aliases (User uses {{name}}, {{email}})
                        name: currentUser.displayName || currentUser.email,
                        email: currentUser.email,

                        // Explicit names for clarity
                        from_name: currentUser.displayName || currentUser.email,
                        from_email: currentUser.email,

                        subject: `[DAYZZY] ${workspace.name} You have been invited to the project!`,
                        message: `Hi! ${currentUser.displayName || currentUser.email} has invited you to collaborate on the '${workspace.name}' project in Dayzzy. Log in now and start working together! \n\nLog in: ${window.location.origin}`,
                    },
                    "fl41_kqu9IEPE1TlJ" // Public Key
                );
                console.log("Invitation email sent successfully!");
            } catch (mailErr) {
                console.error("Failed to send invitation email:", mailErr);
                // 메일 발송 실패해도 DB 업데이트는 성공했으므로 멤버 추가는 유지
            }

            setMembers(prev => [...prev, email.trim()]);
            setEmail("");
            alert(`We've sent an invitation email to ${email.trim()}!`);
        } catch (err) {
            console.error("Error inviting member:", err);
            alert("Failed to send invitation.");
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (memberEmail) => {
        if (!isOwner) return;
        if (!window.confirm(`Would you like to remove ${memberEmail} from the project?`)) return;

        setLoading(true);
        try {
            const wsRef = doc(db, "workspaces", workspace.id);
            await updateDoc(wsRef, {
                members: arrayRemove(memberEmail)
            });
            setMembers(prev => prev.filter(m => m !== memberEmail));
        } catch (err) {
            console.error("Error removing member:", err);
            alert("Failed to remove member.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="member-modal-overlay" onClick={onClose}>
            <div className="member-modal-content" onClick={e => e.stopPropagation()}>
                <div className="member-modal-header">
                    <h2>Member Management</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="member-modal-body">
                    <p className="project-name">Project: <strong>{workspace.name}</strong></p>

                    {isOwner && (
                        <form className="invite-form" onSubmit={handleInvite}>
                            <input
                                type="email"
                                placeholder="Enter the Google email address to invite"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                disabled={loading}
                                required
                            />
                            <button type="submit" disabled={loading || members.length >= 10}>
                                Invite
                            </button>
                        </form>
                    )}

                    <div className="member-list-section">
                        <h3>Member List ({members.length}/10)</h3>
                        <ul className="member-list">
                            <li className="member-item owner">
                                <span>{workspace.ownerEmail || "Leader (Me)"}</span>
                                <span className="role-badge leader">Leader</span>
                            </li>
                            {members.map(m => (
                                <li key={m} className="member-item">
                                    <span>{m}</span>
                                    {isOwner && (
                                        <button className="remove-btn" onClick={() => handleRemove(m)} disabled={loading}>
                                            Remove
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
