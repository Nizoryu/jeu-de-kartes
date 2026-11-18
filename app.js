'use strict';
const $ = id => document.getElementById(id);
const KEY = 'kartes.games.v1';
const uid = () => Math.random().toString(36).slice(2, 9);
const EFFECTS = { '': '', replay: 'Rejoue', draw2: 'Adv. +2', double: '×2', wild: 'Joker' };
const KINDS = { build: '🏗️', attack: '⚔️', cure: '💊', action: '⚡' };
const KIND_NAMES = { build: 'Construction', attack: 'Attaque', cure: 'Soin', action: 'Action' };
const list = v => Array.isArray(v) ? v : String(v || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
function describe(c) {
  const p = [KIND_NAMES[c.kind] || ''];
  if (list(c.requires).length) p.push('requiert ' + list(c.requires).join(', '));
  if (list(c.forbids).length) p.push('interdit si ' + list(c.forbids).join(', '));
  if (list(c.gives).length) p.push('donne ' + list(c.gives).join(', '));
  if (list(c.immune).length) p.push('immunise contre ' + list(c.immune).join(', '));
  if (c.removes) p.push('détruit « ' + c.removes + ' » chez la cible');
  if (c.cures) p.push('soigne « ' + c.cures + ' »');
  if (+c.drawN) p.push('pioche ' + c.drawN);
  if (+c.targetDiscard) p.push('la cible défausse ' + c.targetDiscard);
  if (c.skipTarget) p.push('la cible passe son tour');
  if (c.extraTurn) p.push('rejoue');
  if (c.all) p.push('vise tous les adversaires');
  return `${c.name} (${c.value} pt${Math.abs(c.value) > 1 ? 's' : ''}) : ` + p.filter(Boolean).join(' · ');
}

/* ---------- Données ---------- */
const defaultRules = () => ({ mode: 'pli', hand: 5, target: 0, higher: '1', points: 'value', notes: '' });
const newGame = (name = 'Mon jeu') => ({ id: uid(), name, cards: [], rules: defaultRules() });

let games = load();
let current = games[0].id;
const cur = () => games.find(g => g.id === current);

function load() {
  try { const g = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(g) && g.length) return g; } catch (e) {}
  const g = newGame('Mon premier jeu');
  g.cards = [
    ['Épée', 3, '⚔️', '#444', 4, ''], ['Bouclier', 2, '🛡️', '#1b5fa8', 4, ''],
    ['Dragon', 9, '🔥', '#c0182b', 2, 'double'], ['Mage', 6, '✨', '#7a2fb5', 3, 'replay'],
    ['Piège', 1, '🕸️', '#2b7a3d', 3, 'draw2'], ['Joker', 0, '🃏', '#d17a00', 1, 'wild'],
  ].map(([name, value, suit, color, qty, effect]) => ({ id: uid(), name, value, suit, color, qty, effect }));
  return [g];
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(games)); } catch (e) {} };

/* ---------- Rendu des cartes ---------- */
function cardEl(c, tag = 'div') {
  const el = document.createElement(tag);
  el.className = 'card';
  el.style.setProperty('--c', c.color || '#111');
  const n = document.createElement('div'); n.className = 'n'; n.textContent = c.name;
  const v = document.createElement('div'); v.className = 'v'; v.textContent = c.value;
  const s = document.createElement('div'); s.className = 's'; s.textContent = c.suit || '';
  const fx = document.createElement('div'); fx.className = 'fx';
  fx.textContent = c.kind ? (KINDS[c.kind] || '') + ' ' + (list(c.gives)[0] || c.removes || c.cures || '') : (EFFECTS[c.effect] || '');
  if (c.kind) el.title = describe(c);
  el.append(n, v, s, fx);
  return el;
}
const backEl = () => { const d = document.createElement('div'); d.className = 'card back'; return d; };

