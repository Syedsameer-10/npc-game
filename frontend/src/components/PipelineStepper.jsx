// PipelineStepper.jsx — Minimalist Linear Stepper matching Editor theme
import React from 'react'
import { STAGE_CONFIG } from '../compiler/compiler'

export default function PipelineStepper({
  activeStageIndex,
  onSelectStage,
  result,
}) {
  const stages = STAGE_CONFIG

  return (
    <div
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 56,
        zIndex: 40,
        padding: '0 20px',
      }}
    >
      <div
        style={{
          maxWidth: 980,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 48,
          gap: 8,
        }}
      >
        {/* Horizontal Pipeline Stepper Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            flex: 1,
          }}
        >
          {stages.map((stg, idx) => {
            const isActive = activeStageIndex === idx
            const isCompleted = result?.stagesCompleted?.includes(stg.name)
            const isFailed = result?.failedAt === stg.name

            let color = 'var(--text-3)'
            let bg = 'transparent'
            let border = 'transparent'

            if (isActive) {
              color = 'var(--text-1)'
              bg = 'var(--surface-2)'
              border = 'var(--border-md)'
            } else if (isFailed) {
              color = 'var(--danger)'
            } else if (isCompleted) {
              color = 'var(--text-2)'
            }

            return (
              <React.Fragment key={stg.id}>
                <button
                  type="button"
                  onClick={() => onSelectStage(idx)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 9px',
                    borderRadius: 4,
                    border: `1px solid ${border}`,
                    background: bg,
                    color,
                    cursor: 'pointer',
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: 11,
                    fontWeight: isActive ? 600 : 400,
                    letterSpacing: '0.02em',
                    transition: 'all 0.12s',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'var(--text-1)'
                      e.currentTarget.style.background = 'var(--surface-2)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = color
                      e.currentTarget.style.background = bg
                    }
                  }}
                  title={stg.title}
                >
                  <span style={{ color: isActive ? 'var(--text-1)' : 'var(--text-3)', fontSize: 10 }}>
                    {String(stg.num).padStart(2, '0')}
                  </span>
                  <span>{stg.name}</span>

                  {/* Indicator dot */}
                  {isFailed ? (
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--danger)', flexShrink: 0 }} />
                  ) : isCompleted ? (
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--success)', opacity: isActive ? 1 : 0.6, flexShrink: 0 }} />
                  ) : null}
                </button>

                {idx < stages.length - 1 && (
                  <span style={{ color: 'var(--border-md)', fontSize: 10, userSelect: 'none', margin: '0 1px' }}>
                    /
                  </span>
                )}
              </React.Fragment>
            )
          })}
        </div>

        {/* Compact status on right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span
            style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: 10,
              fontWeight: 500,
              padding: '2px 7px',
              borderRadius: 4,
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              color: result?.success ? 'var(--success)' : 'var(--danger)',
            }}
          >
            {result?.success ? 'Valid' : result?.failedAt || 'Error'}
          </span>
        </div>
      </div>
    </div>
  )
}
