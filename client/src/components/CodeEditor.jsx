import { useRef, useEffect } from 'react'

function CodeEditor({ value, onChange, height = '400px', readOnly = false }) {
  const textareaRef = useRef(null)
  const lineNumbersRef = useRef(null)

  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.value)
    }
  }

  const handleScroll = () => {
    if (lineNumbersRef.current && textareaRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  const handleKeyDown = (e) => {
    // Handle Tab key for indentation
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = e.target.selectionStart
      const end = e.target.selectionEnd
      const newValue = value.substring(0, start) + '  ' + value.substring(end)
      onChange(newValue)
      // Set cursor position after the tab
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2
      }, 0)
    }
  }

  const lines = value ? value.split('\n') : ['']
  const lineCount = lines.length

  return (
    <div
      className="monaco-editor-container bg-white overflow-hidden flex"
      style={{ height }}
    >
      {/* Line numbers */}
      <div
        ref={lineNumbersRef}
        className="bg-gray-50 text-gray-400 text-right py-4 px-2 font-mono text-sm select-none overflow-hidden border-r border-gray-200"
        style={{ minWidth: '50px' }}
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i + 1} className="leading-6">
            {i + 1}
          </div>
        ))}
      </div>

      {/* Code area */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        readOnly={readOnly}
        spellCheck={false}
        className="flex-1 p-4 font-mono text-sm leading-6 resize-none focus:outline-none bg-white text-gray-800"
        style={{
          tabSize: 2,
          MozTabSize: 2
        }}
        placeholder="// Write your JavaScript code here..."
      />
    </div>
  )
}

export default CodeEditor
