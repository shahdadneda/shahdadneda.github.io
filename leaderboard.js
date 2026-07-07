// Shared global high-score client for the games.
// Renders a persistent leaderboard panel beside the board (below it on
// mobile) and handles arcade initials entry. If the scores API on
// server.shahdad.ca is unreachable the panel stays hidden and the games
// behave exactly as before.
window.Leaderboard = (function () {
  'use strict';

  const API_BASE = 'https://server.shahdad.ca/api/scores';
  const INITIALS_KEY = 'arcade-initials';
  const INITIALS_PATTERN = /^[A-Z]{1,4}$/;
  const FETCH_TIMEOUT_MS = 4000;

  function create(config) {
    const game = config.game;
    const panel = config.panel;
    const overlaySub = config.overlaySub;

    let top = null; // cached top-10, or null while unavailable
    let capturing = false;
    let submitted = false;
    let pendingScore = 0;
    let defaultSubText = '';

    // --- panel scaffolding ---

    const heading = document.createElement('p');
    heading.className = 'lb-heading';
    heading.textContent = 'global leaderboard';

    const entry = document.createElement('form');
    entry.className = 'lb-entry';
    entry.hidden = true;

    const prompt = document.createElement('p');
    prompt.className = 'lb-prompt';
    prompt.textContent = 'top 10 finish — your initials';

    const input = document.createElement('input');
    input.className = 'lb-input';
    input.maxLength = 4;
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = 'AAAA';
    input.setAttribute('autocapitalize', 'characters');
    input.setAttribute('inputmode', 'text');
    input.setAttribute('aria-label', 'initials');
    // Keep password managers (1Password, LastPass, Bitwarden, Dashlane) away
    // from this arcade-initials field.
    input.setAttribute('data-1p-ignore', '');
    input.setAttribute('data-lpignore', 'true');
    input.setAttribute('data-bwignore', '');
    input.setAttribute('data-form-type', 'other');

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

    const list = document.createElement('ol');
    list.className = 'lb-list';

    const empty = document.createElement('p');
    empty.className = 'lb-empty';
    empty.textContent = 'no scores yet';
    empty.hidden = true;

    panel.append(heading, entry, list, empty);
    panel.hidden = true; // revealed once we have data

    input.addEventListener('input', function () {
      input.value = input.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
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
        .then(function (data) {
          top = data.scores;
          panel.hidden = false;
          renderList();
        })
        .catch(function () {
          top = null;
          panel.hidden = true;
        });
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
          overlaySub.textContent = rankNote + 'press or tap to go again';
        })
        .catch(function () {
          overlaySub.textContent = defaultSubText;
        });
    }

    // --- ui ---

    function renderList(highlightId) {
      list.textContent = '';
      const rows = top || [];
      rows.forEach(function (row, i) {
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
      const isEmpty = rows.length === 0;
      list.hidden = isEmpty;
      empty.hidden = !isEmpty;
    }

    function dismiss() {
      entry.hidden = true;
      capturing = false;
      overlaySub.textContent = defaultSubText;
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
        input.value = localStorage.getItem(INITIALS_KEY) || '';
        entry.hidden = false;
        overlaySub.textContent = 'top 10 finish — add your initials';
        // Bring the entry into view (matters on mobile, where the panel
        // sits below the board) and focus on desktop.
        if (window.matchMedia('(hover: hover)').matches) {
          input.focus();
        } else {
          entry.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }

    // Call from init()/restart().
    function reset() {
      capturing = false;
      submitted = false;
      entry.hidden = true;
      renderList();
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
