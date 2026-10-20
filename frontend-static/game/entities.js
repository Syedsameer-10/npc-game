/**
 * Entities Manager: Player, Enemies, Items.
 */

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.health = 100;
  }

  move(dx, dy, map) {
    const targetX = this.x + dx;
    const targetY = this.y + dy;
    if (!map.isWall(targetX, targetY) && !map.isPit(targetX, targetY)) {
      this.x = targetX;
      this.y = targetY;
    }
  }
}

class Enemy {
  constructor(x, y, health = 60) {
    this.x = x;
    this.y = y;
    this.health = health;
    this.alive = true;
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
    }
  }
}

class Treasure {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.collected = false;
  }
}

window.Player = Player;
window.Enemy = Enemy;
window.Treasure = Treasure;
