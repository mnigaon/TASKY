import { useEffect, useState } from "react";

export default function PreferencesCard() {
  /* =========================
     ⭐ 초기값을 localStorage에서 직접 읽기
     (useEffect ❌ 절대 쓰지 말 것)
  ========================= */
  const [darkMode, setDarkMode] = useState(() =>
    localStorage.getItem("tasky_darkMode") === "true"
  );

  const [defaultStatus, setDefaultStatus] = useState(() =>
    localStorage.getItem("tasky_defaultStatus") || "pending"
  );

  const [enterSubmit, setEnterSubmit] = useState(() =>
    localStorage.getItem("tasky_enterSubmit") !== "false"
  );

  const [dateFormat, setDateFormat] = useState(() =>
    localStorage.getItem("tasky_dateFormat") || "YYYY-MM-DD"
  );

  /* =========================
     저장 함수
  ========================= */
  const save = (key, value) => {
    localStorage.setItem(key, value);
  };

  /* =========================
     🌙 Dark mode 저장 + App에 알림
     (body 직접 조작 ❌ App.jsx가 담당)
  ========================= */
  useEffect(() => {
    save("tasky_darkMode", darkMode);

    // App.jsx 전역 적용 트리거
    window.dispatchEvent(new Event("darkmode-change"));
  }, [darkMode]);

  /* =========================
     기타 설정 저장
  ========================= */
  useEffect(() => {
    save("tasky_defaultStatus", defaultStatus);
  }, [defaultStatus]);

  useEffect(() => {
    save("tasky_enterSubmit", enterSubmit);
  }, [enterSubmit]);

  useEffect(() => {
    save("tasky_dateFormat", dateFormat);
  }, [dateFormat]);

  return (
    <div className="sticker-card">
      <h3>⚙️ Preferences</h3>

      {/* Dark mode */}
      <SettingRow
        label="Dark Mode"
        control={
          <Toggle
            checked={darkMode}
            onChange={() => setDarkMode(!darkMode)}
          />
        }
      />

      {/* Default status */}
      <SettingRow
        label="Default Task Status"
        control={
          <select
            value={defaultStatus}
            onChange={(e) => setDefaultStatus(e.target.value)}
          >
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        }
      />

      {/* Enter submit */}
      <SettingRow
        label="Enter = Add Task"
        control={
          <Toggle
            checked={enterSubmit}
            onChange={() => setEnterSubmit(!enterSubmit)}
          />
        }
      />

      {/* Date format */}
      <SettingRow
        label="Date Format"
        control={
          <select
            value={dateFormat}
            onChange={(e) => setDateFormat(e.target.value)}
          >
            <option>YYYY-MM-DD</option>
            <option>MM-DD</option>
          </select>
        }
      />
    </div>
  );
}

/* =========================
   공통 UI 컴포넌트
========================= */

function SettingRow({ label, control }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 14,
      }}
    >
      <span style={{ fontFamily: "'Gaegu', cursive", fontSize: "1.2rem" }}>{label}</span>
      {control}
    </div>
  );
}

/* 토글 버튼 */
function Toggle({ checked, onChange }) {
  return (
    <div
      className={`sticker-toggle ${checked ? "active" : ""}`}
      onClick={onChange}
    >
      <div className="sticker-toggle-thumb" />
    </div>
  );
}

