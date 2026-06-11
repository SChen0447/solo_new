import type { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <main className="max-w-[1200px] mx-auto px-4 pt-20 pb-10">
      {children}
    </main>
  )
}
