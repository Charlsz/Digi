import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { SiteHeader } from "@/components/site-header"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Digi",
  description: "A private desk for sketch, manga, and ink drawings.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-paper font-sans text-ink">
        <div className="flex min-h-dvh flex-col">
          <SiteHeader />
          {children}
        </div>
      </body>
    </html>
  )
}
