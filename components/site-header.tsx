"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
  { href: "/", label: "Draw" },
  { href: "/archive", label: "Archive" },
]

export function SiteHeader() {
  const pathname = usePathname()

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5 sm:px-8">
      <Link href="/" className="text-[12px] uppercase tracking-[0.28em]">
        Digi
      </Link>
      <nav className="flex items-center gap-6 text-[13px]">
        {links.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={active ? "text-ink" : "text-ash hover:text-ink"}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
