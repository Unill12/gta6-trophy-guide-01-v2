// Leonida Ledger v2 — GTA VI trophy guide and tracker.
// Loads app/data/trophies.json, renders five views (tracker, roadmap, missables,
// grinds, sources), and keeps earned ticks plus grind counters in localStorage.
// Everything runs offline: the only fetch is the app's own data file.
// Screenshot presets (?shot=cover|roadmap|guide|grinds) seed an in-memory demo
// state so each screenshot shows a real, reachable app state; they never write
// to localStorage.
const STORAGE_KEY = 'leonida-ledger-progress-v2';
const GRIND_KEY = 'leonida-ledger-grinds-v2';
const SPOILER_KEY = 'leonida-ledger-spoiler-v2';
const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
const KIND_LABELS = {
  story: 'Story',
  missable: 'Missable',
  collectibles: 'Collectibles',
  activities: 'Activities',
  platinum: 'Platinum',
};
const STAGE_PLAN = [
  {
    stage: 1,
    title: 'Stage 1 — Play the story, clean as you go',
    goal: 'Chapters 1–4 and the final mission, plus the story trophies that pop along the way. Do the missable moments in this stage when the game offers them — they do not come back.',
    time: 'Roughly 25–35 hours of story.',
    warning: 'Keep a manual save before story choices. “Actions Speak Louder” and “Bad Luck, I Guess” turn on choices the game does not let you redo without a save.',
  },
  {
    stage: 2,
    title: 'Stage 2 — Strangers & side missions',
    goal: 'Every stranger strand and every side-mission giver: Andy, Kenton, Billy, Randy and Tyrone to their final missions, plus 8 stranger strands across Leonida.',
    time: 'Roughly 10–15 hours.',
    warning: '“Strangers & Freaks” needs 8 completed strands — count them in the Grinds view before you move on.',
  },
  {
    stage: 3,
    title: 'Stage 3 — Activities & minigames',
    goal: 'Shooting Range golds, Top Fun drone races at every location, 20 different race wins, the fishing challenge against Cal, an arcade game, bowling, and the partner co-op trophies.',
    time: 'Roughly 15–20 hours, more if you chase gold medals.',
    warning: '“The Shootist” is the hardest skill gate in the list: gold in every Shooting Range challenge. Practice the range early; it also teaches the gunplay the heists need.',
  },
  {
    stage: 4,
    title: 'Stage 4 — Collectibles & grinds',
    goal: 'The long counters: 250 stunts, 50 challenges, 100 vehicles, WAiNK at 100 locations, 3 card sets, 5 bank vaults, and full exploration of Leonida.',
    time: 'Roughly 30–40 hours — the biggest single chunk of the platinum.',
    warning: 'Do the counters alongside the story, not after it: stunts, vehicles and WAiNK spots are all on the map while you travel anyway.',
  },
  {
    stage: 5,
    title: 'Stage 5 — Cleanup & the Platinum',
    goal: 'Money trophies, properties, and the 100% completion check. When the in-game stats say 100%, “A Long Road” pops, and the Platinum follows.',
    time: 'Roughly 5–10 hours of cleanup.',
    warning: 'Check the stats menu before you call it done: 100% counts missions, strands, activities, collectibles and challenges — the Tracker shows exactly what is still open.',
  },
];
const GRINDS = [
  { id: 15, target: 250, unit: 'stunts', note: 'Any stunt counts — jumps, near misses and air time all add up while you drive.' },
  { id: 32, target: 50, unit: 'challenges', note: 'Challenges are the small tasks the game tracks in the stats menu; 50 completed pops it.' },
  { id: 35, target: 100, unit: 'vehicles', note: 'Discovering a vehicle means getting in it once. New models count; the same model twice does not.' },
  { id: 31, target: 100, unit: 'locations', note: 'WAiNK it at 100 different spots. Fast travel does not help — you have to be there.' },
  { id: 30, target: 3, unit: 'card sets', note: 'Three complete collectible card sets. Cards are hidden across Leonida; use the checklist in the guide.' },
  { id: 19, target: 20, unit: 'races won', note: 'Twenty different races — replays of the same race do not count.' },
  { id: 40, target: 5, unit: 'bank vaults', note: 'Five bank vaults robbed and escaped. Plan the getaway before the alarm, not after.' },
  { id: 55, target: 10, unit: 'vehicles', note: 'Register vehicles to the Scooter Bros app — ten registrations pops it.' },
  { id: 52, target: 250, unit: '$1,000 laundered', note: 'Launder $250,000 of Marked Bills through your contacts. The counter here counts in thousands.' },
  { id: 53, target: 100, unit: '$1,000 spent', note: 'Spend $100,000 across all shops. Cars, clothes and guns all count.' },
];
const OFFICIAL_LIST_SOURCES = [
  { name: 'PSNProfiles — Grand Theft Auto VI trophy list', coverage: 'Official names, descriptions and grades' },
  { name: 'Exophase — Grand Theft Auto VI trophies', coverage: 'Official names, descriptions and grades' },
];
const SOURCE_COVERAGE = {
  'PowerPyx — GTA 6 Trophy Guide & Roadmap': 'Roadmap, missable warnings, per-trophy methods',
  'PowerPyx — GTA 6 100% Completion Checklist & Guide': '100% checklist numbers and requirements',
  'Push Square — GTA 6 Trophy Guide & Roadmap': 'Counts, locations, money and progress menus',
  'GTABase — GTA 6 Trophy Guide & Achievements List': 'Roadmap, missable warnings, permanent-choice warnings',
  'KeenGamer — GTA 6 Trophy Guide & Platinum Roadmap': 'Unconfirmed trophies and roadmap order',
  'GTA Zone — GTA 6 Trophy List': 'Bank vault count and roadmap',
  'GTA Scoop — GTA 6 Trophies & Achievements': 'Criminal Profile action count',
  'Output Lag — GTA 6 Trophy List': 'Missable meditation detail',
};
const SHOT_SEEDS = {
  cover: { earned: [2, 3, 4, 5, 8, 9, 10, 15, 16, 21, 33, 44], open: [1], view: 'tracker' },
  roadmap: { earned: [2, 3, 4, 5, 8, 9, 10, 44], open: [], view: 'roadmap' },
  guide: { earned: [2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 15, 16, 21, 33, 44, 52, 53], open: [40], view: 'tracker', search: 'Maximum Withdrawal' },
  grinds: { earned: [2, 3, 4, 5, 8, 9, 10, 16, 21, 22, 33, 44], open: [], view: 'grinds', grinds: { 15: 187, 32: 34, 35: 73, 31: 61, 30: 2, 19: 14, 40: 3, 55: 7, 52: 168, 53: 74 } },
};

