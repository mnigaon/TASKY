//App.jsx
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

  // 헤더를 숨길 경로
  const hideHeaderRoutes = ["/auth", "/auth/register", "/dashboard"];
  const shouldShowHeader = !hideHeaderRoutes.includes(location.pathname);

  return (
    <>
      {shouldShowHeader && <Header />}

      <Routes>
        {/* 메인 홈 */}
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

        {/* 로그인 유저 전용 */}
        <Route
          path="/dashboard"
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
