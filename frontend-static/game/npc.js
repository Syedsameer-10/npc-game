/**
 * NPC Engine: Sensing environment, evaluating rule table, executing actions.
 */

const DIRECTIONS = ["UP", "RIGHT", "DOWN", "LEFT"];
const DIR_VECTORS = {
  UP: { dx: 0, dy: -1 },
  RIGHT: { dx: 1, dy: 0 },
  DOWN: { dx: 0, dy: 1 },
  LEFT: { dx: -1, dy: 0 },
};

class NPC {
  constructor(name = "Guard", x = 2, y = 2, direction = "RIGHT") {
    this.name = name;
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.health = 100;
    this.score = 0;
    this.inventory = [];
    this.currentAction = "IDLE";
    this.matchedRule = null;
    this.sensedConditions = {};
    this.compiledRules = [];
  }

  setRules(behaviorPayload) {
    if (behaviorPayload && behaviorPayload.rules) {
      this.name = behaviorPayload.npc || this.name;
      this.compiledRules = behaviorPayload.rules.filter((r) => r.isActive);
    }
  }

  // --- SENSORS ---

  getAheadCoordinates(distance = 1) {
    const vec = DIR_VECTORS[this.direction];
    return {
      x: this.x + vec.dx * distance,
      y: this.y + vec.dy * distance,
    };
  }

  isWallAhead(map) {
    const ahead = this.getAheadCoordinates(1);
    return map.isWall(ahead.x, ahead.y);
  }

  isPitAhead(map) {
    const ahead = this.getAheadCoordinates(1);
    return map.isPit(ahead.x, ahead.y);
  }

  isDoorAhead(map) {
    const ahead = this.getAheadCoordinates(1);
    return map.isDoor(ahead.x, ahead.y);
  }

  isPathClear(map) {
    const ahead = this.getAheadCoordinates(1);
    return !map.isWall(ahead.x, ahead.y) && !map.isPit(ahead.x, ahead.y) && !map.isDoor(ahead.x, ahead.y);
  }

  isEnemyNear(enemies) {
    return enemies.some((e) => {
      if (!e.alive) return false;
      const dist = Math.hypot(e.x - this.x, e.y - this.y);
      return dist <= 2.2;
    });
  }

  isPlayerSeen(player, map) {
    if (!player) return false;
    const vec = DIR_VECTORS[this.direction];
    let currX = this.x;
    let currY = this.y;

    // Cast ray forward up to 8 tiles
    for (let i = 1; i <= 8; i++) {
      currX += vec.dx;
      currY += vec.dy;

      if (map.isWall(currX, currY)) return false;
      if (currX === player.x && currY === player.y) return true;
    }
    return false;
  }

  isPlayerNear(player) {
    if (!player) return false;
    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    return dist <= 1.8;
  }

  isTreasureNear(treasures) {
    return treasures.some((t) => {
      if (t.collected) return false;
      const dist = Math.hypot(t.x - this.x, t.y - this.y);
      return dist <= 2.5;
    });
  }

  isHealthLow() {
    return this.health <= 30;
  }

  senseEnvironment(map, player, enemies, treasures) {
    this.sensedConditions = {
      WALL_AHEAD: this.isWallAhead(map),
      PIT_AHEAD: this.isPitAhead(map),
      PATH_CLEAR: this.isPathClear(map),
      ENEMY_NEAR: this.isEnemyNear(enemies),
      PLAYER_SEEN: this.isPlayerSeen(player, map),
      PLAYER_NEAR: this.isPlayerNear(player),
      TREASURE_NEAR: this.isTreasureNear(treasures),
      HEALTH_LOW: this.isHealthLow(),
      DOOR_AHEAD: this.isDoorAhead(map),
    };
    return this.sensedConditions;
  }

  // --- DECISION CYCLE ---

  evaluateBehavior(map, player, enemies, treasures) {
    this.senseEnvironment(map, player, enemies, treasures);

    this.matchedRule = null;
    this.currentAction = "STOP";

    // Evaluate rules in priority order (First Match Precedence)
    for (const rule of this.compiledRules) {
      if (this.sensedConditions[rule.condition]) {
        this.matchedRule = rule;
        this.currentAction = rule.action;
        break;
      }
    }

    return {
      action: this.currentAction,
      matchedRule: this.matchedRule,
      conditions: this.sensedConditions,
    };
  }

