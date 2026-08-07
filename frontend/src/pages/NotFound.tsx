import { Link } from "react-router-dom";
import { Logo } from "../components/Logo";

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo className="mb-8 text-lg" />
      <p className="text-5xl font-extrabold text-slate-900">404</p>
      <p className="mt-3 text-slate-500">We couldn't find that page.</p>
      <Link to="/" className="btn-primary mt-8">
        Back to dashboard
      </Link>
    </div>
  );
}
