import { useState, useEffect } from 'react'

export const PHASE_LABELS = [
  'Tokens', 'NFA / DFA', 'Grammar', 'AST',
  'Semantic', 'CFG', 'IR (3AC)', 'Optimizer', 'CodeGen'
]

export default function TopNav({ result, onCompile }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const hasResult = !!result

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        gap: 12,
        background: 'rgba(247,247,245,0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: scrolled ? '1px solid var(--border-md)' : '1px solid var(--border)',
        transition: 'border-color 0.2s',
      }}
    >
      {/* Brand mark */}
      <a
        href="#"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          textDecoration: 'none',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: 'var(--text-1)',
            color: '#fff',
            fontFamily: "'Geist Mono', monospace",
            fontSize: 12,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          λ
        </div>
        <span
          style={{
            fontFamily: "'Geist', system-ui, sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-1)',
            letterSpacing: '-0.01em',
          }}
        >
          NPC Compiler
        </span>
        <span
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: 9.5,
            fontWeight: 600,
            padding: '2px 7px',
            borderRadius: 4,
            border: '1px solid var(--border)',
            background: 'var(--surface-2)',
            color: 'var(--text-3)',
            letterSpacing: '0.06em',
          }}
        >
          DSL v1.0
        </span>
      </a>

      {/* Center — phase redirect links */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flex: 1,
          justifyContent: 'center',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {/* Compiler Phases — single entry point */}
        <a
          href="#/phases"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 5,
            border: '1px solid var(--border-md)',
            background: hasResult ? 'var(--text-1)' : 'var(--surface-2)',
            color: hasResult ? '#fff' : 'var(--text-3)',
            fontFamily: "'Geist Mono', monospace",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            cursor: hasResult ? 'pointer' : 'default',
            pointerEvents: hasResult ? 'auto' : 'none',
            opacity: hasResult ? 1 : 0.45,
            transition: 'all 0.15s',
          }}
          title={hasResult ? 'View all compiler phases' : 'Compile code first'}
        >
          {/* Status dot */}
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: hasResult ? '#4ade80' : '#94a3b8',
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          Compiler Phases
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M1.5 7.5l6-6M4 1.5h3.5V5" />
          </svg>
        </a>

        <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 6px' }} />

        {/* Individual phase pills (only visible after compile) */}
        {hasResult && PHASE_LABELS.map((lbl, i) => (
          <a
            key={lbl}
            href="#/phases"
            onClick={(e) => {
              e.preventDefault()
              // Navigate to phases page and jump to the correct panel
              window.location.hash = '/phases'
              // Store target index for PhasesPage to pick up
              sessionStorage.setItem('phases_target', String(i))
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 9px',
              borderRadius: 4,
              border: '1px solid transparent',
              background: 'transparent',
              color: 'var(--text-2)',
              fontFamily: "'Geist Mono', monospace",
              fontSize: 10.5,
              fontWeight: 500,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              letterSpacing: '0.02em',
              transition: 'all 0.12s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--surface-2)'
              e.currentTarget.style.color = 'var(--text-1)'
              e.currentTarget.style.borderColor = 'var(--border-md)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-2)'
              e.currentTarget.style.borderColor = 'transparent'
            }}
          >
            {lbl}
          </a>
        ))}

        {/* Simulator anchor */}
        <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 6px' }} />
        <a
          href="#game-section"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 10px',
            borderRadius: 4,
            border: '1px solid rgba(34,197,94,0.3)',
            background: 'rgba(34,197,94,0.07)',
            color: '#059669',
            fontFamily: "'Geist Mono', monospace",
            fontSize: 10.5,
            fontWeight: 600,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: '#22c55e',
              display: 'inline-block',
              animation: 'pulse 2s infinite',
            }}
          />
          Simulator
        </a>
      </div>

      {/* Compile CTA */}
      <button
        onClick={onCompile}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 14px',
          borderRadius: 5,
          border: 'none',
          background: 'var(--text-1)',
          color: '#fff',
          fontFamily: "'Geist', system-ui, sans-serif",
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          flexShrink: 0,
          letterSpacing: '-0.01em',
        }}
      >
        <svg width="7" height="8" viewBox="0 0 7 8" fill="currentColor">
          <path d="M0 0L7 4L0 8V0Z" />
        </svg>
        Compile
      </button>
    </nav>
  )
}
