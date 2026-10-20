// CompilerWorkbench.jsx — Full Integrated Compiler Pipeline Workspace
// Minimalist, collapsible side drawer for Source Context giving maximum breathing room to diagrams
import React, { useState } from 'react'
import PipelineStepper from './PipelineStepper'
import PhaseSections from './PhaseSections'

export default function CompilerWorkbench({ result, sourceCode, onRecompile }) {
  const [activeStageIndex, setActiveStageIndex] = useState(0)
  const [highlightedSpan, setHighlightedSpan] = useState(null)
  const [showSource, setShowSource] = useState(true)

  const handleSourceHighlight = (item) => {
    if (item && item.line) {
      setHighlightedSpan({ line: item.line, col: item.column })
    } else {
      setHighlightedSpan(null)
    }
  }

  return (
    <section
      id="phases-workbench"
      style={{
        background: 'var(--bg)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        scrollMarginTop: 60,
      }}
    >
      {/* Horizontal Phase Stepper Component */}
      <PipelineStepper
        activeStageIndex={activeStageIndex}
        onSelectStage={setActiveStageIndex}
        result={result}
      />

      {/* Main Workspace Header Bar with Source Drawer Toggle */}
      <div
        style={{
          maxWidth: 1040,
          margin: '0 auto',
          padding: '14px 20px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        <button
          type="button"
          onClick={() => setShowSource(!showSource)}
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: 10.5,
            padding: '4px 10px',
            borderRadius: 4,
            border: '1px solid var(--border)',
            background: showSource ? 'var(--surface-2)' : 'var(--surface)',
            color: 'var(--text-2)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>{showSource ? 'Hide Source Context ◀' : 'Show Source Context ▶'}</span>
          {highlightedSpan && (
            <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>[L{highlightedSpan.line}]</span>
          )}
        </button>
      </div>

      {/* Main Workspace Grid: Dynamic 1-column or 2-column based on drawer */}
      <div
        style={{
          maxWidth: 1040,
          margin: '0 auto',
          padding: '12px 20px 48px',
          display: 'grid',
          gridTemplateColumns: showSource ? '250px 1fr' : '1fr',
          gap: 18,
          transition: 'all 0.2s ease',
        }}
      >
        {/* Left Column: Synchronized Source Context Tracer (collapsible) */}
        {showSource && (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-md)',
              borderRadius: 6,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              height: 'fit-content',
              position: 'sticky',
              top: 112,
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                background: 'var(--surface-2)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontFamily: "'Geist', system-ui, sans-serif", fontSize: 11.5, fontWeight: 600, color: 'var(--text-1)' }}>
                Source Trace
              </div>
              <span
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: 9.5,
                  color: highlightedSpan ? 'var(--text-1)' : 'var(--text-3)',
                  fontWeight: highlightedSpan ? 600 : 400,
                }}
              >
                {highlightedSpan ? `Line ${highlightedSpan.line}` : 'DSL'}
              </span>
            </div>

            {/* Source lines with real-time highlighting */}
            <div
              style={{
                padding: '8px 0',
                fontFamily: "'Geist Mono', monospace",
                fontSize: 11,
                lineHeight: 1.8,
                maxHeight: 480,
                overflowY: 'auto',
              }}
            >
              {sourceCode?.split('\n').map((line, idx) => {
                const lineNum = idx + 1
                const isTargetLine = highlightedSpan?.line === lineNum

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '1px 10px',
                      background: isTargetLine ? 'var(--surface-3)' : 'transparent',
                      borderLeft: `2.5px solid ${isTargetLine ? 'var(--text-1)' : 'transparent'}`,
                      transition: 'all 0.1s',
                    }}
                  >
                    <span
                      style={{
                        width: 22,
                        flexShrink: 0,
                        color: isTargetLine ? 'var(--text-1)' : 'var(--text-3)',
                        fontWeight: isTargetLine ? 600 : 400,
                        userSelect: 'none',
                        fontSize: 10,
                      }}
                    >
                      {lineNum}
                    </span>
                    <span
                      style={{
                        color: isTargetLine ? 'var(--text-1)' : 'var(--text-2)',
                        fontWeight: isTargetLine ? 600 : 400,
                        whiteSpace: 'pre',
                      }}
                    >
                      {line}
                    </span>
                  </div>
                )
              })}
            </div>

            <div
              style={{
                padding: '6px 12px',
                borderTop: '1px solid var(--border)',
                background: 'var(--surface-2)',
                fontFamily: "'Geist Mono', monospace",
                fontSize: 9.5,
                color: 'var(--text-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>Linked to tree nodes</span>
              <a href="#phase-source" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>
                Edit ↑
              </a>
            </div>
          </div>
        )}

        {/* Right Column: Active Phase Visualizer */}
        <div style={{ minWidth: 0 }}>
          <PhaseSections
            result={result}
            activeStageIndex={activeStageIndex}
            onSelectStage={setActiveStageIndex}
            onSourceHighlight={handleSourceHighlight}
          />
        </div>
      </div>
    </section>
  )
}
