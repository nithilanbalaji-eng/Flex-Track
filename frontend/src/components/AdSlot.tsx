import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * An advertising placement.
 *
 * Premium subscribers never see these — the component renders nothing at all
 * for them, so there's no reserved gap where an ad used to be.
 *
 * Wiring a real ad network (Google AdSense on web, AdMob in the native app)
 * means replacing the placeholder body below with the network's unit; the
 * premium gating and layout around it stay exactly as they are. Until then
 * this renders an honest in-house promo rather than a fake advert.
 */
export function AdSlot({ placement }: { placement: string }) {
  const { user } = useAuth();

  // showAds is computed server-side so a client can't simply flip it.
  if (!user || user.showAds === false) return null;

  return (
    <div className="my-6" data-ad-placement={placement}>
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
        <span className="absolute right-3 top-3 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Ad
        </span>

        <p className="pr-10 text-sm font-semibold text-slate-900">Training without interruptions</p>
        <p className="mt-1 text-sm text-slate-500">
          Go Premium to remove ads and support the app.
        </p>
        <Link to="/premium" className="btn-primary mt-4 w-full">
          Remove ads — $2.99/mo
        </Link>
      </div>
    </div>
  );
}
