// GameEngine — Full 2D NPC Simulator
// NPC behavior is driven entirely by the compiled rule dispatch table
// Operator is player-controlled (WASD + Space attack)
// Target Dummies / Sentries are static obstacles that do not move or attack,
// allowing clean, reproducible rule demos without chaotic death loops.

export const MAPS = {
  arena: {
    id: 'arena',
    name: 'Sector 7: Tactical Combat Ground',
    missionType: 'DEFENSE',
    objective: 'Destroy all static target dummies using compiled rules or manual combat',
    w: 18, h: 13,
    grid: [
      "##################",
      "#N.............E.#",
      "#..###.....O.....#",
      "#..............T.#",
      "#.T....E.........#",
      "#..............O.#",
      "#...O...######...#",
      "#..............D.#",
      "#.....P..E.......#",
      "#.T..............#",
      "#..........E.....#",
      "#.......T........#",
      "##################",
    ],
  },
  dungeon: {
    id: 'dungeon',
    name: 'Vault Alpha: Extraction Grid',
    missionType: 'EXTRACTION',
    objective: 'Collect all data cores, clear target sentries, and enter exit gate',
    w: 18, h: 13,
    grid: [
      "##################",
      "#N..T.....T......#",
      "#..####...E......#",
      "#...E...###......#",
      "#..T.............#",
      "#.....E...T......#",
      "#....###.........#",
      "#..P.....O.......#",
      "#...T......T.....#",
      "#.......D........#",
      "#....E...........#",
      "#.T..............#",
      "##################",
    ],
  },
  maze: {
    id: 'maze',
    name: 'Sector 9: Obstacle & Hazard Maze',
    missionType: 'NAVIGATION',
    objective: 'Jump hazard pits, turn at walls, and extract all data cores',
    w: 18, h: 13,
    grid: [
      "##################",
      "#N......#.........#",
      "#.####.##.###....#",
      "#....#.#.#.......#",
      "#.##.#...#..P....#",
      "#O.#.#.###.#.....#",
      "##.#.#...#.#.O...#",
      "#..#.#.T...#.....#",
      "#E...#...D.T.....#",
      "#..O.............#",
      "#....E.......T...#",
      "#................#",
      "##################",
    ],
  },
};

const DIRS  = ['UP','RIGHT','DOWN','LEFT'];
const DVec  = { UP:{dx:0,dy:-1}, RIGHT:{dx:1,dy:0}, DOWN:{dx:0,dy:1}, LEFT:{dx:-1,dy:0} };
const GLYPH = { UP:'▲', RIGHT:'▶', DOWN:'▼', LEFT:'◀' };
export const TS = 36;

// ── Minimal Web Audio synth ───────────────────────────────────────────────
class SoundFX {
  constructor() { this.ctx = null; this.enabled = true; }
  _init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }
  _tone(freq1, freq2, type, gain, dur) {
    if (!this.enabled) return; this._init(); if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq1, t);
    if (freq2) osc.frequency.exponentialRampToValueAtTime(freq2, t + dur * 0.7);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g); g.connect(this.ctx.destination);
    osc.start(t); osc.stop(t + dur);
  }
  playCollect() { this._tone(587, 880, 'sine', 0.1, 0.14); }
  playAttack()  { this._tone(220, 55, 'sawtooth', 0.12, 0.12); }
  playJump()    { this._tone(220, 440, 'triangle', 0.08, 0.14); }
  playVictory() { this._tone(523, 1047, 'sine', 0.1, 0.4); }
  playHit()     { this._tone(180, 80, 'square', 0.08, 0.1); }
}

// ── GameEngine ────────────────────────────────────────────────────────────
export class GameEngine {
  constructor(canvas, onTick, onStateChange) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.onTick        = onTick;
    this.onStateChange = onStateChange;
    this.sfx     = new SoundFX();
    this.running = false;
    this.mode    = 'compiled';
    this.interval = null;
    this.tickMs  = 500;
    this.cycle   = 0;
    this.particles    = [];
    this.floatingTexts = [];
    this.missionStatus = 'ACTIVE';
    this.animFrame = null;
    this.time = 0;

