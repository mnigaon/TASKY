// src/App.jsx
import { useEffect, useState } from "react";

import { Routes, Route, useLocation } from "react-router-dom";
import Header from "./components/Headerr";
import Footer from "./components/Footer";
import Hero from "./components/Hero";
import Logoslider from "./components/Logoslider";
import FeatureCard from "./components/FeatureCards";
import FeatureRows from "./components/FeatureRows";
import TestimonialWall from "./components/TestimonialWall";
import FAQ from "./components/FAQ";
import HeroGradient from "./components/HeroGradient";
import ContactSales from "./components/ContactSales";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import Dashboard from "./components/dashboard/Dashboard";
import PrivateRoute from "./components/dashboard/PrivateRoute";

// TimerProvider 제거됨 (index.js로 이동)
import TimerPage from "./components/timer/TimerPage";
import "./styles/theme.css";
import "@fontsource/jua"; // Jua 폰트 import


function Home() {
  return (
    <>
      <Hero />
      <Logoslider />
      <FeatureCard />
      <FeatureRows />
      <TestimonialWall />
      <FAQ />
      <HeroGradient />
    </>
  );
}

function App() {
  const location = useLocation();
  const hideHeaderRoutes = ["/auth", "/auth/register", "/dashboard", "/timer"];

  const shouldShowHeader = !hideHeaderRoutes.some((route) =>
    location.pathname.startsWith(route)
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);


  /* =========================
     🌙 전역 다크모드 관리자
  ========================= */
  useEffect(() => {
    const applyDark = () => {
      const dark =
        localStorage.getItem("tasky_darkMode") === "true";

      document.body.classList.toggle("dark", dark);
    };

    applyDark(); // 최초 1회

    // ⭐ PreferencesCard에서 이벤트 받기
    window.addEventListener("darkmode-change", applyDark);

    return () =>
      window.removeEventListener("darkmode-change", applyDark);
  }, []);


  return (
    <>
      {shouldShowHeader && <Header />}

      <Routes>
        {/* 홈 */}
        <Route
          path="/"
          element={
            <>
              <Home />
              <Footer />
            </>
          }
        />

        {/* 인증 */}
        <Route path="/auth" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />

        {/* 컨택트 */}
        <Route
          path="/contact"
          element={
            <>
              <ContactSales />
              <Footer />
            </>
          }
        />

        {/* 타이머 페이지 */}
        <Route
          path="/timer"
          element={
            <TimerPage />
          }
        />

        {/* 대시보드 */}
        <Route
          path="/dashboard/*"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;
