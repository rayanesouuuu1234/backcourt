"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Schedule Builder" },
  { href: "/optimizer", label: "Optimizer" },
  { href: "/load", label: "Player Load" },
  { href: "/reports", label: "Reports" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <div className="brand-mark">
          <span>B</span>
        </div>
        <div className="brand-name">Backcourt</div>
      </Link>
      <nav className="nav">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={path === l.href ? "active" : ""}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
