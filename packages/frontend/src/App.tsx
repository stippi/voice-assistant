import { Route, Routes } from "react-router-dom";
import "./App.css";
import DefaultPage from "./pages/default";
import MotionTestPage from "./pages/test-motion";
import TestStreaming from "./pages/test-streaming";
import OrigamiPage from "./pages/origami";

export function App() {
  return (
    <Routes>
      <Route path="/mt" element={<MotionTestPage />} />
      <Route path="/test-streaming" element={<TestStreaming />} />
      <Route path="/origami" element={<OrigamiPage />} />
      <Route path="*" element={<DefaultPage />} />
    </Routes>
  );
}
