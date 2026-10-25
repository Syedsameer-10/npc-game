import { useState, useRef } from 'react'
import { MASTER_PROGRAM } from '../compiler/compiler'

const SENSORS = [
  { name: 'WALL_AHEAD',    desc: 'Obstacle directly ahead' },
  { name: 'PIT_AHEAD',     desc: 'Hazard gap in front' },
  { name: 'PATH_CLEAR',    desc: 'Front cell is open' },
  { name: 'ENEMY_NEAR',    desc: 'Threat within 2 tiles' },
  { name: 'PLAYER_SEEN',   desc: 'Line-of-sight ray hit' },
  { name: 'PLAYER_NEAR',   desc: 'Player within 1.8 tiles' },
  { name: 'TREASURE_NEAR', desc: 'Data core within 2 tiles' },
  { name: 'HEALTH_LOW',    desc: 'Shield integrity ≤ 35%' },
  { name: 'DOOR_AHEAD',    desc: 'Extraction gate in front' },
]

const ACTIONS = [
  { name: 'MOVE_FORWARD', desc: 'Advance 1 cell' },
  { name: 'TURN_LEFT',    desc: 'Rotate 90° CCW' },
  { name: 'TURN_RIGHT',   desc: 'Rotate 90° CW' },
  { name: 'JUMP',         desc: 'Leap over 2-cell gap' },
  { name: 'ATTACK',       desc: 'Strike nearby threat' },
  { name: 'CHASE',        desc: 'Pursue sighted entity' },
  { name: 'RUN_AWAY',     desc: 'Flee from threat' },
  { name: 'COLLECT',      desc: 'Extract data core' },
  { name: 'STOP',         desc: 'Hold position' },
]

const GRAMMAR = [
  { name: 'NPC <Name> { }',  insert: 'NPC MyBot {\n    \n}', desc: 'NPC block declaration' },
  { name: 'WHEN <Cond>:',    insert: 'WHEN ',                desc: 'Sensor condition trigger' },
  { name: '// comment',      insert: '// ',                  desc: 'Inline comment' },
]

