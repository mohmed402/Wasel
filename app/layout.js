import './globals.css'
import Sidebar from '../components/Sidebar'

export const metadata = {
  title: 'واصل - نظام الإدارة',
  description: 'نظام إدارة واصل',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <div className="app-container">
          <Sidebar />
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}

