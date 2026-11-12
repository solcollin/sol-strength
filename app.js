/* SOL STRENGTH — no external dependencies, accounts, analytics, or network APIs. */
'use strict';

const APP_NAME = 'SOL STRENGTH';
const DB_NAME = 'sol-strength-v1';
const STORE_NAME = 'records';
const STORAGE_KEY = 'sol-strength-state-v1';
const SCHEMA_VERSION = 1;

// Exercise definitions are deliberately separate from rendering and 5/3/1 math.
const LIFTS = [
  { id: 'bench-press', label: 'Bench Press', short: 'Bench' },
  { id: 'deadlift', label: 'Deadlift', short: 'Deadlift' },
  { id: 'overhead-press', label: 'Overhead Press', short: 'OHP' },
  { id: 'squat', label: 'Squat', short: 'Squat' }
];
const primaryIds = new Set(LIFTS.map(lift => lift.id));
const exercise = (id, name, sets, min, max, options = {}) => ({ id, name, sets, min, max, type: 'reps', ...options });
const PROGRAM = [
  { name: 'Chest & Arms', tag: 'UPPER', exercises: [
    exercise('bench-press', 'Bench Press', 3, 5, 8),
    exercise('incline-press', 'Incline Press', 3, 8, 12),
    exercise('chest-flies', 'Chest Flies', 3, 12, 15),
    exercise('lateral-raises', 'Lateral Raises', 4, 15, 20),
    exercise('tricep-pressdowns', 'Tricep Pressdowns', 3, 10, 15),
    exercise('bicep-curls', 'Bicep Curls', 3, 10, 15)
  ] },
  { name: 'Legs & Back', tag: 'POSTERIOR', exercises: [
    exercise('deadlift', 'Deadlift', 3, 5, 8),
    exercise('lat-pulldown', 'Lat Pulldown', 3, 8, 12),
    exercise('seated-leg-curl', 'Seated Leg Curl', 4, 10, 15),
    exercise('shrugs', 'Shrugs', 3, 10, 15),
    exercise('calf-raises', 'Calf Raises', 4, 12, 15),
    exercise('bicep-curls', 'Bicep Curls', 3, 10, 15)
  ] },
  { name: 'Recovery', tag: 'RECOVER', recovery: 'Rest or active recovery. Optional walking.', exercises: [] },
  { name: 'Shoulders, Chest & Arms', tag: 'UPPER', exercises: [
    exercise('overhead-press', 'Overhead Press', 3, 5, 8),
    exercise('machine-chest-press', 'Machine Chest Press', 2, 8, 12),
    exercise('cable-chest-flies', 'Cable Chest Flies', 2, 12, 15),
    exercise('lateral-raises', 'Lateral Raises', 4, 15, 20),
    exercise('reverse-pec-deck', 'Reverse Pec Deck', 4, 12, 15, { note: 'Rear delts' }),
    exercise('tricep-pressdowns', 'Tricep Pressdowns', 3, 10, 15),
    exercise('bicep-curls', 'Bicep Curls', 3, 10, 15)
  ] },
  { name: 'Quad-Focused Legs', tag: 'QUADS', exercises: [
    exercise('squat', 'Squat', 3, 5, 8),
    exercise('romanian-deadlift', 'Romanian Deadlift', 2, 8, 12),
    exercise('dead-hangs', 'Dead Hangs', 2, 60, 60, { type: 'time' }),
    exercise('leg-press', 'Leg Press', 3, 8, 12),
    exercise('leg-extension', 'Leg Extension', 3, 12, 15),
    exercise('calf-raises', 'Calf Raises', 4, 12, 15)
  ] },
  { name: 'Back & Arms', tag: 'PULL', exercises: [
    exercise('heavy-lat-pulldown', 'Heavy Lat Pulldown', 3, 8, 10),
    exercise('seated-cable-row', 'Seated Cable Row', 3, 10, 12),
    exercise('cable-pullover', 'Cable Pullover', 3, 12, 15),
    exercise('ez-bar-curls', 'EZ Bar Curls', 3, 10, 12),
    exercise('hammer-curls', 'Hammer Curls', 3, 10, 12)
  ] },
  { name: 'Recovery', tag: 'RECOVER', recovery: 'Rest or active recovery. Prepare for next training week.', exercises: [] }
];
const ALL_EXERCISES = new Map(PROGRAM.flatMap(day => day.exercises).map(item => [item.id, item]));
const DEFAULT_TEMPLATE = [
  [{ pct: 65, reps: 5, amrap: false }, { pct: 75, reps: 5, amrap: false }, { pct: 85, reps: 5, amrap: true }],
  [{ pct: 70, reps: 3, amrap: false }, { pct: 80, reps: 3, amrap: false }, { pct: 90, reps: 3, amrap: true }],
  [{ pct: 75, reps: 5, amrap: false }, { pct: 85, reps: 3, amrap: false }, { pct: 95, reps: 1, amrap: true }]
];

const $ = selector => document.querySelector(selector);
const clone = value => JSON.parse(JSON.stringify(value));
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const finite = (n, fallback = null) => n === '' || n == null || !Number.isFinite(Number(n)) ? fallback : Number(n);
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const fmt = n => n == null || !Number.isFinite(Number(n)) ? '—' : Number(Number(n).toFixed(2)).toLocaleString('en-US', { maximumFractionDigits: 2 });
const todayISO = () => toISO(new Date());
function toISO(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function fromISO(iso) { return new Date(`${iso}T12:00:00`); }
function addDays(iso, days) { const d = fromISO(iso); d.setDate(d.getDate() + days); return toISO(d); }
function daysBetween(start, end) { const utc = iso => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); }; return Math.round((utc(end) - utc(start)) / 86400000); }
function prettyDate(iso) { return fromISO(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }
function fullDate(iso) { return fromISO(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); }
function roundLoad(value, increment) { return Math.max(0, Math.round((value + Number.EPSILON) / increment) * increment); }
function estimated1RM(weight, reps) { return reps > 0 && reps <= 12 && weight > 0 ? weight * (1 + reps / 30) : null; }

function blankState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    settings: { startDate: todayISO(), unit: 'lb', increment: 5, restSeconds: 120, autoRest: false,
      template: clone(DEFAULT_TEMPLATE) },
    tmByCycle: {},
    sessions: {}
  };
}

function validateDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = fromISO(value);
  return !Number.isNaN(date.getTime()) && toISO(date) === value;
}
function normalizeState(raw) {
  if (!raw || typeof raw !== 'object' || raw.schemaVersion !== SCHEMA_VERSION ||
      !raw.settings || typeof raw.sessions !== 'object' || !raw.sessions ||
      typeof raw.tmByCycle !== 'object' || !raw.tmByCycle) throw new Error('Not a supported SOL STRENGTH data file.');
  const next = blankState();
  const s = raw.settings;
  next.settings.startDate = validateDate(s.startDate) ? s.startDate : todayISO();
  next.settings.unit = s.unit === 'kg' ? 'kg' : 'lb';
  next.settings.increment = clamp(finite(s.increment, next.settings.unit === 'kg' ? 2.5 : 5), 0.25, 100);
  next.settings.restSeconds = clamp(Math.round(finite(s.restSeconds, 120)), 15, 900);
  next.settings.autoRest = Boolean(s.autoRest);
  if (Array.isArray(s.template) && s.template.length === 3 && s.template.every(w => Array.isArray(w) && w.length === 3)) {
    next.settings.template = s.template.map(week => week.map(set => ({
      pct: clamp(Math.round(finite(set.pct, 65)), 1, 150),
      reps: clamp(Math.round(finite(set.reps, 5)), 1, 30),
      amrap: Boolean(set.amrap)
    })));
  }
  for (const [k, vals] of Object.entries(raw.tmByCycle).slice(0, 1000)) {
    const cycle = Number(k);
    if (!Number.isInteger(cycle) || cycle < 1 || cycle > 10000 || !vals || typeof vals !== 'object') continue;
    next.tmByCycle[cycle] = Object.fromEntries(LIFTS.map(l => [l.id, finite(vals[l.id]) > 0 ? clamp(Number(vals[l.id]), 0.01, 100000) : null]));
  }
  for (const [date, session] of Object.entries(raw.sessions).slice(0, 10000)) {
    if (!validateDate(date) || !session || typeof session !== 'object' || !Array.isArray(session.exercises)) continue;
    const exercises = session.exercises.slice(0, 50).filter(ex => ex && ALL_EXERCISES.has(ex.id) && Array.isArray(ex.sets)).map(ex => ({
      id: ex.id,
      name: ALL_EXERCISES.get(ex.id).name,
      type: ALL_EXERCISES.get(ex.id).type,
      sets: ex.sets.slice(0, 15).filter(Boolean).map(set => ({
        weight: finite(set.weight) >= 0 ? finite(set.weight) : null,
        reps: finite(set.reps) >= 0 ? finite(set.reps) : null,
        seconds: finite(set.seconds) >= 0 ? finite(set.seconds) : null,
        done: Boolean(set.done),
        target: typeof set.target === 'string' ? set.target.slice(0, 80) : '',
        pct: finite(set.pct),
        targetWeight: finite(set.targetWeight)
      }))
    }));
    next.sessions[date] = {
      date, dayNumber: clamp(Math.round(finite(session.dayNumber, 1)), 1, 7),
      phase: session.phase === '531' ? '531' : 'baseline',
      cycle: Math.max(0, Math.round(finite(session.cycle, 0))),
      week: Math.max(0, Math.round(finite(session.week, 0))),
      exercises,
      notes: typeof session.notes === 'string' ? session.notes.slice(0, 20000) : '',
      completed: Boolean(session.completed),
      completedAt: typeof session.completedAt === 'string' ? session.completedAt : null,
      updatedAt: typeof session.updatedAt === 'string' ? session.updatedAt : null
    };
  }
  next.updatedAt = typeof raw.updatedAt === 'string' && !Number.isNaN(Date.parse(raw.updatedAt)) ? raw.updatedAt : new Date().toISOString();
  return next;
}

