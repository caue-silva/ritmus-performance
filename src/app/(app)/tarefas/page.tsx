import type { Metadata } from "next"

import { PageHeader } from "@/components/shell/page-header"
import { getActivationOptions } from "@/features/alunos/queries"
import { TaskBoard } from "@/features/tarefas/components/task-board"
import { getTasks } from "@/features/tarefas/queries"
import { requireAdmin } from "@/lib/auth"
import { firstName } from "@/lib/format"

export const metadata: Metadata = { title: "Tarefas" }

export default async function TarefasPage() {
  const staff = await requireAdmin()
  const [tasks, options] = await Promise.all([getTasks(), getActivationOptions()])
  return (
    <>
      <PageHeader
        title="Tarefas de hoje"
        description={
          tasks.length
            ? `Oi, ${firstName(staff.full_name)}. ${tasks.length === 1 ? "Uma coisa precisa" : `${tasks.length} coisas precisam`} da sua atenção.`
            : `Oi, ${firstName(staff.full_name)}.`
        }
      />
      <TaskBoard tasks={tasks} options={options} />
    </>
  )
}
