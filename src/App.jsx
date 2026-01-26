// src/App.jsx
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

import { TimerProvider } from "./context/TimerContext";
import TimerPage from "./components/timer/TimerPage";

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
  const shouldShowHeader = !hideHeaderRoutes.includes(location.pathname);

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
            <TimerProvider>
              <TimerPage />
            </TimerProvider>
          }
        />

        {/* 대시보드 */}
        <Route
          path="/dashboard/*"
          element={
            <PrivateRoute>
              <TimerProvider>
                <Dashboard />
              </TimerProvider>
            </PrivateRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;
