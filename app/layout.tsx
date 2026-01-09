import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Groceries - Smart Inventory Manager',
  description: 'Track your groceries, never run out. Smart inventory management with adaptive learning.',
  manifest: '/manifest.json',
  themeColor: '#10b981',
  viewport: 'minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, user-scalable=no, viewport-fit=cover',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Groceries'
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  )
}
