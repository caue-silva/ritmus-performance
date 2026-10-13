import { AppShell } from "@/components/shell/app-shell"
import { requireStaff } from "@/lib/auth"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff()
  return <AppShell staff={staff}>{children}</AppShell>
}
