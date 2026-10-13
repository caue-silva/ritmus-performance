import { UserPlus } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { PageHeader } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import { InstallBanner } from "@/components/pwa/install-app"
import { NowCard } from "@/features/agenda/components/now-card"
import { getNow } from "@/features/agenda/queries"
import { getActivationOptions } from "@/features/alunos/queries"
import { TaskBoard } from "@/features/tarefas/components/task-board"
import { getTasks } from "@/features/tarefas/queries"
import { requireAdmin } from "@/lib/auth"
import { firstName } from "@/lib/format"

export const metadata: Metadata = { title: "Tarefas" }

export default async function TarefasPage() {
  const staff = await requireAdmin()
  const [tasks, options, now] = await Promise.all([getTasks(), getActivationOptions(), getNow(staff.id)])
  return (
    <>
      <PageHeader
        title="Tarefas de hoje"
        description={
          tasks.length
            ? `Oi, ${firstName(staff.full_name)}. ${tasks.length === 1 ? "Uma coisa precisa" : `${tasks.length} coisas precisam`} da sua atenção.`
            : `Oi, ${firstName(staff.full_name)}.`
        }
        actions={
          <Button asChild size="lg" variant="outline">
            <Link href="/alunos/novo">
              <UserPlus aria-hidden /> Novo aluno
            </Link>
          </Button>
        }
      />
      <InstallBanner />
      <NowCard now={now} />
      <TaskBoard tasks={tasks} options={options} />
    </>
  )
}
