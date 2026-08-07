import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Logo } from "./Logo";
import {
  IconDashboard,
  IconDumbbell,
  IconCalendarCheck,
  IconUtensils,
  IconUsers,
  IconSparkles,
  IconSettings,
  IconLogout,
  IconMenu,
  IconClose,
} from "./icons";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: IconDashboard, end: true },
  { to: "/plans", label: "Workout Plans", icon: IconDumbbell },
  { to: "/coach", label: "AI Coach", icon: IconSparkles },
  { to: "/gym-log", label: "Gym Log", icon: IconCalendarCheck },
  { to: "/calories", label: "Calorie Tracker", icon: IconUtensils },
  { to: "/groups", label: "Groups", icon: IconUsers },
  { to: "/settings", label: "Settings", icon: IconSettings },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
            }`
          }
        >
          <item.icon className="h-5 w-5" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="px-5 py-5">
          <Logo />
        </div>
        {nav}
        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {user?.name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{user?.name}</p>
              <p className="truncate text-xs text-slate-400">{user?.email}</p>
            </div>
            <button onClick={handleLogout} title="Log out" className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <IconLogout className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile topbar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <Logo />
        <button onClick={() => setMobileOpen(true)} className="rounded-md p-2 text-slate-600 hover:bg-slate-100">
          <IconMenu />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between px-5 py-5">
              <Logo />
              <button onClick={() => setMobileOpen(false)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100">
                <IconClose />
              </button>
            </div>
            {nav}
            <div className="border-t border-slate-200 p-4">
              <button onClick={handleLogout} className="btn-secondary w-full">
                <IconLogout className="h-4 w-4" /> Log out
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
