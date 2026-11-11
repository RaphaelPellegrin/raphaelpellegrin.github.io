/**
 * Foldable CV skill groups and a dynamic falling word cloud.
 */
(function () {
  "use strict";

  /**
   * Storage key for folded skill groups on this page.
   * @returns {string}
   */
  function foldStorageKey() {
    return "cv-skills-fold:" + window.location.pathname;
  }

  /**
   * Read fold state from localStorage.
   * @returns {Object<string, boolean>}
   */
  function readFoldState() {
    try {
      var raw = localStorage.getItem(foldStorageKey());
      return raw ? JSON.parse(raw) : {};
    } catch (err) {
      return {};
    }
  }

  /**
   * Persist fold state.
   * @param {Object<string, boolean>} state Fold map.
   * @returns {void}
   */
  function writeFoldState(state) {
    try {
      localStorage.setItem(foldStorageKey(), JSON.stringify(state));
    } catch (err) {
      // Ignore storage failures.
    }
  }

  /**
   * Expand or collapse one skill group.
   * @param {string} slug Group slug.
   * @param {boolean} expanded Open state.
   * @returns {void}
   */
  function setGroupExpanded(slug, expanded) {
    var group = document.querySelector('[data-skills-group="' + slug + '"]');
    var button = document.querySelector('[data-skills-fold="' + slug + '"]');
    if (!group || !button) {
      return;
    }
    group.classList.toggle("is-collapsed", !expanded);
    button.setAttribute("aria-expanded", expanded ? "true" : "false");
  }

  /**
   * Wire fold toggles for skill categories.
   * @returns {void}
   */
  function initFolds() {
    var state = readFoldState();
    document.querySelectorAll("[data-skills-fold]").forEach(function (button) {
      var slug = button.getAttribute("data-skills-fold") || "";
      var expanded = state[slug] !== false;
      setGroupExpanded(slug, expanded);
    });

    document.addEventListener("click", function (event) {
      var target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      var button = target.closest("[data-skills-fold]");
      if (!button) {
        return;
      }
      event.preventDefault();
      var slug = button.getAttribute("data-skills-fold") || "";
      var expanded = button.getAttribute("aria-expanded") !== "true";
      setGroupExpanded(slug, expanded);
      var nextState = readFoldState();
      nextState[slug] = expanded;
      writeFoldState(nextState);
    });
  }

  /**
   * Rect intersection helper.
   * @param {{x:number,y:number,w:number,h:number}} a First box.
   * @param {{x:number,y:number,w:number,h:number}} b Second box.
   * @returns {boolean}
   */
  function overlaps(a, b) {
    return !(
      a.x + a.w < b.x ||
      b.x + b.w < a.x ||
      a.y + a.h < b.y ||
      b.y + b.h < a.y
    );
  }

  /**
   * Whether the user prefers reduced motion.
   * @returns {boolean}
   */
  function prefersReducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  /**
   * Compute spiral word-cloud placements.
   * @param {HTMLElement} canvas Cloud canvas.
   * @param {HTMLElement[]} words Word nodes.
   * @returns {{el:HTMLElement,x:number,y:number,rotate:number}[]}
   */
  function computePlacements(canvas, words) {
    var width = canvas.clientWidth;
    var height = canvas.clientHeight;
    var cx = width / 2;
    var cy = height / 2;
    var placed = [];
    var results = [];

    var ordered = words.slice().sort(function (a, b) {
      return (
        Number(b.getAttribute("data-weight") || 3) -
        Number(a.getAttribute("data-weight") || 3)
      );
    });

    ordered.forEach(function (word, index) {
      var weight = Number(word.getAttribute("data-weight") || 3);
      var fontSize = 0.85 + weight * 0.28;
      var rotate = ((index % 5) - 2) * 8;
      word.style.fontSize = fontSize + "rem";
      word.style.left = "0px";
      word.style.top = "0px";
      word.style.transform = "translate(0, 0) rotate(" + rotate + "deg)";
      word.style.opacity = "0";

      var rect = word.getBoundingClientRect();
      var box = { w: rect.width + 10, h: rect.height + 8 };
      var found = null;
      var angle = 0;
      var radius = 0;
      var step;

      for (step = 0; step < 500; step += 1) {
        angle += 0.35;
        radius = 4 + step * 0.9;
        var x = cx + Math.cos(angle) * radius;
        var y = cy + Math.sin(angle) * radius * 0.72;
        var candidate = {
          x: x - box.w / 2,
          y: y - box.h / 2,
          w: box.w,
          h: box.h,
        };

        if (
          candidate.x < 4 ||
          candidate.y < 4 ||
          candidate.x + candidate.w > width - 4 ||
          candidate.y + candidate.h > height - 4
        ) {
          continue;
        }

        var hit = placed.some(function (other) {
          return overlaps(candidate, other);
        });
        if (!hit) {
          found = candidate;
          break;
        }
      }

      if (!found) {
        found = {
          x: 8 + (index * 37) % Math.max(40, width - box.w - 16),
          y: 8 + (index * 29) % Math.max(40, height - box.h - 16),
          w: box.w,
          h: box.h,
        };
      }

      placed.push(found);
      results.push({
        el: word,
        x: found.x + found.w / 2,
        y: found.y + found.h / 2,
        rotate: rotate,
      });
    });

    return results;
  }

  /**
   * Snap words to their final resting places.
   * @param {{el:HTMLElement,x:number,y:number,rotate:number}[]} placements Targets.
   * @returns {void}
   */
  function settleImmediate(placements) {
    placements.forEach(function (item) {
      item.el.classList.add("is-settled");
      item.el.style.left = item.x + "px";
      item.el.style.top = item.y + "px";
      item.el.style.opacity = "0.92";
      item.el.style.transform =
        "translate(-50%, -50%) rotate(" + item.rotate + "deg)";
    });
  }

  /**
   * Animate words falling from above, then stabilize.
   * @param {{el:HTMLElement,x:number,y:number,rotate:number}[]} placements Targets.
   * @returns {void}
   */
  function animateFall(placements) {
    var particles = placements.map(function (item, index) {
      var startY = item.y - (90 + Math.random() * 140 + index * 10);
      var startX = item.x + (Math.random() * 36 - 18);
      item.el.classList.remove("is-settled");
      item.el.style.left = startX + "px";
      item.el.style.top = startY + "px";
      item.el.style.opacity = "0";
      item.el.style.transform =
        "translate(-50%, -50%) rotate(" + (item.rotate + (Math.random() * 24 - 12)) + "deg)";

      return {
        el: item.el,
        x: startX,
        y: startY,
        vx: (item.x - startX) * 0.018,
        vy: 0.4 + Math.random() * 0.55,
        targetX: item.x,
        targetY: item.y,
        rotate: item.rotate + (Math.random() * 24 - 12),
        targetRotate: item.rotate,
        delay: index * 55 + Math.random() * 90,
        started: false,
        settled: false,
      };
    });

    var start = null;

    /**
     * Spring a value toward a target.
     * @param {number} value Current value.
     * @param {number} target Destination.
     * @param {number} amount Blend amount.
     * @returns {number}
     */
    function lerp(value, target, amount) {
      return value + (target - value) * amount;
    }

    /**
     * Animation frame handler.
     * @param {number} now Timestamp.
     * @returns {void}
     */
    function frame(now) {
      if (start === null) {
        start = now;
      }
      var elapsed = now - start;
      var allSettled = true;

      particles.forEach(function (p) {
        if (p.settled) {
          return;
        }
        allSettled = false;

        if (!p.started) {
          if (elapsed < p.delay) {
            return;
          }
          p.started = true;
          p.el.style.opacity = "0.2";
        }

        var falling = p.y < p.targetY - 8;
        if (falling) {
          p.vy += 0.42;
          p.vy = Math.min(p.vy, 11);
          p.y += p.vy;
          p.x += p.vx;
          p.rotate = lerp(p.rotate, p.targetRotate, 0.04);
          p.el.style.opacity = String(Math.min(0.92, 0.2 + (p.y / p.targetY) * 0.7));
        } else {
          p.x = lerp(p.x, p.targetX, 0.18);
          p.y = lerp(p.y, p.targetY, 0.22);
          p.rotate = lerp(p.rotate, p.targetRotate, 0.2);
          p.el.style.opacity = "0.92";
          if (
            Math.abs(p.x - p.targetX) < 0.4 &&
            Math.abs(p.y - p.targetY) < 0.4
          ) {
            p.x = p.targetX;
            p.y = p.targetY;
            p.rotate = p.targetRotate;
            p.settled = true;
            p.el.classList.add("is-settled");
          }
        }

        p.el.style.left = p.x + "px";
        p.el.style.top = p.y + "px";
        p.el.style.transform =
          "translate(-50%, -50%) rotate(" + p.rotate + "deg)";
      });

      if (!allSettled) {
        window.requestAnimationFrame(frame);
      }
    }

    window.requestAnimationFrame(frame);
  }

  var cloudState = {
    animated: false,
    placements: /** @type {{el:HTMLElement,x:number,y:number,rotate:number}[]} */ ([]),
  };

  /**
   * Lay out (and optionally animate) the word cloud.
   * @param {{animate?: boolean}} options Layout options.
   * @returns {void}
   */
  function layoutCloud(options) {
    var animate = !options || options.animate !== false;
    var canvas = document.querySelector("[data-skills-cloud]");
    if (!canvas || !(canvas instanceof HTMLElement)) {
      return;
    }

    var words = Array.prototype.slice.call(
      canvas.querySelectorAll(".skills-cloud__word")
    );
    if (!words.length) {
      return;
    }

    var placements = computePlacements(canvas, words);
    cloudState.placements = placements;

    if (!animate || prefersReducedMotion()) {
      settleImmediate(placements);
      cloudState.animated = true;
      return;
    }

    animateFall(placements);
    cloudState.animated = true;
  }

  /**
   * Re-layout after resize without replaying the fall.
   * @returns {void}
   */
  function relayoutSettled() {
    var canvas = document.querySelector("[data-skills-cloud]");
    if (!canvas || !(canvas instanceof HTMLElement)) {
      return;
    }
    var words = Array.prototype.slice.call(
      canvas.querySelectorAll(".skills-cloud__word")
    );
    var placements = computePlacements(canvas, words);
    cloudState.placements = placements;
    settleImmediate(placements);
  }

  /**
   * Start the fall once the cloud enters view.
   * @returns {void}
   */
  function initCloud() {
    var cloud = document.querySelector(".skills-cloud");
    if (!cloud) {
      return;
    }

    if (prefersReducedMotion()) {
      layoutCloud({ animate: false });
      window.addEventListener("resize", relayoutSettled);
      return;
    }

    if (!("IntersectionObserver" in window)) {
      layoutCloud({ animate: true });
      window.addEventListener("resize", relayoutSettled);
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !cloudState.animated) {
            layoutCloud({ animate: true });
            observer.disconnect();
          }
        });
      },
      { threshold: 0.35 }
    );
    observer.observe(cloud);
    window.addEventListener("resize", function () {
      if (cloudState.animated) {
        relayoutSettled();
      }
    });
  }

  /**
   * Initialize skills interactions.
   * @returns {void}
   */
  function init() {
    if (!document.querySelector(".skills")) {
      return;
    }
    initFolds();
    initCloud();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
