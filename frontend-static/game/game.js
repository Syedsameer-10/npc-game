/**
 * NPC 2D — Game Engine
 * Dual control: WASD = player, Arrow keys = NPC manual
 * Auto mode: compiled rules drive NPC
 * Manual mode: arrow keys drive NPC, rules still evaluate (shown in HUD)
 * NPC reacts to player via PLAYER_SEEN and PLAYER_NEAR rules
 */

const DIRS = ['UP', 'RIGHT', 'DOWN', 'LEFT'];
const DVec = {
  UP:    { dx:  0, dy: -1 },
  RIGHT: { dx:  1, dy:  0 },
  DOWN:  { dx:  0, dy:  1 },
  LEFT:  { dx: -1, dy:  0 },
};

// Which key the NPC "presses" per compiled action (shown in HUD)
const ACTION_KEY_MAP = {
  MOVE_FORWARD: 'W',
  TURN_LEFT:    'A',
  TURN_RIGHT:   'D',
  JUMP:         'Spc',
  ATTACK:       'F',
  CHASE:        'W↑',
  RUN_AWAY:     'S',
  COLLECT:      'E',
  STOP:         '—',
  IDLE:         '—',
};

const ACTION_COLOR = {
  MOVE_FORWARD: '#4ade80',
  TURN_LEFT:    '#60a5fa',
  TURN_RIGHT:   '#60a5fa',
  JUMP:         '#a78bfa',
  ATTACK:       '#f87171',
  CHASE:        '#fb923c',
  RUN_AWAY:     '#fbbf24',
  COLLECT:      '#34d399',
  STOP:         '#4b5563',
  IDLE:         '#4b5563',
};

// Single tactical arena — one guard, one player, enemies, treasures, pits, door
const ARENA = {
  name: 'Tactical Arena',
  w: 18, h: 12,
  grid: [
    "##################",
    "#..N.....E.......#",
    "#..####..........#",
    "#........O.......#",
    "#....T...E.......#",
    "#................#",
    "#...O...#####....#",
    "#................#",
    "#.....P..........#",
    "#.T..........D...#",
    "#.......E........#",
    "##################",
  ]
};

class GameEngine {
  constructor(canvasId, onTick, onStateChange) {
    this.canvas  = document.getElementById(canvasId);
    this.ctx     = this.canvas.getContext('2d');
    this.onTick  = onTick;
    this.onStateChange = onStateChange;

    this.running  = false;
    this.interval = null;
    this.tickMs   = 600;
    this.cycle    = 0;
    this.TS       = 36;

    // 'auto' = compiled rules tick | 'manual' = arrow keys control NPC
    this.npcMode  = 'auto';

    // Alert state: fires when player enters NPC vision
    this.alertTTL = 0;

    // NPC
    this.npc = {
      x: 2, y: 1, dir: 'RIGHT',
      health: 100, score: 0,
      rules: [], action: 'IDLE',
      matchedRule: null, conditions: {},
      name: 'Guard',
    };
    // Player
    this.player = { x: 6, y: 8, health: 100 };

    this.enemies   = [];
    this.treasures = [];
    this.tiles     = [];
    this.mapW      = ARENA.w;
    this.mapH      = ARENA.h;

    // Visual FX
    this.fx = {
      keyFlash:     null,  // { key, ttl, color }
      actionFlash:  null,  // { label, ttl, color }
      trail:        [],    // NPC movement breadcrumbs
      jumpArc:      null,
      collectPulse: null,
      attackFlash:  [],
      playerHit:    0,     // ttl for player-got-hit flash
      alertPulse:   0,     // ttl for player-entered-vision alert
    };

    this.initWorld();
    this._bindKeys();
    this.render();
  }

  /* ─── World ──────────────────────────────────────────────── */

