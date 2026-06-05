"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/config/tickers", label: "Tickers" },
  { href: "/config/fed-meetings", label: "Fed meetings" },
  { href: "/config/note-types", label: "Tipos de notas" },
];

export function ConfigSubnav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-investep-navy/20">
      <Link
        href="/config"
        className={`px-3 py-1.5 text-sm rounded ${
          pathname === "/config"
            ? "bg-investep-navy text-white"
            : "text-investep-navy border hover:bg-investep-cream"
        }`}
      >
        Configuración
      </Link>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`px-3 py-1.5 text-sm rounded ${
            pathname === link.href || pathname.startsWith(link.href + "/")
              ? "bg-investep-navy text-white"
              : "text-investep-navy border hover:bg-investep-cream"
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
