import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Carregando" className="grid gap-4">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-5 w-72 max-w-full" />
      <div className="mt-2 grid gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}
