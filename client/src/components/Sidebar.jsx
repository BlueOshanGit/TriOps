import { NavLink } from 'react-router-dom'

const navItems = [
  { path: '/snippets', label: 'Snippets', icon: CodeIcon },
  { path: '/secrets', label: 'Secrets', icon: KeyIcon },
  { path: '/logs', label: 'Logs', icon: ListIcon },
  { path: '/usage', label: 'Usage', icon: ChartIcon },
  { path: '/account', label: 'Account', icon: UserIcon }
]

function Sidebar({ portal, collapsed, onToggle }) {
  return (
    <aside
      className={`bg-white border-r border-hubspot-border flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="p-3 border-b border-hubspot-border">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-hubspot-orange rounded flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">HH</span>
              </div>
              <div className="overflow-hidden">
                <h1 className="font-semibold text-hubspot-dark whitespace-nowrap">HubHacks</h1>
                <p className="text-xs text-hubspot-gray whitespace-nowrap">HubSpot Integration</p>
              </div>
            </div>
          )}
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
            title={collapsed ? 'Open sidebar' : 'Close sidebar'}
          >
            {collapsed ? (
              <svg className="w-5 h-5 text-hubspot-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-hubspot-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 ${collapsed ? 'p-2' : 'p-4'}`}>
        <ul className="space-y-1">
          {navItems.map(item => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                title={item.label}
                className={({ isActive }) =>
                  `flex items-center rounded-lg transition-colors ${
                    collapsed
                      ? 'justify-center p-2.5'
                      : 'gap-3 px-3 py-2'
                  } ${
                    isActive
                      ? 'bg-hubspot-orange/10 text-hubspot-orange'
                      : 'text-hubspot-gray hover:bg-gray-100'
                  }`
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="font-medium whitespace-nowrap">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Portal Info */}
      {portal && (
        <div className={`border-t border-hubspot-border ${collapsed ? 'p-2' : 'p-4'}`}>
          {collapsed ? (
            <div
              className="w-10 h-10 mx-auto bg-hubspot-orange/10 rounded-full flex items-center justify-center cursor-default"
              title={`${portal.hubDomain || `Portal ${portal.portalId}`}\n${portal.userEmail}`}
            >
              <span className="text-hubspot-orange font-semibold text-sm">
                {(portal.userEmail || 'U')[0].toUpperCase()}
              </span>
            </div>
          ) : (
            <div className="text-xs text-hubspot-gray">
              <p className="truncate" title={portal.hubDomain}>
                {portal.hubDomain || `Portal ${portal.portalId}`}
              </p>
              <p className="truncate text-hubspot-gray/70" title={portal.userEmail}>
                {portal.userEmail}
              </p>
            </div>
          )}
        </div>
      )}
    </aside>
  )
}

// Icons
function CodeIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  )
}

function KeyIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  )
}

function ListIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )
}

function ChartIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function UserIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

export default Sidebar
