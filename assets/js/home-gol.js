/**
 * Boxed Game of Life band for the homepage.
 * Seeds kites (still lifes), gliders, Canada geese, and copperheads.
 */
(function () {
  "use strict";

  /** @type {Record<string, number[][]>} */
  var PATTERNS = {
    kite: [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 2],
      [2, 1],
    ],
    glider: [
      [0, 1],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ],
    copperhead: parseRle("b2o2b2o$3b2o$3b2o$obo2bobo$o6bo2$o6bo$b2o2b2o$2b4o2$3b2o$3b2o!"),
    canadaGoose: parseRle(
      "3o10b$o9b2ob$bo6b3obo$3b2o2b2o4b$4bo8b$8bo4b$4b2o3bo3b$3bobob2o4b$3bobo2bob2ob$2bo4b2o4b$2b2o9b$2b2o!"
    ),
  };

  /**
   * Parse a single-line Life RLE body into cell offsets.
   * @param {string} rle RLE pattern body.
   * @returns {number[][]}
   */
  function parseRle(rle) {
    var cells = [];
    var row = 0;
    var col = 0;
    var count = 0;
    var i;
    var ch;
    for (i = 0; i < rle.length; i += 1) {
      ch = rle.charAt(i);
      if (ch >= "0" && ch <= "9") {
        count = count * 10 + (ch.charCodeAt(0) - 48);
        continue;
      }
      if (count === 0) {
        count = 1;
      }
      if (ch === "b") {
        col += count;
      } else if (ch === "o") {
        while (count > 0) {
          cells.push([row, col]);
          col += 1;
          count -= 1;
        }
        count = 0;
        continue;
      } else if (ch === "$") {
        row += count;
        col = 0;
      } else if (ch === "!") {
        break;
      }
      count = 0;
    }
    return cells;
  }

  /**
   * Rotate cell offsets 90° clockwise around the pattern origin box.
   * @param {number[][]} cells Source cells.
   * @param {number} turns Number of 90° clockwise turns.
   * @returns {number[][]}
   */
  function rotateCells(cells, turns) {
    var t = ((turns % 4) + 4) % 4;
    var out = cells.map(function (cell) {
      return [cell[0], cell[1]];
    });
    var n;
    var maxR;
    var maxC;
    var rotated;
    for (n = 0; n < t; n += 1) {
      maxR = 0;
      maxC = 0;
      out.forEach(function (cell) {
        if (cell[0] > maxR) {
          maxR = cell[0];
        }
        if (cell[1] > maxC) {
          maxC = cell[1];
        }
      });
      rotated = out.map(function (cell) {
        return [cell[1], maxR - cell[0]];
      });
      out = rotated;
    }
    return out;
  }

  /**
   * Mirror cells horizontally.
   * @param {number[][]} cells Source cells.
   * @returns {number[][]}
   */
  function flipHorizontal(cells) {
    var maxC = 0;
    cells.forEach(function (cell) {
      if (cell[1] > maxC) {
        maxC = cell[1];
      }
    });
    return cells.map(function (cell) {
      return [cell[0], maxC - cell[1]];
    });
  }

  /**
   * Read whether night theme is active.
   * @returns {boolean}
   */
  function isNight() {
    return document.documentElement.getAttribute("data-theme") === "night";
  }

  /**
   * Create an empty grid.
   * @param {number} rows Row count.
   * @param {number} cols Column count.
   * @returns {Uint8Array[]}
   */
  function makeGrid(rows, cols) {
    var grid = [];
    var r;
    for (r = 0; r < rows; r += 1) {
      grid.push(new Uint8Array(cols));
    }
    return grid;
  }

  /**
   * Stamp a pattern onto the grid with wraparound.
   * @param {Uint8Array[]} grid Destination grid.
   * @param {number[][]} cells Pattern cells.
   * @param {number} row0 Top row.
   * @param {number} col0 Left column.
   * @returns {void}
   */
  function stamp(grid, cells, row0, col0) {
    var rows = grid.length;
    var cols = grid[0].length;
    cells.forEach(function (cell) {
      var r = ((row0 + cell[0]) % rows + rows) % rows;
      var c = ((col0 + cell[1]) % cols + cols) % cols;
      grid[r][c] = 1;
    });
  }

  /**
   * Seed a composed layout of still lifes and spaceships inside the box.
   * @param {Uint8Array[]} grid Grid to fill.
   * @returns {void}
   */
  function seed(grid) {
    var rows = grid.length;
    var cols = grid[0].length;
    var r;
    for (r = 0; r < rows; r += 1) {
      grid[r].fill(0);
    }

    var kiteSpots = [
      [1, 2],
      [1, Math.max(2, cols - 5)],
      [Math.max(1, rows - 4), 2],
      [Math.max(1, rows - 4), Math.max(2, cols - 5)],
    ];
    kiteSpots.forEach(function (spot, index) {
      stamp(grid, rotateCells(PATTERNS.kite, index % 4), spot[0], spot[1]);
    });

    stamp(grid, PATTERNS.glider, 2, Math.floor(cols * 0.28));
    stamp(grid, rotateCells(PATTERNS.glider, 1), Math.floor(rows * 0.35), Math.floor(cols * 0.7));
    stamp(grid, rotateCells(PATTERNS.glider, 2), Math.max(2, rows - 5), Math.floor(cols * 0.45));
    stamp(grid, rotateCells(PATTERNS.glider, 3), Math.floor(rows * 0.45), 3);

    stamp(grid, PATTERNS.copperhead, Math.max(1, rows - 13), Math.floor(cols * 0.12));
    stamp(
      grid,
      rotateCells(PATTERNS.copperhead, 2),
      1,
      Math.max(1, cols - 10)
    );

    if (rows >= 14 && cols >= 20) {
      stamp(grid, PATTERNS.canadaGoose, Math.floor(rows * 0.2), Math.floor(cols * 0.5));
      stamp(
        grid,
        flipHorizontal(rotateCells(PATTERNS.canadaGoose, 2)),
        Math.max(1, rows - 13),
        Math.floor(cols * 0.35)
      );
    }
  }

  /**
   * Count live neighbors with wraparound.
   * @param {Uint8Array[]} grid Source grid.
   * @param {number} r Row.
   * @param {number} c Column.
   * @returns {number}
   */
  function neighbors(grid, r, c) {
    var rows = grid.length;
    var cols = grid[0].length;
    var total = 0;
    var dr;
    var dc;
    for (dr = -1; dr <= 1; dr += 1) {
      for (dc = -1; dc <= 1; dc += 1) {
        if (dr === 0 && dc === 0) {
          continue;
        }
        total += grid[(r + dr + rows) % rows][(c + dc + cols) % cols];
      }
    }
    return total;
  }

  /**
   * Advance one generation.
   * @param {Uint8Array[]} current Current grid.
   * @param {Uint8Array[]} next Destination grid.
   * @returns {void}
   */
  function step(current, next) {
    var r;
    var c;
    var n;
    var alive;
    for (r = 0; r < current.length; r += 1) {
      for (c = 0; c < current[r].length; c += 1) {
        n = neighbors(current, r, c);
        alive = current[r][c] === 1;
        next[r][c] = (alive && (n === 2 || n === 3)) || (!alive && n === 3) ? 1 : 0;
      }
    }
  }

  /**
   * Initialize the homepage Game of Life.
   * @returns {void}
   */
  function init() {
    var canvas = document.querySelector("[data-home-gol]");
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
      return;
    }

    var ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    var cell = 9;
    var cols = 0;
    var rows = 0;
    var current = [];
    var next = [];
    var timer = 0;
    var generations = 0;
    var resizeTimer = 0;

    /**
     * Resize canvas to the boxed container and reseed.
     * @returns {void}
     */
    function resize() {
      var rect = canvas.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.max(16, Math.floor(rect.width / cell));
      rows = Math.max(10, Math.floor(rect.height / cell));
      current = makeGrid(rows, cols);
      next = makeGrid(rows, cols);
      seed(current);
      generations = 0;
    }

    /**
     * Paint the current grid.
     * @returns {void}
     */
    function draw() {
      var rect = canvas.getBoundingClientRect();
      var night = isNight();
      var alive = night ? "rgba(142, 192, 245, 0.28)" : "rgba(31, 95, 139, 0.22)";
      var r;
      var c;
      var x;
      var y;
      var size = cell - 2;
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.fillStyle = alive;
      for (r = 0; r < rows; r += 1) {
        for (c = 0; c < cols; c += 1) {
          if (current[r][c]) {
            x = c * cell + 1;
            y = r * cell + 1;
            if (ctx.roundRect) {
              ctx.beginPath();
              ctx.roundRect(x, y, size, size, 2);
              ctx.fill();
            } else {
              ctx.fillRect(x, y, size, size);
            }
          }
        }
      }
    }

    /**
     * Tick the simulation.
     * @returns {void}
     */
    function tick() {
      step(current, next);
      var swap = current;
      current = next;
      next = swap;
      generations += 1;
      if (generations % 420 === 0) {
        seed(current);
      }
      draw();
    }

    resize();
    draw();
    timer = window.setInterval(tick, 140);

    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        resize();
        draw();
      }, 120);
    });

    var observer = new MutationObserver(function () {
      draw();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        window.clearInterval(timer);
        timer = 0;
      } else if (!timer) {
        timer = window.setInterval(tick, 140);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