/* ---------- Éditeur ---------- */
function renderGames() {
  const ul = $('gameList'); ul.textContent = '';
  games.forEach(g => {
    const li = document.createElement('li'), b = document.createElement('button');
    b.className = 'game' + (g.id === current ? ' active' : ''); b.textContent = g.name || '(sans nom)';
    b.onclick = () => { current = g.id; renderAll(); };
    li.append(b); ul.append(li);
  });
}
function renderCards() {
  const g = cur(), box = $('cardList'); box.textContent = '';
  g.cards.forEach(c => {
    const el = cardEl(c);
    const x = document.createElement('span'); x.className = 'x'; x.textContent = '✕'; x.title = 'Supprimer';
    x.onclick = () => { g.cards = g.cards.filter(k => k.id !== c.id); save(); renderCards(); };
    const q = document.createElement('div'); q.className = 'fx'; q.textContent = '×' + c.qty;
    el.append(x, q); box.append(el);
  });
  $('cardCount').textContent = g.cards.reduce((a, c) => a + c.qty, 0) + ' cartes dans le paquet';
}
function applyMode() { document.body.className = 'm-' + cur().rules.mode; }
function renderRules() {
  const r = cur().rules; applyMode();
  $('rMode').value = r.mode; $('rHand').value = r.hand; $('rTarget').value = r.target;
  $('rHigher').value = r.higher; $('rPoints').value = r.points; $('rNotes').value = r.notes;
}
function renderAll() { $('gameName').value = cur().name; renderGames(); renderCards(); renderRules(); }

