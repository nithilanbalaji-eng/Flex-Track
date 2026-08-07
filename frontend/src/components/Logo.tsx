export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 font-extrabold tracking-tight ${className}`}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 12h2l1.5-4L9 16l2-6 1.5 4H21"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span>
        Flex<span className="text-brand-600">Track</span>
      </span>
    </div>
  );
}
