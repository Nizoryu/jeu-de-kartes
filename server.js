'use strict';
// Serveur Kartes : fichiers statiques + parties multijoueurs en réseau local (HTTP + Server-Sent Events, zéro dépendance).
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const { Game, sanitizeGame, MAX_PLAYERS, buildDeck } = require('./engine');
const { TableauGame } = require('./tableau');

const PORT = +process.env.PORT || 3000;
const STATIC = { '/': 'index.html', '/index.html': 'index.html', '/style.css': 'style.css', '/app.js': 'app.js', '/samples.js': 'samples.js' };
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const rooms = new Map();
const rid = n => crypto.randomBytes(n).toString('hex');
const newCode = () => { let c; do c = String(1000 + crypto.randomInt(9000)); while (rooms.has(c)); return c; };

function lanUrls() {
  return Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => `http://${i.address}:${PORT}`);
}
function pushState(room) {
  room.players.forEach((pl, i) => {
    const data = room.game ? { phase: 'play', game: room.game.view(i) }
      : { phase: 'lobby', code: room.code, host: i === 0, name: room.def.name, notes: room.def.rules.notes, mode: room.def.rules.mode, players: room.players.map(p => p.name) };
    for (const res of pl.streams) res.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}
function readJson(req) {
  return new Promise((ok, ko) => {
    let b = ''; req.on('data', d => { b += d; if (b.length > 1e6) { ko(new Error('trop gros')); req.destroy(); } });
    req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch (e) { ko(e); } });
  });
}
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
const cleanName = s => String(s || '').trim().slice(0, 16) || 'Joueur';
function auth(b) { const room = rooms.get(String(b.room)); const idx = room ? room.players.findIndex(p => p.id === b.pid) : -1; return idx < 0 ? [null, -1] : [room, idx]; }

async function api(req, res, url) {
  if (url.pathname === '/api/info') return send(res, 200, { urls: lanUrls() });
  if (url.pathname === '/events') {
    const [room, i] = auth({ room: url.searchParams.get('room'), pid: url.searchParams.get('pid') });
    if (!room) return send(res, 404, { error: 'Partie introuvable.' });
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    room.players[i].streams.add(res);
    const ka = setInterval(() => res.write(': ka\n\n'), 20000);
    req.on('close', () => { clearInterval(ka); room.players[i].streams.delete(res); });
    pushState(room); return;
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'Méthode non autorisée.' });
  const b = await readJson(req);
  if (url.pathname === '/api/create') {
    const def = sanitizeGame(b.game || {});
    if (!def.cards.length) return send(res, 400, { error: 'Ce jeu ne contient aucune carte.' });
    const room = { code: newCode(), def, players: [], game: null };
    const pl = { id: rid(8), name: cleanName(b.name), streams: new Set() };
    room.players.push(pl); rooms.set(room.code, room);
    return send(res, 200, { room: room.code, pid: pl.id });
  }
  if (url.pathname === '/api/join') {
    const room = rooms.get(String(b.room || '').trim());
    if (!room) return send(res, 404, { error: 'Code de partie inconnu.' });
    if (room.game) return send(res, 400, { error: 'La partie a déjà commencé.' });
    if (room.players.length >= MAX_PLAYERS) return send(res, 400, { error: `Partie pleine (${MAX_PLAYERS} joueurs max).` });
    const pl = { id: rid(8), name: cleanName(b.name), streams: new Set() };
    let name = pl.name, k = 2; while (room.players.some(p => p.name === name)) name = `${pl.name} ${k++}`; pl.name = name;
    room.players.push(pl); pushState(room);
    return send(res, 200, { room: room.code, pid: pl.id });
  }
  const [room, i] = auth(b);
  if (!room) return send(res, 404, { error: 'Partie introuvable.' });
  if (url.pathname === '/api/start') {
    if (i !== 0) return send(res, 403, { error: "Seul l'hôte peut lancer la partie." });
    if (room.players.length < 2) return send(res, 400, { error: 'Il faut au moins 2 joueurs.' });
    const isT = room.def.rules.mode === 'tableau', need = (isT ? TableauGame : Game).minCards(room.def.rules, room.players.length), have = room.def.cards.reduce((a, c) => a + c.qty, 0);
    if (have < need) return send(res, 400, { error: `Il faut au moins ${need} cartes dans le paquet (${have} actuellement).` });
    const names = room.players.map(p => p.name);
    room.game = isT ? new TableauGame(room.def, names, buildDeck) : new Game(room.def, names);
    room.game.onChange = () => pushState(room); pushState(room); return send(res, 200, {});
  }
  if (!room.game) return send(res, 400, { error: "La partie n'a pas commencé." });
  let err;
  if (url.pathname === '/api/play') err = room.game.play(i, +b.card, b.target);
  else if (url.pathname === '/api/react') err = room.game.react ? room.game.react(i, b.card == null ? null : +b.card) : 'Action impossible.';
  else if (url.pathname === '/api/discard') err = room.game.discardCard ? room.game.discardCard(i, +b.card) : 'Action impossible.';
  else if (url.pathname === '/api/draw') err = room.game.drawCard(i);
  else if (url.pathname === '/api/again') {
    if (i !== 0 || !room.game.over) err = "Impossible."; else room.game = null;
  } else return send(res, 404, { error: 'Inconnu.' });
  if (err) return send(res, 400, { error: err });
  pushState(room); send(res, 200, {});
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/events' || url.pathname.startsWith('/api/')) {
    return api(req, res, url).catch(e => { if (!res.headersSent) send(res, 400, { error: 'Requête invalide.' }); });
  }
  const f = STATIC[url.pathname];
  if (!f) { res.writeHead(404); return res.end('Introuvable'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] });
  fs.createReadStream(path.join(__dirname, f)).pipe(res);
}).listen(PORT, '0.0.0.0', () => {
  console.log('Kartes est lancé. Ouvre l\'une de ces adresses depuis les appareils du réseau local :');
  [`http://localhost:${PORT}`, ...lanUrls()].forEach(u => console.log('  ' + u));
});
