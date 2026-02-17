import { useState } from 'react'
import { Card } from '../components/Card'
import Badge from '../components/Badge'

const FUNCTIONS = [
  { name: 'concat', syntax: 'concat(a, b, ...)', description: 'Join multiple values together', example: 'concat({{firstname}}, " ", {{lastname}})', category: 'Text' },
  { name: 'upper', syntax: 'upper(text)', description: 'Convert text to UPPERCASE', example: 'upper({{firstname}})', category: 'Text' },
  { name: 'lower', syntax: 'lower(text)', description: 'Convert text to lowercase', example: 'lower({{email}})', category: 'Text' },
  { name: 'trim', syntax: 'trim(text)', description: 'Remove leading and trailing whitespace', example: 'trim({{company}})', category: 'Text' },
  { name: 'trimall', syntax: 'trimall(text)', description: 'Remove all whitespace from text', example: 'trimall({{phone}})', category: 'Text' },
  { name: 'capitalize', syntax: 'capitalize(text)', description: 'Capitalize the first letter of each word', example: 'capitalize({{city}})', category: 'Text' },
  { name: 'substring', syntax: 'substring(text, start, length)', description: 'Extract part of a string', example: 'substring({{firstname}}, 0, 1)', category: 'Text' },
  { name: 'replace', syntax: 'replace(text, search, replacement)', description: 'Replace all occurrences of search with replacement', example: 'replace({{phone}}, "-", "")', category: 'Text' },
  { name: 'length', syntax: 'length(text)', description: 'Get the number of characters in text', example: 'length({{lastname}})', category: 'Text' },
  { name: 'round', syntax: 'round(number, decimals)', description: 'Round a number to N decimal places', example: 'round({{deal_amount}}, 2)', category: 'Number' },
  { name: 'floor', syntax: 'floor(number)', description: 'Round down to the nearest integer', example: 'floor({{deal_amount}})', category: 'Number' },
  { name: 'ceil', syntax: 'ceil(number)', description: 'Round up to the nearest integer', example: 'ceil({{deal_amount}})', category: 'Number' },
  { name: 'abs', syntax: 'abs(number)', description: 'Get the absolute value of a number', example: 'abs({{score}})', category: 'Number' },
  { name: 'add (+)', syntax: 'a + b', description: 'Add two numbers', example: '{{deal_amount}} + 100', category: 'Math' },
  { name: 'subtract (-)', syntax: 'a - b', description: 'Subtract two numbers', example: '{{deal_amount}} - {{discount}}', category: 'Math' },
  { name: 'multiply (*)', syntax: 'a * b', description: 'Multiply two numbers', example: '{{deal_amount}} * 1.08', category: 'Math' },
  { name: 'divide (/)', syntax: 'a / b', description: 'Divide two numbers', example: '{{deal_amount}} / 12', category: 'Math' },
  { name: 'if', syntax: 'if(condition, then, else)', description: 'Return "then" value if condition is truthy, otherwise "else"', example: 'if({{firstname}}, Hello {{firstname}}, Hello there)', category: 'Logic' },
  { name: 'default', syntax: 'default(value, fallback)', description: 'Return value if not empty, otherwise return fallback', example: 'default({{company}}, No Company)', category: 'Logic' },
]

const CATEGORIES = [
  { name: 'Text', badge: 'info', count: 9 },
  { name: 'Number', badge: 'warning', count: 4 },
  { name: 'Math', badge: 'success', count: 4 },
  { name: 'Logic', badge: 'error', count: 2 },
]

