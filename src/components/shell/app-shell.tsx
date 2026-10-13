import Link from "next/link"

import { Logo } from "@/components/brand/logo"
import type { Staff } from "@/lib/auth"

import { AccountMenu } from "./account-menu"
import { BottomNav } from "./bottom-nav"
import { SideRail } from "./side-rail"
import { StudentSearch } from "./student-search"

export function AppShell({ staff, taskCount = 0, children }: { staff: Staff; taskCount?: number; children: React.ReactNode }) {
  const roleLabel = staff.role === "admin" ? "Administrador" : "Personal"
  return (
    <div className="flex min-h-dvh">
      <SideRail role={staff.role} taskCount={taskCount} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-background/75">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 md:h-16 md:px-6">
            <Link href="/" className="flex items-center gap-2 md:hidden" aria-label="Início">
              <Logo size={36} />
              <span className="font-display text-lg leading-none font-bold uppercase">Ritmus</span>
            </Link>
            <div className="hidden flex-1 md:block">
              <StudentSearch variant="bar" />
            </div>
            <div className="ml-auto flex items-center gap-1">
              <div className="md:hidden">
                <StudentSearch variant="icon" />
              </div>
              <AccountMenu name={staff.full_name} roleLabel={roleLabel} avatarUrl={staff.avatar_url} />
            </div>
          </div>
        </header>
        <main
          id="conteudo"
          className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-[calc(var(--nav-h)+env(safe-area-inset-bottom)+1.5rem)] md:px-6 md:pt-8 md:pb-10"
        >
          {children}
        </main>
      </div>
      <BottomNav role={staff.role} taskCount={taskCount} />
    </div>
  )
}