let db = null;
let state = blankState();
let currentTab = 'today';
let selectedDate = todayISO();
let progressWeekOffset = 0;
let tmEditCycle = 1;
let saveQueue = Promise.resolve();
let saveTimeout = null;
let toastTimeout = null;
let storageFailure = false;
let timer = { running: false, deadline: 0, remaining: 0, duration: 0, finished: false };

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('IndexedDB unavailable')); return; }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Database unavailable'));
    request.onblocked = () => reject(new Error('Database blocked'));
  });
}
function idbGet() {
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get('state');
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error('Could not read data'));
  });
}
function idbPut(snapshot) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(snapshot, 'state');
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Could not store data'));
    transaction.onabort = () => reject(transaction.error || new Error('Save aborted'));
  });
}
async function loadState() {
  let fromDB = null, fromLocal = null;
  try { db = await openDatabase(); fromDB = await idbGet(); } catch (error) { console.warn('IndexedDB not available:', error); db = null; }
  try { fromLocal = localStorage.getItem(STORAGE_KEY); } catch (error) { console.warn('Local fallback not available:', error); }
  const candidates = [];
  for (const candidate of [fromDB, fromLocal]) {
    try { if (candidate) candidates.push(normalizeState(JSON.parse(candidate))); }
    catch (error) { console.warn('Skipped invalid stored state:', error); }
  }
  if (candidates.length) state = candidates.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
  else if (fromDB || fromLocal) showStorageWarning('Saved data could not be read. Restore a JSON backup if you have one. New logs will use a fresh database.');
  tmEditCycle = Math.max(1, scheduleFor(todayISO()).cycle || 1);
}
function showStorageWarning(message) { storageFailure = true; const node = $('#storage-warning'); node.textContent = message; node.hidden = false; }
function saveState() {
  clearTimeout(saveTimeout); saveTimeout = null;
  const snapshot = JSON.stringify(state);
  let localOk = false;
  try { localStorage.setItem(STORAGE_KEY, snapshot); localOk = true; }
  catch (error) { console.warn('Local storage backup failed:', error); }
  if (!db) {
    if (!localOk) showStorageWarning('Storage is not available. Your changes may be lost. Export a JSON backup now.');
    return Promise.resolve(localOk);
  }
  saveQueue = saveQueue.catch(() => false).then(() => idbPut(snapshot).then(() => true).catch(error => {
    console.error('IndexedDB save failed:', error);
    if (!localOk) showStorageWarning('Could not save to this device. Export a JSON backup and check available storage.');
    return false;
  }));
  return saveQueue;
}
function changed(debounce = false) {
  state.updatedAt = new Date().toISOString();
  if (debounce) { clearTimeout(saveTimeout); saveTimeout = setTimeout(saveState, 180); }
  else saveState();
}
function getWritableSession(date) {
  if (!state.sessions[date]) state.sessions[date] = createSession(date);
  state.sessions[date].updatedAt = new Date().toISOString();
  return state.sessions[date];
}
function scheduleFor(date) {
  const dayIndex = daysBetween(state.settings.startDate, date);
  if (dayIndex < 0) return { beforeStart: true, dayIndex, dayNumber: 1, phase: 'baseline', cycle: 0, week: 0 };
  const dayNumber = dayIndex % 7 + 1;
  if (dayIndex < 14) return { beforeStart: false, dayIndex, dayNumber, phase: 'baseline', cycle: 0, week: Math.floor(dayIndex / 7) + 1 };
  const n = dayIndex - 14;
  return { beforeStart: false, dayIndex, dayNumber, phase: '531', cycle: Math.floor(n / 21) + 1, week: Math.floor(n / 7) % 3 + 1 };
}
function getTrainingMaxes(cycle) {
  const keys = Object.keys(state.tmByCycle).map(Number).filter(k => k <= cycle).sort((a, b) => b - a);
  return keys.length ? { ...state.tmByCycle[keys[0]] } : Object.fromEntries(LIFTS.map(l => [l.id, null]));
}
function makeSets(ex, schedule, date) {
  if (schedule.phase === '531' && primaryIds.has(ex.id)) {
    const tm = getTrainingMaxes(schedule.cycle)[ex.id];
    return state.settings.template[schedule.week - 1].map(t => {
      const weight = tm > 0 ? roundLoad(tm * t.pct / 100, state.settings.increment) : null;
      return { weight, reps: null, seconds: null, done: false,
        target: `${t.reps}${t.amrap ? '+' : ''}`, pct: t.pct, targetWeight: weight };
    });
  }
  const prior = previousExercise(ex.id, date, true);
  const lastWeight = prior && prior.sets.find(set => set.done && set.weight != null && set.weight > 0)?.weight;
  return Array.from({ length: ex.sets }, () => ({ weight: lastWeight || null, reps: null, seconds: null,
    done: false, target: ex.type === 'time' ? `${ex.min}s` : `${ex.min}–${ex.max}`, pct: null, targetWeight: null }));
}
function createSession(date) {
  const schedule = scheduleFor(date);
  if (schedule.beforeStart) throw new Error('The program has not started yet.');
  return { date, dayNumber: schedule.dayNumber, phase: schedule.phase, week: schedule.week,
    cycle: schedule.cycle, exercises: PROGRAM[schedule.dayNumber - 1].exercises.map(ex => ({
      id: ex.id, name: ex.name, type: ex.type, sets: makeSets(ex, schedule, date)
    })), notes: '', completed: false, completedAt: null, updatedAt: new Date().toISOString() };
}
function getSession(date) { return state.sessions[date] || createSession(date); }
function previousExercise(id, beforeDate, strictlyBefore = true) {
  const sessions = Object.values(state.sessions).filter(s => strictlyBefore ? s.date < beforeDate : s.date <= beforeDate)
    .sort((a, b) => b.date.localeCompare(a.date));
  for (const session of sessions) {
    const found = session.exercises.find(ex => ex.id === id && ex.sets.some(set => set.done));
    if (found) return { ...found, date: session.date };
  }
  return null;
}
function allCompletedSets() {
  return Object.values(state.sessions).flatMap(session => session.exercises.flatMap(ex =>
    ex.sets.filter(set => set.done).map(set => ({ ...set, exId: ex.id, name: ex.name, date: session.date, phase: session.phase }))));
}
function suggestTrainingMaxes() {
  const baseline = allCompletedSets().filter(set => set.phase === 'baseline' && primaryIds.has(set.exId) &&
    daysBetween(state.settings.startDate, set.date) >= 0 && daysBetween(state.settings.startDate, set.date) < 14);
  return Object.fromEntries(LIFTS.map(lift => {
    const best = baseline.filter(s => s.exId === lift.id).reduce((max, s) => Math.max(max, estimated1RM(s.weight, s.reps) || 0), 0);
    return [lift.id, best ? roundLoad(best * 0.9, state.settings.increment) : null];
  }));
}
function setCount(session) { return session.exercises.reduce((n, ex) => n + ex.sets.filter(set => set.done).length, 0); }
function totalSets(session) { return session.exercises.reduce((n, ex) => n + ex.sets.length, 0); }
function numberInput(value, attrs = '') { return `<input class="number-input" type="number" inputmode="decimal" min="0" step="any" value="${value == null ? '' : esc(value)}" ${attrs}>`; }
function weekDescription(week) { return ['5s week', '3s week', '5/3/1 week'][week - 1] || ''; }
function phaseTitle(s) { return s.phase === 'baseline' ? `BASELINE · WEEK ${s.week}/2` : `CYCLE ${s.cycle} · WEEK ${s.week}/3`; }
function progressBar(value, max) { return `<div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}"><span style="width:${max ? clamp((value / max) * 100, 0, 100) : 0}%"></span></div>`; }
function getLastSummary(exId, date) {
  const ex = previousExercise(exId, date);
  if (!ex) return 'No previous logged sets';
  const done = ex.sets.filter(s => s.done);
  const sample = done.slice().sort((a, b) => (b.weight || 0) - (a.weight || 0))[0];
  return `${prettyDate(ex.date)} · ${ex.type === 'time' ? `${fmt(Math.max(...done.map(s => s.seconds || 0)))}s best` : `${sample.weight == null ? 'BW' : fmt(sample.weight) + ' ' + state.settings.unit} × ${fmt(sample.reps)}`} · ${done.length} set${done.length === 1 ? '' : 's'}`;
}

