"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import type { Staff } from "@/lib/auth"
import { cn } from "@/lib/utils"

import { bottomNav, isActive, moreItems } from "./nav-config"

export function BottomNav({ role, taskCount = 0 }: { role: Staff["role"]; taskCount?: number }) {
  const pathname = usePathname()
  const items = bottomNav(role)

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)] text-sidebar-foreground md:hidden"
    >
      <ul className="mx-auto grid h-nav max-w-lg" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const active =
            isActive(pathname, item.href) ||
            (item.href === "/mais" && moreItems.some((m) => isActive(pathname, m.href)))
          const Icon = item.icon
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors",
                  active ? "text-brand" : "text-sidebar-foreground/75 hover:text-sidebar-foreground",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-0 h-0.5 w-8 rounded-full bg-brand transition-opacity",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="relative">
                  <Icon className="size-6" strokeWidth={active ? 2.4 : 2} aria-hidden />
                  {item.badge === "tasks" && taskCount > 0 && <CountBadge count={taskCount} />}
                </span>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function CountBadge({ count, className }: { count: number; className?: string }) {
  return (
    <span
      className={cn(
        "absolute -top-1.5 -right-3 min-w-5 rounded-full bg-brand px-1.5 text-center text-[0.7rem] leading-5 font-bold text-brand-foreground",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
      <span className="sr-only"> tarefas abertas</span>
    </span>
  )
}