$('gameName').oninput = e => { cur().name = e.target.value; save(); renderGames(); };
$('newGame').onclick = () => { const g = newGame('Nouveau jeu'); games.push(g); current = g.id; save(); renderAll(); };
$('dupGame').onclick = () => {
  const g = JSON.parse(JSON.stringify(cur())); g.id = uid(); g.name += ' (copie)';
  g.cards.forEach(c => c.id = uid()); games.push(g); current = g.id; save(); renderAll();
};
$('delGame').onclick = () => {
  if (!confirm('Supprimer « ' + cur().name + ' » ?')) return;
  games = games.filter(g => g.id !== current);
  if (!games.length) games.push(newGame('Mon jeu'));
  current = games[0].id; save(); renderAll();
};
$('cardForm').onsubmit = e => {
  e.preventDefault();
  cur().cards.push({
    id: uid(), name: $('cName').value.trim(), value: +$('cValue').value || 0, suit: $('cSuit').value.trim(),
    color: $('cColor').value, qty: Math.max(1, +$('cQty').value || 1), effect: $('cEffect').value,
    kind: $('cKind').value, gives: $('cGives').value, requires: $('cRequires').value, forbids: $('cForbids').value,
    immune: $('cImmune').value, removes: $('cRemoves').value, cures: $('cCures').value,
    drawN: +$('cDraw').value || 0, targetDiscard: +$('cTDisc').value || 0,
    extraTurn: $('cExtra').checked, skipTarget: $('cSkip').checked, all: $('cAll').checked,
  });
  ['cGives', 'cRequires', 'cForbids', 'cImmune', 'cRemoves', 'cCures'].forEach(i => $(i).value = '');
  $('cName').value = ''; save(); renderCards(); $('cName').focus();
};
$('clearCards').onclick = () => { if (confirm('Vider le paquet ?')) { cur().cards = []; save(); renderCards(); } };
$('presetStd').onclick = () => {
  const names = ['2','3','4','5','6','7','8','9','10','V','D','R','As'];
  [['♠', '#222'], ['♥', '#c0182b'], ['♦', '#c0182b'], ['♣', '#222']].forEach(([s, color]) =>
    names.forEach((name, i) => cur().cards.push({ id: uid(), name, value: i + 2, suit: s, color, qty: 1, effect: '' })));
  save(); renderCards();
};
const SAMPLE = [
  ['Mousse', 1, '⚓', '#1b5fa8', 6, { kind: 'build', gives: 'équipage' }],
  ['Capitaine', 4, '🏴‍☠️', '#222222', 2, { kind: 'build', gives: 'capitaine', requires: 'équipage', forbids: 'capitaine, scorbut' }],
  ['Navire', 3, '⛵', '#7a4b1b', 3, { kind: 'build', gives: 'navire', requires: 'équipage', forbids: 'scorbut' }],
  ['Trésor', 5, '💰', '#d17a00', 3, { kind: 'build', requires: 'navire', forbids: 'tempête' }],
  ['Amulette', 1, '🧿', '#2b7a3d', 2, { kind: 'build', immune: 'scorbut, tempête' }],
  ['Tempête', -2, '🌩️', '#555555', 3, { kind: 'attack', gives: 'tempête' }],
  ['Scorbut', -1, '🤢', '#2b7a3d', 3, { kind: 'attack', gives: 'scorbut' }],
  ['Abordage', 0, '⚔️', '#c0182b', 2, { kind: 'attack', removes: 'navire' }],
  ['Brume', 0, '🌫️', '#777777', 2, { kind: 'attack', skipTarget: true }],
  ['Pillage', 0, '🦜', '#c0182b', 2, { kind: 'attack', targetDiscard: 2, all: true }],
  ['Citron', 0, '🍋', '#b59a00', 3, { kind: 'cure', cures: 'scorbut' }],
  ['Beau temps', 0, '☀️', '#d17a00', 3, { kind: 'cure', cures: 'tempête' }],
  ['Longue-vue', 0, '🔭', '#1b5fa8', 3, { kind: 'action', drawN: 2 }],
  ['Vent favorable', 0, '💨', '#1b5fa8', 2, { kind: 'action', extraTurn: true }],
];
$('presetTab').onclick = () => {
  const g = cur();
  if (g.cards.length && !confirm('Remplacer le paquet actuel par l\'exemple ?')) return;
  g.cards = SAMPLE.map(([name, value, suit, color, qty, fx]) => ({ id: uid(), name, value, suit, color, qty, effect: '', ...fx }));
  g.rules.mode = 'tableau'; g.rules.hand = 5; g.rules.target = 0;
  if (!g.rules.notes) g.rules.notes = "Pose des cartes dans ta zone pour marquer des points. Attaque les autres avec Tempête, Scorbut… et protège-toi avec Citron, Beau temps ou l'Amulette. Les étiquettes (équipage, navire…) conditionnent ce que tu peux poser.";
  save(); renderAll();
};
const bindRule = (id, key, num) => $(id).oninput = e => { cur().rules[key] = num ? Math.max(0, +e.target.value || 0) : e.target.value; save(); applyMode(); };
bindRule('rMode', 'mode'); bindRule('rHand', 'hand', 1); bindRule('rTarget', 'target', 1);
bindRule('rHigher', 'higher'); bindRule('rPoints', 'points'); bindRule('rNotes', 'notes');

document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('active', x === b));
  ['cards', 'rules', 'play'].forEach(t => $('tab-' + t).hidden = t !== b.dataset.tab);
});

/* ---------- Multijoueur (réseau local) ---------- */
let S = null, es = null;   // S = { room, pid }
const api = async (path, body) => {
  const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Erreur réseau.');
  return j;
};
const showErr = t => { $('err').textContent = t || ''; };
const getName = id => $(id).value.trim() || localStorage.getItem('kartes.name') || 'Joueur';
const remember = n => { try { localStorage.setItem('kartes.name', n); } catch (e) {} };
try { $('hostName').value = $('joinName').value = localStorage.getItem('kartes.name') || ''; } catch (e) {}

fetch('/api/info').then(r => r.json()).then(i => {
  $('lanInfo').textContent = i.urls.length ? 'Adresse à donner aux autres joueurs : ' + i.urls.join(' ou ') : '';
}).catch(() => { $('lanInfo').textContent = 'Serveur injoignable : lance « npm start » puis ouvre la page via http://.'; });

