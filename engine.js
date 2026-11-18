'use strict';
// Moteur de jeu côté serveur : 2 à 6 joueurs, règles définies par le créateur du jeu.
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const MAX_PLAYERS = 6;

function buildDeck(cards) {
  let n = 0;
  return shuffle(cards.flatMap(c => Array.from({ length: c.qty }, () => ({
    ...c, id: ++n, qty: undefined,
  }))));
}

function sanitizeGame(g) {
  const num = (v, min, max, d) => Math.min(max, Math.max(min, Number.isFinite(+v) ? Math.trunc(+v) : d));
  const str = (v, n) => String(v ?? '').slice(0, n);
  const tags = v => [...new Set((Array.isArray(v) ? v : String(v ?? '').split(',')).map(t => str(t, 20).trim().toLowerCase()).filter(Boolean))].slice(0, 8);
  const cards = (Array.isArray(g.cards) ? g.cards : []).slice(0, 200).map(c => ({
    name: str(c.name, 20), value: num(c.value, -99, 99, 0), suit: str(c.suit, 3),
    color: /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : '#111111',
    qty: num(c.qty, 1, 20, 1), effect: ['replay', 'draw2', 'double', 'wild'].includes(c.effect) ? c.effect : '',
    kind: ['build', 'attack', 'cure', 'action'].includes(c.kind) ? c.kind : 'build',
    gives: tags(c.gives), requires: tags(c.requires), forbids: tags(c.forbids), immune: tags(c.immune),
    removes: tags(c.removes)[0] || '', cures: tags(c.cures)[0] || '',
    drawN: num(c.drawN, 0, 5, 0), targetDiscard: num(c.targetDiscard, 0, 5, 0),
    extraTurn: !!c.extraTurn, skipTarget: !!c.skipTarget, all: !!c.all,
  }));
  const r = g.rules || {};
  return {
    name: str(g.name, 40) || 'Jeu', cards, rules: {
      mode: ['defausse', 'tableau'].includes(r.mode) ? r.mode : 'pli', hand: num(r.hand, 1, 20, 5), target: num(r.target, 0, 999, 0),
      higher: r.higher === '0' ? '0' : '1', points: r.points === 'trick' ? 'trick' : 'value', notes: str(r.notes, 1000),
    },
  };
}