export default function HeroEditor({ source, setSource, onCompile, hasResult }) {
  const textareaRef = useRef(null)
  const gutterRef   = useRef(null)
  const [activeTab, setActiveTab] = useState('sensors')

  const lines = source.split('\n')

  const syncScroll = () => {
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  const handleResetDefault = () => {
    setSource(MASTER_PROGRAM)
    requestAnimationFrame(() => onCompile())
  }

  const handleKey = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      onCompile()
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = textareaRef.current
      const start = ta.selectionStart, end = ta.selectionEnd
      const newVal = source.slice(0, start) + '    ' + source.slice(end)
      setSource(newVal)
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 4 })
    }
  }

  const insertSnippet = (text) => {
    const ta = textareaRef.current
    if (!ta) { setSource(prev => prev + '\n' + text); return }
    const start = ta.selectionStart, end = ta.selectionEnd
    setSource(source.slice(0, start) + text + source.slice(end))
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = ta.selectionEnd = start + text.length
    })
  }

  const tabs = [
    { id: 'sensors', label: 'Sensors' },
    { id: 'actions', label: 'Actions' },
    { id: 'grammar', label: 'Grammar' },
  ]

  return (
    <section
      id="phase-source"
      style={{
        minHeight: 'calc(100dvh - 56px)',
        scrollMarginTop: 72,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        background: 'var(--bg)',
      }}
    >
      {/* Page header — single eyebrow allowed here as it's the hero */}
      <div style={{ maxWidth: 860, width: '100%', marginBottom: 28 }}>
        <div
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--text-3)',
            marginBottom: 10,
          }}
        >
          NPC Behavior Compiler
        </div>
        <h1
          style={{
            fontFamily: "'Geist', system-ui, sans-serif",
            fontSize: 'clamp(28px, 3.5vw, 44px)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            color: 'var(--text-1)',
            marginBottom: 10,
          }}
        >
          Write rules. Compile. Simulate.
        </h1>
        <p
          style={{
            fontFamily: "'Geist', system-ui, sans-serif",
            fontSize: 13,
            color: 'var(--text-2)',
            lineHeight: 1.6,
            maxWidth: 480,
          }}
        >
          Define sensor-driven reactive behavior in the DSL. The compiler runs 9
          transparent phases and executes the result in the NPC simulator below.
        </p>
      </div>

      {/* Split workbench: editor left, reference right */}
      <div
        style={{
          maxWidth: 860,
          width: '100%',
          display: 'grid',
          gridTemplateColumns: '1fr 260px',
          gap: 12,
          alignItems: 'stretch',
        }}
      >
        {/* ── Left: Code editor ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid var(--border-md)',
            borderRadius: 8,
            background: 'var(--surface)',
            overflow: 'hidden',
            minHeight: 420,
          }}
        >
          {/* Editor chrome bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              background: 'var(--surface-2)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            {/* macOS-style controls + filename */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffa0a0', display: 'inline-block' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffd080', display: 'inline-block' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#a0e0a0', display: 'inline-block' }} />
              </div>
              <span
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: 11,
                  color: 'var(--text-2)',
                  marginLeft: 4,
                  fontWeight: 500,
                }}
              >
                master.npc
              </span>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={handleResetDefault}
                title="Reset to default Master Program (all 9 sensors & actions)"
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: 10.5,
                  padding: '3px 9px',
                  borderRadius: 4,
                  border: '1px solid var(--border-md)',
                  background: 'var(--surface)',
                  color: 'var(--text-2)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                  <path d="M3 21v-5h5" />
                </svg>
                Reset Default
              </button>
            </div>
          </div>

          {/* Gutter + textarea */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: 'var(--surface)' }}>
            {/* Line numbers */}
            <div
              ref={gutterRef}
              style={{
                width: 38,
                flexShrink: 0,
                padding: '12px 6px 12px 0',
                textAlign: 'right',
                fontFamily: "'Geist Mono', monospace",
                fontSize: 11,
                lineHeight: '21px',
                color: 'var(--text-3)',
                background: 'var(--surface-2)',
                borderRight: '1px solid var(--border)',
                overflowY: 'hidden',
                whiteSpace: 'pre',
                userSelect: 'none',
              }}
            >
              {lines.map((_, i) => i + 1).join('\n')}
            </div>

            {/* Text area */}
            <textarea
              ref={textareaRef}
              value={source}
              onChange={e => setSource(e.target.value)}
              onScroll={syncScroll}
              onKeyDown={handleKey}
              spellCheck={false}
              placeholder={'NPC MyBot {\n    WHEN WALL_AHEAD:\n        TURN_LEFT\n}'}
              style={{
                flex: 1,
                padding: '12px 14px',
                fontFamily: "'Geist Mono', monospace",
                fontSize: 12.5,
                lineHeight: '21px',
                color: 'var(--text-1)',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                tabSize: 4,
                whiteSpace: 'pre',
              }}
            />
          </div>

          {/* Editor footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '7px 12px',
              background: 'var(--surface-2)',
              borderTop: '1px solid var(--border)',
            }}
          >
            <span
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: 10,
                color: 'var(--text-3)',
              }}
            >
              Ctrl + Enter to compile
            </span>

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setSource('')}
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: 11,
                  padding: '4px 10px',
                  borderRadius: 4,
                  border: '1px solid var(--border-md)',
                  background: 'var(--surface)',
                  color: 'var(--text-2)',
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
              <button
                onClick={onCompile}
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 14px',
                  borderRadius: 4,
                  border: 'none',
                  background: 'var(--text-1)',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <svg width="7" height="8" viewBox="0 0 7 8" fill="currentColor">
                  <path d="M0 0L7 4L0 8V0Z" />
                </svg>
                Compile
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: DSL language reference ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid var(--border-md)',
            borderRadius: 8,
            background: 'var(--surface)',
            overflow: 'hidden',
          }}
        >
          {/* Panel header */}
          <div
            style={{
              padding: '10px 14px 8px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--surface-2)',
            }}
          >
            <div
              style={{
                fontFamily: "'Geist', system-ui, sans-serif",
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-1)',
              }}
            >
              Language Reference
            </div>
            <div
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: 9.5,
                color: 'var(--text-3)',
                marginTop: 1,
              }}
            >
              Click any token to insert
            </div>
          </div>

          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--border)',
            }}
          >
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '7px 4px',
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: 10,
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  color: activeTab === tab.id ? 'var(--text-1)' : 'var(--text-3)',
                  background: activeTab === tab.id ? 'var(--surface)' : 'var(--surface-2)',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid var(--text-1)' : '2px solid transparent',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  transition: 'color 0.15s, border-color 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Token list — scrollable */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px 0',
            }}
          >
            {activeTab === 'sensors' && SENSORS.map((s, i) => (
              <button
                key={s.name}
                onClick={() => insertSnippet(s.name)}
                style={{
                  width: '100%',
                  display: 'block',
                  padding: '7px 14px',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: i < SENSORS.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <div
                  style={{
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--accent)',
                    marginBottom: 1,
                  }}
                >
                  {s.name}
                </div>
                <div
                  style={{
                    fontFamily: "'Geist', system-ui, sans-serif",
                    fontSize: 10.5,
                    color: 'var(--text-3)',
                  }}
                >
                  {s.desc}
                </div>
              </button>
            ))}

            {activeTab === 'actions' && ACTIONS.map((a, i) => (
              <button
                key={a.name}
                onClick={() => insertSnippet(a.name)}
                style={{
                  width: '100%',
                  display: 'block',
                  padding: '7px 14px',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: i < ACTIONS.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <div
                  style={{
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--kw-act)',
                    marginBottom: 1,
                  }}
                >
                  {a.name}
                </div>
                <div
                  style={{
                    fontFamily: "'Geist', system-ui, sans-serif",
                    fontSize: 10.5,
                    color: 'var(--text-3)',
                  }}
                >
                  {a.desc}
                </div>
              </button>
            ))}

            {activeTab === 'grammar' && (
              <div>
                {GRAMMAR.map((g, i) => (
                  <button
                    key={g.name}
                    onClick={() => insertSnippet(g.insert)}
                    style={{
                      width: '100%',
                      display: 'block',
                      padding: '7px 14px',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <div
                      style={{
                        fontFamily: "'Geist Mono', monospace",
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--kw-npc)',
                        marginBottom: 1,
                      }}
                    >
                      {g.name}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Geist', system-ui, sans-serif",
                        fontSize: 10.5,
                        color: 'var(--text-3)',
                      }}
                    >
                      {g.desc}
                    </div>
                  </button>
                ))}

                {/* Rule structure reference */}
                <div
                  style={{
                    margin: '10px 14px 8px',
                    padding: '10px 12px',
                    borderRadius: 6,
                    background: '#0f1117',
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: 11,
                    lineHeight: 1.8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      textTransform: 'uppercase',
                      letterSpacing: '0.14em',
                      color: '#555',
                      marginBottom: 6,
                    }}
                  >
                    Rule Structure
                  </div>
                  <span style={{ color: '#a78bfa' }}>NPC</span>{' '}
                  <span style={{ color: '#93c5fd' }}>Name</span>{' {\n'}
                  {'    '}<span style={{ color: '#a78bfa' }}>WHEN</span>{' '}
                  <span style={{ color: '#93c5fd' }}>CONDITION</span>{':\n'}
                  {'        '}<span style={{ color: '#fb923c' }}>ACTION</span>{'\n}'}
                </div>
              </div>
            )}
          </div>

          {/* Panel footer note */}
          <div
            style={{
              padding: '7px 14px',
              borderTop: '1px solid var(--border)',
              fontFamily: "'Geist Mono', monospace",
              fontSize: 9.5,
              color: 'var(--text-3)',
              background: 'var(--surface-2)',
            }}
          >
            Rules evaluated top-to-bottom priority.
          </div>
        </div>
      </div>

      {/* Scroll nudge — no animate-bounce, just a quiet indicator */}
      {hasResult && (
        <div
          style={{
            marginTop: 28,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: "'Geist Mono', monospace",
            fontSize: 10,
            color: 'var(--text-3)',
            letterSpacing: '0.08em',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2v8M3 7l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          scroll to explore compiler phases
        </div>
      )}
    </section>
  )
}
