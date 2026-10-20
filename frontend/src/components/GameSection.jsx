import { useEffect, useRef, useState } from 'react'
import { GameEngine } from '../game/GameEngine'

const MANUAL_ACTIONS = [
  { key: 'MOVE_FORWARD', label: 'Forward', kbd: 'I', color: '#3b82f6' },
  { key: 'TURN_LEFT',    label: 'Turn Left', kbd: 'J', color: '#64748b' },
  { key: 'TURN_RIGHT',   label: 'Turn Right', kbd: 'L', color: '#64748b' },
  { key: 'JUMP',         label: 'Jump (Pit)', kbd: 'P', color: '#38bdf8' },
  { key: 'ATTACK',       label: 'Attack Sentry', kbd: 'U', color: '#f87171' },
  { key: 'CHASE',        label: 'Seek Target', kbd: '', color: '#fb923c' },
  { key: 'RUN_AWAY',     label: 'Evade Area', kbd: '', color: '#a78bfa' },
  { key: 'COLLECT',      label: 'Extract Core', kbd: 'O', color: '#facc15' },
  { key: 'STOP',         label: 'Hold & Shield', kbd: 'H', color: '#34d399' },
]

const SPEEDS = [
  { ms: 900, label: '0.5×' },
  { ms: 500, label: '1×'   },
  { ms: 200, label: '2×'   },
  { ms: 80,  label: '5×'   },
]

// Minimal SVG icons
const Play  = () => <svg width="8" height="9" viewBox="0 0 8 9" fill="currentColor"><path d="M0 0L8 4.5L0 9V0Z"/></svg>
const Pause = () => <svg width="8" height="9" viewBox="0 0 8 9" fill="currentColor"><rect x="0" y="0" width="3" height="9" rx="1"/><rect x="5" y="0" width="3" height="9" rx="1"/></svg>
const Step  = () => <svg width="10" height="9" viewBox="0 0 10 9" fill="currentColor"><path d="M0 0L6 4.5L0 9V0Z"/><rect x="8" y="0" width="2" height="9" rx="1"/></svg>
const Reset = () => <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M8.5 5A3.5 3.5 0 1 1 5 1.5h2.5M7.5 1.5H10V4"/></svg>
const Snd   = () => <svg width="11" height="10" viewBox="0 0 11 10" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M1 3.5H3L6 1v8L3 6.5H1V3.5Z"/><path d="M8 3a2.5 2.5 0 0 1 0 4"/></svg>
const Mute  = () => <svg width="11" height="10" viewBox="0 0 11 10" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M1 3.5H3L6 1v8L3 6.5H1V3.5Z"/><path d="M8.5 3.5L11 6M11 3.5L8.5 6"/></svg>

// Health bar
function HealthBar({ value, max = 100, color = '#22c55e' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const barColor = pct > 50 ? color : pct > 25 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 99, transition: 'width 0.3s ease' }} />
    </div>
  )
}

// Sensor indicator dot
function SensorDot({ name, active }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? '#22c55e' : 'rgba(255,255,255,0.1)', flexShrink: 0, boxShadow: active ? '0 0 6px #22c55e' : 'none', transition: 'all 0.2s' }} />
      <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 9.5, color: active ? '#22c55e' : 'rgba(255,255,255,0.25)', fontWeight: active ? 700 : 400, transition: 'color 0.2s', letterSpacing: '0.04em' }}>
        {name.replace(/_/g, ' ')}
      </span>
    </div>
  )
}

