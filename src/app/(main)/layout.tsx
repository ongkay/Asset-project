import type { ReactNode } from "react";

export default function LegacyMainLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <div className="pointer-events-none fixed right-3 bottom-3 z-50 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[11px] text-amber-700 shadow-sm backdrop-blur dark:text-amber-300">
        Legacy template route group. Product flow uses `/login`, `/console`, and `/admin`.
      </div>
      {children}
    </>
  );
}