  initWorld() {
    this.mapW  = ARENA.w;
    this.mapH  = ARENA.h;
    this.tiles = ARENA.grid.map(r => r.split(''));

    this.enemies   = [];
    this.treasures = [];
    let ps = { x: 6, y: 8 };

    for (let r = 0; r < this.mapH; r++) {
      for (let c = 0; c < this.mapW; c++) {
        const ch = this.tiles[r][c];
        if (ch === 'N') {
          this.npc.x = c; this.npc.y = r; this.tiles[r][c] = '.';
        } else if (ch === 'P') {
          ps = { x: c, y: r }; this.tiles[r][c] = '.';
        } else if (ch === 'E') {
          this.enemies.push({ x: c, y: r, alive: true, health: 60, maxHealth: 60 });
          this.tiles[r][c] = '.';
        } else if (ch === 'T') {
          this.treasures.push({ x: c, y: r, collected: false });
          this.tiles[r][c] = '.';
        }
      }
    }

    this.player      = { x: ps.x, y: ps.y, health: 100 };
    this.npc.dir     = 'RIGHT';
    this.npc.health  = 100;
    this.npc.score   = 0;
    this.npc.action  = 'IDLE';
    this.npc.matchedRule = null;
    this.npc.conditions  = {};
    this.cycle    = 0;
    this.alertTTL = 0;
    this.fx = { keyFlash: null, actionFlash: null, trail: [], jumpArc: null, collectPulse: null, attackFlash: [], playerHit: 0, alertPulse: 0 };

    this.canvas.width  = this.mapW * this.TS;
    this.canvas.height = this.mapH * this.TS;
    this.updateHUD();
  }

  /* ─── Tile helpers ───────────────────────────────────────── */

  tile(x, y)      { return (x<0||x>=this.mapW||y<0||y>=this.mapH) ? '#' : this.tiles[y][x]; }
  isWall(x, y)    { return this.tile(x,y) === '#'; }
  isPit(x, y)     { return this.tile(x,y) === 'O'; }
  isDoor(x, y)    { return this.tile(x,y) === 'D'; }
  isBlocked(x, y) { return this.isWall(x,y) || this.isDoor(x,y); }

  ahead(n = 1) {
    const v = DVec[this.npc.dir];
    return { x: this.npc.x + v.dx * n, y: this.npc.y + v.dy * n };
  }

  /* ─── Key bindings ───────────────────────────────────────── */

  setNPCMode(mode) {
    this.npcMode = mode;       // 'auto' | 'manual'
    this.updateHUD();
    if (this.onStateChange) this.onStateChange(this.running);
  }

  _bindKeys() {
    window.addEventListener('keydown', e => {
      // ── Player: WASD ──────────────────────────────────────
      const playerMv = { KeyW:[0,-1], KeyS:[0,1], KeyA:[-1,0], KeyD:[1,0] };
      if (playerMv[e.code]) {
        e.preventDefault();
        const [dx, dy] = playerMv[e.code];
        const nx = this.player.x + dx, ny = this.player.y + dy;
        if (!this.isWall(nx,ny) && !this.isPit(nx,ny)) {
          this.player.x = nx; this.player.y = ny;
        }
        // After player moves, always re-sense so NPC reacts immediately
        this._sense();
        // Trigger alert if player just stepped into NPC's view
        if (this.npc.conditions.PLAYER_SEEN || this.npc.conditions.PLAYER_NEAR) {
          this.fx.alertPulse = 8;
          this.alertTTL      = 8;
        }
        this.updateHUD();
        this.render();
        return;
      }

      // ── NPC manual: Arrow keys ────────────────────────────
      if (this.npcMode === 'manual') {
        const npcMv = {
          ArrowUp:    { dx:0, dy:-1, dir:'UP'    },
          ArrowDown:  { dx:0, dy:1,  dir:'DOWN'  },
          ArrowLeft:  { dx:-1,dy:0,  dir:'LEFT'  },
          ArrowRight: { dx:1, dy:0,  dir:'RIGHT' },
        };
        if (npcMv[e.code]) {
          e.preventDefault();
          const mv = npcMv[e.code];
          const nx = this.npc.x + mv.dx, ny = this.npc.y + mv.dy;

          // Face that direction first
          this.npc.dir = mv.dir;

          // Move if not blocked by wall (pits are walkable — bad consequence)
          if (!this.isBlocked(nx, ny)) {
            // Trail
            this.fx.trail.push({ x: this.npc.x, y: this.npc.y, ttl: 10 });
            if (this.fx.trail.length > 12) this.fx.trail.shift();
            this.npc.x = nx; this.npc.y = ny;
            if (this.isPit(nx, ny)) {
              // Fell in pit — lose health
              this.npc.health = Math.max(0, this.npc.health - 20);
            }
          }

          // Arrow key display (white = manual)
          const arrowLabel = { ArrowUp:'↑', ArrowDown:'↓', ArrowLeft:'←', ArrowRight:'→' }[e.code];
          this.fx.keyFlash    = { key: arrowLabel, ttl: 4, color: '#ffffff' };
          this.fx.actionFlash = { label: 'MANUAL', ttl: 5, color: '#ffffff' };

          this.cycle++;
          this._sense();
          this._checkReactiveCollisions();
          this._tickFX();
          this.updateHUD();
          this.render();
        }
      }
    });
  }

