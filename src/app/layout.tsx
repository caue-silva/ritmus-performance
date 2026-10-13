import type { Metadata, Viewport } from "next"
import { Barlow, Barlow_Condensed } from "next/font/google"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"

import "./globals.css"

const body = Barlow({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600", "700"] })
const display = Barlow_Condensed({ variable: "--font-display", subsets: ["latin"], weight: ["600", "700"] })

export const metadata: Metadata = {
  title: { default: "Ritmus Performance", template: "%s · Ritmus" },
  description: "Gestão do estúdio Ritmus Performance",
  applicationName: "Ritmus",
  appleWebApp: { capable: true, title: "Ritmus", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0b0b0b" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0b" },
  ],
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${body.variable} ${display.variable} h-full`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          {/* Um aviso por vez: empilhados, eles cobriam os botões da metade de baixo da tela. */}
          <Toaster
            position="bottom-center"
            visibleToasts={1}
            duration={3500}
            offset={{ bottom: "calc(var(--nav-h) + 1rem)" }}
            mobileOffset={{ bottom: "calc(var(--nav-h) + env(safe-area-inset-bottom) + 0.75rem)" }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
