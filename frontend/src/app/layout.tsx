import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Classic Computing 2025',
  description: 'Catalog Application for Classic Computing 2025',
  icons: {
    icon: 'favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
