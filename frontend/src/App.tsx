import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { Privacy } from "./pages/Privacy";
import { Dashboard } from "./pages/Dashboard";
import { WorkoutPlans } from "./pages/WorkoutPlans";
import { WorkoutPlanDetail } from "./pages/WorkoutPlanDetail";
import { PlanBuilder } from "./pages/PlanBuilder";
import { AICoach } from "./pages/AICoach";
import { GymLogPage } from "./pages/GymLogPage";
import { CalorieTracker } from "./pages/CalorieTracker";
import { Crews } from "./pages/Crews";
import { Settings } from "./pages/Settings";
import { Premium } from "./pages/Premium";
import { NotFound } from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* Public: App Store review, AdSense and HealthKit all need this reachable
          without signing in. */}
      <Route path="/privacy" element={<Privacy />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/plans" element={<WorkoutPlans />} />
          <Route path="/plans/new" element={<PlanBuilder />} />
          <Route path="/plans/:id" element={<WorkoutPlanDetail />} />
          <Route path="/plans/:id/edit" element={<PlanBuilder />} />
          <Route path="/coach" element={<AICoach />} />
          <Route path="/gym-log" element={<GymLogPage />} />
          <Route path="/calories" element={<CalorieTracker />} />
          <Route path="/crews" element={<Crews />} />
          {/* Older links and bookmarks still land somewhere sensible. */}
          <Route path="/groups" element={<Navigate to="/crews" replace />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/premium" element={<Premium />} />
        </Route>
      </Route>

      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