const REAL_WORLD_EXAMPLES = [
  {
    title: 'Full Name (Uppercase)',
    formula: 'upper(concat({{firstname}}, " ", {{lastname}}))',
    description: 'Combine first and last name, then convert to uppercase',
    result: 'SRI KUMARAN'
  },
  {
    title: 'Name + Email Tag',
    formula: 'concat(upper({{firstname}}), " - ", lower({{email}}))',
    description: 'Uppercase name with lowercase email, separated by dash',
    result: 'SRI - sri@example.com'
  },
  {
    title: 'Display Name with Fallback',
    formula: 'default(concat(capitalize({{firstname}}), " ", capitalize({{lastname}})), Anonymous User)',
    description: 'Capitalized full name, or "Anonymous User" if empty',
    result: 'Sri Kumaran'
  },
  {
    title: 'First Initial + Last Name',
    formula: 'concat(upper(substring({{firstname}}, 0, 1)), ". ", capitalize({{lastname}}))',
    description: 'First letter initial with full last name',
    result: 'S. Kumaran'
  },
  {
    title: 'Deal with Tax',
    formula: 'round({{deal_amount}} * 1.18, 2)',
    description: 'Calculate deal amount with 18% tax, rounded to 2 decimals',
    result: '11800.00'
  },
  {
    title: 'Monthly Payment',
    formula: 'round({{deal_amount}} / 12, 2)',
    description: 'Split deal amount into 12 monthly payments',
    result: '833.33'
  },
  {
    title: 'Conditional Greeting',
    formula: 'if({{firstname}}, concat("Hi ", {{firstname}}, "!"), Hi there!)',
    description: 'Personalized greeting if name exists, generic if empty',
    result: 'Hi Sri!'
  },
  {
    title: 'Clean Phone Number',
    formula: 'replace(replace({{phone}}, "-", ""), " ", "")',
    description: 'Remove dashes and spaces from phone number',
    result: '9876543210'
  },
]