  /* ─── Rules / behavior ───────────────────────────────────── */

  setRules(beh) {
    if (beh && beh.rules) {
      this.npc.name  = beh.npc || 'Guard';
      this.npc.rules = beh.rules.filter(r => r.isActive);
    }
  }

  /* ─── Simulation control ─────────────────────────────────── */

  start() {
    if (this.running) return;
    this.running  = true;
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

  step() {
    this.cycle++;
    this._sense();

    if (this.npcMode === 'auto') {
      this._decide();
      this._act();
    } else {
      // Manual mode: evaluate rules for display only (don't execute)
      this._decide();
      // Don't call _act — user controls NPC with arrow keys
    }

    this._tickFX();
    this.updateHUD();
    this.render();
  }

  /* ─── Sense ──────────────────────────────────────────────── */

  _sense() {
    const n    = this.npc;
    const a1   = this.ahead(1);
    const dist = (ex, ey) => Math.hypot(ex - n.x, ey - n.y);

    const prevPlayerSeen = n.conditions.PLAYER_SEEN;

    n.conditions = {
      WALL_AHEAD:    this.isWall(a1.x, a1.y),
      PIT_AHEAD:     this.isPit(a1.x, a1.y),
      DOOR_AHEAD:    this.isDoor(a1.x, a1.y),
      PATH_CLEAR:    !this.isWall(a1.x, a1.y) && !this.isPit(a1.x, a1.y) && !this.isDoor(a1.x, a1.y),
      ENEMY_NEAR:    this.enemies.some(e => e.alive && dist(e.x, e.y) <= 2.8),
      PLAYER_SEEN:   this._rayCast(this.player.x, this.player.y),
      PLAYER_NEAR:   dist(this.player.x, this.player.y) <= 1.5,
      TREASURE_NEAR: this.treasures.some(t => !t.collected && dist(t.x, t.y) <= 2.5),
      HEALTH_LOW:    n.health <= 30,
    };

    // Rising edge: player just entered view → alert pulse
    if (!prevPlayerSeen && n.conditions.PLAYER_SEEN) {
      this.fx.alertPulse = 10;
      this.alertTTL      = 10;
    }
  }

  _rayCast(tx, ty) {
    const v = DVec[this.npc.dir];
    let cx = this.npc.x, cy = this.npc.y;
    for (let i = 1; i <= 10; i++) {
      cx += v.dx; cy += v.dy;
      if (this.isWall(cx, cy)) return false;
      if (cx === tx && cy === ty) return true;
    }
    return false;
  }

  /* ─── Decide (always runs, even in manual mode for HUD display) ── */

  _decide() {
    const n = this.npc;
    n.matchedRule = null;
    n.action = 'STOP';
    for (const r of n.rules) {
      if (n.conditions[r.condition]) {
        n.matchedRule = r;
        n.action = r.action;
        break;
      }
    }
  }

  /* ─── Act (auto mode only) ──────────────────────────────── */

  _flashKey(action) {
    const key   = ACTION_KEY_MAP[action] || '?';
    const color = ACTION_COLOR[action]   || '#fff';
    this.fx.keyFlash    = { key, ttl: 4, color };
    this.fx.actionFlash = { label: action, ttl: 5, color };
  }

  _act() {
    const n = this.npc;
    const v = DVec[n.dir];
    const mv = (dx, dy) => {
      const nx = n.x + dx, ny = n.y + dy;
      if (!this.isBlocked(nx, ny)) { n.x = nx; n.y = ny; }
    };

    if (['MOVE_FORWARD','CHASE'].includes(n.action)) {
      this.fx.trail.push({ x: n.x, y: n.y, ttl: 12 });
      if (this.fx.trail.length > 14) this.fx.trail.shift();
    }

    this._flashKey(n.action);

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
        const fromX = n.x, fromY = n.y;
        const l = this.ahead(2);
        if (!this.isWall(l.x, l.y) && !this.isPit(l.x, l.y)) {
          n.x = l.x; n.y = l.y;
        } else { mv(v.dx, v.dy); }
        this.fx.jumpArc = { fromX, fromY, toX: n.x, toY: n.y, t: 0, ttl: 6 };
        break;
      }

      case 'ATTACK': {
        // Attack player if close
        if (Math.hypot(this.player.x - n.x, this.player.y - n.y) <= 2.0) {
          this.player.health = Math.max(0, this.player.health - 15);
          this.fx.attackFlash.push({ x: this.player.x, y: this.player.y, ttl: 6, isPlayer: true });
          this.fx.playerHit = 6;
        }
        // Also damage nearby enemies
        for (const e of this.enemies) {
          if (e.alive && Math.hypot(e.x - n.x, e.y - n.y) <= 2.0) {
            e.health -= 30;
            if (e.health <= 0) { e.alive = false; e.health = 0; }
            this.fx.attackFlash.push({ x: e.x, y: e.y, ttl: 6, isPlayer: false });
          }
        }
        break;
      }

      case 'CHASE': {
        // Chase player (the operator!)
        const tgt = this.player;
        const dx  = tgt.x - n.x, dy = tgt.y - n.y;
        if (Math.abs(dx) >= Math.abs(dy)) {
          const s = dx > 0 ? 1 : -1;
          if (!this.isBlocked(n.x+s, n.y))  { n.x += s; n.dir = s>0 ? 'RIGHT':'LEFT'; }
          else if (dy !== 0) {
            const sy = dy > 0 ? 1 : -1;
            if (!this.isBlocked(n.x, n.y+sy)) { n.y += sy; n.dir = sy>0 ? 'DOWN':'UP'; }
          }
        } else {
          const s = dy > 0 ? 1 : -1;
          if (!this.isBlocked(n.x, n.y+s))  { n.y += s; n.dir = s>0 ? 'DOWN':'UP'; }
          else if (dx !== 0) {
            const sx = dx > 0 ? 1 : -1;
            if (!this.isBlocked(n.x+sx, n.y)) { n.x += sx; n.dir = sx>0 ? 'RIGHT':'LEFT'; }
          }
        }
        break;
      }

      case 'RUN_AWAY': {
        const tgt = this.enemies.find(e => e.alive) || this.player;
        const dx  = n.x - tgt.x, dy = n.y - tgt.y;
        const sx  = dx >= 0 ? 1 : -1, sy = dy >= 0 ? 1 : -1;
        if (!this.isBlocked(n.x+sx, n.y))  { n.x += sx; n.dir = sx>0 ? 'RIGHT':'LEFT'; }
        else if (!this.isBlocked(n.x, n.y+sy)) { n.y += sy; n.dir = sy>0 ? 'DOWN':'UP'; }
        else n.dir = DIRS[(DIRS.indexOf(n.dir)+1)%4];
        break;
      }

      case 'COLLECT': {
        for (const t of this.treasures) {
          if (!t.collected && Math.hypot(t.x-n.x, t.y-n.y) <= 2.0) {
            t.collected = true;
            n.score += 100;
            this.fx.collectPulse = { x: t.x, y: t.y, ttl: 9, r: 0 };
          }
        }
        break;
      }

      case 'STOP': default: break;
    }

