/**
 * 2D Tactical Map Engine for NPC Simulation.
 */

const PREDEFINED_MAPS = {
  arena: {
    id: "arena",
    name: "Tactical Arena (Guard Scenario)",
    width: 14,
    height: 10,
    grid: [
      "##############",
      "#..N.........#",
      "#..###...O...#",
      "#............#",
      "#....T...E...#",
      "#............#",
      "#...O...###..#",
      "#.........P..#",
      "#...D........#",
      "##############",
    ],
  },
  dungeon: {
    id: "dungeon",
    name: "Collector's Vault (Loot Scenario)",
    width: 14,
    height: 10,
    grid: [
      "##############",
      "#N..T....O.T.#",
      "#..###.......#",
      "#...E....###.#",
      "#..O.........#",
      "#.T....E..T..#",
      "#....###.....#",
      "#..P.....O...#",
      "#...T......T.#",
      "##############",
    ],
  },
  maze: {
    id: "maze",
    name: "Obstacle Labyrinth (Patrol Scenario)",
    width: 14,
    height: 10,
    grid: [
      "##############",
      "#N.....#.....#",
      "#.####.#.###.#",
      "#....#.#.#...#",
      "#.##.#...#.P.#",
      "#..#.#.###.#.#",
      "##.#.#...#.#.#",
      "#..#.#.O...#.#",
      "#E...#...D.T.#",
      "##############",
    ],
  },
};

class GameMap {
  constructor(mapId = "arena") {
    this.load(mapId);
  }

  load(mapId) {
    const template = PREDEFINED_MAPS[mapId] || PREDEFINED_MAPS.arena;
    this.id = template.id;
    this.name = template.name;
    this.width = template.width;
    this.height = template.height;

    // Deep copy raw grid
    this.tiles = template.grid.map((row) => row.split(""));

    // Extracted initial spawn locations
    this.initialNPC = null;
    this.initialPlayer = null;
    this.initialEnemies = [];
    this.initialTreasures = [];

    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        const char = this.tiles[r][c];
        if (char === "N") {
          this.initialNPC = { x: c, y: r, dir: "RIGHT" };
          this.tiles[r][c] = "."; // replace with clear floor
        } else if (char === "P") {
          this.initialPlayer = { x: c, y: r };
          this.tiles[r][c] = ".";
        } else if (char === "E") {
          this.initialEnemies.push({ x: c, y: r, health: 50 });
          this.tiles[r][c] = ".";
        } else if (char === "T") {
          this.initialTreasures.push({ x: c, y: r, collected: false });
          this.tiles[r][c] = ".";
        }
      }
    }
  }

  getTile(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return "#"; // Wall out of bounds
    }
    return this.tiles[y][x];
  }

  isWall(x, y) {
    return this.getTile(x, y) === "#";
  }

  isPit(x, y) {
    return this.getTile(x, y) === "O";
  }

  isDoor(x, y) {
    return this.getTile(x, y) === "D";
  }
}

window.GameMap = GameMap;
window.PREDEFINED_MAPS = PREDEFINED_MAPS;