const listEl = document.getElementById('trophyList');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('gradeFilter');
const spoilerEl = document.getElementById('spoilerToggle');
const emptyEl = document.getElementById('emptyState');
const listCountEl = document.getElementById('listCount');
const shot = new URLSearchParams(location.search).get('shot');
const demoMode = Boolean(shot && SHOT_SEEDS[shot]);
const seed = demoMode ? SHOT_SEEDS[shot] : null;

let trophies = [];
let earned = new Set(demoMode ? seed.earned : loadStoredProgress());
let grinds = new Map(Object.entries(demoMode && seed.grinds ? seed.grinds : loadStoredGrinds()).map(([k, v]) => [Number(k), v]));
let activeFilter = 'all';
let activeView = 'tracker';
let openGuides = new Set(demoMode ? seed.open : []);

function loadStoredProgress() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}
function loadStoredGrinds() {
  try { return JSON.parse(localStorage.getItem(GRIND_KEY) ?? '{}'); } catch { return {}; }
}
function saveProgress() {
  if (demoMode) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned]));
}
function saveGrinds() {
  if (demoMode) return;
  localStorage.setItem(GRIND_KEY, JSON.stringify(Object.fromEntries(grinds)));
}

function sortTrophies(items) {
  return [...items].sort((a, b) => {
    if (a.grade === 'platinum' && b.grade !== 'platinum') return -1;
    if (b.grade === 'platinum' && a.grade !== 'platinum') return 1;
    if (a.stage !== b.stage) return a.stage - b.stage;
    if (GRADE_ORDER[a.grade] !== GRADE_ORDER[b.grade]) return GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade];
    return a.id - b.id;
  });
}