    this._checkReactiveCollisions();
  }

  // Collision: NPC stepped on player?
  _checkReactiveCollisions() {
    if (this.npc.x === this.player.x && this.npc.y === this.player.y) {
      this.player.health = Math.max(0, this.player.health - 10);
      this.fx.playerHit  = 5;
      this.fx.attackFlash.push({ x: this.player.x, y: this.player.y, ttl: 5, isPlayer: true });
    }
  }

  /* ─── FX tick ────────────────────────────────────────────── */

  _tickFX() {
    if (this.fx.keyFlash)     this.fx.keyFlash.ttl--;
    if (this.fx.actionFlash)  this.fx.actionFlash.ttl--;
    if (this.fx.collectPulse) { this.fx.collectPulse.ttl--; this.fx.collectPulse.r += 3.5; }
    if (this.fx.jumpArc)      { this.fx.jumpArc.t += 0.3; this.fx.jumpArc.ttl--; }
    if (this.fx.playerHit > 0)  this.fx.playerHit--;
    if (this.fx.alertPulse > 0) this.fx.alertPulse--;
    if (this.alertTTL > 0)      this.alertTTL--;
    this.fx.trail       = this.fx.trail.map(p => ({...p, ttl: p.ttl-1})).filter(p => p.ttl>0);
    this.fx.attackFlash = this.fx.attackFlash.map(a => ({...a, ttl: a.ttl-1})).filter(a => a.ttl>0);
  }

  /* ─── HUD ────────────────────────────────────────────────── */

  updateHUD() {
    if (this.onTick) this.onTick({
      cycle:       this.cycle,
      action:      this.npc.action,
      matchedRule: this.npc.matchedRule,
      heading:     this.npc.dir,
      npcHealth:   this.npc.health,
      playerHealth:this.player.health,
      score:       this.npc.score,
      conditions:  this.npc.conditions,
      keyPressed:  this.fx.keyFlash,
      npcMode:     this.npcMode,
      alertActive: this.alertTTL > 0,
    });
  }

  /* ─── Render ─────────────────────────────────────────────── */

  render() {
    const ctx = this.ctx;
    const ts  = this.TS;

    ctx.fillStyle = '#080a0f';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.016)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= this.canvas.width; x += ts) {
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x, this.canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= this.canvas.height; y += ts) {
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(this.canvas.width, y); ctx.stroke();
    }

    // Tiles
    for (let r = 0; r < this.mapH; r++) {
      for (let c = 0; c < this.mapW; c++) {
        const px = c*ts, py = r*ts, t = this.tiles[r][c];
        if (t === '#') {
          ctx.fillStyle = '#141926'; ctx.fillRect(px+1,py+1,ts-2,ts-2);
          ctx.strokeStyle='#1d2640'; ctx.lineWidth=1; ctx.strokeRect(px+1.5,py+1.5,ts-3,ts-3);
          ctx.strokeStyle='rgba(255,255,255,0.022)';
          ctx.beginPath(); ctx.moveTo(px+2,py+2); ctx.lineTo(px+ts-2,py+2); ctx.stroke();
        } else if (t === 'O') {
          ctx.fillStyle='#150808'; ctx.fillRect(px+1,py+1,ts-2,ts-2);
          ctx.save();
          ctx.strokeStyle='rgba(248,113,113,0.55)'; ctx.lineWidth=1.4;
          ctx.beginPath(); ctx.moveTo(px+5,py+5); ctx.lineTo(px+ts-5,py+ts-5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(px+ts-5,py+5); ctx.lineTo(px+5,py+ts-5); ctx.stroke();
          ctx.strokeStyle='rgba(248,113,113,0.2)'; ctx.lineWidth=1;
          ctx.strokeRect(px+3,py+3,ts-6,ts-6); ctx.restore();
        } else if (t === 'D') {
          ctx.fillStyle='#131108'; ctx.fillRect(px+1,py+1,ts-2,ts-2);
          ctx.strokeStyle='#b45309'; ctx.fillStyle='rgba(180,83,9,0.1)'; ctx.lineWidth=1.3;
          ctx.beginPath(); ctx.roundRect(px+4,py+2,ts-8,ts-4,2); ctx.fill(); ctx.stroke();
          ctx.fillStyle='#b45309'; ctx.beginPath(); ctx.arc(px+ts/2,py+ts/2,1.8,0,Math.PI*2); ctx.fill();
        }
      }
    }

    // Vision cone + sensor overlays
    this._renderVisionCone(ctx, ts);

    // NPC trail
    for (const p of this.fx.trail) {
      const a = p.ttl / 12;
      ctx.fillStyle = `rgba(96,165,250,${a*0.28})`;
      ctx.beginPath(); ctx.arc(p.x*ts+ts/2, p.y*ts+ts/2, 3.5*a, 0, Math.PI*2); ctx.fill();
    }

    // Attack flashes
    for (const f of this.fx.attackFlash) {
      const a = f.ttl / 6;
      ctx.save();
      ctx.fillStyle   = f.isPlayer ? `rgba(248,113,113,${a*0.3})` : `rgba(248,113,113,${a*0.3})`;
      ctx.strokeStyle = f.isPlayer ? `rgba(248,113,113,${a*0.9})` : `rgba(248,113,113,${a*0.7})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(f.x*ts+ts/2, f.y*ts+ts/2, ts*(f.isPlayer?0.8:0.65), 0, Math.PI*2);
      ctx.fill(); ctx.stroke(); ctx.restore();
    }

    // Collect pulse
    if (this.fx.collectPulse && this.fx.collectPulse.ttl > 0) {
      const cp = this.fx.collectPulse, a = cp.ttl/9;
      ctx.save(); ctx.strokeStyle=`rgba(52,211,153,${a*0.75})`; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(cp.x*ts+ts/2, cp.y*ts+ts/2, cp.r, 0, Math.PI*2); ctx.stroke(); ctx.restore();
    }

    // Treasures
    for (const t of this.treasures) {
      if (t.collected) continue;
      const cx=t.x*ts+ts/2, cy=t.y*ts+ts/2;
      ctx.save(); ctx.shadowColor='#facc15'; ctx.shadowBlur=9;
      ctx.fillStyle='#facc15'; this._drawStar(ctx,cx,cy,5,7,3.5); ctx.restore();
    }

    // Enemies
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const cx=e.x*ts+ts/2, cy=e.y*ts+ts/2;
      ctx.save();
      // HP bar
      const hp=e.health/e.maxHealth;
      ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(cx-9,cy-ts/2+2,18,3);
      ctx.fillStyle=hp>0.5?'#4ade80':'#f87171'; ctx.fillRect(cx-9,cy-ts/2+2,18*hp,3);
      // Body
      ctx.fillStyle='rgba(248,113,113,0.12)'; ctx.strokeStyle='#f87171'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(cx,cy-9); ctx.lineTo(cx+8,cy); ctx.lineTo(cx,cy+9); ctx.lineTo(cx-8,cy); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#f87171'; ctx.beginPath(); ctx.arc(cx,cy,2.5,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }

    // Player — flash red if hit
    {
      const cx=this.player.x*ts+ts/2, cy=this.player.y*ts+ts/2;
      ctx.save();
      const hitA = this.fx.playerHit / 6;
      const ringColor = hitA > 0 ? `rgba(248,113,113,${0.7+hitA*0.3})` : '#4ade80';
      const fillColor = hitA > 0 ? `rgba(248,113,113,0.25)` : 'rgba(74,222,128,0.1)';
      ctx.fillStyle = fillColor; ctx.strokeStyle = ringColor; ctx.lineWidth = hitA>0?2:1.5;
      ctx.beginPath(); ctx.arc(cx,cy,10,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = hitA>0?'#f87171':'#4ade80';
      ctx.beginPath(); ctx.arc(cx,cy,4,0,Math.PI*2); ctx.fill();
      // HP bar below label
      const php = this.player.health/100;
      ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(cx-10,cy+13,20,3);
      ctx.fillStyle=php>0.5?'#4ade80':'#f87171'; ctx.fillRect(cx-10,cy+13,20*php,3);
      // Label
      ctx.fillStyle = hitA>0?'rgba(248,113,113,0.8)':'rgba(74,222,128,0.6)';
      ctx.font='bold 7px "Geist Mono",monospace'; ctx.textAlign='center'; ctx.textBaseline='bottom';
      ctx.fillText('YOU', cx, cy-12); ctx.restore();
    }

    // NPC
    this._renderNPC(ctx, ts);

    // Action label popup above NPC
    if (this.fx.actionFlash && this.fx.actionFlash.ttl > 0) {
      const af = this.fx.actionFlash, a = Math.min(af.ttl/5,1);
      const nx = this.npc.x*ts+ts/2, ny = this.npc.y*ts+ts/2;
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = af.color;
      ctx.font = 'bold 8px "Geist Mono",monospace';
      ctx.textAlign='center'; ctx.textBaseline='bottom';
      ctx.fillText(af.label, nx, ny-22); ctx.restore();
    }

    // Jump arc
    if (this.fx.jumpArc && this.fx.jumpArc.ttl > 0) {
      const ja=this.fx.jumpArc, t=Math.min(ja.t,1);
      const mx=(ja.fromX+ja.toX)/2*ts+ts/2, my=((ja.fromY+ja.toY)/2*ts+ts/2)-ts*1.5;
      const cx=(1-t)*(1-t)*ja.fromX*ts+2*(1-t)*t*mx+t*t*ja.toX*ts+ts/2;
      const cy=(1-t)*(1-t)*ja.fromY*ts+2*(1-t)*t*my+t*t*ja.toY*ts+ts/2;
      ctx.save(); ctx.strokeStyle='rgba(167,139,250,0.55)'; ctx.lineWidth=1.5; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(ja.fromX*ts+ts/2,ja.fromY*ts+ts/2); ctx.quadraticCurveTo(mx,my,ja.toX*ts+ts/2,ja.toY*ts+ts/2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle='#a78bfa'; ctx.beginPath(); ctx.arc(cx,cy,4,0,Math.PI*2); ctx.fill(); ctx.restore();
    }

    // NPC key overlay (bottom-right)
    this._renderKeyOverlay(ctx);

    // Mode badge (top-left)
    this._renderModeBadge(ctx);
  }

  _renderVisionCone(ctx, ts) {
    const n   = this.npc;
    const cx  = n.x*ts+ts/2, cy = n.y*ts+ts/2;
    const ang = n.dir==='UP'?-Math.PI/2:n.dir==='DOWN'?Math.PI/2:n.dir==='LEFT'?Math.PI:0;

    // Danger/alert circle when player near or enemy near
    if (n.conditions.PLAYER_NEAR || n.conditions.ENEMY_NEAR) {
      ctx.save();
      const pulse = this.fx.alertPulse > 0 ? (this.fx.alertPulse/10)*0.12 : 0.04;
      ctx.strokeStyle=`rgba(248,113,113,${0.15+pulse})`; ctx.fillStyle=`rgba(248,113,113,${0.025+pulse*0.2})`;
      ctx.lineWidth=1; ctx.setLineDash([3,4]);
      ctx.beginPath(); ctx.arc(cx,cy,ts*2.5,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
    }

    // Alert pulse ring (when player just entered view)
    if (this.fx.alertPulse > 0) {
      const a = this.fx.alertPulse/10;
      ctx.save(); ctx.strokeStyle=`rgba(251,146,60,${a*0.8})`; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.arc(cx,cy,ts*(2+(1-a)*2),0,Math.PI*2); ctx.stroke(); ctx.restore();
    }

    // Vision cone color
    const playerSeen = n.conditions.PLAYER_SEEN;
    const coneC = playerSeen ? 'rgba(251,146,60,' : 'rgba(96,165,250,';
    ctx.save();
    ctx.fillStyle   = `${coneC}0.045)`;
    ctx.strokeStyle = `${coneC}${playerSeen?0.22:0.12})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,ts*5.5,ang-0.55,ang+0.55); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.restore();

    // Ray ahead
    const a1 = this.ahead(1);
    const rayC = n.conditions.WALL_AHEAD||n.conditions.PIT_AHEAD
      ? 'rgba(248,113,113,0.55)'
      : playerSeen
      ? 'rgba(251,146,60,0.6)'
      : 'rgba(96,165,250,0.35)';
    ctx.save(); ctx.strokeStyle=rayC; ctx.lineWidth=1.5; ctx.setLineDash([2,3]);
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(a1.x*ts+ts/2,a1.y*ts+ts/2); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
  }

  _renderNPC(ctx, ts) {
    const n   = this.npc;
    const cx  = n.x*ts+ts/2, cy = n.y*ts+ts/2;
    const ang = n.dir==='UP'?-Math.PI/2:n.dir==='DOWN'?Math.PI/2:n.dir==='LEFT'?Math.PI:0;
    const isManual = this.npcMode === 'manual';

    ctx.save(); ctx.translate(cx,cy);
    // Glow
    ctx.shadowColor = isManual ? 'rgba(167,139,250,0.5)' : 'rgba(96,165,250,0.5)';
    ctx.shadowBlur  = 14;
    ctx.fillStyle   = isManual ? 'rgba(167,139,250,0.08)' : 'rgba(96,165,250,0.08)';
    ctx.beginPath(); ctx.arc(0,0,12,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur  = 0;
    ctx.rotate(ang);
    // Chevron
    const bodyColor = isManual ? '#a78bfa' : '#60a5fa';
    ctx.strokeStyle=bodyColor; ctx.fillStyle=isManual?'rgba(167,139,250,0.25)':'rgba(96,165,250,0.25)'; ctx.lineWidth=1.8;
    ctx.beginPath(); ctx.moveTo(11,0); ctx.lineTo(-8,-8); ctx.lineTo(-3,0); ctx.lineTo(-8,8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle=bodyColor; ctx.beginPath(); ctx.arc(6,0,2.5,0,Math.PI*2); ctx.fill();
    ctx.restore();

    // Label
    ctx.fillStyle = isManual ? 'rgba(167,139,250,0.75)' : 'rgba(96,165,250,0.75)';
    ctx.font='bold 7px "Geist Mono",monospace'; ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillText(n.rules.length>0?n.name.toUpperCase():'NO RULES', cx, cy-14);

    // HP bar
    const hp = n.health/100;
    ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(cx-10, cy+13, 20, 3);
    ctx.fillStyle=hp>0.5?'#60a5fa':'#f87171'; ctx.fillRect(cx-10, cy+13, 20*hp, 3);
  }

  _renderKeyOverlay(ctx) {
    if (!this.fx.keyFlash || this.fx.keyFlash.ttl <= 0) return;
    const kf = this.fx.keyFlash, a = kf.ttl/4;
    const W = this.canvas.width, H = this.canvas.height;
    const size = 38, x = W-size-10, y = H-size-10;
    ctx.save(); ctx.globalAlpha=a;
    ctx.fillStyle='rgba(0,0,0,0.8)'; ctx.strokeStyle=kf.color; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.roundRect(x,y,size,size,6); ctx.fill(); ctx.stroke();
    ctx.fillStyle=kf.color; ctx.font='bold 14px "Geist Mono",monospace';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(kf.key, x+size/2, y+size/2); ctx.restore();
  }

  _renderModeBadge(ctx) {
    const isManual = this.npcMode === 'manual';
    const label    = isManual ? '↑↓←→ NPC MANUAL' : '⚙ NPC AUTO';
    const color    = isManual ? '#a78bfa' : '#60a5fa';
    ctx.save();
    ctx.fillStyle  = 'rgba(0,0,0,0.65)';
    ctx.strokeStyle= color;
    ctx.lineWidth  = 1;
    ctx.beginPath(); ctx.roundRect(8,8,isManual?130:100,22,4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = 'bold 9px "Geist Mono",monospace';
    ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText(label, 14, 19);
    ctx.restore();
  }

  _drawStar(ctx, cx, cy, pts, or, ir) {
    ctx.beginPath();
    for (let i=0; i<pts*2; i++) {
      const r=i%2===0?or:ir, a=(i*Math.PI/pts)-Math.PI/2;
      i===0?ctx.moveTo(cx+r*Math.cos(a),cy+r*Math.sin(a)):ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));
    }
    ctx.closePath(); ctx.fill();
  }
}

window.GameEngine    = GameEngine;
window.ACTION_KEY_MAP = ACTION_KEY_MAP;
window.ACTION_COLOR   = ACTION_COLOR;
