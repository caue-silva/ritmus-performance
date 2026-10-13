import { AppShell } from "@/components/shell/app-shell"
import { ensureMonthlyCharges } from "@/features/financeiro/queries"
import { countOpenTasks } from "@/features/tarefas/queries"
import { requireStaff } from "@/lib/auth"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff()
  // Sem rotina agendada: sempre que o admin abre o app, as mensalidades do mês são
  // garantidas (idempotente). O contador só existe para o admin (inclui financeiro).
  if (staff.role === "admin") await ensureMonthlyCharges()
  const taskCount = staff.role === "admin" ? await countOpenTasks() : 0
  return (
    <AppShell staff={staff} taskCount={taskCount}>
      {children}
    </AppShell>
  )
}