async function loadTrophies() {
  const response = await fetch('data/trophies.json');
  const doc = await response.json();
  trophies = sortTrophies(doc.trophies);
  if (demoMode) {
    earned = new Set(seed.earned.map((id) => trophyById(id)?.name).filter(Boolean));
    openGuides = new Set((seed.open ?? []).map((id) => trophyById(id)?.name).filter(Boolean));
  }
  const hashView = (location.hash || '').replace('#', '');
  activeView = demoMode ? seed.view : (['tracker', 'roadmap', 'missables', 'grinds', 'sources'].includes(hashView) ? hashView : 'tracker');
  renderAuditCounts();
  renderSourceMatrix();
  renderRoadmap();
  renderMissables();
  renderGrinds();
  renderTrophyList();
  updateProgress();
  setView(activeView);
  if (demoMode && seed.search) {
    searchEl.value = seed.search;
    renderTrophyList();
  }
}

function trophyById(id) { return trophies.find((t) => t.id === id); }

function renderAuditCounts() {
  const steps = trophies.reduce((n, t) => n + (t.steps ? t.steps.length : 0), 0);
  const names = new Set();
  for (const t of trophies) for (const s of t.sources ?? []) names.add(s.name);
  document.getElementById('auditSteps').textContent = String(steps);
  document.getElementById('auditSources').textContent = String(names.size + OFFICIAL_LIST_SOURCES.length);
  document.getElementById('auditMissable').textContent = String(trophies.filter((t) => t.missable).length);
  document.getElementById('auditUnconfirmed').textContent = String(trophies.filter((t) => /still being confirmed/i.test(t.guide)).length);
  document.getElementById('missableCount').textContent = String(trophies.filter((t) => t.missable).length);
}

function renderSourceMatrix() {
  const rows = document.getElementById('sourceRows');
  const seen = new Map();
  for (const t of trophies) {
    for (const s of t.sources ?? []) {
      if (!seen.has(s.name)) seen.set(s.name, s.coverage ?? SOURCE_COVERAGE[s.name] ?? 'Per-trophy methods');
    }
  }
  const frag = document.createDocumentFragment();
  for (const [name, coverage] of seen) frag.append(sourceRow(name, coverage));
  for (const s of OFFICIAL_LIST_SOURCES) frag.append(sourceRow(s.name, s.coverage));
  rows.replaceChildren(frag);
}

function sourceRow(name, coverage) {
  const tr = document.createElement('tr');
  const nameTd = document.createElement('td');
  nameTd.textContent = name;
  const coverTd = document.createElement('td');
  coverTd.textContent = coverage;
  const linkTd = document.createElement('td');
  linkTd.textContent = 'Named source — cited per trophy, no copied text';
  tr.append(nameTd, coverTd, linkTd);
  return tr;
}

function renderRoadmap() {
  const wrap = document.getElementById('roadmapStages');
  const frag = document.createDocumentFragment();
  for (const plan of STAGE_PLAN) {
    const inStage = trophies.filter((t) => t.stage === plan.stage);
    const done = inStage.filter((t) => earned.has(t.name)).length;
    const card = document.createElement('article');
    card.className = 'stage-card';
    const h = document.createElement('h3');
    h.textContent = plan.title;
    const meta = document.createElement('p');
    meta.className = 'stage-meta';
    meta.textContent = `${done} of ${inStage.length} earned · ${plan.time}`;
    const goal = document.createElement('p');
    goal.textContent = plan.goal;
    const ul = document.createElement('ul');
    ul.className = 'stage-trophies';
    for (const t of inStage) {
      const li = document.createElement('li');
      li.textContent = `${t.name} (${t.grade})${t.missable ? ' — possibly missable' : ''}`;
      if (earned.has(t.name)) li.className = 'done';
      ul.append(li);
    }
    const warn = document.createElement('p');
    warn.className = 'stage-warning';
    warn.textContent = plan.warning;
    card.append(h, meta, goal, ul, warn);
    frag.append(card);
  }
  wrap.replaceChildren(frag);
}

function renderMissables() {
  const wrap = document.getElementById('missableList');
  const frag = document.createDocumentFragment();
  for (const t of trophies.filter((x) => x.missable)) frag.append(buildTrophyCard(t));
  wrap.replaceChildren(frag);
}