function connect(s) {
  S = s; if (es) es.close();
  try { sessionStorage.setItem('kartes.session', JSON.stringify(s)); } catch (e) {}
  es = new EventSource(`/events?room=${s.room}&pid=${s.pid}`);
  es.onmessage = e => render(JSON.parse(e.data));
  es.onerror = () => { if (es.readyState === EventSource.CLOSED) { leave(); showErr('Connexion perdue ou partie terminée.'); } };
  $('conn').hidden = true; showErr('');
}
function leave() {
  if (es) es.close(); es = null; S = null;
  try { sessionStorage.removeItem('kartes.session'); } catch (e) {}
  $('conn').hidden = false; $('lobby').hidden = true; $('table').hidden = true;
}
$('hostBtn').onclick = async () => {
  const g = cur(); remember(getName('hostName'));
  try { connect(await api('/api/create', { name: getName('hostName'), game: { name: g.name, cards: g.cards, rules: g.rules } })); }
  catch (e) { showErr(e.message); }
};
$('joinBtn').onclick = async () => {
  remember(getName('joinName'));
  try { connect(await api('/api/join', { room: $('joinCode').value.trim(), name: getName('joinName') })); }
  catch (e) { showErr(e.message); }
};
$('startBtn').onclick = () => act('/api/start');
$('drawBtn').onclick = () => act('/api/draw');
$('againBtn').onclick = () => act('/api/again');
$('leaveBtn').onclick = leave;
async function act(path, extra) { try { await api(path, { ...S, ...extra }); showErr(''); } catch (e) { showErr(e.message); } }

function render(d) {
  $('lobby').hidden = d.phase !== 'lobby'; $('table').hidden = d.phase !== 'play';
  if (d.phase === 'lobby') {
    $('lobbyGame').textContent = d.name; $('roomCode').textContent = d.code; $('lobbyNotes').textContent = d.notes;
    const ul = $('lobbyPlayers'); ul.textContent = '';
    d.players.forEach((n, i) => { const li = document.createElement('li'); li.textContent = '👤 ' + n + (i === 0 ? ' (hôte)' : ''); ul.append(li); });
    $('startBtn').hidden = !d.host; $('lobbyWait').textContent = d.host ? '' : "En attente du lancement par l'hôte…";
    return;
  }
  const g = d.game;
  const sc = $('scores'); sc.textContent = '';
  g.names.forEach((n, i) => {
    const s = document.createElement('span');
    const waiting = g.mode === 'pli' ? g.chosen[i] : g.turn === i;
    s.textContent = `${i === g.you ? '⭐ ' : ''}${n} : ${g.mode !== 'defausse' ? g.score[i] + ' pts · ' : ''}${g.counts[i]} 🂠`;
    s.className = 'pl' + (g.mode !== 'pli' && g.turn === i && !g.over ? ' turn' : '') + (g.mode === 'pli' && waiting ? ' ready' : '');
    sc.append(s);
  });
  $('pileInfo').textContent = `Pioche : ${g.drawCount} carte(s)`;
  $('centerBox').hidden = g.mode === 'tableau'; $('boards').hidden = g.mode !== 'tableau'; $('log').hidden = g.mode !== 'tableau';
  if (g.mode !== 'tableau') { $('actionBar').hidden = true; sel = null; }
  const t = $('slotTable'); t.textContent = '';
  if (g.mode === 'defausse') { if (g.top) t.append(cardEl(g.top)); }
  else if (g.table) g.table.forEach(x => { const w = document.createElement('div'); w.className = 'played';
    const lab = document.createElement('div'); lab.className = 'hint'; lab.textContent = g.names[x.player]; w.append(lab, cardEl(x.card)); t.append(w); });
  $('msg').textContent = g.msg + (g.over ? '' : g.mode !== 'pli' && g.turn === g.you ? ' — À toi !' : '');
  if (g.mode === 'tableau') return renderTableau(g);
  const hand = $('hand'); hand.textContent = '';
  const myTurn = !g.over && (g.mode === 'pli' ? !g.chosen[g.you] : g.turn === g.you);
  const top = g.top;
  g.hand.forEach(c => {
    const el = cardEl(c, 'button');
    const ok = g.mode === 'pli' || !top || c.effect === 'wild' || top.effect === 'wild' || c.suit === top.suit || c.value === top.value;
    el.disabled = !myTurn || !ok;
    el.onclick = () => act('/api/play', { card: c.id });
    hand.append(el);
  });
  $('drawBtn').hidden = g.mode !== 'defausse'; $('drawBtn').disabled = !g.canDraw;
  $('againBtn').hidden = !(g.over && g.you === 0);
}