function renderToday() {
  const sched = scheduleFor(selectedDate);
  const isToday = selectedDate === todayISO();
  const datePicker = `<div class="date-navigator"><button class="icon-btn" data-action="date-shift" data-days="-1" aria-label="Previous day">‹</button>
    <input aria-label="Workout date" type="date" id="workout-date" value="${selectedDate}">
    <button class="icon-btn" data-action="date-shift" data-days="1" aria-label="Next day">›</button>
    ${isToday ? '' : '<button class="today-link" data-action="go-today">Today</button>'}</div>`;
  if (sched.beforeStart) return `<section class="page-heading"><p class="eyebrow">TRAINING LOG</p><h1>Workout</h1></section>${datePicker}
    <section class="card empty-state"><div class="empty-glyph">◷</div><h2>Before your start date</h2><p>Your program starts ${prettyDate(state.settings.startDate)}. Change your start date in Settings if needed.</p><button class="btn btn-secondary" data-tab="settings">Open settings</button></section>`;
  const programDay = PROGRAM[sched.dayNumber - 1];
  const session = getSession(selectedDate);
  const done = setCount(session), total = totalSets(session);
  const isBaseline = sched.phase === 'baseline';
  const missingTM = !isBaseline && programDay.exercises.some(ex => primaryIds.has(ex.id) && !getTrainingMaxes(sched.cycle)[ex.id]);
  const top = `<section class="page-heading"><div><p class="eyebrow">${isToday ? 'TODAY’S SESSION' : 'WORKOUT LOG'} · ${esc(prettyDate(selectedDate).toUpperCase())}</p><h1>${esc(programDay.name)}</h1><p class="subheading">DAY ${sched.dayNumber} / 7 · ${esc(programDay.tag)}</p></div><span class="day-orb">${String(sched.dayNumber).padStart(2, '0')}</span></section>
    ${datePicker}
    <div class="phase-banner ${isBaseline ? 'baseline' : ''}"><div><span class="mini-tag">${isBaseline ? 'PHASE 01' : 'PHASE 02'}</span><strong>${phaseTitle(sched)}</strong><small>${isBaseline ? `Day ${sched.dayIndex + 1} of 14 · Log your working sets and establish starting weights.` : `Classic Wendler 5/3/1 · ${weekDescription(sched.week)} · percentages of training max`}</small></div><span class="phase-symbol">${isBaseline ? '01' : '5/3/1'}</span></div>
    ${missingTM ? `<div class="info-notice"><span>ⓘ</span><p>One or more primary lifts need a training max before weights can be calculated.</p><button data-tab="settings">Set TM</button></div>` : ''}`;
  const completion = `<div class="session-meter"><div class="metric-line"><span>${session.completed ? 'SESSION COMPLETE' : 'SESSION PROGRESS'}</span><strong>${done} <span>/ ${total} SETS</span></strong></div>${progressBar(done, total || 1)}</div>`;
  const restBox = `<div class="rest-quick"><div><span class="rest-label">REST TIMER</span><strong>${formatSeconds(state.settings.restSeconds)}</strong><small>${state.settings.autoRest ? 'Auto-start enabled' : 'Manual start'}</small></div><button class="btn btn-secondary" data-action="start-timer">Start timer</button></div>`;
  const cards = programDay.exercises.map((ex, index) => renderExercise(ex, session.exercises.find(e => e.id === ex.id), index, sched)).join('');
  const recovery = `<section class="card recovery-card"><div class="recover-icon">✳</div><h2>Recovery is training.</h2><p>${esc(programDay.recovery)}</p><p class="muted">You can log recovery notes and mark this day complete below.</p></section>`;
  const button = `<button class="btn ${session.completed ? 'btn-secondary' : 'btn-primary'} btn-wide" data-action="finish-workout">${session.completed ? '✓ Completed · Reopen to edit' : (total ? '✓ Complete workout' : '✓ Mark recovery complete')}</button>`;
  return `${top}${total ? completion + restBox + cards : recovery}
    <section class="notes-card"><div class="section-kicker">SESSION NOTES</div><textarea id="workout-notes" data-notes placeholder="How did it feel? Energy, technique, wins, recovery..." maxlength="20000" rows="3">${esc(session.notes)}</textarea><small>Autosaved locally on this device.</small></section>
    ${button}<p class="footnote">${session.completed ? 'Reopening keeps every logged set and allows corrections.' : 'Weights, reps, seconds and notes save as you enter them.'}</p>`;
}
function renderExercise(def, logged, index, sched) {
  if (!logged) return '';
  const is531 = sched.phase === '531' && primaryIds.has(def.id);
  const repRange = is531 ? '3 WORK SETS · 5/3/1' : `${logged.sets.length} SETS · ${def.type === 'time' ? def.min + ' SEC' : def.min + '–' + def.max + ' REPS'}`;
  const tm = is531 ? getTrainingMaxes(sched.cycle)[def.id] : null;
  const rows = logged.sets.map((set, i) => {
    const weightLabel = is531 ? `${set.pct}% · ${set.target}` : set.target;
    return `<div class="set-row ${set.done ? 'is-done' : ''}">
      <div class="set-index"><strong>${i + 1}</strong><small>${esc(weightLabel)}</small></div>
      ${def.type === 'time' ? `
        <label class="set-field"><span>SECONDS</span>${numberInput(set.seconds, `data-set-field="seconds" data-ex="${esc(def.id)}" data-index="${i}" aria-label="${esc(def.name)} set ${i + 1} seconds" placeholder="${def.min}"`)}</label>
        <div class="set-hint">${def.min}s goal</div>` : `
        <label class="set-field"><span>${esc(state.settings.unit.toUpperCase())}</span>${numberInput(set.weight, `data-set-field="weight" data-ex="${esc(def.id)}" data-index="${i}" aria-label="${esc(def.name)} set ${i + 1} weight" placeholder="—"`)}</label>
        <label class="set-field"><span>REPS</span>${numberInput(set.reps, `data-set-field="reps" data-ex="${esc(def.id)}" data-index="${i}" aria-label="${esc(def.name)} set ${i + 1} reps" placeholder="${is531 ? esc(set.target.replace('+', '')) : def.min}"`)}</label>`}
      <button class="set-check ${set.done ? 'checked' : ''}" data-action="toggle-set" data-ex="${esc(def.id)}" data-index="${i}" aria-label="${set.done ? 'Unmark' : 'Mark'} ${esc(def.name)} set ${i + 1} complete" aria-pressed="${set.done}">${set.done ? '✓' : ''}</button>
    </div>`;
  }).join('');
  return `<section class="exercise-card" data-exercise="${esc(def.id)}"><div class="exercise-head"><span class="exercise-number">${String(index + 1).padStart(2, '0')}</span><div class="exercise-title"><h2>${esc(def.name)}</h2><p>${esc(repRange)}${def.note ? ' · ' + esc(def.note) : ''}</p></div><span class="exercise-count">${logged.sets.filter(s => s.done).length}/${logged.sets.length}</span></div>
    ${is531 ? `<div class="tm-strip"><span>TRAINING MAX</span><strong>${tm ? fmt(tm) + ' ' + esc(state.settings.unit) : 'NOT SET'}</strong>${!tm ? '<button data-tab="settings">Add TM</button>' : ''}</div>` : ''}
    <div class="sets">${rows}</div><div class="exercise-prev"><span>↶</span> PREVIOUS · ${esc(getLastSummary(def.id, selectedDate))}</div></section>`;
}
function renderProgram() {
  const active = scheduleFor(todayISO());
  const rows = PROGRAM.map((day, i) => `<article class="program-day ${active.dayNumber === i + 1 && !active.beforeStart ? 'current' : ''}"><div class="program-day-top"><div class="program-num">${String(i + 1).padStart(2, '0')}</div><div class="program-day-name"><h3>${esc(day.name)}</h3><p>${esc(day.tag)} · ${day.exercises.length ? day.exercises.reduce((n, e) => n + e.sets, 0) + ' working sets' : 'RECOVERY'}</p></div>${active.dayNumber === i + 1 && !active.beforeStart ? '<span class="current-tag">TODAY</span>' : ''}</div>
    <div class="program-exercises">${day.exercises.length ? day.exercises.map(ex => `<div class="program-exercise"><span>${esc(ex.name)}${ex.note ? ` <small>(${esc(ex.note)})</small>` : ''}</span><strong>${ex.sets} × ${ex.type === 'time' ? ex.min + 's' : ex.min + '–' + ex.max}</strong></div>`).join('') : `<p class="program-recovery">${esc(day.recovery)}</p>`}</div></article>`).join('');
  return `<section class="page-heading"><div><p class="eyebrow">YOUR TRAINING PLAN</p><h1>The split.</h1><p class="subheading">7 DAYS · 5 TRAINING · 2 RECOVERY</p></div></section>
    <div class="compact-banner"><strong>2 weeks baseline → 5/3/1</strong><p>All prescribed assistance work stays in the plan, including frequent bicep training. The four primary lifts switch to 5/3/1 sets after day 14.</p></div>
    <h2 class="section-heading">WEEKLY ROTATION</h2>${rows}
    <section class="card formula-card"><p class="eyebrow">PERCENTAGE PHASE</p><h2>Wendler 5/3/1</h2><p>Prescriptions use your <strong>training max</strong>, not your true 1RM. Final sets are AMRAP (as many good-form reps as possible; avoid grinding to failure).</p>
    ${state.settings.template.map((week, i) => `<div class="scheme-row"><strong>W${i + 1} <small>${esc(weekDescription(i + 1))}</small></strong><span>${week.map(t => `${t.pct}% × ${t.reps}${t.amrap ? '+' : ''}`).join(' · ')}</span></div>`).join('')}
    <p class="muted small">No BBB assistance is added. You can edit the three-week percentages in Settings without changing existing logged workouts.</p><button class="btn btn-secondary" data-tab="settings">Edit training maxes / template</button></section>`;
}
function renderHistory() {
  const sessions = Object.values(state.sessions).sort((a, b) => b.date.localeCompare(a.date));
  const items = sessions.map(s => {
    const prog = PROGRAM[(s.dayNumber || 1) - 1];
    return `<button class="history-item" data-action="open-session" data-date="${s.date}"><span class="history-date"><strong>${fromISO(s.date).getDate()}</strong><small>${fromISO(s.date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</small></span>
      <span class="history-desc"><strong>${esc(prog.name)}</strong><small>${s.phase === 'baseline' ? 'BASELINE' : `CYCLE ${s.cycle} · WEEK ${s.week}`} · ${setCount(s)} logged sets</small></span>
      <span class="history-status ${s.completed ? 'complete' : ''}">${s.completed ? 'DONE' : 'DRAFT'}</span><span class="chevron">›</span></button>`;
  }).join('');
  return `<section class="page-heading"><div><p class="eyebrow">EVERY SESSION, SAVED</p><h1>History.</h1><p class="subheading">${sessions.length} RECORDED DAYS</p></div></section>
    <div class="compact-banner"><strong>Edit any session</strong><p>Tap a date to adjust weights, reps, seconds, notes, or completion. Your corrections update personal records automatically.</p></div>
    ${sessions.length ? `<div class="history-list">${items}</div>` : `<section class="card empty-state"><div class="empty-glyph">▤</div><h2>Your log starts here.</h2><p>Complete a set or write a workout note and the session will appear in history.</p><button class="btn btn-primary" data-tab="today">Open workout</button></section>`}`;
}
function liftPerformance(liftId) {
  const sets = allCompletedSets().filter(s => s.exId === liftId && s.reps > 0 && s.weight > 0);
  const maxWeight = sets.reduce((max, set) => !max || set.weight > max.weight ? set : max, null);
  const e1rms = sets.filter(s => estimated1RM(s.weight, s.reps) != null);
  const maxE1rm = e1rms.reduce((max, set) => !max || estimated1RM(set.weight, set.reps) > estimated1RM(max.weight, max.reps) ? set : max, null);
  const recent = sets.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
  return { maxWeight, maxE1rm, recent, count: sets.length };
}
function weeklyCompletion() {
  const today = scheduleFor(todayISO());
  const absoluteWeek = today.beforeStart ? 0 : Math.floor(today.dayIndex / 7);
  const targetWeek = Math.max(0, absoluteWeek + progressWeekOffset);
  const startDate = addDays(state.settings.startDate, targetWeek * 7);
  let done = 0, trainingTotal = 0;
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(startDate, i);
    const isTraining = PROGRAM[i].exercises.length > 0;
    if (isTraining) trainingTotal++;
    const completed = Boolean(state.sessions[date]?.completed);
    if (completed && isTraining) done++;
    return { date, isTraining, completed, isToday: date === todayISO(), name: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][fromISO(date).getDay() === 0 ? 6 : fromISO(date).getDay() - 1] };
  });
  return { done, total: trainingTotal, startDate, week: targetWeek + 1, days };
}
function renderProgress() {
  const week = weeklyCompletion();
  const latest = scheduleFor(todayISO());
  const cycle = latest.phase === '531' ? latest.cycle : 1;
  const tms = getTrainingMaxes(cycle);
  const primary = LIFTS.map(lift => {
    const perf = liftPerformance(lift.id);
    return `<div class="lift-stat"><div class="stat-top"><strong>${esc(lift.label)}</strong><span>EST. 1RM</span></div><div class="big-stat">${perf.maxE1rm ? fmt(estimated1RM(perf.maxE1rm.weight, perf.maxE1rm.reps)) : '—'} <small>${esc(state.settings.unit)}</small></div><div class="stat-footer"><span>Top set: ${perf.maxWeight ? fmt(perf.maxWeight.weight) + ' × ' + fmt(perf.maxWeight.reps) : '—'}</span><span>TM: ${fmt(tms[lift.id])}</span></div></div>`;
  }).join('');
  const all = allCompletedSets().filter(s => s.weight > 0 && s.reps > 0);
  const bestByExercise = new Map();
  all.forEach(set => { const prior = bestByExercise.get(set.exId); if (!prior || set.weight > prior.weight) bestByExercise.set(set.exId, set); });
  const records = [...bestByExercise.values()].sort((a, b) => a.name.localeCompare(b.name));
  const recordRows = records.map(r => `<div class="record-row"><span>${esc(r.name)}<small>${prettyDate(r.date)}</small></span><strong>${fmt(r.weight)} ${esc(state.settings.unit)} <em>× ${fmt(r.reps)}</em></strong></div>`).join('');
  const liftHistory = LIFTS.map(lift => {
    const entries = all.filter(s => s.exId === lift.id).slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    return `<details class="lift-history"><summary>${esc(lift.label)} <span>${entries.length ? entries.length + ' recent sets' : 'No recorded sets'}</span></summary>
    ${entries.length ? entries.map(s => `<div class="record-row"><span>${esc(prettyDate(s.date))}</span><strong>${fmt(s.weight)} × ${fmt(s.reps)} <em>· e1RM ${fmt(estimated1RM(s.weight, s.reps))}</em></strong></div>`).join('') : '<p class="muted small">Complete some sets to create lift history.</p>'}</details>`;
  }).join('');
  return `<section class="page-heading"><div><p class="eyebrow">THE WORK ADDS UP</p><h1>Progress.</h1><p class="subheading">LOCAL RECORDS · REAL PERFORMANCE</p></div></section>
    <section class="card weekly-card"><div class="card-title-row"><div><p class="eyebrow">WEEKLY COMPLETION</p><h2>${week.done} <span>/ ${week.total} sessions</span></h2></div><div class="week-nav"><button class="icon-btn" data-action="week-shift" data-weeks="-1" aria-label="Previous program week">‹</button><button class="icon-btn" data-action="week-shift" data-weeks="1" aria-label="Next program week">›</button></div></div>
    <p class="muted small">Program week ${week.week} · starts ${prettyDate(week.startDate)}</p>${progressBar(week.done, week.total)}
    <div class="week-grid">${week.days.map(d => `<button data-action="open-session" data-date="${d.date}" class="week-day ${d.isToday ? 'today' : ''} ${d.completed ? 'logged' : ''} ${!d.isTraining ? 'rest' : ''}"><span>${esc(prettyDate(d.date).split(' ')[0])}</span><strong>${fromISO(d.date).getDate()}</strong><small>${d.completed ? '✓' : d.isTraining ? '•' : 'R'}</small></button>`).join('')}</div></section>
    <h2 class="section-heading">PRIMARY LIFT RECORDS</h2><div class="lift-grid">${primary}</div>
    <h2 class="section-heading">ALL EXERCISE PRS</h2>${records.length ? `<section class="card record-card">${recordRows}</section>` : `<section class="card empty-state small-empty"><p>No records yet. Finish a working set with weight and reps to begin tracking.</p></section>`}
    <h2 class="section-heading">PRIMARY LIFT HISTORY</h2><section class="card record-card">${liftHistory}</section>
    <p class="footnote">Estimated 1RM uses Epley (weight × [1 + reps / 30]) for sets of 1–12 reps. It is an estimate, not a maximal test.</p>`;
}
function renderSettings() {
  const s = state.settings;
  const current = scheduleFor(todayISO());
  const currentCycle = Math.max(1, current.cycle || 1);
  const effective = Math.max(1, tmEditCycle);
  const existing = getTrainingMaxes(effective);
  const suggested = suggestTrainingMaxes();
  const liftingRows = LIFTS.map(l => `<label class="tm-field"><span><strong>${esc(l.label)}</strong><small>${suggested[l.id] ? 'Baseline suggestion: ' + fmt(suggested[l.id]) + ' ' + s.unit : 'Log baseline sets to get a suggestion'}</small></span>
    <input data-tm="${l.id}" type="number" inputmode="decimal" min="0" step="any" placeholder="Not set" value="${existing[l.id] == null ? '' : esc(existing[l.id])}"></label>`).join('');
  const schemeRows = s.template.map((week, wi) => `<div class="template-week"><div class="template-heading"><strong>WEEK ${wi + 1}</strong><span>${esc(weekDescription(wi + 1))}</span></div><div class="template-grid"><span>SET</span><span>% OF TM</span><span>MIN REPS</span><span>AMRAP</span></div>
    ${week.map((set, si) => `<div class="template-grid template-entry"><strong>${si + 1}</strong><input aria-label="Week ${wi + 1} set ${si + 1} percent" type="number" inputmode="numeric" min="1" max="150" value="${set.pct}" data-template-week="${wi}" data-template-index="${si}" data-template-prop="pct"><input aria-label="Week ${wi + 1} set ${si + 1} repetitions" type="number" inputmode="numeric" min="1" max="30" value="${set.reps}" data-template-week="${wi}" data-template-index="${si}" data-template-prop="reps"><input aria-label="Week ${wi + 1} set ${si + 1} AMRAP" type="checkbox" ${set.amrap ? 'checked' : ''} data-template-week="${wi}" data-template-index="${si}" data-template-prop="amrap"></div>`).join('')}</div>`).join('');
  return `<section class="page-heading"><div><p class="eyebrow">MAKE IT YOURS</p><h1>Settings.</h1><p class="subheading">PRIVATE · OFFLINE FIRST · $0</p></div></section>
    <section class="card settings-card"><div class="settings-heading"><h2>Training setup</h2><p>Program starts on this date and repeats every seven days.</p></div>
    <label class="settings-row"><span><strong>Program start date</strong><small>Day 1 begins here; first 14 calendar days are baseline.</small></span><input type="date" id="start-date" value="${esc(s.startDate)}"></label>
    <label class="settings-row"><span><strong>Weight unit</strong><small>Changing units converts recorded weights and maxes.</small></span><select id="unit-select"><option value="lb" ${s.unit === 'lb' ? 'selected' : ''}>lb</option><option value="kg" ${s.unit === 'kg' ? 'selected' : ''}>kg</option></select></label>
    <label class="settings-row"><span><strong>Weight rounding increment</strong><small>Total bar weight, rounded to nearest increment.</small></span><input id="increment-input" type="number" inputmode="decimal" min="0.25" step="any" value="${esc(s.increment)}"></label></section>
    <section class="card settings-card"><div class="settings-heading"><h2>Rest timer</h2><p>Timer follows actual elapsed time, including when the app is backgrounded.</p></div>
    <label class="settings-row"><span><strong>Default rest</strong><small>Seconds between sets</small></span><select id="rest-select">${[45,60,90,120,150,180,240,300].map(n => `<option value="${n}" ${s.restSeconds === n ? 'selected' : ''}>${formatSeconds(n)}</option>`).join('')}</select></label>
    <label class="settings-row"><span><strong>Auto-start on set completion</strong><small>Rest starts as soon as you check off a set.</small></span><input class="toggle" type="checkbox" id="auto-rest" ${s.autoRest ? 'checked' : ''}></label></section>
    <section class="card settings-card" id="training-maxes"><div class="settings-heading"><h2>5/3/1 training maxes</h2><p>Use a conservative training max, typically 90% of a sensible estimated 1RM. Changes can be scheduled for future cycles.</p></div>
    <label class="settings-row"><span><strong>Effective cycle</strong><small>Cycle ${currentCycle} is ${current.phase === 'baseline' ? 'up next' : 'current'}.</small></span><select id="tm-cycle-select">${Array.from({ length: Math.max(currentCycle + 2, effective) }, (_, i) => i + 1).map(i => `<option value="${i}" ${i === effective ? 'selected' : ''}>Cycle ${i}${i === currentCycle ? ' (current)' : ''}</option>`).join('')}</select></label>
    <div class="tm-fields">${liftingRows}</div>
    <div class="button-stack"><button class="btn btn-primary" data-action="save-maxes">Save training maxes</button><button class="btn btn-secondary" data-action="use-suggestions" ${Object.values(suggested).some(Boolean) ? '' : 'disabled'}>Use baseline suggestions</button><button class="btn btn-secondary" data-action="next-cycle-maxes">Set up next cycle (${currentCycle + 1})</button></div>
    <p class="settings-hint">Each cycle inherits the latest saved maxes unless you override them. Already-created workout entries retain their original target weights.</p></section>
    <details class="card advanced-settings"><summary><strong>Edit 5/3/1 template</strong><span>3 weeks · 3 sets each</span></summary><p class="muted small">Changes apply to newly created sessions only. The final AMRAP set is marked with a +.</p>${schemeRows}<button class="btn btn-secondary" data-action="reset-template">Restore classic 5/3/1 template</button></details>
    <section class="card settings-card backup-card"><div class="settings-heading"><h2>Your data & backups</h2><p>Workout history remains on this device. Nothing is sent to a server. Save regular backups to Files or iCloud Drive.</p></div>
    <button class="btn btn-primary" data-action="export">↓ Export JSON backup</button>
    <label class="btn btn-secondary file-button" for="import-file">↑ Import JSON backup</label><input class="visually-hidden" id="import-file" type="file" accept=".json,application/json">
    <p class="settings-hint">Import replaces all current settings and workout history. Export first if you need to preserve existing data.</p>
    <button class="danger-link" data-action="erase-data">Erase all device data</button></section>
    <div class="privacy-note"><strong>PRIVATE BY DESIGN</strong><p>No account, trackers, cloud sync, advertising, or third-party JavaScript. On iOS, browser storage may be cleared by the OS or by you. JSON backups are essential.</p><small>SOL STRENGTH · VERSION 1.0</small></div>`;
}
function render() {
  const screens = { today: renderToday, program: renderProgram, history: renderHistory, progress: renderProgress, settings: renderSettings };
  $('#screen').innerHTML = screens[currentTab]();
  document.querySelectorAll('[data-tab]').forEach(button => {
    if (!button.classList.contains('tab')) return;
    const active = button.dataset.tab === currentTab;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  updateConnection();
  renderTimerBar();
}
function goTo(tab, date = null) {
  if (date) selectedDate = date;
  currentTab = tab;
  render();
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function toast(message) {
  const node = $('#toast'); node.textContent = message;
  node.classList.add('show');
  clearTimeout(toastTimeout); toastTimeout = setTimeout(() => node.classList.remove('show'), 3300);
}
function updateConnection() {
  const online = navigator.onLine;
  $('#connection').innerHTML = `<i class="${online ? '' : 'offline'}"></i><span>${online ? 'ON-DEVICE DATA' : 'OFFLINE MODE'}</span>`;
}
function formatSeconds(value) { const n = Math.max(0, Math.ceil(value)); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`; }
function startTimer(seconds = state.settings.restSeconds) {
  timer = { running: true, deadline: Date.now() + seconds * 1000, remaining: seconds, duration: seconds, finished: false };
  renderTimerBar();
}
function pauseTimer() { if (timer.running) { timer.remaining = Math.max(0, Math.ceil((timer.deadline - Date.now()) / 1000)); timer.running = false; } else if (timer.remaining > 0) { timer.running = true; timer.deadline = Date.now() + timer.remaining * 1000; } renderTimerBar(); }
function resetTimer() { timer.running = false; timer.remaining = 0; timer.finished = false; renderTimerBar(); }
function renderTimerBar() {
  if (timer.running) {
    timer.remaining = Math.max(0, Math.ceil((timer.deadline - Date.now()) / 1000));
    if (timer.remaining <= 0) { timer.running = false; timer.finished = true; toast('Rest finished. Ready for your next set.'); if ('vibrate' in navigator) navigator.vibrate(160); }
  }
  const bar = $('#timer-bar');
  if (!timer.running && timer.remaining === 0 && !timer.finished) { bar.hidden = true; return; }
  bar.hidden = false;
  bar.innerHTML = `<div class="timer-inner"><div class="timer-circle">◷</div><div class="timer-readout"><span>${timer.finished ? 'REST COMPLETE' : timer.running ? 'REST COUNTDOWN' : 'REST PAUSED'}</span><strong>${formatSeconds(timer.remaining)}</strong></div><button data-action="pause-timer" class="timer-action">${timer.finished ? 'Done' : timer.running ? 'Pause' : 'Resume'}</button><button data-action="reset-timer" class="timer-close" aria-label="Dismiss timer">×</button></div>`;
}
function convertUnit(newUnit) {
  if (newUnit === state.settings.unit) return;
  const oldUnit = state.settings.unit;
  const factor = newUnit === 'kg' ? 0.45359237 : 2.2046226218;
  const convert = value => value == null ? null : Number((value * factor).toFixed(2));
  for (const vals of Object.values(state.tmByCycle)) for (const lift of LIFTS) vals[lift.id] = convert(vals[lift.id]);
  for (const session of Object.values(state.sessions)) for (const ex of session.exercises) for (const set of ex.sets) {
    set.weight = convert(set.weight); set.targetWeight = convert(set.targetWeight);
  }
  state.settings.unit = newUnit;
  state.settings.increment = oldUnit === 'lb' ? 2.5 : 5;
  changed(); render(); toast(`Weights converted to ${newUnit}.`);
}
function exportData() {
  const data = { app: APP_NAME, version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data: state };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = `sol-strength-backup-${todayISO()}.json`;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  toast('Backup generated. Save the JSON file somewhere safe.');
}
async function importData(file) {
  if (!file) return;
  if (file.size > 20 * 1024 * 1024) { toast('File too large (maximum 20 MB).'); return; }
  try {
    const parsed = JSON.parse(await file.text());
    if (parsed.app !== APP_NAME || parsed.version !== SCHEMA_VERSION || !parsed.data) throw new Error('This is not a SOL STRENGTH version 1 backup.');
    const candidate = normalizeState(parsed.data);
    const count = Object.keys(candidate.sessions).length;
    if (!window.confirm(`Restore ${count} saved sessions from this backup? This replaces ALL current workouts, maxes, and settings. Export your current data first if needed.`)) return;
    state = candidate;
    state.updatedAt = new Date().toISOString();
    selectedDate = todayISO(); progressWeekOffset = 0; tmEditCycle = Math.max(1, scheduleFor(todayISO()).cycle || 1);
    await saveState();
    render(); toast(`Restored ${count} sessions from backup.`);
  } catch (error) { console.error('Import failed:', error); toast(`Import failed: ${error.message || 'Invalid JSON file'}`); }
}
function handleAction(button) {
  const action = button.dataset.action;
  if (action === 'date-shift') { selectedDate = addDays(selectedDate, Number(button.dataset.days)); render(); return; }
  if (action === 'go-today') { selectedDate = todayISO(); render(); return; }
  if (action === 'open-session') { goTo('today', button.dataset.date); return; }
  if (action === 'week-shift') { progressWeekOffset = Math.max(-1000, progressWeekOffset + Number(button.dataset.weeks)); render(); return; }
  if (action === 'start-timer') { startTimer(); return; }
  if (action === 'pause-timer') { if (timer.finished) resetTimer(); else pauseTimer(); return; }
  if (action === 'reset-timer') { resetTimer(); return; }
  if (action === 'toggle-set') {
    const exId = button.dataset.ex, i = Number(button.dataset.index);
    const session = getWritableSession(selectedDate);
    const set = session.exercises.find(ex => ex.id === exId)?.sets[i];
    const type = ALL_EXERCISES.get(exId)?.type;
    if (!set) return;
    if (!set.done && !(type === 'time' ? set.seconds > 0 : set.reps > 0)) {
      toast(type === 'time' ? 'Enter seconds to mark this set complete.' : 'Enter reps to mark this set complete.');
      document.querySelector(`[data-set-field="${type === 'time' ? 'seconds' : 'reps'}"][data-ex="${exId}"][data-index="${i}"]`)?.focus();
      return;
    }
    set.done = !set.done;
    if (set.done && state.settings.autoRest) startTimer();
    changed(); render(); return;
  }
  if (action === 'finish-workout') {
    const session = getWritableSession(selectedDate);
    if (!session.completed && totalSets(session) && !setCount(session)) { toast('Log at least one working set before completing a training day.'); return; }
    session.completed = !session.completed;
    session.completedAt = session.completed ? new Date().toISOString() : null;
    changed(); render(); toast(session.completed ? 'Workout completed. Strong work.' : 'Workout reopened for editing.'); return;
  }
  if (action === 'save-maxes' || action === 'use-suggestions') {
    const cycle = Math.max(1, tmEditCycle);
    const values = getTrainingMaxes(cycle);
    const suggested = suggestTrainingMaxes();
    for (const lift of LIFTS) {
      if (action === 'use-suggestions') {
        if (suggested[lift.id] > 0) values[lift.id] = suggested[lift.id];
      } else {
        const elem = document.querySelector(`[data-tm="${lift.id}"]`);
        const n = finite(elem?.value);
        if (n != null && (n <= 0 || n > 100000)) { toast('Training maxes must be positive numbers.'); elem?.focus(); return; }
        values[lift.id] = n;
      }
    }
    state.tmByCycle[cycle] = values;
    changed(); render(); toast(`Training maxes saved for cycle ${cycle}.`); return;
  }
  if (action === 'next-cycle-maxes') { tmEditCycle = Math.max(1, scheduleFor(todayISO()).cycle || 1) + 1; render(); $('#training-maxes')?.scrollIntoView({ behavior: 'instant', block: 'start' }); return; }
  if (action === 'reset-template') {
    if (!window.confirm('Restore classic 5/3/1 percentages and reps for future workouts?')) return;
    state.settings.template = clone(DEFAULT_TEMPLATE); changed(); render(); toast('Classic 5/3/1 template restored.'); return;
  }
  if (action === 'export') { exportData(); return; }
  if (action === 'erase-data') {
    if (!window.confirm('Permanently erase ALL SOL STRENGTH history on this device? Export a JSON backup first if you want to keep it.')) return;
    if (!window.confirm('Final confirmation: erase every session, training max, and setting?')) return;
    state = blankState(); selectedDate = todayISO(); tmEditCycle = 1; progressWeekOffset = 0;
    changed(); render(); toast('Device data erased.'); return;
  }
}
function handleFieldChange(event) {
  const el = event.target;
  if (el.matches('[data-set-field]')) {
    const session = getWritableSession(selectedDate);
    const set = session.exercises.find(ex => ex.id === el.dataset.ex)?.sets[Number(el.dataset.index)];
    if (!set) return;
    const value = finite(el.value);
    if (value != null && (value < 0 || value > 100000)) { el.value = ''; toast('Enter a valid positive number.'); return; }
    set[el.dataset.setField] = value;
    changed(true); return;
  }
  if (el.matches('[data-notes]')) { getWritableSession(selectedDate).notes = el.value; changed(true); }
}
function handleSettingsChange(event) {
  const el = event.target;
  if (el.id === 'workout-date') { if (validateDate(el.value)) { selectedDate = el.value; render(); } return; }
  if (el.id === 'start-date') {
    if (!validateDate(el.value)) { toast('Choose a valid start date.'); render(); return; }
    if (el.value !== state.settings.startDate && Object.keys(state.sessions).length &&
      !window.confirm('Changing the program start date changes which phase/day is scheduled. Existing logged sessions will keep their original exercise sets. Continue?')) { render(); return; }
    state.settings.startDate = el.value; selectedDate = todayISO(); tmEditCycle = Math.max(1, scheduleFor(todayISO()).cycle || 1);
    changed(); render(); toast('Program start date updated.'); return;
  }
  if (el.id === 'unit-select') { convertUnit(el.value); return; }
  if (el.id === 'increment-input') { const n = finite(el.value); if (n == null || n < 0.25 || n > 100) { toast('Use an increment between 0.25 and 100.'); render(); return; } state.settings.increment = n; changed(); toast('Plate rounding updated for new sessions.'); return; }
  if (el.id === 'rest-select') { state.settings.restSeconds = Number(el.value); changed(); render(); return; }
  if (el.id === 'auto-rest') { state.settings.autoRest = el.checked; changed(); render(); return; }
  if (el.id === 'tm-cycle-select') { tmEditCycle = Number(el.value); render(); return; }
  if (el.matches('[data-template-prop]')) {
    const set = state.settings.template[Number(el.dataset.templateWeek)]?.[Number(el.dataset.templateIndex)]; if (!set) return;
    const field = el.dataset.templateProp;
    if (field === 'amrap') set.amrap = el.checked;
    else { const n = finite(el.value); if (!n || n < 1 || n > (field === 'pct' ? 150 : 30)) { toast('Template value out of range.'); render(); return; } set[field] = Math.round(n); }
    changed(); return;
  }
  if (el.id === 'import-file') { importData(el.files?.[0]); el.value = ''; }
}
function requestPersistentStorage() {
  // Best-effort; iOS may choose not to grant persistence. Always keep JSON backups.
  if (!navigator.storage || typeof navigator.storage.persist !== 'function') return;
  navigator.storage.persisted().then(already => {
    if (!already) return navigator.storage.persist();
  }).catch(error => console.info('Persistent storage was not granted:', error));
}
function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(err => console.warn('Offline service worker could not register:', err));
}
async function init() {
  await loadState();
  document.addEventListener('click', event => {
    const button = event.target.closest('button[data-tab]');
    if (button) { goTo(button.dataset.tab); return; }
    const actionButton = event.target.closest('[data-action]');
    if (actionButton) handleAction(actionButton);
  });
  document.addEventListener('input', handleFieldChange);
  document.addEventListener('change', event => {
    handleSettingsChange(event);
    // Flush any debounced set/notes edits on blur/change, not just a timer.
    if (event.target.matches('[data-set-field], [data-notes]')) saveState();
  });
  window.addEventListener('online', updateConnection);
  window.addEventListener('offline', updateConnection);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && saveTimeout) saveState(); renderTimerBar(); });
  window.addEventListener('pagehide', () => { if (saveTimeout) saveState(); });
  setInterval(renderTimerBar, 500);
  render();
  requestPersistentStorage();
  registerServiceWorker();
}

// Exposed only for automated tests; no user data leaves the browser.
window.SOL_STRENGTH_TEST = Object.freeze({
  scheduleFor, estimated1RM, roundLoad, getTrainingMaxes, suggestTrainingMaxes,
  getState: () => clone(state), getSession: date => clone(getSession(date)),
  waitForSaves: async () => { if (saveTimeout) await saveState(); await saveQueue; }
});
init().catch(error => {
  console.error(error);
  $('#screen').innerHTML = '<section class="card empty-state"><h2>Unable to start SOL STRENGTH.</h2><p>Try reloading the app. If the issue continues, check browser storage availability and restore a saved JSON backup.</p></section>';
});