function renderGrinds() {
  const wrap = document.getElementById('grindList');
  const frag = document.createDocumentFragment();
  for (const g of GRINDS) {
    const t = trophyById(g.id);
    if (!t) continue;
    const count = grinds.get(g.id) ?? 0;
    const pct = Math.min(100, Math.round((count / g.target) * 100));
    const card = document.createElement('article');
    card.className = 'grind-card';
    const head = document.createElement('div');
    head.className = 'grind-head';
    const title = document.createElement('span');
    title.className = 'grind-title';
    title.textContent = `${t.name} — ${t.description}`;
    const countEl = document.createElement('span');
    countEl.className = 'grind-count';
    countEl.textContent = `${count} / ${g.target} ${g.unit}${earned.has(t.name) ? ' · earned' : ''}`;
    head.append(title, countEl);
    const bar = document.createElement('div');
    bar.className = 'grind-bar';
    const fill = document.createElement('div');
    fill.className = 'grind-fill' + (pct >= 100 ? ' full' : '');
    fill.style.width = `${pct}%`;
    bar.append(fill);
    const controls = document.createElement('div');
    controls.className = 'grind-controls';
    const minus = document.createElement('button');
    minus.type = 'button';
    minus.textContent = '−';
    minus.setAttribute('aria-label', `One fewer for ${t.name}`);
    minus.addEventListener('click', () => setGrind(g.id, count - 1));
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.textContent = '+';
    plus.setAttribute('aria-label', `One more for ${t.name}`);
    plus.addEventListener('click', () => setGrind(g.id, count + 1));
    const plus10 = document.createElement('button');
    plus10.type = 'button';
    plus10.textContent = '+10';
    plus10.setAttribute('aria-label', `Ten more for ${t.name}`);
    plus10.addEventListener('click', () => setGrind(g.id, count + 10));
    controls.append(minus, plus, plus10);
    const note = document.createElement('p');
    note.className = 'grind-note';
    note.textContent = g.note;
    card.append(head, bar, controls, note);
    frag.append(card);
  }
  wrap.replaceChildren(frag);
}

function setGrind(id, value) {
  const g = GRINDS.find((x) => x.id === id);
  const t = trophyById(id);
  const next = Math.max(0, Math.min(g.target, value));
  grinds.set(id, next);
  if (t) {
    if (next >= g.target) earned.add(t.name);
    else earned.delete(t.name);
  }
  saveGrinds();
  saveProgress();
  updateProgress();
  renderGrinds();
  renderRoadmap();
  renderTrophyList();
}

function spoilerHides(trophy) {
  return spoilerEl.checked && trophy.kinds.includes('story') && !earned.has(trophy.name);
}

