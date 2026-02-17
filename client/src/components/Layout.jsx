import { useState } from 'react'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'

function Layout({ children, portal }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="min-h-screen bg-hubspot-light">
      {/* Mobile top navbar - visible on small screens */}
      <MobileNav portal={portal} />

      {/* Desktop layout - sidebar + content */}
      <div className="hidden md:flex min-h-screen">
        <Sidebar
          portal={portal}
          collapsed={!sidebarOpen}
          onToggle={() => setSidebarOpen(prev => !prev)}
        />
        <main className="flex-1 p-6 overflow-auto min-w-0">
          {children}
        </main>
      </div>

      {/* Mobile layout - content below navbar */}
      <main className="md:hidden p-4 pt-2 overflow-auto">
        {children}
      </main>
    </div>
  )
}

export default Layout
