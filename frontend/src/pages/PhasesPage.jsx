// PhasesPage.jsx — Fullscreen Compiler Pipeline Inspector
// Styled with the exact clean typography and minimal palette as the Editor
import React, { useState } from 'react'
import PipelineStepper from '../components/PipelineStepper'
import PhaseSections from '../components/PhaseSections'

export default function PhasesPage({ result, sourceCode, onRecompile }) {
  const [activeStageIndex, setActiveStageIndex] = useState(0)

  if (!result) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
          color: 'var(--text-2)',
          fontFamily: "'Geist Mono', monospace",
          fontSize: 13,
          gap: 12,
        }}
      >
        <div>No compilation result available yet.</div>
        <a
          href="#"
          style={{
            color: 'var(--text-1)',
            padding: '5px 12px',
            background: 'var(--surface)',
            borderRadius: 4,
            border: '1px solid var(--border-md)',
            textDecoration: 'none',
          }}
        >
          ← Return to Editor
        </a>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        color: 'var(--text-1)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top App Header */}
      <header
        style={{
          height: 52,
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a
            href="#"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 4,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--text-2)',
              fontFamily: "'Geist Mono', monospace",
              fontSize: 11,
              textDecoration: 'none',
            }}
          >
            ← Editor
          </a>
          <span style={{ color: 'var(--border-md)' }}>/</span>
          <span style={{ fontFamily: "'Geist', system-ui, sans-serif", fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
            Compiler Pipeline
          </span>
        </div>

        <span
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: 10,
            padding: '2px 8px',
            borderRadius: 4,
            border: '1px solid var(--border)',
            background: 'var(--surface-2)',
            color: result.success ? 'var(--success)' : 'var(--danger)',
            fontWeight: 600,
          }}
        >
          {result.success ? '✓ Valid' : `Failed: ${result.failedAt}`}
        </span>
      </header>

      {/* Horizontal Stepper Navigation */}
      <PipelineStepper
        activeStageIndex={activeStageIndex}
        onSelectStage={setActiveStageIndex}
        result={result}
      />

      {/* Main Artifact Inspector Container */}
      <main
        style={{
          maxWidth: 860,
          width: '100%',
          margin: '0 auto',
          padding: '28px 20px 60px',
          flex: 1,
        }}
      >
        <PhaseSections
          result={result}
          activeStageIndex={activeStageIndex}
          onSelectStage={setActiveStageIndex}
        />
      </main>
    </div>
  )
}
