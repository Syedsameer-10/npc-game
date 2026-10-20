/**
 * Main Application Controller: Workbench UI, Compiler Trigger, and HUD Synchronization.
 */

document.addEventListener("DOMContentLoaded", () => {
  const PRESET_SOURCES = {
    guard: `NPC Guard {

    WHEN WALL_AHEAD:
        TURN_LEFT

    WHEN PIT_AHEAD:
        JUMP

    WHEN ENEMY_NEAR:
        ATTACK

    WHEN PLAYER_SEEN:
        CHASE

    WHEN PATH_CLEAR:
        MOVE_FORWARD
}`,
    collector: `NPC Collector {

    WHEN TREASURE_NEAR:
        COLLECT

    WHEN ENEMY_NEAR:
        RUN_AWAY

    WHEN WALL_AHEAD:
        TURN_RIGHT

    WHEN PIT_AHEAD:
        JUMP

    WHEN PATH_CLEAR:
        MOVE_FORWARD
}`,
    patrol: `NPC Patrol {

    WHEN WALL_AHEAD:
        TURN_RIGHT

    WHEN PLAYER_SEEN:
        CHASE

    WHEN PLAYER_NEAR:
        ATTACK

    WHEN PATH_CLEAR:
        MOVE_FORWARD
}`,
  };

  // UI Elements
  const sourceEditor = document.getElementById("sourceEditor");
  const lineNumbers = document.getElementById("lineNumbers");
  const presetSelect = document.getElementById("presetSelect");
  const mapSelect = document.getElementById("mapSelect");
  const compileBtn = document.getElementById("compileBtn");
  const compileRunBtn = document.getElementById("compileRunBtn");
  const playPauseBtn = document.getElementById("playPauseBtn");
  const stepBtn = document.getElementById("stepBtn");
  const resetBtn = document.getElementById("resetBtn");
  const speedSelect = document.getElementById("speedSelect");

  // Tab Panels
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  // Pipeline Chips
  const chipLexer = document.getElementById("chipLexer");
  const chipParser = document.getElementById("chipParser");
  const chipAST = document.getElementById("chipAST");
  const chipSemantic = document.getElementById("chipSemantic");
  const chipIR = document.getElementById("chipIR");
  const chipBehavior = document.getElementById("chipBehavior");

  // Telemetry HUD Elements
  const hudAction = document.getElementById("hudAction");
  const hudRule = document.getElementById("hudRule");
  const hudHeading = document.getElementById("hudHeading");
  const hudHealth = document.getElementById("hudHealth");
  const hudScore = document.getElementById("hudScore");
  const hudSensors = document.getElementById("hudSensors");

  // Local compiler instance
  const browserCompiler = new BrowserCompiler();

  // Initialize Simulation Engine
  const simulation = new GameSimulation("gameCanvas", {
    onTick: (telemetry) => {
      hudAction.textContent = telemetry.action || "IDLE";
      hudHeading.textContent = telemetry.heading || "NONE";
      hudHealth.textContent = `${telemetry.health} HP`;
      hudScore.textContent = telemetry.score || 0;

      if (telemetry.matchedRule) {
        hudRule.innerHTML = `
          <span class="active-rule-pill">
            <span>#${telemetry.matchedRule.priority}</span>
            <span>${escapeHtml(telemetry.matchedRule.condition)} → ${escapeHtml(telemetry.matchedRule.action)}</span>
          </span>
        `;
      } else {
        hudRule.innerHTML = `<span style="color: var(--color-text-muted);">No matching rule</span>`;
      }

      // Render Active Sensors list
      let sensorHtml = "";
      const conds = telemetry.conditions || {};
      for (const [key, val] of Object.entries(conds)) {
        const cls = val ? "sensor-active" : "sensor-inactive";
        const sym = val ? "●" : "○";
        sensorHtml += `<span class="${cls}" style="margin-right: 8px;">${sym} ${key}</span>`;
      }
      hudSensors.innerHTML = sensorHtml || "None";
    },
    onStateChange: (isRunning) => {
      playPauseBtn.innerHTML = isRunning ? "⏸ Pause" : "▶ Run";
      playPauseBtn.className = isRunning ? "btn btn-danger" : "btn btn-primary";
    },
  });

  // Update Line Numbers
  function updateLineNumbers() {
    const lines = sourceEditor.value.split("\n").length;
    let numbers = "";
    for (let i = 1; i <= lines; i++) {
      numbers += `${i}\n`;
    }
    lineNumbers.textContent = numbers;
  }

  sourceEditor.addEventListener("input", updateLineNumbers);
  sourceEditor.addEventListener("scroll", () => {
    lineNumbers.scrollTop = sourceEditor.scrollTop;
  });

  // Tab switching
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabPanes.forEach((p) => (p.style.display = "none"));

      btn.classList.add("active");
      const targetId = btn.getAttribute("data-tab");
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.style.display = "block";
    });
  });

  // Preset switching
  presetSelect.addEventListener("change", (e) => {
    const key = e.target.value;
    if (PRESET_SOURCES[key]) {
      sourceEditor.value = PRESET_SOURCES[key];
      updateLineNumbers();
      compileSource();
    }
  });

  // Map switching
  mapSelect.addEventListener("change", (e) => {
    simulation.initWorld(e.target.value);
  });

  // Speed switching
  speedSelect.addEventListener("change", (e) => {
    simulation.setSpeed(parseInt(e.target.value, 10));
  });

  // Play / Pause / Step / Reset controls
  playPauseBtn.addEventListener("click", () => {
    if (simulation.isRunning) {
      simulation.pause();
    } else {
      simulation.start();
    }
  });

  stepBtn.addEventListener("click", () => {
    simulation.pause();
    simulation.step();
  });

  resetBtn.addEventListener("click", () => {
    simulation.pause();
    simulation.initWorld(mapSelect.value);
  });

  // Main Compilation Routine
  async function compileSource(autoRun = false) {
    const source = sourceEditor.value;
    let result = null;

    // Attempt backend API first, fallback to browser compiler
    try {
      const resp = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      if (resp.ok) {
        result = await resp.json();
      } else {
        result = browserCompiler.compile(source);
      }
    } catch (e) {
      // Backend not running / offline -> use in-browser compiler
      result = browserCompiler.compile(source);
    }

    renderCompilationArtifacts(result);

    if (result.success) {
      simulation.setCompiledBehavior(result.behavior);
      if (autoRun) {
        simulation.start();
      }
    } else {
      simulation.pause();
    }
  }

  function renderCompilationArtifacts(res) {
    const phases = res.phasesCompleted || [];

    function updateChip(chip, name) {
      if (phases.includes(name)) {
        chip.className = "pipeline-chip success";
        chip.innerHTML = `✓ ${name}`;
      } else if (!res.success && res.errors && res.errors.some((e) => e.phase === name)) {
        chip.className = "pipeline-chip failed";
        chip.innerHTML = `✕ ${name}`;
      } else {
        chip.className = "pipeline-chip";
        chip.innerHTML = `○ ${name}`;
      }
    }

    updateChip(chipLexer, "Lexical Analysis");
    updateChip(chipParser, "Syntax Analysis");
    updateChip(chipAST, "AST Construction");
    updateChip(chipSemantic, "Semantic Analysis");
    updateChip(chipIR, "Intermediate Code Generation");
    updateChip(chipBehavior, "Behavior Generation");

    // 1. Tokens Tab
    renderTokensView(document.getElementById("tokensTabContent"), res.tokens);

    // 2. AST Tab
    renderASTView(document.getElementById("astTabContent"), res.ast);

    // 3. Diagnostics Tab
    renderDiagnostics(document.getElementById("diagnosticsTabContent"), res);

    // 4. IR Tab
    renderIRView(document.getElementById("irTabContent"), res.ir);

    // 5. Behavior Rule Table Tab
    renderBehaviorView(document.getElementById("behaviorTabContent"), res.behavior);
  }

  function renderDiagnostics(container, res) {
    let html = "";

    if (res.errors && res.errors.length > 0) {
      res.errors.forEach((err) => {
        html += `
          <div class="diag-item error">
            <div class="diag-title">
              <span>✕ [${escapeHtml(err.phase || "Compiler")}] Error at line ${err.line || 1}:${err.column || 1}</span>
            </div>
            <div>${escapeHtml(err.message)}</div>
            ${err.suggestion ? `<div class="diag-suggestion">💡 ${escapeHtml(err.suggestion)}</div>` : ""}
          </div>
        `;
      });
    }

    if (res.warnings && res.warnings.length > 0) {
      res.warnings.forEach((warn) => {
        html += `
          <div class="diag-item warning">
            <div class="diag-title">
              <span>⚠ [${escapeHtml(warn.phase || "Semantic")}] Warning at line ${warn.line || 1}:${warn.column || 1}</span>
            </div>
            <div>${escapeHtml(warn.message)}</div>
            ${warn.suggestion ? `<div class="diag-suggestion">💡 ${escapeHtml(warn.suggestion)}</div>` : ""}
          </div>
        `;
      });
    }

    if (res.success && (!res.warnings || res.warnings.length === 0)) {
      html = `
        <div class="diag-item success">
          <div class="diag-title">✓ Compilation Succeeded</div>
          <div>All compiler phases passed with 0 errors and 0 warnings. Behavior rules successfully generated.</div>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  compileBtn.addEventListener("click", () => compileSource(false));
  compileRunBtn.addEventListener("click", () => compileSource(true));

  // Initial Load
  sourceEditor.value = PRESET_SOURCES.guard;
  updateLineNumbers();
  compileSource(false);
});