    this.npc = {
      x: 2, y: 2, displayX: 2, displayY: 2,
      dir: 'RIGHT',
      health: 100, maxHealth: 100,
      score: 0,
      rules: [],
      action: 'IDLE',
      matchedRule: null,
      conditions: {},
      trail: [],
    };
    this.player = { x: 8, y: 8, displayX: 8, displayY: 8, health: 100, maxHealth: 100 };
    this.enemies   = [];
    this.treasures = [];
    this.tiles     = [];
    this.mapW = 18; this.mapH = 13;
    this.mapId = 'arena';
    this.events = [];

    this._keyHandler = this._onKey.bind(this);
    window.addEventListener('keydown', this._keyHandler);

    this.initWorld('arena');
    this._startAnimLoop();
  }

  destroy() {
    window.removeEventListener('keydown', this._keyHandler);
    this.pause();
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
  }

  toggleSound() { this.sfx.enabled = !this.sfx.enabled; return this.sfx.enabled; }

  _startAnimLoop() {
    const loop = () => {
      this.time += 0.04;
      const lerp = 0.3;
      this.npc.displayX    += (this.npc.x - this.npc.displayX) * lerp;
      this.npc.displayY    += (this.npc.y - this.npc.displayY) * lerp;
      this.player.displayX += (this.player.x - this.player.displayX) * lerp;
      this.player.displayY += (this.player.y - this.player.displayY) * lerp;
      this.render();
      this.animFrame = requestAnimationFrame(loop);
    };
    this.animFrame = requestAnimationFrame(loop);
  }

  _onKey(e) {
    if (['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;

    // Operator movement (WASD / arrows)
    const mv = { ArrowUp:[0,-1], ArrowDown:[0,1], ArrowLeft:[-1,0], ArrowRight:[1,0], KeyW:[0,-1], KeyS:[0,1], KeyA:[-1,0], KeyD:[1,0] };
    if (mv[e.code]) {
      e.preventDefault();
      if (this.missionStatus !== 'ACTIVE') return;
      const [dx,dy] = mv[e.code];
      const nx = this.player.x + dx, ny = this.player.y + dy;
      if (this.canEnter(nx, ny)) { this.player.x = nx; this.player.y = ny; this.checkMission(); this.updateHUD(); }
    }

    // Operator attack (Space)
    if (e.code === 'Space') { e.preventDefault(); this.operatorAttack(); }

    // Manual NPC (only in manual mode)
    if (this.mode === 'manual') {
      const npcDirs = { KeyI:'UP', KeyL:'RIGHT', KeyK:'DOWN', KeyJ:'LEFT' };
      if (npcDirs[e.code]) { e.preventDefault(); this.npc.dir = npcDirs[e.code]; this.manualAction('MOVE_FORWARD'); }
      const npcActs = { KeyU:'ATTACK', KeyO:'COLLECT', KeyP:'JUMP', KeyH:'STOP' };
      if (npcActs[e.code]) { e.preventDefault(); this.manualAction(npcActs[e.code]); }
    }
  }

  // ── World initialization ──────────────────────────────────────────────
  initWorld(mapId) {
    this.mapId = mapId;
    const map  = MAPS[mapId];
    this.mapW  = map.w; this.mapH = map.h;
    this.tiles = map.grid.map(r => r.split(''));
    this.enemies   = [];
    this.treasures = [];
    this.particles = [];
    this.floatingTexts = [];
    this.missionStatus = 'ACTIVE';
    this.events = [];

    let playerStart = { x: 8, y: 8 };

    for (let r = 0; r < this.mapH; r++) {
      for (let c = 0; c < this.mapW; c++) {
        const ch = this.tiles[r][c];
        if (ch === 'N') {
          this.npc.x = c; this.npc.y = r;
          this.npc.displayX = c; this.npc.displayY = r;
          this.tiles[r][c] = '.';
        } else if (ch === 'P') {
          playerStart = { x: c, y: r };
          this.tiles[r][c] = '.';
        } else if (ch === 'E') {
          // Static target dummy / sentry: stationary, does not attack, can be destroyed
          this.enemies.push({ id: `e${this.enemies.length}`, x: c, y: r, alive: true, health: 60, maxHealth: 60, isStatic: true });
          this.tiles[r][c] = '.';
        } else if (ch === 'T') {
          this.treasures.push({ id: `t${this.treasures.length}`, x: c, y: r, collected: false });
          this.tiles[r][c] = '.';
        }
      }
    }

    this.player = { x: playerStart.x, y: playerStart.y, displayX: playerStart.x, displayY: playerStart.y, health: 100, maxHealth: 100 };
    Object.assign(this.npc, {
      dir: 'RIGHT',
      health: 100, maxHealth: 100,
      score: 0, action: 'IDLE',
      matchedRule: null, conditions: {},
      trail: [{ x: this.npc.x, y: this.npc.y }],
    });
    this.cycle = 0;

    this.canvas.width  = this.mapW * TS;
    this.canvas.height = this.mapH * TS;
    this.updateHUD();
  }

  // ── Tile queries ──────────────────────────────────────────────────────
  tile(x, y)     { return (x < 0 || x >= this.mapW || y < 0 || y >= this.mapH) ? '#' : this.tiles[y][x]; }
  isWall(x, y)   { return this.tile(x, y) === '#'; }
  isPit(x, y)    { return this.tile(x, y) === 'O'; }
  isDoor(x, y)   { return this.tile(x, y) === 'D'; }
  canEnter(x, y) {
    if (this.isWall(x, y) || this.isPit(x, y)) return false;
    // Static targets block movement until destroyed
    if (this.enemies.some(e => e.alive && e.x === x && e.y === y)) return false;
    if (this.isDoor(x, y)) return this.treasures.every(t => t.collected);
    return true;
  }

  setMode(mode)   { this.pause(); this.mode = mode; this.updateHUD(); }
  setRules(beh)   { this.npc.rules = beh?.rules?.filter(r => r.isActive) || []; }

  start() {
    if (this.running || this.mode !== 'compiled' || this.missionStatus !== 'ACTIVE' || !this.npc.rules.length) return;
    this.running = true;
    this.interval = setInterval(() => this.step(), this.tickMs);
    this.onStateChange(true);
  }

  pause() {
    this.running = false;
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
    this.onStateChange(false);
  }

  setSpeed(ms) {
    this.tickMs = ms;
    if (this.running) { this.pause(); this.start(); }
  }

  // ── Simulation tick ───────────────────────────────────────────────────
  step() {
    if (this.mode !== 'compiled' || this.missionStatus !== 'ACTIVE') return;
    this.cycle++;
    this.sense();
    this.decide();
    this.act();
    this.advanceWorld();
    this.checkMission();
    this.updateHUD();
  }

  manualAction(action) {
    if (this.mode !== 'manual' || this.missionStatus !== 'ACTIVE') return;
    this.cycle++;
    this.sense();
    this.npc.action = action;
    this.npc.matchedRule = null;
    this.act();
    this.advanceWorld();
    this.checkMission();
    this.updateHUD();
  }

  // Operator melee attack (Space key)
  operatorAttack() {
    if (this.missionStatus !== 'ACTIVE') return;
    let hit = false;
    // 1. Strike adjacent static sentry
    for (const e of this.enemies) {
      if (e.alive && Math.hypot(e.x - this.player.x, e.y - this.player.y) <= 1.5) {
        e.health -= 30;
        this.sfx.playAttack();
        this.burst(e.x * TS + TS/2, e.y * TS + TS/2, '#f87171', 8);
        this.floatText(e.x, e.y, '-30 HIT', '#f87171');
        if (e.health <= 0) {
          e.alive = false;
          this.npc.score += 150;
          this.floatText(e.x, e.y, '+150 TARGET DESTROYED', '#4ade80');
        }
        hit = true;
        break;
      }
    }
    // 2. Spar with NPC if adjacent (allows manual demo testing of HEALTH_LOW trigger)
    if (!hit && Math.hypot(this.npc.x - this.player.x, this.npc.y - this.player.y) <= 1.5) {
      this.npc.health = Math.max(15, this.npc.health - 25);
      this.sfx.playAttack();
      this.burst(this.npc.x * TS + TS/2, this.npc.y * TS + TS/2, '#f97316', 8);
      this.floatText(this.npc.x, this.npc.y, '-25 HP SPAR', '#f97316');
      hit = true;
    }
    if (!hit) return;
    this.checkMission();
    this.updateHUD();
  }

  // ── Sense ─────────────────────────────────────────────────────────────
  ahead(d = 1) {
    const v = DVec[this.npc.dir];
    return { x: this.npc.x + v.dx * d, y: this.npc.y + v.dy * d };
  }

  sense() {
    const n  = this.npc;
    const a1 = this.ahead(1);
    const dist = (ex, ey) => Math.hypot(ex - n.x, ey - n.y);

    n.conditions = {
      WALL_AHEAD:    this.isWall(a1.x, a1.y),
      PIT_AHEAD:     this.isPit(a1.x, a1.y),
      DOOR_AHEAD:    this.isDoor(a1.x, a1.y),
      PATH_CLEAR:    !this.isWall(a1.x, a1.y) && !this.isPit(a1.x, a1.y) && !this.isDoor(a1.x, a1.y) && !this.enemies.some(e => e.alive && e.x === a1.x && e.y === a1.y),
      ENEMY_NEAR:    this.enemies.some(e => e.alive && dist(e.x, e.y) <= 2.2),
      PLAYER_SEEN:   this._rayCast(this.player.x, this.player.y),
      PLAYER_NEAR:   dist(this.player.x, this.player.y) <= 1.8,
      TREASURE_NEAR: this.treasures.some(t => !t.collected && dist(t.x, t.y) <= 2.5),
      HEALTH_LOW:    n.health <= 35,
    };
  }

  _rayCast(px, py) {
    const v = DVec[this.npc.dir];
    let cx = this.npc.x, cy = this.npc.y;
    for (let i = 1; i <= 8; i++) {
      cx += v.dx; cy += v.dy;
      if (this.isWall(cx, cy)) return false;
      if (cx === px && cy === py) return true;
    }
    return false;
  }

  // ── Decision (compiled rule matching) ────────────────────────────────
  decide() {
    const n = this.npc;
    n.matchedRule = null;
    n.action = 'STOP'; // default fallback
    for (const r of n.rules) {
      if (n.conditions[r.condition]) {
        // 1. If rule has compiler probability weight: WHEN COND (50%): ...
        if (r.probability && r.probability < 1.0) {
          if (Math.random() <= r.probability) {
            n.matchedRule = r;
            n.action = r.action;
            break;
          }
          // Probability branch not taken; continue to evaluate next matching rule
          continue;
        }

        n.matchedRule = r;
        // 2. If rule has compiled stochastic alternatives: WHEN WALL_AHEAD: TURN_LEFT | TURN_RIGHT
        if (r.isStochastic && r.alternatives && r.alternatives.length > 1) {
          const pick = Math.random() < 0.5 ? r.alternatives[0] : r.alternatives[1];
          n.action = pick;
          this.floatText(n.x, n.y, `50/50 ➔ ${pick.replace('TURN_', '')}`, '#38bdf8');
        } else {
          n.action = r.action;
        }
        break; // first-match-priority
      }
    }
  }

  // ── Execute action ────────────────────────────────────────────────────
  act() {
    const n = this.npc, v = DVec[n.dir];
    const mv = (dx, dy) => {
      const nx = n.x + dx, ny = n.y + dy;
      if (this.canEnter(nx, ny)) {
        n.x = nx; n.y = ny;
        n.trail.push({ x: n.x, y: n.y });
        if (n.trail.length > 8) n.trail.shift();
      }
    };

    switch (n.action) {
      case 'MOVE_FORWARD':
        mv(v.dx, v.dy);
        break;

      case 'TURN_LEFT':
        n.dir = DIRS[(DIRS.indexOf(n.dir) + 3) % 4];
        break;

      case 'TURN_RIGHT':
        n.dir = DIRS[(DIRS.indexOf(n.dir) + 1) % 4];
        break;

      case 'JUMP': {
        const pit = this.ahead(1);
        const land = this.ahead(2);
        if (this.isPit(pit.x, pit.y) && this.canEnter(land.x, land.y)) {
          n.x = land.x; n.y = land.y;
          n.trail.push({ x: n.x, y: n.y });
          if (n.trail.length > 8) n.trail.shift();
          this.sfx.playJump();
          this.burst(n.displayX * TS + TS/2, n.displayY * TS + TS/2, '#38bdf8', 10);
          this.floatText(n.x, n.y, 'JUMPED PIT', '#38bdf8');
        } else {
          // If no pit or cannot land, turn or step
          if (this.canEnter(this.ahead(1).x, this.ahead(1).y)) {
            mv(v.dx, v.dy);
          } else {
            n.dir = DIRS[(DIRS.indexOf(n.dir) + 1) % 4];
          }
        }
        break;
      }

      case 'ATTACK': {
        let attacked = false;
        // 1. Strike static sentry in melee range
        for (const e of this.enemies) {
          if (e.alive && Math.hypot(e.x - n.x, e.y - n.y) <= 1.8) {
            e.health -= 30;
            this.sfx.playAttack();
            this.burst(e.x * TS + TS/2, e.y * TS + TS/2, '#f87171', 10);
            this.floatText(e.x, e.y, '-30 HIT', '#f87171');
            if (e.health <= 0) {
              e.alive = false;
              n.score += 250;
              this.floatText(e.x, e.y, '+250 DESTROYED', '#4ade80');
            }
            attacked = true;
            break;
          }
        }
        // 2. Strike player if PLAYER_NEAR triggered attack
        if (!attacked && Math.hypot(this.player.x - n.x, this.player.y - n.y) <= 1.8) {
          this.sfx.playAttack();
          this.burst(this.player.x * TS + TS/2, this.player.y * TS + TS/2, '#f97316', 8);
          this.floatText(this.player.x, this.player.y, 'NPC MELEE', '#f97316');
          attacked = true;
        }
        // 3. If target not reached yet, advance toward designated target
        if (!attacked) {
          const target = (n.matchedRule?.condition?.includes('PLAYER') ? this.player : this.nearestEnemy(n.x, n.y)) || this.player;
          if (target) {
            const dx = target.x - n.x, dy = target.y - n.y;
            if (Math.abs(dx) >= Math.abs(dy)) { mv(Math.sign(dx), 0); n.dir = dx > 0 ? 'RIGHT' : 'LEFT'; }
            else { mv(0, Math.sign(dy)); n.dir = dy > 0 ? 'DOWN' : 'UP'; }
          } else {
            mv(v.dx, v.dy);
          }
        }
        break;
      }

      case 'CHASE': {
        const target = (n.matchedRule?.condition?.includes('PLAYER') ? this.player : this.nearestEnemy(n.x, n.y)) || this.player;
        const dx = target.x - n.x, dy = target.y - n.y;
        if (Math.abs(dx) >= Math.abs(dy)) {
          const s = dx > 0 ? 1 : -1;
          if (this.canEnter(n.x + s, n.y)) { mv(s, 0); n.dir = s > 0 ? 'RIGHT' : 'LEFT'; }
          else if (this.canEnter(n.x, n.y + Math.sign(dy))) { mv(0, Math.sign(dy)); n.dir = dy > 0 ? 'DOWN' : 'UP'; }
          else { n.dir = DIRS[(DIRS.indexOf(n.dir) + 1) % 4]; }
        } else {
          const s = dy > 0 ? 1 : -1;
          if (this.canEnter(n.x, n.y + s)) { mv(0, s); n.dir = s > 0 ? 'DOWN' : 'UP'; }
          else if (this.canEnter(n.x + Math.sign(dx), n.y)) { mv(Math.sign(dx), 0); n.dir = dx > 0 ? 'RIGHT' : 'LEFT'; }
          else { n.dir = DIRS[(DIRS.indexOf(n.dir) + 1) % 4]; }
        }
        break;
      }

      case 'RUN_AWAY': {
        const threat = (n.matchedRule?.condition?.includes('PLAYER') ? this.player : this.nearestEnemy(n.x, n.y)) || this.player;
        if (threat) {
          const dx = n.x - threat.x, dy = n.y - threat.y;
          const sx = Math.sign(dx) || 1, sy = Math.sign(dy) || 1;
          if (this.canEnter(n.x + sx, n.y)) { mv(sx, 0); n.dir = sx > 0 ? 'RIGHT' : 'LEFT'; }
          else if (this.canEnter(n.x, n.y + sy)) { mv(0, sy); n.dir = sy > 0 ? 'DOWN' : 'UP'; }
          else { n.dir = DIRS[(DIRS.indexOf(n.dir) + 1) % 4]; }
        }
        break;
      }

      case 'COLLECT': {
        let collected = false;
        for (const t of this.treasures) {
          if (!t.collected && Math.hypot(t.x - n.x, t.y - n.y) <= 1.8) {
            t.collected = true;
            n.score += 150;
            this.sfx.playCollect();
            this.burst(t.x * TS + TS/2, t.y * TS + TS/2, '#facc15', 14);
            this.floatText(t.x, t.y, '+150 CORE', '#facc15');
            collected = true;
            break;
          }
        }
        // If nothing in range, move towards nearest data core
        if (!collected) {
          const nearest = this.treasures.filter(t => !t.collected).sort((a,b) => Math.hypot(a.x-n.x,a.y-n.y)-Math.hypot(b.x-n.x,b.y-n.y))[0];
          if (nearest) {
            const dx = nearest.x - n.x, dy = nearest.y - n.y;
            if (Math.abs(dx) >= Math.abs(dy)) { mv(Math.sign(dx), 0); n.dir = dx > 0 ? 'RIGHT' : 'LEFT'; }
            else { mv(0, Math.sign(dy)); n.dir = dy > 0 ? 'DOWN' : 'UP'; }
          } else mv(v.dx, v.dy);
        }
        break;
      }

      case 'STOP':
        // Slowly regenerate health when stopped (self-repair mode)
        if (n.health < n.maxHealth) {
          n.health = Math.min(n.maxHealth, n.health + 4);
          this.floatText(n.x, n.y, '+4 REPAIR', '#38bdf8');
        }
        break;

      default:
        break;
    }
  }

  nearestEnemy(x, y) {
    return this.enemies.filter(e => e.alive)
      .sort((a,b) => Math.hypot(a.x-x,a.y-y) - Math.hypot(b.x-x,b.y-y))[0] || null;
  }

  // ── World advance ─────────────────────────────────────────────────────
  advanceWorld() {
    // Static targets do not move or attack! They serve as stationary obstacles / target dummies.
    // This guarantees deterministic, demo-ready rule demonstration without chaotic damage loops.
  }

  // ── Mission check ─────────────────────────────────────────────────────
  checkMission() {
    const map = MAPS[this.mapId];
    const collected    = this.treasures.filter(t => t.collected).length;
    const totalT       = this.treasures.length;
    const targetsAlive = this.enemies.filter(e => e.alive).length;

    if (this.missionStatus !== 'ACTIVE') return;

    if (map.missionType === 'EXTRACTION') {
      const atDoor = this.isDoor(this.npc.x, this.npc.y) || this.isDoor(this.player.x, this.player.y);
      if (collected >= totalT && totalT > 0 && atDoor) {
        this.missionStatus = 'VICTORY';
        this.sfx.playVictory();
      }
    } else if (map.missionType === 'DEFENSE') {
      if (targetsAlive === 0 && this.enemies.length > 0) {
        this.missionStatus = 'VICTORY';
        this.sfx.playVictory();
      }
    } else if (map.missionType === 'NAVIGATION') {
      if (collected >= totalT && totalT > 0) {
        this.missionStatus = 'VICTORY';
        this.sfx.playVictory();
      }
    }

    if (this.missionStatus !== 'ACTIVE') this.pause();
  }

  // ── HUD update ────────────────────────────────────────────────────────
  updateHUD() {
    const map = MAPS[this.mapId];
    this.onTick?.({
      cycle:   this.cycle,
      action:  this.npc.action,
      matchedRule: this.npc.matchedRule,
      heading: this.npc.dir,
      health:  this.npc.health,
      operatorHealth: this.player.health,
      mode:    this.mode,
      score:   this.npc.score,
      conditions: this.npc.conditions,
      mission: {
        name:      map.name,
        objective: map.objective,
        status:    this.missionStatus,
        collected: this.treasures.filter(t => t.collected).length,
        totalT:    this.treasures.length,
        threats:   this.enemies.filter(e => e.alive).length,
      },
    });
  }

  // ── Particles & floating text ─────────────────────────────────────────
  burst(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 1.2 + Math.random() * 1.8;
      this.particles.push({ x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, color, life: 1.0, decay: 0.05 + Math.random()*0.04 });
    }
  }

  floatText(gx, gy, text, color) {
    this.floatingTexts.push({ x: gx*TS + TS/2, y: gy*TS + 4, text, color, life: 1.0 });
  }

  // ── Renderer ──────────────────────────────────────────────────────────
  render() {
    const ctx = this.ctx, ts = TS;
    const W = this.canvas.width, H = this.canvas.height;

    // Background
    ctx.fillStyle = '#090c14';
    ctx.fillRect(0, 0, W, H);

    // Subtle grid
    ctx.strokeStyle = '#121928';
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += ts) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y <= H; y += ts) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

    // Tiles
    for (let r = 0; r < this.mapH; r++) {
      for (let c = 0; c < this.mapW; c++) {
        const px = c*ts, py = r*ts, t = this.tiles[r][c];
        if (t === '#') {
          // Wall
          ctx.fillStyle = '#151e2e';
          ctx.fillRect(px+1, py+1, ts-2, ts-2);
          ctx.strokeStyle = '#1d2d45';
          ctx.lineWidth = 1;
          ctx.strokeRect(px+1.5, py+1.5, ts-3, ts-3);
        } else if (t === 'O') {
          // Hazard pit
          ctx.fillStyle = '#180e12';
          ctx.fillRect(px+2, py+2, ts-4, ts-4);
          ctx.strokeStyle = 'rgba(239,68,68,0.4)';
          ctx.strokeRect(px+3, py+3, ts-6, ts-6);
          ctx.fillStyle = '#ef4444';
          ctx.font = `11px 'Geist Mono', monospace`;
          ctx.textAlign = 'center';
          ctx.fillText('✕', px+ts/2, py+ts/2+4);
        } else if (t === 'D') {
          // Exit gate
          const glow = 0.5 + 0.5 * Math.sin(this.time * 2);
          ctx.fillStyle = '#1c1708';
          ctx.fillRect(px+2, py+2, ts-4, ts-4);
          ctx.strokeStyle = `rgba(245,158,11,${0.4 + glow*0.4})`;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px+3, py+3, ts-6, ts-6);
          ctx.fillStyle = `rgba(245,158,11,${0.7 + glow*0.3})`;
          ctx.font = `10px 'Geist Mono', monospace`;
          ctx.textAlign = 'center';
          ctx.fillText('⌑', px+ts/2, py+ts/2+4);
        }
      }
    }

    // NPC trail
    if (this.npc.trail.length > 1) {
      for (let i = 1; i < this.npc.trail.length; i++) {
        const alpha = (i / this.npc.trail.length) * 0.35;
        ctx.strokeStyle = `rgba(56,189,248,${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.npc.trail[i-1].x*ts+ts/2, this.npc.trail[i-1].y*ts+ts/2);
        ctx.lineTo(this.npc.trail[i].x*ts+ts/2, this.npc.trail[i].y*ts+ts/2);
        ctx.stroke();
      }
    }

    // Treasures (Data Cores)
    for (const t of this.treasures) {
      if (t.collected) continue;
      const cx = t.x*ts+ts/2, cy = t.y*ts+ts/2;
      const pulse = 0.85 + 0.15 * Math.sin(this.time * 3 + t.x);
      ctx.fillStyle = `rgba(250,204,21,${pulse})`;
      ctx.font = `bold 14px 'Geist Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('◈', cx, cy+5);
    }

    // Static Target Sentries (Do not attack; can be destroyed by NPC or Operator)
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const cx = e.x*ts+ts/2, cy = e.y*ts+ts/2;

      // Outer target ring
      ctx.strokeStyle = 'rgba(248,113,113,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 13, 0, Math.PI * 2);
      ctx.stroke();

      // Static target glyph
      ctx.fillStyle = '#f87171';
      ctx.font = `bold 14px 'Geist Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('◆', cx, cy+5);

      // Target Health bar
      const bw = 18, bh = 3;
      ctx.fillStyle = 'rgba(15,23,42,0.8)';
      ctx.fillRect(cx-bw/2, cy-14, bw, bh);
      ctx.fillStyle = e.health > 30 ? '#ef4444' : '#fb923c';
      ctx.fillRect(cx-bw/2, cy-14, (e.health/e.maxHealth)*bw, bh);
    }

    // Player (Operator)
    {
      const cx = this.player.displayX*ts+ts/2, cy = this.player.displayY*ts+ts/2;
      // Aura
      ctx.fillStyle = 'rgba(52,211,153,0.08)';
      ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#34d399';
      ctx.font = `bold 16px 'Geist Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('◉', cx, cy+5);
    }

    // NPC Agent
    this._renderNPC();

    // Floating texts
    for (let i = this.floatingTexts.length-1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ctx.globalAlpha = ft.life;
      ctx.fillStyle = ft.color;
      ctx.font = `bold 10px 'Geist Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ft.y -= 0.6;
      ft.life -= 0.035;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }
    ctx.globalAlpha = 1;

    // Particles
    for (let i = this.particles.length-1; i >= 0; i--) {
      const p = this.particles[i];
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI*2); ctx.fill();
      p.x += p.vx; p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    ctx.globalAlpha = 1;

    // Mission overlay (Victory / Defeat)
    if (this.missionStatus !== 'ACTIVE') {
      ctx.fillStyle = this.missionStatus === 'VICTORY' ? 'rgba(0,30,10,0.85)' : 'rgba(30,0,0,0.85)';
      ctx.fillRect(0, 0, W, H);
      const color = this.missionStatus === 'VICTORY' ? '#4ade80' : '#f87171';
      ctx.fillStyle = color;
      ctx.font = `bold 22px 'Geist Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(this.missionStatus === 'VICTORY' ? '✓ MISSION COMPLETE' : '✗ MISSION FAILED', W/2, H/2 - 10);
      ctx.font = `12px 'Geist Mono', monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(`Score: ${this.npc.score}  ·  Cycles: ${this.cycle}`, W/2, H/2 + 18);
    }
  }

  _renderNPC() {
    const ctx = this.ctx, n = this.npc, ts = TS;
    const cx = n.displayX*ts+ts/2, cy = n.displayY*ts+ts/2;
    const a1 = this.ahead(1);

    // Sensor ray
    ctx.save();
    ctx.strokeStyle = 'rgba(56,189,248,0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(a1.x*ts+ts/2, a1.y*ts+ts/2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Aura pulse (when rule matched)
    if (n.matchedRule) {
      const pulse = 0.15 + 0.1 * Math.sin(this.time * 6);
      ctx.fillStyle = `rgba(56,189,248,${pulse})`;
      ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI*2); ctx.fill();
    }

    // NPC glyph
    ctx.fillStyle = '#38bdf8';
    ctx.font = `bold 16px 'Geist Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(GLYPH[n.dir] || '▲', cx, cy+6);

    // Active rule callout
    if (n.matchedRule) {
      const txt = `${n.matchedRule.condition} → ${n.matchedRule.action}`;
      ctx.font = `bold 8.5px 'Geist Mono', monospace`;
      const tw = ctx.measureText(txt).width;

      ctx.fillStyle = 'rgba(9,12,20,0.95)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(cx - tw/2 - 6, cy - 28, tw + 12, 16, 3);
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'center';
      ctx.fillText(txt, cx, cy - 17);
    }
  }
}
