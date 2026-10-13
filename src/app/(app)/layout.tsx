import { AppShell } from "@/components/shell/app-shell"
import { countOpenTasks } from "@/features/tarefas/queries"
import { requireStaff } from "@/lib/auth"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff()
  // O contador só existe para o admin (as tarefas incluem informação financeira).
  const taskCount = staff.role === "admin" ? await countOpenTasks() : 0
  return (
    <AppShell staff={staff} taskCount={taskCount}>
      {children}
    </AppShell>
  )
}
