import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
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
  IconClose,
} from "./icons";

/** Primary destinations, surfaced in the bottom tab bar. Labels are kept to one
 *  short word so six fit without truncating on a 360px-wide phone. */
const TABS = [
  { to: "/", label: "Home", icon: IconDashboard, end: true },
  { to: "/plans", label: "Plans", icon: IconDumbbell },
  { to: "/coach", label: "Coach", icon: IconSparkles },
  { to: "/gym-log", label: "Log", icon: IconCalendarCheck },
  { to: "/calories", label: "Food", icon: IconUtensils },
  { to: "/crews", label: "Crews", icon: IconUsers },
];

/** Secondary destinations, reached from the account sheet. */
const SHEET_LINKS = [
  { to: "/settings", label: "Settings", icon: IconSettings, hint: "Profile, Apple Health & subscription" },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Close the account sheet whenever the route changes.
  useEffect(() => setSheetOpen(false), [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-[100dvh] bg-slate-100">
      {/* On desktop the app sits in a centered phone-width column so it reads
          as an app rather than a stretched-out web page. */}
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col bg-slate-50 shadow-xl sm:border-x sm:border-slate-200">
        {/* App bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
          <Logo />
          <button
            onClick={() => setSheetOpen(true)}
            aria-label="Account menu"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 active:scale-95"
          >
            {user?.name?.[0]?.toUpperCase() ?? "?"}
          </button>
        </header>

        {/* Scrollable content. Bottom padding clears the tab bar. */}
        <main className="flex-1 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-5">
          <Outlet />
        </main>

        {/* Bottom tab bar */}
        <nav className="fixed bottom-0 z-30 w-full max-w-[480px] border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
          <div className="flex items-stretch">
            {TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors active:scale-95 ${
                    isActive ? "text-brand-600" : "text-slate-400"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <tab.icon className={`h-[22px] w-[22px] ${isActive ? "stroke-[2.4]" : ""}`} />
                    {tab.label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Account sheet */}
        {sheetOpen && (
          <div className="fixed inset-0 z-40 flex items-end justify-center">
            <div
              className="absolute inset-0 bg-black/40 animate-[fadeIn_150ms_ease-out]"
              onClick={() => setSheetOpen(false)}
            />
            <div className="relative w-full max-w-[480px] rounded-t-3xl bg-white pb-[max(1rem,env(safe-area-inset-bottom))] animate-[slideUp_200ms_ease-out]">
              <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-slate-300" />

              <div className="flex items-center gap-3 px-5 pb-4 pt-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-700">
                  {user?.name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{user?.name}</p>
                  <p className="truncate text-sm text-slate-400">{user?.email}</p>
                </div>
                <button
                  onClick={() => setSheetOpen(false)}
                  aria-label="Close"
                  className="rounded-full p-2 text-slate-400 active:bg-slate-100"
                >
                  <IconClose className="h-5 w-5" />
                </button>
              </div>

              <div className="border-t border-slate-100">
                {SHEET_LINKS.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className="flex items-center gap-4 px-5 py-4 active:bg-slate-50"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <link.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{link.label}</p>
                      <p className="text-xs text-slate-400">{link.hint}</p>
                    </div>
                  </NavLink>
                ))}

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-4 border-t border-slate-100 px-5 py-4 text-left active:bg-slate-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                    <IconLogout className="h-5 w-5" />
                  </div>
                  <p className="font-medium text-red-600">Log out</p>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
