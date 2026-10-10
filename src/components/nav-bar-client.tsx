'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

type LinkItem = {
  href: string;
  label: string;
};

type NavBarClientProps = {
  links: LinkItem[];
};

export function NavBarClient({ links }: NavBarClientProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4"
    >
      <div className="pointer-events-auto grid w-full max-w-md grid-cols-4 gap-1 rounded-2xl border border-white/10 bg-zinc-950/95 p-1.5 text-sm shadow-lg backdrop-blur">
        {links.map((link) => {
          const isActive =
            link.href === "/"
              ? pathname === "/"
              : link.label === "Train"
                ? pathname === "/workout" || pathname?.startsWith("/workout/")
                : pathname?.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-11 min-w-0 items-center justify-center rounded-xl px-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                isActive
                  ? "bg-white/10 text-emerald-300"
                  : "text-white/70 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
