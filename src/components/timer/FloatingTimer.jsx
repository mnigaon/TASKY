// src/components/timer/FloatingTimer.jsx
import React from "react";
import { useTimer } from "../../context/TimerContext"; // 타이머 상태 가져오기
import "./FloatingTimer.css";

export default function FloatingTimer() {
  const { isRunning } = useTimer(); // 타이머 실행 여부 확인

  if (!isRunning) return null; // 실행 중이 아니면 렌더링하지 않음

  return (
    <div className="floating-timer">
      ⏱️
    </div>
  );
}

