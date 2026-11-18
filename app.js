'use strict';
const $ = id => document.getElementById(id);
const KEY = 'kartes.games.v1';
const uid = () => Math.random().toString(36).slice(2, 9);
const EFFECTS = { '': '', replay: 'Rejoue', draw2: 'Adv. +2', double: '×2', wild: 'Joker' };
const KINDS = { build: '🏗️', attack: '⚔️', cure: '💊', action: '⚡', reaction: '🛡️' };
const KIND_NAMES = { build: 'Construction', attack: 'Attaque', cure: 'Soin', action: 'Action', reaction: 'Réaction' };
const list = v => Array.isArray(v) ? v : String(v || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
function describe(c) {
  const p = [KIND_NAMES[c.kind] || ''];
  if (+c.payN && c.payTag) p.push('coûte ' + c.payN + ' × ' + c.payTag);
  if (list(c.requires).length) p.push('requiert ' + list(c.requires).join(', '));
  if (list(c.requiresAny).length) p.push("requiert l'un de " + list(c.requiresAny).join(' / '));
  if (list(c.reacts).length) p.push('pare : ' + list(c.reacts).join(', '));
  if (c.takes) p.push('prend chez la cible « ' + c.takes + ' »');
  if (+c.steal) p.push('vole ' + c.steal + ' carte(s) en main');
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
  fx.textContent = c.kind ? (KINDS[c.kind] || '') + ' ' + (list(c.gives)[0] || c.removes || c.cures || c.takes || list(c.reacts)[0] || '') : (EFFECTS[c.effect] || '');
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
    requiresAny: $('cReqAny').value, reacts: $('cReacts').value, takes: $('cTakes').value,
    payTag: $('cPayTag').value, payN: +$('cPayN').value || 0, steal: +$('cSteal').value || 0,
  });
  ['cGives', 'cRequires', 'cForbids', 'cImmune', 'cRemoves', 'cCures', 'cReqAny', 'cReacts', 'cTakes', 'cPayTag'].forEach(i => $(i).value = '');
  $('cName').value = ''; save(); renderCards(); $('cName').focus();
};
$('clearCards').onclick = () => { if (confirm('Vider le paquet ?')) { cur().cards = []; save(); renderCards(); } };
$('presetStd').onclick = () => {
  const names = ['2','3','4','5','6','7','8','9','10','V','D','R','As'];
  [['♠', '#222'], ['♥', '#c0182b'], ['♦', '#c0182b'], ['♣', '#222']].forEach(([s, color]) =>
    names.forEach((name, i) => cur().cards.push({ id: uid(), name, value: i + 2, suit: s, color, qty: 1, effect: '' })));
  save(); renderCards();
};
function loadSample(key) {
  const g = cur(), sm = SAMPLES.toGame(SAMPLES.GAMES[key], uid);
  if (g.cards.length && !confirm("Remplacer le paquet et les règles de ce jeu par l'exemple ?")) return;
  g.cards = sm.cards; g.rules = { ...defaultRules(), ...sm.rules };
  if (!g.name || g.name.startsWith('Nouveau') || g.name.startsWith('Mon ')) g.name = sm.name;
  save(); renderAll();
}
$('presetPirates').onclick = () => loadSample('pirates');
$('presetBat').onclick = () => loadSample('batisseurs');
const bindRule = (id, key, num) => $(id).oninput = e => { cur().rules[key] = num ? Math.max(0, +e.target.value || 0) : e.target.value; save(); applyMode(); };
bindRule('rMode', 'mode'); bindRule('rHand', 'hand', 1); bindRule('rTarget', 'target', 1);
bindRule('rHigher', 'higher'); bindRule('rPoints', 'points'); bindRule('rNotes', 'notes');

document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('active', x === b));
  ['cards', 'rules'].forEach(t => $('tab-' + t).hidden = t !== b.dataset.tab);
});

