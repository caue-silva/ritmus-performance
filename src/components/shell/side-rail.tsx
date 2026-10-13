"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Logo } from "@/components/brand/logo"
import type { Staff } from "@/lib/auth"
import { cn } from "@/lib/utils"

import { CountBadge } from "./bottom-nav"
import { isActive, railNav } from "./nav-config"

export function SideRail({ role, taskCount = 0 }: { role: Staff["role"]; taskCount?: number }) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navegação principal"
      className="sticky top-0 hidden h-dvh w-24 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex lg:w-60"
    >
      <Link href="/" className="flex items-center gap-3 px-4 py-5 lg:px-5" aria-label="Início">
        <Logo size={48} className="mx-auto lg:mx-0" />
        <span className="hidden font-display text-xl leading-none font-bold uppercase lg:block">
          Ritmus
          <span className="block text-sm font-semibold tracking-wider text-brand">Performance</span>
        </span>
      </Link>
      <ul className="grid gap-1 px-2 lg:px-3">
        {railNav(role).map((item) => {
          const active = isActive(pathname, item.href)
          const Icon = item.icon
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-tap flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold transition-colors lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-base",
                  active
                    ? "bg-sidebar-accent text-brand"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <span className="relative">
                  <Icon className="size-6 lg:size-5" strokeWidth={active ? 2.4 : 2} aria-hidden />
                  {item.badge === "tasks" && taskCount > 0 && <CountBadge count={taskCount} className="lg:hidden" />}
                </span>
                <span className="text-center lg:flex-1 lg:text-left">{item.label}</span>
                {item.badge === "tasks" && taskCount > 0 && (
                  <span className="hidden rounded-full bg-brand px-2 text-sm leading-6 font-bold text-brand-foreground lg:inline">
                    {taskCount}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
