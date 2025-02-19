import type { Metadata } from 'next'
import SessionProvider from './components/SessionProvider' // ✅ Import Client Component

export const metadata: Metadata = {
  title: 'My App',
  description: 'Next.js + Nest.js + TypeORM',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>{' '}
        {/* ✅ Wrap with Client Component */}
      </body>
    </html>
  )
}