/* ---------- Navigation Créer / Jouer ---------- */
function showView(v) {
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  $('view-create').hidden = v !== 'create'; $('view-play').hidden = v !== 'play';
  if (v === 'play') renderLibrary();
}
document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => showView(b.dataset.view));

/* ---------- Multijoueur (réseau local) ---------- */
let S = null, es = null;   // S = { room, pid }
const api = async (path, body) => {
  const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Erreur réseau.');
  return j;
};
const showErr = t => { $('err').textContent = t || ''; };
const getName = () => $('pName').value.trim() || 'Joueur';
const remember = n => { try { localStorage.setItem('kartes.name', n); } catch (e) {} };
try { $('pName').value = localStorage.getItem('kartes.name') || ''; } catch (e) {}

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
async function host(g) {
  remember(getName());
  try { connect(await api('/api/create', { name: getName(), game: { name: g.name, cards: g.cards, rules: g.rules } })); }
  catch (e) { showErr(e.message); }
}
$('joinBtn').onclick = async () => {
  remember(getName());
  try { connect(await api('/api/join', { room: $('joinCode').value.trim(), name: getName() })); }
  catch (e) { showErr(e.message); }
};
const MODES = { pli: 'Duel', defausse: 'Défausse', tableau: 'Tableau (cartes à effets)' };
function renderLibrary() {
  const box = $('library'); box.textContent = '';
  games.forEach(g => {
    const n = g.cards.reduce((s, c) => s + c.qty, 0);
    const d = document.createElement('div'); d.className = 'gamecard';
    const info = document.createElement('div');
    const t = document.createElement('h3'); t.textContent = g.name || '(sans nom)';
    const p = document.createElement('p'); p.textContent = `${MODES[g.rules.mode] || ''} · ${n} cartes · ${g.rules.hand} en main`;
    info.append(t, p);
    if (g.rules.notes) { const q = document.createElement('p'); q.textContent = g.rules.notes.slice(0, 120); info.append(q); }
    const b = document.createElement('button'); b.textContent = 'Héberger';
    if (!n) { b.disabled = true; b.title = "Ce jeu n'a pas encore de cartes : va dans « Créer un jeu »."; }
    b.onclick = () => host(g);
    d.append(info, b); box.append(d);
  });
}
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
  const myTurn = !g.over && !g.pending && g.turn === g.you;
  if (!g.hand.some(c => c.id === sel)) sel = null;
  const hand = $('hand'); hand.textContent = '';
  g.hand.forEach(c => {
    const el = cardEl(c, 'button'), o = g.options[c.id];
    el.disabled = !myTurn; el.classList.toggle('sel', c.id === sel); el.classList.toggle('dim', myTurn && o && !o.ok);
    el.onclick = () => { sel = c.id; render({ phase: 'play', game: g }); };
    hand.append(el);
  });
  const bar = $('actionBar'); bar.textContent = '';
  const pd = g.pending;
  if (pd) {
    bar.hidden = false;
    const d = document.createElement('p'); d.className = 'desc';
    if (pd.target === g.you) {
      d.textContent = `⚠️ ${g.names[pd.from]} t'attaque avec ${describe(pd.card)}. Réagis !`; bar.append(d);
      pd.options.forEach(id => { const k = g.hand.find(x => x.id === id);
        const b = document.createElement('button'); b.textContent = '🛡️ Parer avec ' + k.name; b.onclick = () => act('/api/react', { card: id }); bar.append(b); });
      const b = document.createElement('button'); b.className = 'ghost'; b.textContent = 'Subir'; b.onclick = () => act('/api/react', { card: null }); bar.append(b);
    } else { d.textContent = `En attente de la réaction de ${g.names[pd.target]}…`; bar.append(d); }
    $('drawBtn').hidden = true; $('againBtn').hidden = true; return;
  }
  bar.hidden = !(myTurn && sel);
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
try { const s = JSON.parse(sessionStorage.getItem('kartes.session')); if (s) { showView('play'); connect(s); } } catch (e) {}

renderAll();
