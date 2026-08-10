import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "./Spinner";
import { PrivacyConsentGate } from "./PrivacyConsentGate";

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Nothing behind here is reachable until the current policy is accepted.
  return (
    <PrivacyConsentGate>
      <Outlet />
    </PrivacyConsentGate>
  );
}