function FormulaReference() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [copiedIndex, setCopiedIndex] = useState(null)

  const filtered = FUNCTIONS.filter(fn => {
    const matchesSearch = !search.trim() ||
      fn.name.toLowerCase().includes(search.toLowerCase()) ||
      fn.description.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = activeCategory === 'All' || fn.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const handleCopy = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 1500)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-hubspot-dark">Formula Reference</h1>
        <p className="text-hubspot-gray mt-1">All available functions for the Format Data: Custom Mode action</p>
      </div>

      {/* How to use — Fix #1: Both syntaxes, Fix #2: Quoted strings */}
      <Card className="mb-6">
        <h2 className="font-semibold text-hubspot-dark mb-3">How to Use</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 rounded-lg p-3 border border-hubspot-border/50">
            <p className="font-medium text-hubspot-dark mb-2">Direct Property Access</p>
            <p className="text-hubspot-gray mb-2">Reference HubSpot properties directly using double curly braces:</p>
            <code className="block bg-white px-2 py-1.5 rounded border border-hubspot-border/50 font-mono text-xs mb-1">{'{{firstname}}'} {'{{lastname}}'} {'{{email}}'} {'{{company}}'}</code>
            <p className="text-hubspot-gray text-xs mt-1.5">Works with any contact, company, deal, or ticket property name.</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-hubspot-border/50">
            <p className="font-medium text-hubspot-dark mb-2">Property Picker References</p>
            <p className="text-hubspot-gray mb-2">Or use the Property 1/2/3 picker fields below the formula:</p>
            <div className="space-y-1">
              <p className="text-hubspot-gray text-xs"><code className="bg-white px-1.5 py-0.5 rounded border border-hubspot-border/50 font-mono">{'[[input1]]'}</code> = Property 1 value</p>
              <p className="text-hubspot-gray text-xs"><code className="bg-white px-1.5 py-0.5 rounded border border-hubspot-border/50 font-mono">{'[[input2]]'}</code> = Property 2 value</p>
              <p className="text-hubspot-gray text-xs"><code className="bg-white px-1.5 py-0.5 rounded border border-hubspot-border/50 font-mono">{'[[input3]]'}</code> = Property 3 value</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-hubspot-border/50">
            <p className="font-medium text-hubspot-dark mb-2">Quoted Strings</p>
            <p className="text-hubspot-gray mb-2">Use double quotes to include text with spaces or special characters:</p>
            <code className="block bg-white px-2 py-1.5 rounded border border-hubspot-border/50 font-mono text-xs">concat({'{{firstname}}'}, " ", {'{{lastname}}'})</code>
            <p className="text-hubspot-gray text-xs mt-1.5"><code className="font-mono">" "</code> becomes a space. <code className="font-mono">" - "</code> becomes dash with spaces.</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-hubspot-border/50">
            <p className="font-medium text-hubspot-dark mb-2">Nesting Functions</p>
            <p className="text-hubspot-gray mb-2">Combine multiple functions by nesting them inside each other:</p>
            <code className="block bg-white px-2 py-1.5 rounded border border-hubspot-border/50 font-mono text-xs">upper(concat({'{{firstname}}'}, " ", {'{{lastname}}'}))</code>
            <p className="text-hubspot-gray text-xs mt-1.5">Inner functions evaluate first, then outer functions process the result.</p>
          </div>
        </div>
      </Card>

      {/* Fix #3: Real-world examples */}
      <Card className="mb-6">
        <h2 className="font-semibold text-hubspot-dark mb-3">Real-World Examples</h2>
        <p className="text-sm text-hubspot-gray mb-4">Copy and paste these formulas into the Custom Mode action. Click to copy.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {REAL_WORLD_EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => handleCopy(ex.formula, `ex-${i}`)}
              className="text-left bg-gray-50 rounded-lg p-3 border border-hubspot-border/50 hover:border-hubspot-orange/50 hover:bg-hubspot-orange/5 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-hubspot-dark text-sm">{ex.title}</p>
                  <p className="text-xs text-hubspot-gray mt-0.5">{ex.description}</p>
                  <code className="block bg-white px-2 py-1.5 rounded border border-hubspot-border/50 font-mono text-xs mt-2 truncate">{ex.formula}</code>
                  <p className="text-xs text-hubspot-gray mt-1">Result: <span className="font-mono text-green-600">{ex.result}</span></p>
                </div>
                <span className="text-xs text-hubspot-gray group-hover:text-hubspot-orange flex-shrink-0 mt-1">
                  {copiedIndex === `ex-${i}` ? (
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </span>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-hubspot-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search functions..."
            className="w-full pl-9 pr-3 py-2 border border-hubspot-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-hubspot-blue focus:border-hubspot-blue"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveCategory('All')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeCategory === 'All'
                ? 'bg-hubspot-orange text-white'
                : 'bg-gray-100 text-hubspot-gray hover:bg-gray-200'
            }`}
          >
            All ({FUNCTIONS.length})
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === cat.name
                  ? 'bg-hubspot-orange text-white'
                  : 'bg-gray-100 text-hubspot-gray hover:bg-gray-200'
              }`}
            >
              {cat.name} ({cat.count})
            </button>
          ))}
        </div>
      </div>

      {/* Function List */}
      <div className="space-y-3">
        {filtered.map((fn, i) => (
          <Card key={fn.name} className="hover:border-hubspot-blue/50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-hubspot-dark font-mono">{fn.name}</h3>
                  <Badge variant={CATEGORIES.find(c => c.name === fn.category)?.badge || 'default'}>
                    {fn.category}
                  </Badge>
                </div>
                <p className="text-sm text-hubspot-gray mb-2">{fn.description}</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-hubspot-gray mb-1">Syntax</p>
                    <code className="block bg-gray-50 px-3 py-1.5 rounded text-sm font-mono border border-hubspot-border/50">{fn.syntax}</code>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-hubspot-gray mb-1">Example</p>
                    <code className="block bg-gray-50 px-3 py-1.5 rounded text-sm font-mono border border-hubspot-border/50">{fn.example}</code>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleCopy(fn.example, `fn-${i}`)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-hubspot-gray hover:text-hubspot-dark flex-shrink-0"
                title="Copy example"
              >
                {copiedIndex === `fn-${i}` ? (
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-hubspot-gray">
            <p>No functions match your search.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default FormulaReference
