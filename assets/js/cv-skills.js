/**
 * Foldable CV skill groups.
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
   * Initialize skills interactions.
   * @returns {void}
   */
  function init() {
    if (!document.querySelector(".skills")) {
      return;
    }
    initFolds();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