function filterTrophies() {
  const query = searchEl.value.trim().toLowerCase();
  const grade = gradeEl.value;
  return trophies.filter((t) => {
    if (activeFilter === 'unearned' && earned.has(t.name)) return false;
    if (activeFilter !== 'all' && activeFilter !== 'unearned' && !t.kinds.includes(activeFilter)) return false;
    if (grade !== 'all' && t.grade !== grade) return false;
    if (query) {
      const hay = `${t.name} ${t.description} ${t.guide} ${(t.steps ?? []).join(' ')} ${(t.tip ?? '')}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
}

function renderTrophyList() {
  const shown = filterTrophies();
  listCountEl.textContent = `— showing ${shown.length} of ${trophies.length}`;
  if (shown.length === 0) {
    emptyEl.hidden = false;
    emptyEl.textContent = 'No trophies match this search or filter.';
    listEl.replaceChildren();
    return;
  }
  emptyEl.hidden = true;
  const frag = document.createDocumentFragment();
  for (const t of shown) frag.append(buildTrophyCard(t));
  listEl.replaceChildren(frag);
}

function buildTrophyCard(trophy) {
  const card = document.createElement('article');
  card.className = 'trophy-card';
  card.dataset.trophyId = String(trophy.id);
  if (earned.has(trophy.name)) card.classList.add('earned');
  if (trophy.missable) card.classList.add('missable-card');

  const head = document.createElement('div');
  head.className = 'card-head';

  const earnBox = document.createElement('div');
  earnBox.className = 'earn-box';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned.has(trophy.name);
  box.id = `earn-${trophy.id}`;
  box.setAttribute('aria-label', `Mark ${trophy.name} as earned`);
  box.addEventListener('change', () => toggleEarned(trophy, box.checked));
  const boxLabel = document.createElement('label');
  boxLabel.htmlFor = box.id;
  boxLabel.textContent = box.checked ? 'Earned' : 'Earn it';
  earnBox.append(box, boxLabel);

  const main = document.createElement('div');
  main.className = 'card-main';
  const titleRow = document.createElement('div');
  titleRow.className = 'card-title-row';
  const nameEl = document.createElement('span');
  nameEl.className = 'trophy-name' + (spoilerHides(trophy) ? ' hidden-name' : '');
  nameEl.textContent = spoilerHides(trophy) ? 'Hidden story trophy — earn it to reveal' : trophy.name;
  const badge = document.createElement('span');
  badge.className = `grade-badge grade-${trophy.grade}`;
  badge.textContent = trophy.grade;
  titleRow.append(nameEl, badge);
  if (trophy.missable) {
    const flag = document.createElement('span');
    flag.className = 'missable-flag';
    flag.textContent = 'Possibly missable';
    titleRow.append(flag);
  }

  const desc = document.createElement('p');
  desc.className = 'trophy-desc';
  desc.textContent = spoilerHides(trophy)
    ? 'Hidden until earned — this story trophy stays masked while spoilers are hidden.'
    : trophy.description;

  const tags = document.createElement('div');
  tags.className = 'tag-row';
  for (const kind of trophy.kinds) {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = KIND_LABELS[kind] ?? kind;
    tags.append(tag);
  }
  const stageTag = document.createElement('span');
  stageTag.className = 'tag';
  stageTag.textContent = trophy.stage === 5 ? 'Roadmap: Platinum' : `Roadmap: Stage ${trophy.stage}`;
  tags.append(stageTag);
  if (trophy.difficulty) {
    const dTag = document.createElement('span');
    dTag.className = 'tag';
    dTag.textContent = `Difficulty: ${trophy.difficulty}`;
    tags.append(dTag);
  }
  if (trophy.time) {
    const tTag = document.createElement('span');
    tTag.className = 'tag';
    tTag.textContent = `Time: ${trophy.time}`;
    tags.append(tTag);
  }

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'guide-toggle';
  const open = openGuides.has(trophy.name);
  toggle.textContent = open ? 'Hide guide' : 'Show guide';
  toggle.setAttribute('aria-expanded', String(open));
  const detail = buildGuideDetail(trophy);
  detail.hidden = !open;
  toggle.addEventListener('click', () => {
    if (openGuides.has(trophy.name)) openGuides.delete(trophy.name);
    else openGuides.add(trophy.name);
    renderTrophyList();
  });

  main.append(titleRow, desc, tags, toggle, detail);
  head.append(earnBox, main);
  card.append(head);
  return card;
}

function buildGuideDetail(trophy) {
  const detail = document.createElement('div');
  detail.className = 'guide-detail';
  if (spoilerHides(trophy)) {
    const p = document.createElement('p');
    p.className = 'guide-text';
    p.textContent = 'Guide hidden with the story spoiler. Earn this trophy to reveal its guide.';
    detail.append(p);
    return detail;
  }
  const text = document.createElement('p');
  text.className = 'guide-text';
  text.textContent = trophy.guide;
  detail.append(text);
  if (trophy.steps && trophy.steps.length) {
    const ol = document.createElement('ol');
    ol.className = 'guide-steps';
    for (const step of trophy.steps) {
      const li = document.createElement('li');
      li.textContent = step;
      ol.append(li);
    }
    detail.append(ol);
  }
  if (trophy.tip) {
    const tip = document.createElement('p');
    tip.className = 'tip';
    tip.textContent = `Tip: ${trophy.tip}`;
    detail.append(tip);
  }
  const unconfirmed = /still being confirmed/i.test(trophy.guide);
  if (unconfirmed) {
    const note = document.createElement('p');
    note.className = 'unconfirmed-note';
    note.textContent = 'Honest flag: the guides have not confirmed this trophy’s exact trigger yet. This guide says so rather than guessing — check the sources for updates.';
    detail.append(note);
  }
  const srcBlock = document.createElement('div');
  srcBlock.className = 'guide-sources';
  const label = document.createElement('strong');
  label.textContent = 'Sources:';
  srcBlock.append(label);
  const ul = document.createElement('ul');
  for (const s of trophy.sources ?? []) {
    const li = document.createElement('li');
    li.textContent = s.coverage ? `${s.name} — ${s.coverage}` : s.name;
    ul.append(li);
  }
  srcBlock.append(ul);
  detail.append(srcBlock);
  return detail;
}

function toggleEarned(trophy, isEarned) {
  if (isEarned) earned.add(trophy.name);
  else earned.delete(trophy.name);
  saveProgress();
  updateProgress();
  renderRoadmap();
  renderTrophyList();
}

function updateProgress() {
  const total = trophies.length || 55;
  const done = earned.size;
  const pct = Math.round((done / total) * 100);
  document.getElementById('progressText').textContent = `${done} of ${total} earned`;
  document.getElementById('progressPct').textContent = `${pct}%`;
  const ring = document.getElementById('progressRing');
  ring.style.strokeDasharray = '188.5';
  ring.style.strokeDashoffset = String(188.5 * (1 - done / total));
  const counts = ['platinum', 'gold', 'silver', 'bronze'].map((g) => {
    const inGrade = trophies.filter((t) => t.grade === g);
    const got = inGrade.filter((t) => earned.has(t.name)).length;
    return `${got}/${inGrade.length} ${g}`;
  });
  document.getElementById('gradeCounts').textContent = counts.join(' · ');
  const next = trophies.filter((t) => !earned.has(t.name) && t.grade !== 'platinum').slice(0, 3);
  document.getElementById('nextUp').textContent = next.length
    ? `Next up: ${next.map((t) => t.name).join(' · ')}`
    : 'All 55 earned — Leonida Legend.';
}

function exportProgress() {
  const blob = new Blob([JSON.stringify({ earned: [...earned], grinds: Object.fromEntries(grinds) }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importProgress(file) {
  if (!file) return;
  try {
    const doc = JSON.parse(await file.text());
    const names = Array.isArray(doc) ? doc : doc.earned;
    if (!Array.isArray(names)) throw new Error('not an array');
    const known = new Set(trophies.map((t) => t.name));
    earned = new Set(names.filter((n) => typeof n === 'string' && known.has(n)));
    if (doc && doc.grinds && typeof doc.grinds === 'object') {
      grinds = new Map(Object.entries(doc.grinds).map(([k, v]) => [Number(k), v]));
    }
    saveProgress();
    saveGrinds();
    updateProgress();
    renderRoadmap();
    renderGrinds();
    renderTrophyList();
  } catch {
    alert('That file is not a valid Leonida Ledger progress export.');
  }
}

function resetProgress() {
  if (!confirm('Clear all earned ticks and grind counters?')) return;
  earned = new Set();
  grinds = new Map();
  saveProgress();
  saveGrinds();
  updateProgress();
  renderRoadmap();
  renderGrinds();
  renderTrophyList();
}

function applySpoilerMask() {
  if (!demoMode) localStorage.setItem(SPOILER_KEY, spoilerEl.checked ? '1' : '0');
  renderTrophyList();
}

function setView(view) {
  activeView = view;
  for (const section of document.querySelectorAll('.view')) {
    section.hidden = section.id !== `view-${view}`;
  }
  for (const btn of document.querySelectorAll('.view-btn')) {
    btn.classList.toggle('active', btn.dataset.view === view);
  }
  if (location.hash !== `#${view}`) history.replaceState(null, '', `#${view}`);
}

for (const btn of document.querySelectorAll('.view-btn')) {
  btn.addEventListener('click', () => setView(btn.dataset.view));
}
for (const btn of document.querySelectorAll('.filter-btn')) {
  btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    for (const b of document.querySelectorAll('.filter-btn')) b.classList.toggle('active', b === btn);
    renderTrophyList();
  });
}
searchEl.addEventListener('input', renderTrophyList);
gradeEl.addEventListener('change', renderTrophyList);
spoilerEl.addEventListener('change', applySpoilerMask);
document.getElementById('exportBtn').addEventListener('click', exportProgress);
document.getElementById('importFile').addEventListener('change', (e) => importProgress(e.target.files[0]));
document.getElementById('resetBtn').addEventListener('click', resetProgress);

spoilerEl.checked = demoMode ? false : localStorage.getItem(SPOILER_KEY) === '1';
loadTrophies();
