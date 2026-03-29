import './globals.css'
import AppShell from '../components/AppShell'

export const metadata = {
  title: 'واصل - نظام الإدارة',
  description: 'نظام إدارة واصل',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}

