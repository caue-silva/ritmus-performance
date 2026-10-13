import {
  CalendarDays,
  CircleUser,
  ClipboardCheck,

  LineChart,
  Menu,
  Settings,
  Timer,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react"

import type { Staff } from "@/lib/auth"

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  /** Mostra o contador de tarefas abertas. */
  badge?: "tasks"
}

const tarefas: NavItem = { href: "/tarefas", label: "Tarefas", icon: ClipboardCheck, badge: "tasks" }
const agora: NavItem = { href: "/agora", label: "Agora", icon: Timer }
const agenda: NavItem = { href: "/agenda", label: "Agenda", icon: CalendarDays }
const alunos: NavItem = { href: "/alunos", label: "Alunos", icon: Users }
const financeiro: NavItem = { href: "/financeiro", label: "Financeiro", icon: Wallet }
const painel: NavItem = { href: "/painel", label: "Painel", icon: LineChart }
const equipe: NavItem = { href: "/equipe", label: "Equipe", icon: UsersRound }
const configuracoes: NavItem = { href: "/configuracoes", label: "Ajustes", icon: Settings }
const conta: NavItem = { href: "/conta", label: "Conta", icon: CircleUser }
const mais: NavItem = { href: "/mais", label: "Mais", icon: Menu }

/** Barra inferior (celular): no máximo 5 itens. */
export function bottomNav(role: Staff["role"]): NavItem[] {
  return role === "admin" ? [tarefas, agenda, alunos, financeiro, mais] : [agora, agenda, alunos, conta]
}

/** Trilho lateral (tablet/computador): tudo visível. */
export function railNav(role: Staff["role"]): NavItem[] {
  return role === "admin"
    ? [tarefas, agora, agenda, alunos, financeiro, painel, equipe, configuracoes]
    : [agora, agenda, alunos]
}

/** Itens da tela "Mais" do admin no celular. */
export const moreItems: NavItem[] = [
  { ...agora, label: "Minha aula agora" },
  painel,
  equipe,
  { ...configuracoes, label: "Configurações" },
  conta,
]

export const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`)

