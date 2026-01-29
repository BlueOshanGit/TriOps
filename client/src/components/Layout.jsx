import Sidebar from './Sidebar'

function Layout({ children, portal }) {
  return (
    <div className="min-h-screen bg-hubspot-light flex">
      <Sidebar portal={portal} />
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  )
}

export default Layout
