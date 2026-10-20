// PhaseSections.jsx — Clean, minimalist compiler artifact representations
// Uses the exact same typography and neutral color palette as the editor screen (Geist & Geist Mono)
// Features real SVG State Diagrams, Diagrammatic AST Tree, Semantic Scope Hierarchy Tree, and Flowchart-style CFG.
import React, { useState, useMemo } from 'react'
import { STAGE_CONFIG } from '../compiler/compiler'

const mono = "'Geist Mono', monospace"
const sans = "'Geist', system-ui, sans-serif"

function MetricItem({ label, value, note }) {
  return (
    <div
      style={{
        padding: '10px 14px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 6,
      }}
    >
      <div style={{ fontFamily: mono, fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ fontFamily: mono, fontSize: 18, fontWeight: 600, color: 'var(--text-1)', marginTop: 2 }}>
        {value}
      </div>
      {note && (
        <div style={{ fontFamily: sans, fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>
          {note}
        </div>
      )}
    </div>
  )
}

function SectionWrapper({ stage, activeStageIndex = 0, onSelectStage, children }) {
  const prevStage = activeStageIndex > 0 ? STAGE_CONFIG[activeStageIndex - 1] : null
  const nextStage = activeStageIndex < STAGE_CONFIG.length - 1 ? STAGE_CONFIG[activeStageIndex + 1] : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>
              {String(stage.num).padStart(2, '0')}
            </span>
            <h2 style={{ fontFamily: sans, fontSize: 16, fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>
              {stage.title}
            </h2>
          </div>
          <p style={{ fontFamily: sans, fontSize: 12, color: 'var(--text-2)', margin: '4px 0 0' }}>
            {stage.desc}
          </p>
        </div>

        {/* Phase Transition Quick Jump */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {prevStage && (
            <button
              type="button"
              onClick={() => onSelectStage?.(activeStageIndex - 1)}
              style={{
                fontFamily: mono,
                fontSize: 10.5,
                padding: '3px 8px',
                borderRadius: 4,
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
                color: 'var(--text-2)',
                cursor: 'pointer',
              }}
            >
              ← {prevStage.name}
            </button>
          )}

          <span style={{ fontFamily: mono, fontSize: 10.5, color: 'var(--text-3)', margin: '0 4px' }}>
            {stage.num} / 9
          </span>

          {nextStage && (
            <button
              type="button"
              onClick={() => onSelectStage?.(activeStageIndex + 1)}
              style={{
                fontFamily: mono,
                fontSize: 10.5,
                padding: '3px 8px',
                borderRadius: 4,
                border: '1px solid var(--border-md)',
                background: 'var(--surface)',
                color: 'var(--text-1)',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {nextStage.name} →
            </button>
          )}
        </div>
      </div>

      {children}

      {/* Footer Navigation Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 16,
          marginTop: 8,
          borderTop: '1px solid var(--border)',
        }}
      >
        <div>
          {prevStage ? (
            <button
              type="button"
              onClick={() => onSelectStage?.(activeStageIndex - 1)}
              style={{
                fontFamily: mono,
                fontSize: 11,
                padding: '5px 12px',
                borderRadius: 4,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-2)',
                cursor: 'pointer',
              }}
            >
              ← Previous: {prevStage.name}
            </button>
          ) : <div />}
        </div>

        <div>
          {nextStage ? (
            <button
              type="button"
              onClick={() => onSelectStage?.(activeStageIndex + 1)}
              style={{
                fontFamily: mono,
                fontSize: 11,
                fontWeight: 600,
                padding: '5px 14px',
                borderRadius: 4,
                border: '1px solid var(--border-md)',
                background: 'var(--text-1)',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Next: {nextStage.name} →
            </button>
          ) : (
            <a
              href="#game-section"
              style={{
                fontFamily: mono,
                fontSize: 11,
                fontWeight: 600,
                padding: '5px 14px',
                borderRadius: 4,
                background: 'var(--success)',
                color: '#fff',
                textDecoration: 'none',
              }}
            >
              Run in Simulation 🎮 →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 01. LEXER: Clean Token Table & Summary ────────────────────────────────
function LexerStage({ tokens, onSelectToken }) {
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const raw = useMemo(() => tokens || [], [tokens])
  const filtered = useMemo(() => {
    return raw.filter(t => {
      if (filter !== 'ALL' && t.category !== filter.toLowerCase() && t.type !== filter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return t.value.toLowerCase().includes(q) || t.type.toLowerCase().includes(q)
      }
      return true
    })
  }, [raw, filter, search])

  const counts = useMemo(() => {
    let kw = 0, ident = 0, cond = 0, act = 0
    raw.forEach(t => {
      if (t.category === 'keyword') kw++
      else if (t.category === 'identifier') ident++
      else if (t.category === 'condition') cond++
      else if (t.category === 'action') act++
    })
    return { kw, ident, cond, act }
  }, [raw])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
        <MetricItem label="Tokens" value={raw.length} />
        <MetricItem label="Keywords" value={counts.kw} note="NPC, WHEN" />
        <MetricItem label="Sensors" value={counts.cond} note="Sensory query" />
        <MetricItem label="Actuators" value={counts.act} note="Actuator command" />
        <MetricItem label="Identifiers" value={counts.ident} note="Named entity" />
      </div>

      {/* Filter / Search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 6, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {['ALL', 'KEYWORD', 'CONDITION', 'ACTION', 'IDENTIFIER'].map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                fontFamily: mono,
                fontSize: 10,
                padding: '3px 8px',
                borderRadius: 4,
                border: filter === cat ? '1px solid var(--border-md)' : '1px solid transparent',
                background: filter === cat ? 'var(--surface)' : 'transparent',
                color: filter === cat ? 'var(--text-1)' : 'var(--text-3)',
                cursor: 'pointer',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Filter tokens..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            fontFamily: mono,
            fontSize: 11,
            padding: '3px 8px',
            borderRadius: 4,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text-1)',
            outline: 'none',
            width: 160,
          }}
        />
      </div>

      {/* Token Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', maxHeight: 380 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: mono, fontSize: 11 }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '6px 12px', color: 'var(--text-3)', fontSize: 10, fontWeight: 500 }}>#</th>
                <th style={{ padding: '6px 12px', color: 'var(--text-3)', fontSize: 10, fontWeight: 500 }}>LEXEME</th>
                <th style={{ padding: '6px 12px', color: 'var(--text-3)', fontSize: 10, fontWeight: 500 }}>TOKEN TYPE</th>
                <th style={{ padding: '6px 12px', color: 'var(--text-3)', fontSize: 10, fontWeight: 500 }}>CATEGORY</th>
                <th style={{ padding: '6px 12px', color: 'var(--text-3)', fontSize: 10, fontWeight: 500 }}>POSITION</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, idx) => {
                const isSelected = selectedId === t.id
                return (
                  <tr
                    key={t.id || idx}
                    onClick={() => { setSelectedId(t.id); onSelectToken?.(t); }}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: isSelected ? 'var(--surface-3)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <td style={{ padding: '6px 12px', color: 'var(--text-3)' }}>{idx + 1}</td>
                    <td style={{ padding: '6px 12px', fontWeight: 600, color: 'var(--text-1)' }}>{t.value}</td>
                    <td style={{ padding: '6px 12px', color: 'var(--text-2)' }}>{t.type}</td>
                    <td style={{ padding: '6px 12px', color: 'var(--text-3)' }}>{t.category}</td>
                    <td style={{ padding: '6px 12px', color: 'var(--text-3)' }}>{t.line}:{t.column}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── 02. AUTOMATA: Real SVG State Diagram ───────────────────────────────────
function AutomataStage({ automata }) {
  const [view, setView] = useState('DFA')
  const [selectedState, setSelectedState] = useState(null)

  const dfaNodes = [
    { id: 'q0', x: 60, y: 130, label: 'q0', type: 'start', desc: 'Start state' },
    { id: 'q_N', x: 190, y: 60, label: 'q1', type: 'mid', desc: 'Matched "N"' },
    { id: 'q_NPC', x: 330, y: 60, label: 'q2', type: 'accept', desc: 'Accepts NPC' },
    { id: 'q_W', x: 190, y: 130, label: 'q3', type: 'mid', desc: 'Matched "W"' },
    { id: 'q_WHEN', x: 330, y: 130, label: 'q4', type: 'accept', desc: 'Accepts WHEN' },
    { id: 'q_COND', x: 230, y: 200, label: 'q5', type: 'accept', desc: 'Accepts Sensor' },
    { id: 'q_ACT', x: 370, y: 200, label: 'q6', type: 'accept', desc: 'Accepts Action' },
    { id: 'q_ID', x: 190, y: 270, label: 'q7', type: 'accept', desc: 'Accepts Identifier' },
    { id: 'q_SYM', x: 330, y: 270, label: 'q8', type: 'accept', desc: 'Accepts Delimiter' },
  ]

  const dfaEdges = [
    { from: 'q0', to: 'q_N', label: "'N'" },
    { from: 'q_N', to: 'q_NPC', label: "'PC'" },
    { from: 'q0', to: 'q_W', label: "'W'" },
    { from: 'q_W', to: 'q_WHEN', label: "'HEN'" },
    { from: 'q0', to: 'q_COND', label: "Sensors" },
    { from: 'q0', to: 'q_ACT', label: "Actions" },
    { from: 'q0', to: 'q_ID', label: "[a-zA-Z_]" },
    { from: 'q0', to: 'q_SYM', label: "{, }, :" },
  ]

  const nfaNodes = [
    { id: 'n0', x: 60, y: 140, label: 'n0', type: 'start', desc: 'Entry state' },
    { id: 'n1', x: 180, y: 70, label: 'n1', type: 'mid', desc: 'Keyword branch' },
    { id: 'n2', x: 320, y: 50, label: 'n2', type: 'accept', desc: 'Accepts NPC' },
    { id: 'n3', x: 320, y: 100, label: 'n3', type: 'accept', desc: 'Accepts WHEN' },
    { id: 'n4', x: 180, y: 160, label: 'n4', type: 'mid', desc: 'Enum branch' },
    { id: 'n5', x: 320, y: 160, label: 'n5', type: 'accept', desc: 'Accepts Enum' },
    { id: 'n6', x: 180, y: 230, label: 'n6', type: 'mid', desc: 'Identifier branch' },
    { id: 'n7', x: 320, y: 230, label: 'n7', type: 'accept', desc: 'Accepts Identifier' },
    { id: 'n8', x: 180, y: 290, label: 'n8', type: 'accept', desc: 'Accepts Delimiter' },
  ]

  const nfaEdges = [
    { from: 'n0', to: 'n1', label: "ε" },
    { from: 'n0', to: 'n4', label: "ε" },
    { from: 'n0', to: 'n6', label: "ε" },
    { from: 'n0', to: 'n8', label: "{, }, :" },
    { from: 'n1', to: 'n2', label: "'NPC'" },
    { from: 'n1', to: 'n3', label: "'WHEN'" },
    { from: 'n4', to: 'n5', label: "Sensors ∪ Actions" },
    { from: 'n6', to: 'n7', label: "[a-zA-Z_]" },
  ]

  const nodes = view === 'DFA' ? dfaNodes : nfaNodes
  const edges = view === 'DFA' ? dfaEdges : nfaEdges

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {['DFA', 'NFA'].map(t => (
            <button
              key={t}
              onClick={() => { setView(t); setSelectedState(null); }}
              style={{
                fontFamily: mono,
                fontSize: 11,
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 4,
                border: view === t ? '1px solid var(--border-md)' : '1px solid var(--border)',
                background: view === t ? 'var(--surface-2)' : 'var(--surface)',
                color: view === t ? 'var(--text-1)' : 'var(--text-3)',
                cursor: 'pointer',
              }}
            >
              {t} Graph
            </button>
          ))}
        </div>
        <div style={{ fontFamily: mono, fontSize: 11, color: 'var(--text-3)' }}>
          {view === 'DFA' ? 'Deterministic Finite Automaton' : 'Non-Deterministic Finite Automaton'}
        </div>
      </div>

      {/* SVG State Diagram Canvas */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 12, overflowX: 'auto' }}>
        <svg width="680" height="340" style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--text-3)" />
            </marker>
          </defs>

          {/* Directed Transitions */}
          {edges.map((e, i) => {
            const src = nodes.find(n => n.id === e.from)
            const dst = nodes.find(n => n.id === e.to)
            if (!src || !dst) return null
            const midX = (src.x + dst.x) / 2
            const midY = (src.y + dst.y) / 2 - 8

            return (
              <g key={i}>
                <line
                  x1={src.x}
                  y1={src.y}
                  x2={dst.x}
                  y2={dst.y}
                  stroke="var(--border-md)"
                  strokeWidth="1.2"
                  markerEnd="url(#arrow)"
                />
                <text
                  x={midX}
                  y={midY}
                  fontFamily={mono}
                  fontSize="9.5"
                  fill="var(--text-3)"
                  textAnchor="middle"
                  style={{ userSelect: 'none' }}
                >
                  {e.label}
                </text>
              </g>
            )
          })}

          {/* State Circles */}
          {nodes.map((n) => {
            const isSelected = selectedState?.id === n.id
            const isAccept = n.type === 'accept'
            const isStart = n.type === 'start'

            return (
              <g
                key={n.id}
                onClick={() => setSelectedState(n)}
                style={{ cursor: 'pointer' }}
              >
                {isAccept && (
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r="19"
                    fill="none"
                    stroke={isSelected ? 'var(--text-1)' : 'var(--text-3)'}
                    strokeWidth="1"
                  />
                )}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r="15"
                  fill={isSelected ? 'var(--surface-3)' : 'var(--surface)'}
                  stroke={isSelected ? 'var(--text-1)' : isStart ? 'var(--text-1)' : 'var(--border-md)'}
                  strokeWidth={isStart ? '1.8' : '1.2'}
                />
                <text
                  x={n.x}
                  y={n.y + 4}
                  fontFamily={mono}
                  fontSize="10"
                  fontWeight="600"
                  fill="var(--text-1)"
                  textAnchor="middle"
                >
                  {n.label}
                </text>
                <text
                  x={n.x}
                  y={n.y + 30}
                  fontFamily={mono}
                  fontSize="9"
                  fill="var(--text-3)"
                  textAnchor="middle"
                >
                  {n.id}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* State Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 14px' }}>
          <div style={{ fontFamily: mono, fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 6 }}>
            Selected State Detail
          </div>
          {selectedState ? (
            <div style={{ fontFamily: mono, fontSize: 11 }}>
              <div>State: <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{selectedState.label} ({selectedState.id})</span></div>
              <div style={{ color: 'var(--text-2)', marginTop: 2 }}>{selectedState.desc}</div>
              <div style={{ color: 'var(--text-3)', marginTop: 4 }}>Type: {selectedState.type}</div>
            </div>
          ) : (
            <div style={{ fontFamily: sans, fontSize: 11, color: 'var(--text-3)' }}>
              Click any node in the graph above to inspect its properties.
            </div>
          )}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 14px' }}>
          <div style={{ fontFamily: mono, fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 6 }}>
            Live Token Recognition Path
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {automata?.tokenDfaPath?.slice(0, 6).map((step, idx) => (
              <span key={idx} style={{ fontFamily: mono, fontSize: 10, padding: '2px 6px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text-2)' }}>
                {step.token} → {step.state}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 03. PARSER: Concrete Parse Tree / CST ─────────────────────────────────
function TreeNode({ node, depth = 0 }) {
  const [collapsed, setCollapsed] = useState(false)
  const isTerminal = node.type === 'Terminal'

  return (
    <div style={{ marginLeft: depth > 0 ? 16 : 0, marginTop: 3 }}>
      <div
        onClick={() => !isTerminal && setCollapsed(!collapsed)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '2px 6px',
          borderRadius: 4,
          background: isTerminal ? 'transparent' : 'var(--surface-2)',
          border: isTerminal ? '1px solid transparent' : '1px solid var(--border)',
          fontFamily: mono,
          fontSize: 11,
          cursor: isTerminal ? 'default' : 'pointer',
        }}
      >
        {!isTerminal && (
          <span style={{ fontSize: 9, color: 'var(--text-3)' }}>{collapsed ? '▶' : '▼'}</span>
        )}
        <span style={{ fontWeight: isTerminal ? 400 : 600, color: isTerminal ? 'var(--text-1)' : 'var(--text-2)' }}>
          {isTerminal ? `"${node.value}" (${node.tokenType})` : `<${node.name}>`}
        </span>
      </div>

      {!collapsed && node.children && (
        <div style={{ borderLeft: '1px solid var(--border-md)', paddingLeft: 6, marginTop: 2 }}>
          {node.children.map((child, i) => (
            <TreeNode key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function ParserStage({ parseTree, bnf }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
      {/* Parse Tree */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 14 }}>
        <div style={{ fontFamily: mono, fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 10 }}>
          Interactive Parse Tree (Concrete Syntax Tree)
        </div>
        <div style={{ overflowX: 'auto', maxHeight: 380 }}>
          {parseTree ? <TreeNode node={parseTree} /> : <div style={{ color: 'var(--text-3)' }}>No CST available.</div>}
        </div>
      </div>

      {/* Grammar Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 14 }}>
        <div style={{ fontFamily: mono, fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 10 }}>
          EBNF Grammar Productions Used
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: mono, fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '6px 8px', color: 'var(--text-3)', textAlign: 'left', fontWeight: 500, fontSize: 10 }}>NON-TERMINAL</th>
                <th style={{ padding: '6px 8px', color: 'var(--text-3)', textAlign: 'left', fontWeight: 500, fontSize: 10 }}>PRODUCTION</th>
              </tr>
            </thead>
            <tbody>
              {bnf?.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 8px', color: 'var(--text-2)', fontWeight: 600 }}>&lt;{r.nonTerminal}&gt;</td>
                  <td style={{ padding: '6px 8px', color: 'var(--text-1)' }}>{r.production}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── 04. AST: Diagrammatic Tree Canvas (SVG Flowchart Layout) ──────────────
function ASTStage({ ast, onSelectNode }) {
  const [selectedNode, setSelectedNode] = useState(null)
  const rules = ast?.npc?.rules || []

  // Dynamic layout calculations for clean SVG hierarchical diagram
  const svgW = Math.max(680, 240 + rules.length * 150)
  const rootX = svgW / 2
  const rootY = 32

  const npcX = rootX
  const npcY = 90

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* SVG Diagrammatic AST Canvas */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 14, overflowX: 'auto' }}>
        <div style={{ fontFamily: mono, fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 10 }}>
          Diagrammatic Abstract Syntax Tree (AST Graph)
        </div>

        <svg width={svgW} height="290" style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}>
          {/* Connector: Root -> NPC */}
          <line x1={rootX} y1={rootY + 16} x2={npcX} y2={npcY - 14} stroke="var(--border-md)" strokeWidth="1.2" />

          {/* Root ProgramNode */}
          <rect x={rootX - 60} y={rootY - 14} width="120" height="28" rx="4" fill="var(--surface-2)" stroke="var(--border-md)" strokeWidth="1" />
          <text x={rootX} y={rootY + 4} fontFamily={mono} fontSize="11" fontWeight="600" fill="var(--text-1)" textAnchor="middle">
            ProgramNode
          </text>

          {/* NPC Declaration Node */}
          <rect x={npcX - 70} y={npcY - 14} width="140" height="28" rx="4" fill="var(--surface)" stroke="var(--text-1)" strokeWidth="1.2" />
          <text x={npcX} y={npcY + 4} fontFamily={mono} fontSize="11" fontWeight="600" fill="var(--text-1)" textAnchor="middle">
            NPC: "{ast?.npc?.name}"
          </text>

          {/* Rule branches */}
          {rules.map((r, i) => {
            const span = (svgW - 80) / Math.max(1, rules.length)
            const rx = 40 + i * span + span / 2
            const ry = 160

            const condX = rx - 40
            const condY = 230
            const actX = rx + 40
            const actY = 230

            const isSelected = selectedNode?.id === r.id

            return (
              <g key={i}>
                {/* Connector: NPC -> RuleNode */}
                <path d={`M ${npcX} ${npcY + 14} L ${rx} ${ry - 14}`} fill="none" stroke="var(--border-md)" strokeWidth="1.2" />

                {/* Rule Node Box */}
                <rect
                  x={rx - 45}
                  y={ry - 14}
                  width="90"
                  height="28"
                  rx="4"
                  fill={isSelected ? 'var(--surface-3)' : 'var(--surface)'}
                  stroke={isSelected ? 'var(--text-1)' : 'var(--border-md)'}
                  strokeWidth={isSelected ? '1.5' : '1'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSelectedNode(r)
                    onSelectNode?.(r)
                  }}
                />
                <text x={rx} y={ry + 4} fontFamily={mono} fontSize="10" fontWeight="600" fill="var(--text-1)" textAnchor="middle" style={{ cursor: 'pointer' }} onClick={() => { setSelectedNode(r); onSelectNode?.(r); }}>
                  Rule #{i + 1}
                </text>

                {/* Branch to Condition */}
                <line x1={rx} y1={ry + 14} x2={condX} y2={condY - 12} stroke="var(--border-md)" strokeWidth="1" strokeDasharray="2,2" />
                <rect x={condX - 44} y={condY - 12} width="88" height="24" rx="3" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1" />
                <text x={condX} y={condY + 4} fontFamily={mono} fontSize="9" fill="var(--text-2)" textAnchor="middle">
                  {r.condition.name}
                </text>

                {/* Branch to Action */}
                <line x1={rx} y1={ry + 14} x2={actX} y2={actY - 12} stroke="var(--border-md)" strokeWidth="1" strokeDasharray="2,2" />
                <rect x={actX - 44} y={actY - 12} width="88" height="24" rx="3" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1" />
                <text x={actX} y={actY + 4} fontFamily={mono} fontSize="9" fontWeight="500" fill="var(--text-1)" textAnchor="middle">
                  {r.action.name}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Selected Node Details */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 14px' }}>
        <div style={{ fontFamily: mono, fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 4 }}>
          AST Node Properties
        </div>
        {selectedNode ? (
          <div style={{ fontFamily: mono, fontSize: 11, display: 'flex', gap: 20 }}>
            <span>Node: <strong style={{ color: 'var(--text-1)' }}>RuleNode</strong></span>
            <span>Condition: <strong style={{ color: 'var(--text-1)' }}>{selectedNode.condition.name}</strong></span>
            <span>Action: <strong style={{ color: 'var(--text-1)' }}>{selectedNode.action.name}</strong></span>
            <span>Location: Line {selectedNode.line}</span>
          </div>
        ) : (
          <div style={{ fontFamily: sans, fontSize: 11, color: 'var(--text-3)' }}>
            Click any Rule node in the tree diagram above to inspect its binding and source mapping.
          </div>
        )}
      </div>
    </div>
  )
}

// ── 05. SEMANTIC: Diagrammatic Scope Tree & Verification ──────────────────
function SemanticStage({ semantic }) {
  const symbols = semantic?.symbolTable || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Verification Diagnostics */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {semantic?.diagnosticsPassed?.map((diag, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: 4,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              fontFamily: mono,
              fontSize: 11,
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>✓ {diag.check}</span>
            <span style={{ color: 'var(--text-3)', fontSize: 10.5 }}>{diag.desc}</span>
          </div>
        ))}
      </div>

      {/* Diagrammatic Scope Hierarchy Graph */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 14, overflowX: 'auto' }}>
        <div style={{ fontFamily: mono, fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 12 }}>
          Diagrammatic Symbol & Scope Tree
        </div>

        <svg width="680" height="190" style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}>
          {/* Global Root Scope */}
          <rect x="270" y="16" width="140" height="28" rx="4" fill="var(--surface-2)" stroke="var(--border-md)" strokeWidth="1" />
          <text x="340" y="34" fontFamily={mono} fontSize="11" fontWeight="600" fill="var(--text-1)" textAnchor="middle">
            GLOBAL SCOPE
          </text>

          {/* Line from Global Scope to NPC Scope */}
          <line x1="340" y1="44" x2="340" y2="76" stroke="var(--border-md)" strokeWidth="1.2" />

          {/* NPC Scope */}
          <rect x="250" y="76" width="180" height="28" rx="4" fill="var(--surface)" stroke="var(--text-1)" strokeWidth="1.2" />
          <text x="340" y="94" fontFamily={mono} fontSize="11" fontWeight="600" fill="var(--text-1)" textAnchor="middle">
            NPC Scope: "{symbols[0]?.identifier}"
          </text>

          {/* Branch lines to Rules in Scope */}
          {symbols.slice(1).map((s, idx) => {
            const count = symbols.length - 1
            const span = 620 / Math.max(1, count)
            const sx = 30 + idx * span + span / 2
            const sy = 146

            return (
              <g key={idx}>
                <line x1="340" y1="104" x2={sx} y2={sy - 12} stroke="var(--border-md)" strokeWidth="1" />
                <rect x={sx - 48} y={sy - 12} width="96" height="24" rx="3" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1" />
                <text x={sx} y={sy + 4} fontFamily={mono} fontSize="9" fontWeight="500" fill="var(--text-1)" textAnchor="middle">
                  {s.identifier} ({s.status})
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Scoped Symbol Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ padding: '8px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontFamily: mono, fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase' }}>
          Scoped Symbol Table
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: mono, fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '6px 12px', color: 'var(--text-3)', fontSize: 10, fontWeight: 500 }}>IDENTIFIER</th>
                <th style={{ padding: '6px 12px', color: 'var(--text-3)', fontSize: 10, fontWeight: 500 }}>TYPE</th>
                <th style={{ padding: '6px 12px', color: 'var(--text-3)', fontSize: 10, fontWeight: 500 }}>SCOPE</th>
                <th style={{ padding: '6px 12px', color: 'var(--text-3)', fontSize: 10, fontWeight: 500 }}>BINDING</th>
                <th style={{ padding: '6px 12px', color: 'var(--text-3)', fontSize: 10, fontWeight: 500 }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {symbols.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 12px', fontWeight: 600 }}>{s.identifier}</td>
                  <td style={{ padding: '6px 12px', color: 'var(--text-2)' }}>{s.type}</td>
                  <td style={{ padding: '6px 12px', color: 'var(--text-3)' }}>{s.scope}</td>
                  <td style={{ padding: '6px 12px' }}>{s.value}</td>
                  <td style={{ padding: '6px 12px' }}>
                    <span style={{ padding: '2px 6px', borderRadius: 3, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 9.5 }}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── 06. CFG: Full Visual Flowchart Diagram ────────────────────────────────
function CFGStage({ cfg }) {
  const [selectedBlock, setSelectedBlock] = useState(null)
  const blocks = cfg?.blocks || []
  const edges = cfg?.edges || []

  // Dynamic flowchart layout coordinates
  const canvasW = 680
  const startX = canvasW / 2
  const stepY = 70
  const canvasH = Math.max(340, blocks.length * 48 + 80)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Visual Flowchart SVG Diagram */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 14, overflowX: 'auto' }}>
        <div style={{ fontFamily: mono, fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 12 }}>
          Visual Control Flow Graph Flowchart
        </div>

        <svg width={canvasW} height={canvasH} style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}>
          <defs>
            <marker id="cfg-arrow" viewBox="0 0 10 10" refX="16" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--text-3)" />
            </marker>
          </defs>

          {/* Render Flowchart Blocks in a structured tree/flow layout */}
          {blocks.map((blk, i) => {
            const isEntry = blk.type === 'entry'
            const isExit = blk.type === 'exit'
            const isFallback = blk.type === 'fallback'
            const isBranch = blk.type === 'branch'
            const isAction = blk.type === 'action'

            // Column placement: center for entry/exit/fallback, left for branch, right for action
            let bx = startX
            if (isBranch) bx = startX - 120
            else if (isAction) bx = startX + 120

            const by = 40 + i * 44
            blk._computedX = bx
            blk._computedY = by

            const isSelected = selectedBlock?.id === blk.id

            return (
              <g key={blk.id} onClick={() => setSelectedBlock(blk)} style={{ cursor: 'pointer' }}>
                {isBranch ? (
                  // Diamond shape for conditional branch decision
                  <polygon
                    points={`${bx},${by - 18} ${bx + 54},${by} ${bx},${by + 18} ${bx - 54},${by}`}
                    fill={isSelected ? 'var(--surface-3)' : 'var(--surface)'}
                    stroke={isSelected ? 'var(--text-1)' : 'var(--border-md)'}
                    strokeWidth={isSelected ? '1.6' : '1.2'}
                  />
                ) : (
                  // Rounded Box for normal statement block
                  <rect
                    x={bx - 60}
                    y={by - 15}
                    width="120"
                    height="30"
                    rx={isEntry || isExit ? 15 : 4}
                    fill={isSelected ? 'var(--surface-3)' : 'var(--surface-2)'}
                    stroke={isSelected ? 'var(--text-1)' : isEntry || isExit ? 'var(--text-1)' : 'var(--border-md)'}
                    strokeWidth={isEntry || isExit ? '1.5' : '1'}
                  />
                )}
                <text
                  x={bx}
                  y={by + 4}
                  fontFamily={mono}
                  fontSize="10"
                  fontWeight="600"
                  fill="var(--text-1)"
                  textAnchor="middle"
                >
                  {blk.id}
                </text>
              </g>
            )
          })}

          {/* Draw connecting flow arrows between computed blocks */}
          {edges.map((e, idx) => {
            const src = blocks.find(b => b.id === e.from)
            const dst = blocks.find(b => b.id === e.to)
            if (!src?._computedX || !dst?._computedX) return null

            const x1 = src._computedX
            const y1 = src._computedY + 15
            const x2 = dst._computedX
            const y2 = dst._computedY - 15
            const midX = (x1 + x2) / 2
            const midY = (y1 + y2) / 2

            return (
              <g key={idx}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="var(--border-md)"
                  strokeWidth="1.2"
                  markerEnd="url(#cfg-arrow)"
                />
                {e.label && (
                  <text
                    x={midX + 8}
                    y={midY}
                    fontFamily={mono}
                    fontSize="9"
                    fill="var(--text-3)"
                  >
                    {e.label}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Selected Block Inspector */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 14px' }}>
        <div style={{ fontFamily: mono, fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 4 }}>
          Inspecting Basic Block
        </div>
        {selectedBlock ? (
          <div style={{ fontFamily: mono, fontSize: 11 }}>
            <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{selectedBlock.title} ({selectedBlock.id})</div>
            <div style={{ color: 'var(--text-2)', marginTop: 4 }}>Statements:</div>
            <div style={{ marginLeft: 8, marginTop: 2 }}>
              {selectedBlock.statements?.map((s, i) => (
                <div key={i} style={{ color: 'var(--text-1)' }}>• {s}</div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ fontFamily: sans, fontSize: 11, color: 'var(--text-3)' }}>
            Click any block or diamond in the flowchart above to inspect its execution instructions.
          </div>
        )}
      </div>
    </div>
  )
}

// ── 07. IR: Three-Address Code Quadruples ─────────────────────────────────
function IRStage({ ir }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontFamily: mono, fontSize: 10, color: 'var(--text-3)' }}>
        THREE-ADDRESS CODE (3AC) TAPE
      </div>
      <div style={{ padding: 14, fontFamily: mono, fontSize: 12, lineHeight: 1.8, overflowX: 'auto' }}>
        {ir?.rawLines?.map((line, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 14 }}>
            <span style={{ color: 'var(--text-3)', width: 24, textAlign: 'right', userSelect: 'none' }}>
              {idx + 1}
            </span>
            <span style={{ color: line.includes(':') && !line.startsWith('    ') ? 'var(--text-1)' : 'var(--text-2)', fontWeight: line.includes(':') && !line.startsWith('    ') ? 600 : 400 }}>
              {line}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 08. OPTIMIZER: Clean Before vs After Comparison ───────────────────────
function OptimizerStage({ optimizer }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        <MetricItem label="Original Rules" value={optimizer?.originalCount || 0} />
        <MetricItem label="Pruned (Dead)" value={optimizer?.prunedCount || 0} />
        <MetricItem label="Surviving Rules" value={optimizer?.optimizedCount || 0} />
        <MetricItem label="Memory Saved" value={`${optimizer?.byteSavings || 0} B`} />
      </div>

      {/* Side by side Before / After */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontFamily: mono, fontSize: 10, color: 'var(--text-3)' }}>
            RAW INPUT IR (BEFORE)
          </div>
          <div style={{ padding: 12, fontFamily: mono, fontSize: 11, lineHeight: 1.8, overflowX: 'auto' }}>
            {optimizer?.beforeLines?.map((l, i) => (
              <div key={i} style={{ color: 'var(--text-2)' }}>{l}</div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontFamily: mono, fontSize: 10, color: 'var(--text-3)' }}>
            OPTIMIZED IR (AFTER PASSES)
          </div>
          <div style={{ padding: 12, fontFamily: mono, fontSize: 11, lineHeight: 1.8, overflowX: 'auto' }}>
            {optimizer?.afterLines?.map((l, i) => (
              <div key={i} style={{ color: 'var(--text-1)', fontWeight: 500 }}>{l}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 09. CODEGEN: Target Architecture & Bytecode Jump Table ────────────────
function CodeGenStage({ behavior }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Assembly Listing */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ padding: '8px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontFamily: mono, fontSize: 10, color: 'var(--text-3)' }}>
          TARGET ARCHITECTURE: {behavior?.targetArch}
        </div>
        <div style={{ padding: 14, fontFamily: mono, fontSize: 11.5, lineHeight: 1.8, overflowX: 'auto' }}>
          <pre style={{ margin: 0, color: 'var(--text-1)' }}>
            {behavior?.assemblyDump}
          </pre>
        </div>
      </div>

      {/* Jump Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ padding: '8px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontFamily: mono, fontSize: 10, color: 'var(--text-3)' }}>
          RUNTIME JUMP TABLE SLOTS
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: mono, fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '6px 12px', color: 'var(--text-3)', fontSize: 10, fontWeight: 500 }}>PRIORITY</th>
              <th style={{ padding: '6px 12px', color: 'var(--text-3)', fontSize: 10, fontWeight: 500 }}>OPCODE</th>
              <th style={{ padding: '6px 12px', color: 'var(--text-3)', fontSize: 10, fontWeight: 500 }}>SENSOR TRIGGER</th>
              <th style={{ padding: '6px 12px', color: 'var(--text-3)', fontSize: 10, fontWeight: 500 }}>ACTUATOR COMMAND</th>
              <th style={{ padding: '6px 12px', color: 'var(--text-3)', fontSize: 10, fontWeight: 500 }}>OFFSET</th>
            </tr>
          </thead>
          <tbody>
            {behavior?.rules?.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '6px 12px', color: 'var(--text-3)' }}>#{r.priority}</td>
                <td style={{ padding: '6px 12px', fontWeight: 600 }}>{r.opcode}</td>
                <td style={{ padding: '6px 12px' }}>{r.condition}</td>
                <td style={{ padding: '6px 12px' }}>{r.action}</td>
                <td style={{ padding: '6px 12px', color: 'var(--text-3)' }}>+{r.dispatchOffset}B</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Master Export ─────────────────────────────────────────────────────────
export default function PhaseSections({ result, activeStageIndex = 0, onSelectStage, onSourceHighlight }) {
  const currentStage = STAGE_CONFIG[activeStageIndex] || STAGE_CONFIG[0]

  if (!result) return null

  return (
    <SectionWrapper stage={currentStage} activeStageIndex={activeStageIndex} onSelectStage={onSelectStage}>
      {activeStageIndex === 0 && <LexerStage tokens={result.tokens} onSelectToken={onSourceHighlight} />}
      {activeStageIndex === 1 && <AutomataStage automata={result.automata} />}
      {activeStageIndex === 2 && <ParserStage parseTree={result.parseTree} bnf={result.bnf} />}
      {activeStageIndex === 3 && <ASTStage ast={result.ast} onSelectNode={onSourceHighlight} />}
      {activeStageIndex === 4 && <SemanticStage semantic={result.semantic} />}
      {activeStageIndex === 5 && <CFGStage cfg={result.cfg} />}
      {activeStageIndex === 6 && <IRStage ir={result.ir} />}
      {activeStageIndex === 7 && <OptimizerStage optimizer={result.optimizer} />}
      {activeStageIndex === 8 && <CodeGenStage behavior={result.behavior} />}
    </SectionWrapper>
  )
}
