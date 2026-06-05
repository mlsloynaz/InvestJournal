"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PriceCalc } from "@/components/checklist/PriceCalc";
import { TOOLS_DOCS_PATH, TOOLS_PLAN_INVERSION_PATH } from "@/lib/tools-paths";

const mainLinks: { href: string; label: string; matchPrefix?: string }[] = [
  { href: "/", label: "Dashboard" },
  { href: "/reports", label: "Reports" },
  { href: "/config", label: "Configuración", matchPrefix: "/config" },
];

const toolLinks: { href: string; label: string; matchPrefix?: string }[] = [
  { href: TOOLS_PLAN_INVERSION_PATH, label: "Plan inversión" },
  { href: TOOLS_DOCS_PATH, label: "Docs", matchPrefix: "/tools/docs" },
];

function linkClass(active: boolean) {
  return `block rounded px-3 py-2 text-sm transition-colors ${
    active ? "bg-white/20 text-white" : "hover:bg-white/10"
  }`;
}

function isActive(pathname: string, href: string, matchPrefix?: string) {
  if (href === "/") return pathname === "/";
  if (matchPrefix) return pathname === href || pathname.startsWith(matchPrefix);
  return pathname === href || pathname.startsWith(href + "/");
}

function isToolLinkActive(pathname: string, href: string, matchPrefix?: string) {
  if (href === TOOLS_DOCS_PATH) {
    return (
      pathname === TOOLS_DOCS_PATH ||
      pathname.startsWith("/tools/documentation") ||
      pathname.startsWith("/tools/strategies") ||
      pathname.startsWith("/tools/websites")
    );
  }
  return isActive(pathname, href, matchPrefix);
}

export function Sidebar() {
  const pathname = usePathname();
  const toolsActive = pathname.startsWith("/tools");

  return (
    <aside className="w-56 shrink-0 bg-investep-navy text-white h-screen sticky top-0 flex flex-col">
      <div className="shrink-0 p-4 pb-2">
        <p className="text-xs uppercase tracking-widest text-investep-gold">Investep</p>
        <h1 className="text-lg font-bold">InvestJournal</h1>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
        <nav className="flex flex-col gap-1">
          {mainLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={linkClass(isActive(pathname, link.href, link.matchPrefix))}
            >
              {link.label}
            </Link>
          ))}

          <div className="mt-3 pt-3 border-t border-white/20">
            <p
              className={`px-3 pb-1 text-xs uppercase tracking-wider ${
                toolsActive ? "text-investep-gold" : "text-investep-gold/80"
              }`}
            >
              Tools
            </p>
            {toolLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={linkClass(isToolLinkActive(pathname, link.href, link.matchPrefix))}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <section
            id="sidebar-calc"
            className="mt-6 pt-5 border-t-4 border-investep-gold rounded-lg bg-black/20 px-2 pb-3"
            aria-label="Calculadora en barra lateral"
          >
            <p className="px-1 pb-3 text-xs font-bold uppercase tracking-wider text-investep-gold">
              Calc
            </p>
            <PriceCalc variant="sidebar" />
          </section>
        </nav>
      </div>

      <p className="shrink-0 px-4 pb-3 text-xs text-white/60">Keep it simple.</p>
    </aside>
  );
}
