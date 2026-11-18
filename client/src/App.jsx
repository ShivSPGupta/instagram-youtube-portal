import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "./components/layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import InstagramPosts from "./pages/InstagramPosts";
import YouTubeConnect from "./pages/YouTubeConnect";
import UploadHistory from "./pages/UploadHistory";
import Settings from "./pages/Settings";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/instagram" element={<InstagramPosts />} />
          <Route path="/youtube" element={<YouTubeConnect />} />
          <Route path="/history" element={<UploadHistory />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
