import "./App.css";
import { Routes, Route } from "react-router-dom";
import DefaultPage from "./pages/default";
import RealTimePage from "./pages/realtime";
import MotionTestPage from "./pages/test-motion";
import TestStreaming from "./pages/test-streaming";

export function App() {
  return (
    <Routes>
      <Route path="/rt" element={<RealTimePage />} />
      <Route path="/mt" element={<MotionTestPage />} />
      <Route path="/test-streaming" element={<TestStreaming />} />
      <Route path="*" element={<DefaultPage />} />
    </Routes>
  );
}
