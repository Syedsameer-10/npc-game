# NPC Behavior Compiler: A Domain-Specific Language for Rule-Based 2D Game NPC Behavior

A complete, educational compiler implementation for a domain-specific language (DSL) that compiles high-level NPC behavior specifications into intermediate representations and executable rule tables executed in real-time by a 2D simulation engine.

---

## 🌟 Highlights & Design System

- **Compiler First**: Implements all standard compiler phases:
  1. **Lexical Analysis**: Hand-crafted lexer with line & column tracking.
  2. **Syntax Analysis**: Hand-written recursive-descent LL(1) parser.
  3. **AST Construction**: Hierarchical Abstract Syntax Tree representation with JSON serialization.
  4. **Semantic Analysis**: Action-condition compatibility matrix, duplicate rule detection, and diagnostic suggestions.
  5. **Intermediate Representation (IR)**: Simplified rule-based 3-address instructions.
  6. **Behavior Code Generation**: Runtime executable rule table & FSM.
- **Developer-Grade Aesthetic**: Designed strictly according to the [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) standard with a sleek **GitHub Copilot / VS Code Dark+ HUD theme**.
- **Interactive 2D Tactical Simulation**: Real-time canvas simulation displaying directional NPC units, obstacle navigation, dynamic sensor rays, and active rule callouts.

---

## 📜 DSL Grammar Specification

```text
program      -> NPC IDENTIFIER LBRACE rule_list RBRACE EOF
rule_list    -> rule rule_list | ε
rule         -> WHEN CONDITION COLON ACTION

CONDITION    -> WALL_AHEAD | PIT_AHEAD | PATH_CLEAR | ENEMY_NEAR 
              | PLAYER_SEEN | PLAYER_NEAR | TREASURE_NEAR | HEALTH_LOW | DOOR_AHEAD

ACTION       -> MOVE_FORWARD | TURN_LEFT | TURN_RIGHT | JUMP 
              | ATTACK | CHASE | RUN_AWAY | COLLECT | STOP
```

---

## 📁 Project Structure

```text
NPC-2d/
├── DESIGN.md                         # Design system spec (VoltAgent standard)
├── requirements.txt                  # Python dependencies
├── backend/
│   ├── app/
│   │   ├── main.py                   # FastAPI server & static file mounts
│   │   ├── schemas.py                # Pydantic request/response models
│   │   └── compiler/
│   │       ├── tokens.py             # Token types & lexeme tables
│   │       ├── lexer.py              # Lexical Analyzer
│   │       ├── ast.py                # AST Node hierarchy
│   │       ├── parser.py             # Recursive-Descent Parser
│   │       ├── semantic.py           # Semantic Validator & Diagnostics
│   │       ├── ir.py                 # Intermediate Representation Generator
│   │       ├── codegen.py            # Executable Behavior Table Generator
│   │       └── compiler.py           # Unified Pipeline Orchestrator
│   └── tests/
│       ├── test_lexer.py
│       ├── test_parser.py
│       ├── test_semantic.py
│       └── test_compiler.py
├── frontend/
│   ├── index.html                    # Workbench single-page app
│   ├── style.css                     # Copilot Dark & Tactical theme
│   ├── app.js                        # App state & synchronization
│   ├── compiler-view/
│   │   ├── browser-compiler.js       # Client-side zero-latency compiler fallback
│   │   ├── tokens.js                 # Token table renderer
│   │   ├── ast-view.js               # AST tree visualizer
│   │   └── ir-view.js                # IR & Rule Table visualizers
│   └── game/
│       ├── map.js                    # 2D Grid maps (Arena, Dungeon, Maze)
│       ├── entities.js               # Player, Enemies, Treasures
│       ├── npc.js                    # Sensors, decision cycle & actions
│       └── game.js                   # Canvas renderer & simulation loop
└── examples/
    ├── guard.npc                     # Guard preset
    ├── collector.npc                 # Collector preset
    └── patrol.npc                    # Patrol preset
```

---

## 🚀 Running the Project

### Option A: 1-Command Startup
```bash
python run.py
```
Or with explicit module runner:
```bash
python -m uvicorn backend.app.main:app --reload --port 8000
```
Then navigate to `http://127.0.0.1:8000`.

### Option B: Standalone Static Browser Run
Simply double-click `frontend/index.html` or open it in any modern browser. The built-in client compiler will execute the full 6-phase compilation pipeline offline with zero setup!

### Running Unit Tests
```bash
python -m pytest backend/tests
```

---

## 🎮 Simulation Controls

| Key / Control | Action |
|---|---|
| `W`, `A`, `S`, `D` or `Arrow Keys` | Move the controllable Player (Green unit) |
| `▶ Run` / `⏸ Pause` | Start or pause the NPC behavior execution loop |
| `⏭ Step` | Step forward a single simulation cycle |
| `↺ Reset` | Reset entity positions and simulation health/score |
| `Speed Selector` | Toggle simulation tick rate (0.5x, 1.0x, 2.0x, 5.0x) |
| `Map Selector` | Switch between Tactical Arena, Collector's Vault, and Obstacle Maze |
