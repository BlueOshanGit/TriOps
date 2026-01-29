function Card({ children, className = '', padding = true }) {
  return (
    <div className={`bg-white rounded-lg border border-hubspot-border shadow-sm ${padding ? 'p-6' : ''} ${className}`}>
      {children}
    </div>
  )
}

function CardHeader({ children, className = '' }) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  )
}

function CardTitle({ children, className = '' }) {
  return (
    <h2 className={`text-lg font-semibold text-hubspot-dark ${className}`}>
      {children}
    </h2>
  )
}

function CardDescription({ children, className = '' }) {
  return (
    <p className={`text-sm text-hubspot-gray mt-1 ${className}`}>
      {children}
    </p>
  )
}

export { Card, CardHeader, CardTitle, CardDescription }
