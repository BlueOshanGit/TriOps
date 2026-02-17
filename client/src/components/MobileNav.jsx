import { useState } from 'react'
import { NavLink } from 'react-router-dom'

const navItems = [
  { path: '/snippets', label: 'Snippets', icon: CodeIcon },
  { path: '/formula-reference', label: 'Formulas', icon: FormulaIcon },
  { path: '/secrets', label: 'Secrets', icon: KeyIcon },
  { path: '/logs', label: 'Logs', icon: ListIcon },
  { path: '/usage', label: 'Usage', icon: ChartIcon },
  { path: '/account', label: 'Account', icon: UserIcon }
]

function MobileNav({ portal }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="md:hidden">
      {/* Top bar */}
      <div className="bg-white border-b border-hubspot-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-hubspot-orange rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">HH</span>
            </div>
            <h1 className="font-semibold text-hubspot-dark">HubHacks</h1>
          </div>
          <button
            onClick={() => setMenuOpen(prev => !prev)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {menuOpen ? (
              <svg className="w-6 h-6 text-hubspot-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-hubspot-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Dropdown menu */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setMenuOpen(false)}
          />

          {/* Menu panel */}
          <div className="absolute left-0 right-0 bg-white border-b border-hubspot-border shadow-lg z-50">
            <nav className="p-3">
              <ul className="space-y-1">
                {navItems.map(item => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-hubspot-orange/10 text-hubspot-orange'
                            : 'text-hubspot-gray hover:bg-gray-100'
                        }`
                      }
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium">{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Portal Info */}
            {portal && (
              <div className="px-4 py-3 border-t border-hubspot-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-hubspot-orange/10 rounded-full flex items-center justify-center">
                    <span className="text-hubspot-orange font-semibold text-sm">
                      {(portal.userEmail || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-hubspot-gray overflow-hidden">
                    <p className="truncate">{portal.hubDomain || `Portal ${portal.portalId}`}</p>
                    <p className="truncate text-hubspot-gray/70">{portal.userEmail}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
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

function FormulaIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <text x="3" y="17" fontSize="15" fontWeight="bold" fontStyle="italic" fill="currentColor" fontFamily="serif">fx</text>
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

export default MobileNav
