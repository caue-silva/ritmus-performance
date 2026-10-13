import { toast } from "sonner"

/**
 * Aviso curto de sucesso com "Desfazer" — padrão para ações reversíveis
 * (check-in, confirmar pagamento, resolver tarefa). Nada de "Tem certeza?".
 */
export function toastWithUndo(message: string, onUndo: () => void | Promise<void>, duration = 6000) {
  toast.success(message, {
    duration,
    action: { label: "Desfazer", onClick: () => void onUndo() },
  })
}