class Game {
  constructor(def, players) {
    this.def = def; this.r = def.rules; this.n = players.length;
    this.draw = buildDeck(def.cards); this.discard = [];
    this.hands = players.map(() => []); this.score = players.map(() => 0);
    this.turn = 0; this.over = false; this.winners = []; this.chosen = players.map(() => null);
    this.table = null; this.msg = ''; this.names = players;
    for (let i = 0; i < this.r.hand; i++) for (let p = 0; p < this.n; p++) this.hands[p].push(this.draw.pop());
    if (this.r.mode === 'defausse') this.discard.push(this.draw.pop());
    this.msg = this.r.mode === 'pli' ? 'Chacun choisit une carte.' : `${this.names[0]} commence.`;
  }
  static minCards(r, n) { return n * r.hand + (r.mode === 'defausse' ? 1 : 0); }
  top() { return this.discard[this.discard.length - 1]; }
  playable(c) { const t = this.top(); return !t || c.effect === 'wild' || t.effect === 'wild' || c.suit === t.suit || c.value === t.value; }
  pull(p) {
    if (!this.draw.length && this.discard.length > 1) { const t = this.discard.pop(); this.draw = shuffle(this.discard); this.discard = [t]; }
    if (this.draw.length) { this.hands[p].push(this.draw.pop()); return true; }
    return false;
  }
  play(p, cardId) {
    if (this.over) return 'Partie terminée.';
    const c = this.hands[p].find(k => k.id === cardId);
    if (!c) return 'Carte inconnue.';
    return this.r.mode === 'pli' ? this.playDuel(p, c) : this.playDiscard(p, c);
  }
  playDuel(p, c) {
    if (this.chosen[p]) return 'Tu as déjà choisi.';
    this.chosen[p] = c; this.table = null;
    const waiting = this.names.filter((_, i) => !this.chosen[i]);
    if (waiting.length) { this.msg = `En attente de : ${waiting.join(', ')}`; return null; }
    const played = this.chosen.map(k => k), hi = this.r.higher === '1';
    const best = played.reduce((m, k) => hi ? Math.max(m, k.value) : Math.min(m, k.value), hi ? -Infinity : Infinity);
    const winners = played.map((k, i) => k.value === best ? i : -1).filter(i => i >= 0);
    this.table = played.map((k, i) => ({ player: i, card: k }));
    if (winners.length === 1) {
      let pts = this.r.points === 'value' ? played.reduce((a, k) => a + Math.abs(k.value), 0) : 1;
      if (played.some(k => k.effect === 'double')) pts *= 2;
      this.score[winners[0]] += pts;
      this.msg = `${this.names[winners[0]]} gagne le pli (+${pts}).`;
    } else this.msg = 'Égalité, personne ne marque.';
    played.forEach((k, i) => { this.hands[i] = this.hands[i].filter(x => x !== k); });
    this.chosen = this.chosen.map(() => null);
    if (this.draw.length >= this.n) for (let i = 0; i < this.n; i++) this.pull(i);
    const t = this.r.target;
    if ((t && Math.max(...this.score) >= t) || this.hands.some(h => !h.length)) this.finishDuel();
    return null;
  }
  finishDuel() {
    this.over = true; const m = Math.max(...this.score);
    this.winners = this.score.map((s, i) => s === m ? i : -1).filter(i => i >= 0);
    this.msg += ' Partie terminée : ' + (this.winners.length > 1 ? 'égalité entre ' : 'victoire de ') + this.winners.map(i => this.names[i]).join(', ') + ' !';
  }
  playDiscard(p, c) {
    if (this.turn !== p) return "Ce n'est pas ton tour.";
    if (!this.playable(c)) return 'Cette carte ne peut pas être posée.';
    this.hands[p] = this.hands[p].filter(x => x !== c); this.discard.push(c);
    let msg = `${this.names[p]} pose ${c.name} ${c.suit}.`;
    if (!this.hands[p].length) { this.over = true; this.winners = [p]; this.msg = msg + ` 🎉 ${this.names[p]} gagne la partie !`; return null; }
    const next = (p + 1) % this.n;
    if (c.effect === 'draw2') { this.pull(next); this.pull(next); msg += ` ${this.names[next]} pioche 2 cartes.`; }
    this.turn = c.effect === 'replay' ? p : next;
    if (c.effect === 'replay') msg += ' Il rejoue.';
    this.msg = msg; return null;
  }
  drawCard(p) {
    if (this.over || this.r.mode !== 'defausse') return 'Action impossible.';
    if (this.turn !== p) return "Ce n'est pas ton tour.";
    if (this.hands[p].some(c => this.playable(c))) return 'Tu as une carte jouable.';
    const ok = this.pull(p);
    this.msg = `${this.names[p]} ${ok ? 'pioche une carte' : 'passe'}.`;
    this.turn = (p + 1) % this.n; return null;
  }
  view(p) {
    return {
      mode: this.r.mode, you: p, names: this.names, score: this.score, turn: this.turn, over: this.over, winners: this.winners,
      counts: this.hands.map(h => h.length), drawCount: this.draw.length, hand: this.hands[p],
      top: this.top() || null, table: this.table, chosen: this.chosen.map(Boolean), msg: this.msg,
      canDraw: this.r.mode === 'defausse' && !this.over && this.turn === p && !this.hands[p].some(c => this.playable(c)),
    };
  }
}
module.exports = { Game, sanitizeGame, MAX_PLAYERS, buildDeck };