let sel = null;
function renderTableau(g) {
  if (g.final && !g.over) $('pileInfo').textContent += ' · dernier tour de table';
  const B = $('boards'); B.textContent = '';
  g.names.forEach((n, i) => {
    const box = document.createElement('div'); box.className = 'board' + (i === g.you ? ' me' : '') + (g.turn === i && !g.over ? ' turn' : '');
    const h = document.createElement('h3');
    const tags = [...new Set(g.boards[i].flatMap(c => c.gives))];
    h.textContent = `${n} — ${g.score[i]} pts` + (tags.length ? ' — ' + tags.join(', ') : '') + (g.skips[i] ? ' — passera son tour' : '');
    const row = document.createElement('div'); row.className = 'cards';
    g.boards[i].forEach(c => { const e = cardEl(c); e.classList.add('mini'); row.append(e); });
    box.append(h, row); B.append(box);
  });
  const L = $('log'); L.textContent = ''; g.log.forEach(t => { const li = document.createElement('li'); li.textContent = t; L.append(li); });
  const myTurn = !g.over && g.turn === g.you;
  if (!g.hand.some(c => c.id === sel)) sel = null;
  const hand = $('hand'); hand.textContent = '';
  g.hand.forEach(c => {
    const el = cardEl(c, 'button'), o = g.options[c.id];
    el.disabled = !myTurn; el.classList.toggle('sel', c.id === sel); el.classList.toggle('dim', myTurn && o && !o.ok);
    el.onclick = () => { sel = c.id; render({ phase: 'play', game: g }); };
    hand.append(el);
  });
  const bar = $('actionBar'); bar.textContent = ''; bar.hidden = !(myTurn && sel);
  if (!bar.hidden) {
    const c = g.hand.find(x => x.id === sel), o = g.options[sel] || {};
    const d = document.createElement('p'); d.className = 'desc'; d.textContent = describe(c) + (o.ok ? '' : '  ⛔ ' + (o.reason || '')); bar.append(d);
    const btn = (t, f, ghost) => { const b = document.createElement('button'); b.textContent = t; if (ghost) b.className = 'ghost'; b.onclick = f; bar.append(b); };
    if (o.ok && c.kind === 'attack') {
      if (c.all) btn('⚔️ Attaquer tous les adversaires', () => act('/api/play', { card: c.id }));
      else o.targets.forEach(t => btn('⚔️ Attaquer ' + g.names[t], () => act('/api/play', { card: c.id, target: t })));
    } else if (o.ok) btn('Jouer', () => act('/api/play', { card: c.id }));
    btn('Défausser', () => act('/api/discard', { card: c.id }), true);
  }
  $('drawBtn').hidden = true;
  $('againBtn').hidden = !(g.over && g.you === 0);
}

// Reprise automatique après un rafraîchissement de la page
try { const s = JSON.parse(sessionStorage.getItem('kartes.session')); if (s) connect(s); } catch (e) {}

renderAll();
