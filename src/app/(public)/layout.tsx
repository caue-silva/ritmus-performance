// Telas sem o menu (login, primeiro acesso): sempre no visual escuro da marca.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="dark flex min-h-dvh flex-col bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </main>
  )
}
