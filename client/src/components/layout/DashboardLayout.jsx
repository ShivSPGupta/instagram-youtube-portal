import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
export default function DashboardLayout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="app-shell">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <main className="main">
        <Header onMenu={() => setOpen(true)} />
        <Outlet />
      </main>
    </div>
  );
}