  // --- ACTIONS ---

  executeAction(map, player, enemies, treasures) {
    switch (this.currentAction) {
      case "MOVE_FORWARD":
        this.moveForward(map);
        break;
      case "TURN_LEFT":
        this.turnLeft();
        break;
      case "TURN_RIGHT":
        this.turnRight();
        break;
      case "JUMP":
        this.jump(map);
        break;
      case "ATTACK":
        this.attack(enemies, player);
        break;
      case "CHASE":
        this.chase(player || (enemies.length ? enemies[0] : null), map);
        break;
      case "RUN_AWAY":
        this.runAway(player || (enemies.length ? enemies[0] : null), map);
        break;
      case "COLLECT":
        this.collect(treasures);
        break;
      case "STOP":
      default:
        // Idle
        break;
    }
  }

  moveForward(map) {
    const ahead = this.getAheadCoordinates(1);
    if (!map.isWall(ahead.x, ahead.y) && !map.isDoor(ahead.x, ahead.y)) {
      this.x = ahead.x;
      this.y = ahead.y;
    }
  }

  turnLeft() {
    const idx = DIRECTIONS.indexOf(this.direction);
    this.direction = DIRECTIONS[(idx + 3) % 4];
  }

  turnRight() {
    const idx = DIRECTIONS.indexOf(this.direction);
    this.direction = DIRECTIONS[(idx + 1) % 4];
  }

  jump(map) {
    // Hop over 2 tiles forward
    const landing = this.getAheadCoordinates(2);
    if (!map.isWall(landing.x, landing.y) && !map.isPit(landing.x, landing.y)) {
      this.x = landing.x;
      this.y = landing.y;
    } else {
      // If landing is blocked, try stepping 1 cell
      this.moveForward(map);
    }
  }

  attack(enemies, player) {
    // Attack adjacent enemy
    for (const e of enemies) {
      if (e.alive && Math.hypot(e.x - this.x, e.y - this.y) <= 1.5) {
        e.takeDamage(35);
        return;
      }
    }
    // Attack adjacent player
    if (player && Math.hypot(player.x - this.x, player.y - this.y) <= 1.5) {
      player.health = Math.max(0, player.health - 25);
    }
  }

  chase(target, map) {
    if (!target) return;
    const dx = target.x - this.x;
    const dy = target.y - this.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      const stepX = dx > 0 ? 1 : -1;
      if (!map.isWall(this.x + stepX, this.y) && !map.isPit(this.x + stepX, this.y)) {
        this.x += stepX;
        this.direction = stepX > 0 ? "RIGHT" : "LEFT";
        return;
      }
    }

    if (dy !== 0) {
      const stepY = dy > 0 ? 1 : -1;
      if (!map.isWall(this.x, this.y + stepY) && !map.isPit(this.x, this.y + stepY)) {
        this.y += stepY;
        this.direction = stepY > 0 ? "DOWN" : "UP";
        return;
      }
    }

    this.moveForward(map);
  }

  runAway(threat, map) {
    if (!threat) return;
    const dx = this.x - threat.x;
    const dy = this.y - threat.y;

    const stepX = dx >= 0 ? 1 : -1;
    const stepY = dy >= 0 ? 1 : -1;

    if (!map.isWall(this.x + stepX, this.y) && !map.isPit(this.x + stepX, this.y)) {
      this.x += stepX;
      this.direction = stepX > 0 ? "RIGHT" : "LEFT";
    } else if (!map.isWall(this.x, this.y + stepY) && !map.isPit(this.x, this.y + stepY)) {
      this.y += stepY;
      this.direction = stepY > 0 ? "DOWN" : "UP";
    } else {
      this.turnLeft();
    }
  }

  collect(treasures) {
    for (const t of treasures) {
      if (!t.collected && Math.hypot(t.x - this.x, t.y - this.y) <= 1.8) {
        t.collected = true;
        this.score += 100;
        this.inventory.push("Gem");
      }
    }
  }
}

window.NPC = NPC;
