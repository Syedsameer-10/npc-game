// CompileOverlay.jsx — Developer-tool terminal loading screen (Render CLI / Compiler build logs style)
import React, { useMemo } from 'react'

const ASCII_LOGO = `
.--------------------------------------------------------.
|  _   _ ____   ____    ____  _____ _   _  ___  ____     |
| | \\ | |  _ \\ / ___|  |  _ \\| ____| \\ | |/ _ \\|  _ \\    |
| |  \\| | |_) | |      | |_) |  _| |  \\| | | | | |_) |   |
| | |\\  |  __/| |___   |  _ <| |___| |\\  | |_| |  _ <    |
| |_| \\_|_|    \\____|  |_| \\_\\_____|_| \\_|\\___/|_| \\_\\   |
'--------------------------------------------------------'
`

const LOG_MESSAGES = [
  'INITIALIZING COMPILER PIPELINE SUBSYSTEM ...',
  'LEXICAL ANALYZER: DECOMPOSING STREAM INTO TOKENS ...',
  'AUTOMATA ENGINE: CONSTRUCTING NFA & DFA TRANSITIONS ...',
  'SYNTAX PARSER: RECURSIVE-DESCENT PARSE TREE GENERATION ...',
  'AST BUILDER: SYNTHESIZING ABSTRACT SYNTAX TREE NODES ...',
  'SEMANTIC VALIDATOR: CHECKING SYMBOL RESOLUTION & CONSTRAINTS ...',
  'CONTROL FLOW GENERATOR: CONSTRUCTING BASIC BLOCKS & EDGES ...',
  'IR GENERATOR: EMITTING LINEAR 3-ADDRESS CODE QUADRUPLES ...',
  'OPTIMIZATION ENGINE: PRUNING SHADOWED DEAD RULES ...',
  'CODE GENERATOR: PRODUCING TARGET RISC VM DISPATCH TABLE ...',
  'SYNTHESIS COMPLETE. SIMULATION READY TO EXECUTE.',
]

export default function CompileOverlay({ active, currentPhase }) {
  if (!active) return null

  // Generate a fake terminal timestamp string HH:MM:SS
  const now = new Date()
  const baseTime = (offsetSec) => {
    const t = new Date(now.getTime() - (10 - offsetSec) * 1000)
    return t.toTimeString().split(' ')[0]
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: '#0a0d14',
        color: '#e2e8f0',
        fontFamily: "'Geist Mono', monospace",
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 680,
          background: '#0e131f',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        {/* Terminal Header Bar */}
        <div
          style={{
            padding: '10px 16px',
            background: '#131929',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56', display: 'inline-block' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e', display: 'inline-block' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f', display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>npc-behavior-compiler --build</span>
          </div>
          <span style={{ fontSize: 10, color: '#38bdf8', padding: '2px 8px', borderRadius: 4, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)' }}>
            BUILDING TARGET
          </span>
        </div>

        {/* Terminal Body */}
        <div style={{ padding: '20px 24px', fontSize: 11.5, lineHeight: 1.8 }}>
          {/* Header logs */}
          <div style={{ color: '#64748b', marginBottom: 12 }}>
            <div>{baseTime(0)} INCOMING COMPILATION TRIGGER RECEIVED ...</div>
            <div>{baseTime(1)} COMPILER DAEMON WAKING UP ...</div>
          </div>

          {/* ASCII Banner Box */}
          <pre
            style={{
              margin: '12px 0 16px',
              fontFamily: "'Geist Mono', monospace",
              fontSize: 9.5,
              lineHeight: 1.25,
              color: '#38bdf8',
              letterSpacing: '0.02em',
              userSelect: 'none',
              overflowX: 'auto',
            }}
          >
            {ASCII_LOGO}
          </pre>

          {/* Real-time Stage Progression Logs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {LOG_MESSAGES.map((msg, idx) => {
              const isPast = idx < currentPhase
              const isCurrent = idx === currentPhase
              if (idx > currentPhase + 1) return null

              let color = '#475569'
              let prefix = '·'
              if (isPast) {
                color = '#94a3b8'
                prefix = '✓'
              } else if (isCurrent) {
                color = '#38bdf8'
                prefix = '▶'
              }

              return (
                <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ color: '#475569', fontSize: 10.5, width: 60, userSelect: 'none' }}>
                    {baseTime(idx + 2)}
                  </span>
                  <span style={{ color: isPast ? '#34d399' : isCurrent ? '#38bdf8' : '#475569', width: 14 }}>
                    {prefix}
                  </span>
                  <span style={{ color, fontWeight: isCurrent ? 600 : 400 }}>
                    {msg}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Bottom live indicator */}
          <div
            style={{
              marginTop: 18,
              paddingTop: 12,
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 10.5,
              color: '#94a3b8',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#38bdf8', animation: 'pulse 1s infinite' }} />
              <span>SYNTHESIZING STAGE {Math.min(9, currentPhase + 1)} / 9</span>
            </div>
            <span style={{ color: '#64748b' }}>STEADY COMPILATION. CLEAN RUNTIME DISPATCH.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
