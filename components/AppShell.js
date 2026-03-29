'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

export default function AppShell({ children }) {
  const pathname = usePathname()
  const isCustomerPage =
    pathname === '/' || pathname === '' || pathname?.startsWith('/customer')

  if (isCustomerPage) {
    return <div className="app-container app-container--full">{children}</div>
  }

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  )
}
