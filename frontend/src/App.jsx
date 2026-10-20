import { useState, useRef, useCallback, useEffect } from 'react'
import TopNav from './components/TopNav'
import HeroEditor from './components/HeroEditor'
import CompileOverlay from './components/CompileOverlay'
import CompilerWorkbench from './components/CompilerWorkbench'
import GameSection from './components/GameSection'
import PhasesPage from './pages/PhasesPage'
import { compile, PRESETS } from './compiler/compiler'

const LOADER_DELAY_MS = 140

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  return hash
}

export default function App() {
  const [source, setSource]           = useState(PRESETS.guard)
  const [result, setResult]           = useState(() => compile(PRESETS.guard))
  const [loading, setLoading]         = useState(false)
  const [loaderPhase, setLoaderPhase] = useState(-1)
  const gameRef                       = useRef(null)
  const hash                          = useHash()

  const isPhases = hash === '#/phases'

  const attachGame = useCallback(engine => {
    gameRef.current = engine
    if (engine && result?.success) engine.setRules(result.behavior)
  }, [result])

  const doCompile = useCallback(() => {
    if (!source.trim()) return
    setLoading(true)
    setLoaderPhase(0)
    let idx = 0
    const step = () => {
      if (idx >= 9) {
        const res = compile(source)
        setResult(res)
        gameRef.current?.pause()
        gameRef.current?.setRules(res.success ? res.behavior : null)
        if (res.success) gameRef.current?.start()
        setTimeout(() => { setLoading(false); setLoaderPhase(-1) }, 100)
        return
      }
      setLoaderPhase(idx++)
      setTimeout(step, LOADER_DELAY_MS)
    }
    step()
  }, [source])

  // Full-screen dedicated pipeline inspection view
  if (isPhases) {
    return <PhasesPage result={result} sourceCode={source} onRecompile={doCompile} />
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', color: 'var(--text-1)' }}>
      <TopNav result={result} onCompile={doCompile} />
      <CompileOverlay active={loading} currentPhase={loaderPhase} />
      
      {/* 01. Code Editor & Preset Sandbox */}
      <HeroEditor
        source={source}
        setSource={setSource}
        onCompile={doCompile}
        hasResult={!!result}
      />

      {/* 02. Professional 9-Stage Compiler Pipeline Analysis Workbench */}
      <CompilerWorkbench
        result={result}
        sourceCode={source}
        onRecompile={doCompile}
      />

      {/* 03. 2D Simulator (Driven by Compiled Bytecode & Actuator Rules) */}
      <GameSection
        gameRef={gameRef}
        onEngineReady={attachGame}
      />
    </div>
  )
}
