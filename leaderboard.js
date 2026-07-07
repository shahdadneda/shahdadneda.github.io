// Shared global high-score client for the games.
// Talks to the scores API on server.shahdad.ca; if it is unreachable the
// games behave exactly as before (local best only, no errors shown).
window.Leaderboard = (function () {
  'use strict';

  const API_BASE = 'https://server.shahdad.ca/api/scores';
  const INITIALS_KEY = 'arcade-initials';
  const INITIALS_PATTERN = /^[A-Z]{1,3}$/;
  const FETCH_TIMEOUT_MS = 4000;

  function create(config) {
    const game = config.game;
    const overlay = config.overlay;
    const overlaySub = config.overlaySub;

    let top = null; // cached top-10, or null while unavailable
    let capturing = false;
    let submitted = false;
    let pendingScore = 0;
    let defaultSubText = '';

    // --- entry form + list, appended to the game-over overlay ---

    const entry = document.createElement('form');
    entry.className = 'lb-entry';
    entry.hidden = true;

    const prompt = document.createElement('p');
    prompt.className = 'lb-prompt';
    prompt.textContent = 'global top 10 · enter initials';

    const input = document.createElement('input');
    input.className = 'lb-input';
    input.maxLength = 3;
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = 'AAA';
    input.setAttribute('autocapitalize', 'characters');
    input.setAttribute('inputmode', 'text');
    input.setAttribute('aria-label', 'initials');

    const actions = document.createElement('div');
    actions.className = 'lb-actions';

    const save = document.createElement('button');
    save.type = 'submit';
    save.className = 'ghost-btn';
    save.textContent = 'save';

    const skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'ghost-btn';
    skip.textContent = 'skip';

    actions.append(save, skip);
    entry.append(prompt, input, actions);

    const listTitle = document.createElement('p');
    listTitle.className = 'lb-title';
    listTitle.textContent = 'global leaderboard';
    listTitle.hidden = true;

    const list = document.createElement('ol');
    list.className = 'lb-list';
    list.hidden = true;

    overlay.append(entry, listTitle, list);

    input.addEventListener('input', function () {
      input.value = input.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        dismiss();
      }
      e.stopPropagation();
    });

    entry.addEventListener('submit', function (e) {
      e.preventDefault();
      const initials = input.value;
      if (!INITIALS_PATTERN.test(initials)) {
        input.focus();
        return;
      }
      localStorage.setItem(INITIALS_KEY, initials);
      submitScore(initials);
    });

    skip.addEventListener('click', dismiss);

    // --- api ---

    function fetchTop() {
      fetch(API_BASE + '/' + game, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
        .then(function (r) {
          if (!r.ok) throw new Error('bad status');
          return r.json();
        })
        .then(function (data) { top = data.scores; })
        .catch(function () { top = null; });
    }

    function submitScore(initials) {
      entry.hidden = true;
      capturing = false;
      overlaySub.textContent = 'saving…';
      fetch(API_BASE + '/' + game, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initials: initials, score: pendingScore }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
        .then(function (r) {
          if (!r.ok) throw new Error('bad status');
          return r.json();
        })
        .then(function (data) {
          top = data.scores;
          renderList(data.id);
          const rankNote = data.rank && data.rank <= 10 ? '#' + data.rank + ' all-time · ' : '';
          overlaySub.textContent = rankNote + defaultSubText;
        })
        .catch(function () {
          overlaySub.textContent = defaultSubText;
        });
    }

    // --- ui ---

    function renderList(highlightId) {
      list.textContent = '';
      (top || []).forEach(function (row, i) {
        const li = document.createElement('li');
        if (row.id === highlightId) li.className = 'mine';
        const rank = document.createElement('span');
        rank.className = 'lb-rank';
        rank.textContent = i + 1;
        const name = document.createElement('span');
        name.className = 'lb-name';
        name.textContent = row.initials;
        const pts = document.createElement('span');
        pts.className = 'lb-score';
        pts.textContent = row.score;
        li.append(rank, name, pts);
        list.appendChild(li);
      });
      list.hidden = !top || top.length === 0;
      listTitle.hidden = list.hidden;
    }

    function dismiss() {
      entry.hidden = true;
      capturing = false;
      overlaySub.textContent = defaultSubText;
      renderList();
    }

    function qualifies(score) {
      if (top === null || score <= 0) return false;
      return top.length < 10 || score > top[top.length - 1].score;
    }

    // --- hooks used by the games ---

    // Call after showOverlay() at game over.
    function gameOver(score) {
      if (submitted) return;
      defaultSubText = overlaySub.textContent;
      pendingScore = score;
      if (qualifies(score)) {
        submitted = true;
        capturing = true;
        list.hidden = true;
        listTitle.hidden = true;
        input.value = localStorage.getItem(INITIALS_KEY) || '';
        entry.hidden = false;
        if (window.matchMedia('(hover: hover)').matches) input.focus();
      } else if (top && top.length) {
        renderList();
      }
    }

    // Call from init()/restart().
    function reset() {
      capturing = false;
      submitted = false;
      entry.hidden = true;
      list.hidden = true;
      listTitle.hidden = true;
    }

    fetchTop();

    return {
      gameOver: gameOver,
      reset: reset,
      isCapturing: function () { return capturing; },
    };
  }

  return { create: create };
})();
