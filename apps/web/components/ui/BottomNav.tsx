"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Icônes SVG inline — pas d'emojis (rendu incohérent selon Android)
const MapIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
    <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
  </svg>
);

const BarChartIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);

const PlugIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22v-5M9 7V2M15 7V2M9 7h6a4 4 0 010 8H9a4 4 0 010-8z"/>
  </svg>
);

const InfoIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
);

const LINKS = [
  { href: "/",       Icon: MapIcon,      label: "Carte"   },
  { href: "/stats",  Icon: BarChartIcon, label: "Stats"   },
  { href: "/spots",  Icon: PlugIcon,     label: "Charger" },
  { href: "/legal",  Icon: InfoIcon,     label: "Infos"   },
];

export function BottomNav() {
  const path = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/95 backdrop-blur border-t border-zinc-800/80 flex"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {LINKS.map(({ href, Icon, label }) => {
        const active = path === href || (href !== "/" && path.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center pt-2 pb-2 gap-0.5 transition-colors ${
              active ? "text-orange-400" : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            <Icon />
            <span className="text-[10px] font-medium mt-0.5">{label}</span>
            {active && (
              <span className="w-1 h-1 rounded-full bg-orange-400 mt-0.5" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
