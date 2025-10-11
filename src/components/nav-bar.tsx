'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/exercises", label: "E" },
  { href: "/", label: "W" },
  { href: "/history", label: "H" },
  { href: "/workout", label: ">" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none fixed inset-x-0 bottom-8 flex justify-center"
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm backdrop-blur">
        {links.map((link) => {
          const isActive =
            link.href === "/"
              ? pathname === "/"
              : pathname?.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                isActive
                  ? "bg-white/20 text-white"
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