export default function GameSection({ gameRef, onEngineReady }) {
  const canvasRef   = useRef(null)
  const engineRef   = useRef(null)
  const [running,      setRunning]      = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [mapId,        setMapId]        = useState('arena')
  const [speed,        setSpeed]        = useState(500)
  const [mode,         setMode]         = useState('compiled')
  const [telemetry,    setTelemetry]    = useState({
    cycle: 0, action: 'IDLE', heading: 'RIGHT', health: 100,
    operatorHealth: 100, score: 0, matchedRule: null, conditions: {},
    mission: { name: 'Sector 7: Tactical Combat Ground', objective: 'Destroy all static target sentries', status: 'ACTIVE', collected: 0, totalT: 2, threats: 2 },
  })

  const mono   = "'Geist Mono', monospace"
  const sans   = "'Geist', system-ui, sans-serif"
  const bg0    = '#090c14'
  const bg1    = '#0d1220'
  const bg2    = '#111827'
  const border = 'rgba(255,255,255,0.07)'
  const text1  = '#e2e8f0'
  const text2  = '#64748b'
  const accent = '#3b82f6'

  useEffect(() => {
    if (!canvasRef.current) return
    const engine = new GameEngine(canvasRef.current, tel => setTelemetry(tel), r => setRunning(r))
    engineRef.current = engine
    onEngineReady(engine)
    return () => { onEngineReady(null); engine.destroy() }
  }, [])

  const handleMap   = (id) => { setMapId(id); engineRef.current?.pause(); engineRef.current?.initWorld(id) }
  const handleSpeed = (ms) => { setSpeed(ms); engineRef.current?.setSpeed(ms) }
  const handleMode  = (m)  => { setMode(m);   engineRef.current?.setMode(m) }

  const btnBase = {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '5px 10px', borderRadius: 5,
    fontFamily: mono, fontSize: 10.5, fontWeight: 500, cursor: 'pointer',
    border: `1px solid ${border}`, background: bg2, color: text1,
    transition: 'background 0.12s',
  }

  const missionColors = {
    ACTIVE:  { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
    VICTORY: { bg: 'rgba(34,197,94,0.15)',  color: '#4ade80', border: 'rgba(34,197,94,0.4)'  },
    DEFEAT:  { bg: 'rgba(239,68,68,0.12)',  color: '#f87171', border: 'rgba(239,68,68,0.3)'  },
  }
  const mc = missionColors[telemetry.mission?.status] || missionColors.ACTIVE

  const allSensors = ['WALL_AHEAD','PIT_AHEAD','PATH_CLEAR','ENEMY_NEAR','PLAYER_SEEN','PLAYER_NEAR','TREASURE_NEAR','HEALTH_LOW','DOOR_AHEAD']

  return (
    <section id="game-section" style={{ scrollMarginTop: 56, background: bg0, borderTop: `1px solid ${border}`, padding: '32px 24px 48px' }}>
      <div style={{ maxWidth: 940, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── Section header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontFamily: mono, fontSize: 9.5, color: text2, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
              Interactive NPC Rule Simulator
            </div>
            <h2 style={{ fontFamily: sans, fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', color: text1, margin: 0 }}>
              {telemetry.mission?.name}
            </h2>
            <p style={{ fontFamily: mono, fontSize: 10, color: text2, marginTop: 4, letterSpacing: '0.02em' }}>
              {telemetry.mission?.objective}
            </p>
          </div>

          {/* Mission badge */}
          <div style={{ padding: '6px 14px', background: mc.bg, border: `1px solid ${mc.border}`, borderRadius: 6, flexShrink: 0 }}>
            <div style={{ fontFamily: mono, fontSize: 9.5, color: mc.color, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 2 }}>
              {telemetry.mission?.status}
            </div>
            <div style={{ fontFamily: mono, fontSize: 9, color: text2 }}>
              {telemetry.mission?.status === 'ACTIVE'
                ? `${telemetry.mission.threats} target sentries · ${telemetry.mission.collected}/${telemetry.mission.totalT} cores`
                : telemetry.mission?.status === 'VICTORY' ? 'Demo Objective Achieved' : 'Mission ended'}
            </div>
          </div>
        </div>

        {/* ── Main layout: canvas + right panel ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 12, alignItems: 'start' }}>

          {/* Canvas column */}
          <div style={{ border: `1px solid ${border}`, borderRadius: 8, overflow: 'hidden', background: bg1, display: 'flex', flexDirection: 'column' }}>

            {/* Control bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px', borderBottom: `1px solid ${border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* Mode */}
                <select value={mode} onChange={e => handleMode(e.target.value)} style={{ ...btnBase, color: accent, outline: 'none' }}>
                  <option value="compiled">⚙ Compiled rules</option>
                  <option value="manual">🕹 Manual NPC</option>
                </select>

                {/* Playback */}
                <button onClick={() => running ? engineRef.current?.pause() : engineRef.current?.start()}
                  disabled={mode === 'manual'}
                  style={{ ...btnBase, background: running ? 'rgba(239,68,68,0.15)' : accent, borderColor: running ? 'rgba(239,68,68,0.4)' : accent, color: running ? '#f87171' : '#fff', fontWeight: 600, opacity: mode === 'manual' ? 0.4 : 1 }}>
                  {running ? <Pause /> : <Play />} {running ? 'Pause' : 'Run'}
                </button>
                <button onClick={() => { engineRef.current?.pause(); engineRef.current?.step() }} disabled={mode === 'manual'} style={{ ...btnBase, opacity: mode === 'manual' ? 0.4 : 1 }} title="Single tick">
                  <Step /> Step
                </button>
                <button onClick={() => { engineRef.current?.pause(); engineRef.current?.initWorld(mapId) }} style={btnBase} title="Reset world">
                  <Reset /> Reset
                </button>

                <div style={{ width: 1, height: 14, background: border, margin: '0 2px' }} />

                {/* Speed */}
                <div style={{ display: 'flex', border: `1px solid ${border}`, borderRadius: 4, overflow: 'hidden' }}>
                  {SPEEDS.map(s => (
                    <button key={s.ms} onClick={() => handleSpeed(s.ms)} style={{ padding: '4px 8px', fontFamily: mono, fontSize: 10, fontWeight: speed === s.ms ? 700 : 400, color: speed === s.ms ? '#fff' : text2, background: speed === s.ms ? accent : 'transparent', border: 'none', borderRight: `1px solid ${border}`, cursor: 'pointer' }}>
                      {s.label}
                    </button>
                  ))}
                </div>

                <button onClick={() => engineRef.current && setAudioEnabled(engineRef.current.toggleSound())} style={{ ...btnBase, color: audioEnabled ? accent : text2 }} title={audioEnabled ? 'Mute' : 'Unmute'}>
                  {audioEnabled ? <Snd /> : <Mute />}
                </button>
              </div>

              {/* Map */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: mono, fontSize: 9.5, color: text2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Map</span>
                <select value={mapId} onChange={e => handleMap(e.target.value)} style={{ fontFamily: mono, fontSize: 10.5, padding: '4px 8px', borderRadius: 4, border: `1px solid ${border}`, background: bg2, color: text1, outline: 'none', cursor: 'pointer' }}>
                  <option value="arena">Sector 7 — Combat Demo</option>
                  <option value="dungeon">Vault Alpha — Extraction</option>
                  <option value="maze">Sector 9 — Obstacle Maze</option>
                </select>
              </div>
            </div>

            {/* Manual NPC action buttons */}
            {mode === 'manual' && (
              <div style={{ padding: '8px 12px', borderBottom: `1px solid ${border}`, background: 'rgba(59,130,246,0.04)' }}>
                <div style={{ fontFamily: mono, fontSize: 9, color: text2, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>NPC Actions — Click or use keyboard</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {MANUAL_ACTIONS.map(a => (
                    <button key={a.key} onClick={() => engineRef.current?.manualAction(a.key)}
                      style={{ padding: '4px 10px', fontFamily: mono, fontSize: 10, fontWeight: 600, cursor: 'pointer', borderRadius: 4, border: `1px solid rgba(255,255,255,0.1)`, background: `${a.color}18`, color: a.color, display: 'flex', alignItems: 'center', gap: 5, transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = `${a.color}30`}
                      onMouseLeave={e => e.currentTarget.style.background = `${a.color}18`}
                    >
                      {a.label}
                      {a.kbd && <span style={{ fontSize: 8.5, opacity: 0.6, padding: '1px 4px', background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>{a.kbd}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Canvas */}
            <div style={{ padding: 12, background: bg0, display: 'flex', justifyContent: 'center', alignItems: 'center', overflowX: 'auto' }}>
              <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%', height: 'auto', imageRendering: 'pixelated', borderRadius: 4 }} />
            </div>

            {/* Status strip */}
            <div style={{ padding: '7px 12px', background: bg1, borderTop: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 14, fontFamily: mono, fontSize: 10.5, flexWrap: 'wrap' }}>
              <span style={{ color: text2 }}>CYC</span>
              <span style={{ color: text1, fontWeight: 700 }}>{String(telemetry.cycle).padStart(4,'0')}</span>
              <span style={{ color: '#334155' }}>·</span>
              <span style={{ color: text2 }}>ACT</span>
              <span style={{ padding: '1px 7px', borderRadius: 3, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: accent, fontWeight: 700, fontSize: 10 }}>
                {telemetry.action}
              </span>
              {telemetry.matchedRule && (
                <>
                  <span style={{ color: '#334155' }}>·</span>
                  <span style={{ color: text2, fontSize: 9.5 }}>
                    Rule #{telemetry.matchedRule.priority}: {telemetry.matchedRule.condition} → {telemetry.matchedRule.action}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* ── Right panel: telemetry ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* NPC Status */}
            <div style={{ background: bg1, border: `1px solid ${border}`, borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontFamily: mono, fontSize: 9.5, color: text2, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>NPC Agent ▲</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div>
                  <div style={{ fontFamily: mono, fontSize: 9, color: text2, marginBottom: 2 }}>SHIELD</div>
                  <div style={{ fontFamily: mono, fontSize: 14, fontWeight: 700, color: text1 }}>{telemetry.health}<span style={{ fontSize: 9, color: text2 }}>%</span></div>
                  <HealthBar value={telemetry.health} color="#22c55e" />
                </div>
                <div>
                  <div style={{ fontFamily: mono, fontSize: 9, color: text2, marginBottom: 2 }}>SCORE</div>
                  <div style={{ fontFamily: mono, fontSize: 14, fontWeight: 700, color: '#facc15' }}>{telemetry.score}</div>
                </div>
              </div>
              <div style={{ fontFamily: mono, fontSize: 9.5, color: text2 }}>
                HEADING: <span style={{ color: '#38bdf8', fontWeight: 700 }}>{telemetry.heading}</span>
                <span style={{ marginLeft: 8, color: text2 }}>MODE: </span>
                <span style={{ color: mode === 'manual' ? '#f59e0b' : '#a78bfa', fontWeight: 700 }}>{mode.toUpperCase()}</span>
              </div>
            </div>

            {/* Operator Status */}
            <div style={{ background: bg1, border: `1px solid ${border}`, borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontFamily: mono, fontSize: 9.5, color: text2, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Operator ◉</div>
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontFamily: mono, fontSize: 9, color: text2, marginBottom: 2 }}>STATUS</div>
                <div style={{ fontFamily: mono, fontSize: 14, fontWeight: 700, color: '#34d399' }}>ACTIVE</div>
              </div>
              <div style={{ fontFamily: mono, fontSize: 9, color: text2, lineHeight: 1.7, background: 'rgba(255,255,255,0.03)', borderRadius: 5, padding: '6px 8px', marginTop: 8 }}>
                <div><span style={{ color: '#34d399' }}>WASD</span> / arrows — move</div>
                <div><span style={{ color: '#f87171' }}>Space</span> — attack adjacent sentry</div>
              </div>
            </div>

            {/* Sensor array */}
            <div style={{ background: bg1, border: `1px solid ${border}`, borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontFamily: mono, fontSize: 9.5, color: text2, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>NPC Sensor Array</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {allSensors.map(s => (
                  <SensorDot key={s} name={s} active={telemetry.conditions?.[s] || false} />
                ))}
              </div>
            </div>

            {/* Legend */}
            <div style={{ background: bg1, border: `1px solid ${border}`, borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontFamily: mono, fontSize: 9.5, color: text2, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Map Legend</div>
              {[
                ['▲','#60a5fa','NPC Agent (Rule Driven)'],
                ['◉','#34d399','Operator (Player)'],
                ['◆','#f87171','Static Sentry / Target'],
                ['◈','#fbbf24','Data Core (Treasure)'],
                ['■','#475569','Obstacle Wall'],
                ['✕','#f87171','Hazard Pit (Jump)'],
                ['⌑','#f59e0b','Exit Gate']
              ].map(([g,c,l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontFamily: mono, fontSize: 12, color: c, width: 16, textAlign: 'center' }}>{g}</span>
                  <span style={{ fontFamily: sans, fontSize: 10.5, color: text2 }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
