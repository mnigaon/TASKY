import "./Settings.css";
import ProfileCard from "./cards/ProfileCard";
import WorkspaceCard from "./cards/WorkspaceCard";
import PreferencesCard from "./cards/PreferencesCard";
import DangerCard from "./cards/DangerCard";

export default function Settings() {
  return (
    <div className="settings">
      <div className="settings-inner">
        <h2 className="settings-title">Settings</h2>

        {/* 🪪 프로필 섹션 (가장 중요!) */}
        <ProfileCard />

        {/* 🏷️ 기타 설정 (스티커 섹션) */}
        <WorkspaceCard />
        <PreferencesCard />
        <DangerCard />
      </div>
    </div>
  );
}
