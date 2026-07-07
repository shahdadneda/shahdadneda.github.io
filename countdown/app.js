(() => {
  const KEY_TARGET = 'countdown.target';
  const KEY_SCHOOL = 'countdown.school';
  const KEY_HASTIME = 'countdown.hastime';

  const schoolCheck = document.getElementById('school-check');
  const targetLine = document.getElementById('target-line');
  const tiles = document.getElementById('tiles');
  const totals = document.getElementById('totals');
  const doneMsg = document.getElementById('done');
  const elDays = document.getElementById('t-days');
  const elDaysLabel = document.getElementById('t-days-label');
  const elHours = document.getElementById('t-hours');
  const elMins = document.getElementById('t-mins');
  const elSecs = document.getElementById('t-secs');

  const picker = document.getElementById('picker');
  const dateBtn = document.getElementById('date-btn');
  const dateBtnText = document.getElementById('date-btn-text');
  const pop = document.getElementById('pop');
  const calTitle = document.getElementById('cal-title');
  const calGrid = document.getElementById('cal-grid');
  const calPrev = document.getElementById('cal-prev');
  const calNext = document.getElementById('cal-next');
  const timeBtn = document.getElementById('time-btn');
  const timeToggle = document.getElementById('time-toggle');
  const timeControls = document.getElementById('time-controls');
  const timeMenu = document.getElementById('time-menu');

  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (n) => n.toLocaleString('en-US');
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  function defaultTarget() {
    return new Date(2026, 7, 7); // Aug 7, 2026
  }

  function parseSaved(v) {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  let saved = null;
  let hasTime = false;
  try {
    saved = parseSaved(localStorage.getItem(KEY_TARGET));
    hasTime = localStorage.getItem(KEY_HASTIME) === '1';
    schoolCheck.checked = localStorage.getItem(KEY_SCHOOL) === '1';
  } catch (e) {}
  let target = saved || defaultTarget();
  if (!hasTime) target = startOfDay(target);

  // Month currently shown in the calendar popover
  let viewY = target.getFullYear();
  let viewM = target.getMonth();

  function save() {
    try {
      localStorage.setItem(KEY_TARGET,
        target.getFullYear() + '-' + pad(target.getMonth() + 1) + '-' + pad(target.getDate()) +
        'T' + pad(target.getHours()) + ':' + pad(target.getMinutes()));
      localStorage.setItem(KEY_SCHOOL, schoolCheck.checked ? '1' : '0');
      localStorage.setItem(KEY_HASTIME, hasTime ? '1' : '0');
    } catch (e) { /* private browsing */ }
  }

  // Weekdays (Mon–Fri) from today through the target date, inclusive on both ends.
  function schoolDaysLeft(now) {
    const d = startOfDay(now);
    const end = startOfDay(target);
    let count = 0;
    while (d <= end) {
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) count++;
      d.setDate(d.getDate() + 1);
    }
    return count;
  }

  /* ---------- Display ---------- */

  function formatTarget() {
    const dateStr = target.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
    if (!hasTime) return dateStr;
    const timeStr = target.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return dateStr + ' · ' + timeStr;
  }

  function renderTargetLine() {
    targetLine.innerHTML = 'counting down to <b></b>';
    targetLine.querySelector('b').textContent = formatTarget();
    dateBtnText.textContent = formatTarget();
  }

  function setDone() {
    elDays.textContent = '0';
    elHours.textContent = '00';
    elMins.textContent = '00';
    elSecs.textContent = '00';
    tiles.classList.add('done');
    totals.hidden = true;
    doneMsg.hidden = false;
  }

  function schoolTotalsText(school) {
    // each school day is 3.5 hours of class time
    const hours = (school * 3.5).toLocaleString('en-US', { maximumFractionDigits: 1 });
    return 'that’s ' + hours + ' hours · ' + fmt(school * 210) + ' minutes of school left';
  }

  function tick() {
    const now = new Date();
    tiles.classList.toggle('no-time', !hasTime);

    if (!hasTime) {
      // Date-only countdown: whole calendar days until the target date
      const dayDiff = Math.round((startOfDay(target) - startOfDay(now)) / 86400000);
      if (dayDiff <= 0) { setDone(); return; }

      tiles.classList.remove('done');
      doneMsg.hidden = true;
      totals.hidden = false;

      if (schoolCheck.checked) {
        const school = schoolDaysLeft(now);
        elDays.textContent = fmt(school);
        elDaysLabel.textContent = 'school days';
        totals.textContent = schoolTotalsText(school);
      } else {
        elDays.textContent = fmt(dayDiff);
        elDaysLabel.textContent = 'days';
        totals.textContent = 'that’s ' + fmt(dayDiff * 24) + ' hours · ' +
          fmt(dayDiff * 1440) + ' minutes in total';
      }
      return;
    }

    const diff = target.getTime() - now.getTime();
    if (diff <= 0) { setDone(); return; }

    tiles.classList.remove('done');
    doneMsg.hidden = true;
    totals.hidden = false;

    const secs = Math.floor(diff / 1000);
    elHours.textContent = pad(Math.floor(secs / 3600) % 24);
    elMins.textContent = pad(Math.floor(secs / 60) % 60);
    elSecs.textContent = pad(secs % 60);

    if (schoolCheck.checked) {
      const school = schoolDaysLeft(now);
      elDays.textContent = fmt(school);
      elDaysLabel.textContent = 'school days';
      totals.textContent = schoolTotalsText(school);
    } else {
      elDays.textContent = fmt(Math.floor(secs / 86400));
      elDaysLabel.textContent = 'days';
      totals.textContent = 'that’s ' + fmt(Math.floor(secs / 3600)) + ' hours · ' +
        fmt(Math.floor(secs / 60)) + ' minutes in total';
    }
  }

  /* ---------- Calendar popover ---------- */

  function renderCalendar() {
    const monthName = new Date(viewY, viewM, 1).toLocaleDateString('en-US', {
      month: 'long', year: 'numeric',
    });
    calTitle.textContent = monthName;

    const firstDow = new Date(viewY, viewM, 1).getDay();
    const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
    const today = new Date();

    calGrid.innerHTML = '';
    for (let i = 0; i < firstDow; i++) {
      const blank = document.createElement('button');
      blank.className = 'blank';
      blank.type = 'button';
      blank.tabIndex = -1;
      blank.disabled = true;
      calGrid.appendChild(blank);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = day;
      if (viewY === today.getFullYear() && viewM === today.getMonth() && day === today.getDate()) {
        btn.classList.add('today');
      }
      if (viewY === target.getFullYear() && viewM === target.getMonth() && day === target.getDate()) {
        btn.classList.add('selected');
      }
      btn.addEventListener('click', () => {
        target = new Date(viewY, viewM, day, target.getHours(), target.getMinutes());
        save();
        renderCalendar();
        renderTargetLine();
        tick();
      });
      calGrid.appendChild(btn);
    }
  }

  function formatTime() {
    return target.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function syncTimeControls() {
    timeToggle.setAttribute('aria-checked', String(hasTime));
    timeBtn.hidden = !hasTime;
    if (hasTime) timeBtn.textContent = formatTime();
    if (!hasTime) closeTimeMenu();
  }

  /* Temporary time dropdown (30-minute steps) */

  function setTime(h24, min) {
    target = new Date(target.getFullYear(), target.getMonth(), target.getDate(), h24, min);
    save();
    timeBtn.textContent = formatTime();
    renderTargetLine();
    tick();
  }

  function renderTimeMenu() {
    const current = target.getHours() * 60 + target.getMinutes();
    const times = [];
    for (let m = 0; m < 1440; m += 30) times.push(m);
    if (!times.includes(current)) {
      times.push(current);
      times.sort((a, b) => a - b);
    }

    timeMenu.innerHTML = '';
    times.forEach((m) => {
      const h24 = Math.floor(m / 60);
      const label = new Date(2000, 0, 1, h24, m % 60)
        .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      if (m === current) btn.classList.add('selected');
      btn.addEventListener('click', () => {
        setTime(h24, m % 60);
        closeTimeMenu();
      });
      timeMenu.appendChild(btn);
    });
  }

  function openTimeMenu() {
    renderTimeMenu();
    timeMenu.hidden = false;
    timeBtn.classList.add('open');
    const sel = timeMenu.querySelector('.selected');
    if (sel) timeMenu.scrollTop = sel.offsetTop - timeMenu.clientHeight / 2 + sel.offsetHeight / 2;
  }

  function closeTimeMenu() {
    timeMenu.hidden = true;
    timeBtn.classList.remove('open');
  }

  timeBtn.addEventListener('click', () => (timeMenu.hidden ? openTimeMenu() : closeTimeMenu()));

  function openPop() {
    viewY = target.getFullYear();
    viewM = target.getMonth();
    syncTimeControls();
    renderCalendar();
    pop.hidden = false;
    dateBtn.setAttribute('aria-expanded', 'true');
  }

  function closePop() {
    pop.hidden = true;
    dateBtn.setAttribute('aria-expanded', 'false');
    closeTimeMenu();
  }

  dateBtn.addEventListener('click', () => (pop.hidden ? openPop() : closePop()));

  calPrev.addEventListener('click', () => {
    viewM--;
    if (viewM < 0) { viewM = 11; viewY--; }
    renderCalendar();
  });
  calNext.addEventListener('click', () => {
    viewM++;
    if (viewM > 11) { viewM = 0; viewY++; }
    renderCalendar();
  });

  timeToggle.addEventListener('click', () => {
    hasTime = !hasTime;
    if (hasTime) {
      // sensible default when switching a date-only countdown to a timed one
      if (target.getHours() === 0 && target.getMinutes() === 0) target.setHours(9, 0, 0, 0);
    } else {
      target = startOfDay(target);
    }
    syncTimeControls();
    save();
    renderTargetLine();
    tick();
  });

  document.addEventListener('pointerdown', (e) => {
    if (!timeMenu.hidden && !timeControls.contains(e.target)) closeTimeMenu();
    if (!pop.hidden && !picker.contains(e.target)) closePop();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!timeMenu.hidden) closeTimeMenu();
    else if (!pop.hidden) closePop();
  });

  schoolCheck.addEventListener('change', () => {
    save();
    tick();
  });

  renderTargetLine();
  tick();
  setInterval(tick, 1000);
})();
