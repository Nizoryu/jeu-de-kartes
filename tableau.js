'use strict';
// Mode « Tableau » : chaque joueur construit une zone personnelle ; les cartes portent des étiquettes
// (tags), des conditions, un coût, des immunités et des effets sur les autres joueurs.
// Une attaque peut être parée par une carte « réaction » de la main de la cible.
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const REACT_TIMEOUT = 25000;

class TableauGame {
  constructor(def, names, buildDeck) {
    this.def = def; this.r = def.rules; this.names = names; this.n = names.length;
    this.draw = buildDeck(def.cards); this.discard = [];
    this.hands = names.map(() => []); this.boards = names.map(() => []); this.skip = names.map(() => 0);
    this.turn = 0; this.over = false; this.winners = []; this.finalTurns = null; this.log = []; this.nextId = 100000;
    this.pending = null; this.timer = null; this.onChange = () => {};
    this.say('La partie commence ! ' + names[0] + ' joue en premier.');
    this.startTurn();
  }
  static minCards(r, n) { return n * r.hand + 1; }
  say(t) { this.log.push(t); if (this.log.length > 40) this.log.shift(); }
  get msg() { return this.log[this.log.length - 1] || ''; }
  tags(p) { const s = new Set(); this.boards[p].forEach(c => c.gives.forEach(t => s.add(t))); return s; }
  count(p, t) { return this.boards[p].reduce((a, c) => a + (c.gives.includes(t) ? 1 : 0), 0); }
  immune(p) { const s = new Set(); this.boards[p].forEach(c => c.immune.forEach(t => s.add(t))); return s; }
  score(p) { return this.boards[p].reduce((a, c) => a + c.value, 0); }
  pull(p) { if (!this.draw.length) return false; this.hands[p].push(this.draw.pop()); return true; }

  startTurn() {
    const p = this.turn;
    while (this.hands[p].length < this.r.hand && this.pull(p));
    if (!this.draw.length && this.finalTurns === null) { this.finalTurns = this.n; this.say('La pioche est vide : dernier tour de table !'); }
    if (!this.hands[p].length) { this.say(`${this.names[p]} n'a plus de carte et passe.`); this.advance(false); }
  }
  advance(extra) {
    if (this.over) return;
    if (this.finalTurns !== null && --this.finalTurns <= 0) return this.finish();
    if (!extra) this.turn = (this.turn + 1) % this.n;
    for (let g = 0; g < this.n && this.skip[this.turn] > 0; g++) {
      this.skip[this.turn]--; this.say(`${this.names[this.turn]} passe son tour.`);
      if (this.finalTurns !== null && --this.finalTurns <= 0) return this.finish();
      this.turn = (this.turn + 1) % this.n;
    }
    this.startTurn();
  }
  finish() {
    this.over = true; clearTimeout(this.timer);
    const sc = this.names.map((_, i) => this.score(i)), m = Math.max(...sc);
    this.winners = sc.map((s, i) => s === m ? i : -1).filter(i => i >= 0);
    this.say('Partie terminée : ' + (this.winners.length > 1 ? 'égalité entre ' : 'victoire de ') + this.winners.map(i => this.names[i]).join(', ') + ` (${m} pts) !`);
  }

  /* ---- Conditions ---- */
  reqs(c) { return c.requires.map(r => { const [t, n] = r.split('*'); return [t, Math.max(1, parseInt(n) || 1)]; }); }
  blocked(p, c) {
    const miss = this.reqs(c).filter(([t, n]) => this.count(p, t) < n).map(([t, n]) => n > 1 ? `${t} ×${n}` : t);
    if (miss.length) return 'Il te manque : ' + miss.join(', ');
    if (c.requiresAny.length && !c.requiresAny.some(t => this.count(p, t) > 0)) return "Il te faut l'un de : " + c.requiresAny.join(', ');
    const bad = c.forbids.filter(t => this.count(p, t) > 0);
    if (bad.length) return 'Bloqué par : ' + bad.join(', ');
    if (c.payN && this.count(p, c.payTag) < c.payN) return `Coût : ${c.payN} × ${c.payTag} (tu en as ${this.count(p, c.payTag)})`;
    return null;
  }
  canHit(c, t) {
    const tg = this.tags(t);
    if (!c.gives.every(g => !tg.has(g)) || (c.removes && !tg.has(c.removes)) || (c.takes && !tg.has(c.takes))) return false;
    const onlySteal = c.steal && !c.gives.length && !c.removes && !c.takes && !c.skipTarget && !c.targetDiscard;
    return !(onlySteal && !this.hands[t].length);
  }
  check(p, c) {
    if (c.kind === 'reaction') return { ok: false, reason: "Se joue en réaction à une attaque, pendant le tour d'un autre joueur" };
    const why = this.blocked(p, c);
    if (why) return { ok: false, reason: why };
    if (c.kind === 'cure' && !this.tags(p).has(c.cures)) return { ok: false, reason: 'Rien à soigner' };
    if (c.kind === 'attack') {
      const targets = this.names.map((_, i) => i).filter(i => i !== p && this.canHit(c, i));
      if (!targets.length) return { ok: false, reason: 'Aucune cible possible' };
      return { ok: true, targets, all: c.all };
    }
    return { ok: true };
  }
  pay(p, c) {
    if (!c.payN) return;
    for (let k = 0; k < c.payN; k++) {
      const idx = this.boards[p].map((x, i) => [x, i]).filter(([x]) => x.gives.includes(c.payTag)).sort((a, b) => a[0].value - b[0].value)[0][1];
      this.discard.push(...this.boards[p].splice(idx, 1));
    }
    this.say(`${this.names[p]} dépense ${c.payN} × ${c.payTag}.`);
  }

  /* ---- Jouer une carte ---- */
  play(p, cardId, target) {
    if (this.over) return 'Partie terminée.';
    if (this.pending) return 'Une attaque est en cours de résolution.';
    if (this.turn !== p) return "Ce n'est pas ton tour.";
    const c = this.hands[p].find(k => k.id === cardId);
    if (!c) return 'Carte inconnue.';
    const chk = this.check(p, c);
    if (!chk.ok) return chk.reason;
    let targets = [];
    if (c.kind === 'attack') {
      targets = c.all ? chk.targets : [Number(target)];
      if (!c.all && !chk.targets.includes(targets[0])) return 'Cible invalide.';
    }
    this.hands[p] = this.hands[p].filter(k => k !== c);
    this.pay(p, c);
    const me = this.names[p];
    if (c.kind === 'attack') {
      this.pending = { from: p, card: c, queue: targets, placed: false, target: null, options: [] };
      this.resolve(); return null;
    }
    let placed = false;
    if (c.kind === 'build') { this.boards[p].push(c); placed = true; this.say(`${me} pose ${c.name} ${c.suit}.`); }
    else if (c.kind === 'cure') {
      const i = this.boards[p].findIndex(k => k.gives.includes(c.cures));
      this.discard.push(...this.boards[p].splice(i, 1)); this.say(`${me} se soigne avec ${c.name} : ${c.cures} disparaît.`);
    } else this.say(`${me} joue ${c.name} ${c.suit}.`);
    this.endPlay(p, c, placed);
    return null;
  }
  endPlay(p, c, placed) {
    if (!placed) this.discard.push(c);
    const me = this.names[p];
    for (let k = 0; k < c.drawN; k++) this.pull(p);
    if (c.drawN) this.say(`${me} pioche ${c.drawN} carte(s).`);
    if (c.extraTurn) this.say(`${me} rejoue !`);
    const t = this.r.target;
    if (t && this.names.some((_, i) => this.score(i) >= t)) { this.say('Score cible atteint !'); this.finish(); return; }
    this.advance(c.extraTurn);
  }

  /* ---- Attaques et réactions ---- */
  reactsTo(k, c) {
    const keys = [...c.gives, c.removes, c.takes, String(c.name).toLowerCase()].filter(Boolean);
    return k.kind === 'reaction' && k.reacts.some(x => keys.includes(x));
  }
  resolve() {
    const P = this.pending, c = P.card, me = this.names[P.from];
    while (P.queue.length) {
      const t = P.queue.shift(), T = this.names[t];
      const imm = [...c.gives, c.removes, c.takes].filter(Boolean).find(x => this.immune(t).has(x));
      if (imm) { this.say(`${me} lance ${c.name} sur ${T}, mais ${T} est immunisé (${imm}) !`); continue; }
      const opts = this.hands[t].filter(k => this.reactsTo(k, c)).map(k => k.id);
      if (opts.length) {
        P.target = t; P.options = opts; this.say(`${me} attaque ${T} avec ${c.name} ${c.suit} — ${T} peut réagir…`);
        clearTimeout(this.timer);
        this.timer = setTimeout(() => { if (this.pending && this.pending.target === t) { this.say(`${T} n'a pas réagi à temps.`); this.react(t, null); this.onChange(); } }, REACT_TIMEOUT);
        if (this.timer.unref) this.timer.unref();
        return;
      }
      this.hit(P.from, c, t);
    }
    this.pending = null; this.endPlay(P.from, c, P.placed);
  }
  react(p, cardId) {
    const P = this.pending;
    if (!P || P.target !== p) return "Aucune attaque ne te vise pour l'instant.";
    const t = P.target, T = this.names[t];
    clearTimeout(this.timer);
    if (cardId != null) {
      const k = this.hands[t].find(x => x.id === cardId);
      if (!k || !P.options.includes(k.id)) return 'Cette carte ne peut pas parer cette attaque.';
      this.hands[t] = this.hands[t].filter(x => x !== k); this.discard.push(k);
      this.say(`${T} pare l'attaque avec ${k.name} ${k.suit} !`);
    } else this.hit(P.from, P.card, t);
    P.target = null; P.options = [];
    this.resolve(); return null;
  }
  hit(p, c, t) {
    const me = this.names[p], T = this.names[t], fx = [];
    if (c.gives.length) { this.boards[t].push({ ...c, id: this.nextId++ }); this.pending.placed = true; fx.push(`subit ${c.gives.join(', ')}`); }
    if (c.removes) { const i = this.boards[t].findIndex(k => k.gives.includes(c.removes)); const [lost] = this.boards[t].splice(i, 1); this.discard.push(lost); fx.push(`perd ${lost.name}`); }
    if (c.takes) { const i = this.boards[t].findIndex(k => k.gives.includes(c.takes)); const [k] = this.boards[t].splice(i, 1); this.boards[p].push(k); fx.push(`se fait prendre ${k.name}`); }
    if (c.steal) { let n = 0; for (let k = 0; k < c.steal && this.hands[t].length; k++) { this.hands[p].push(...this.hands[t].splice(Math.floor(Math.random() * this.hands[t].length), 1)); n++; } fx.push(`se fait voler ${n} carte(s) en main`); }
    if (c.skipTarget) { this.skip[t]++; fx.push('passera son prochain tour'); }
    if (c.targetDiscard) { let n = 0; for (let k = 0; k < c.targetDiscard && this.hands[t].length; k++) { this.discard.push(...this.hands[t].splice(Math.floor(Math.random() * this.hands[t].length), 1)); n++; } fx.push(`défausse ${n} carte(s)`); }
    this.say(`${me} attaque ${T} avec ${c.name} ${c.suit} : ${T} ${fx.join(', ') || 'résiste'}.`);
  }

  discardCard(p, cardId) {
    if (this.over) return 'Partie terminée.';
    if (this.pending) return 'Une attaque est en cours de résolution.';
    if (this.turn !== p) return "Ce n'est pas ton tour.";
    const c = this.hands[p].find(k => k.id === cardId);
    if (!c) return 'Carte inconnue.';
    this.hands[p] = this.hands[p].filter(k => k !== c); this.discard.push(c);
    this.say(`${this.names[p]} défausse une carte.`); this.advance(false); return null;
  }
  view(p) {
    const options = {};
    if (!this.over && !this.pending && this.turn === p) this.hands[p].forEach(c => { options[c.id] = this.check(p, c); });
    const P = this.pending;
    const pending = P && P.target !== null ? {
      from: P.from, target: P.target, card: P.card, options: P.target === p ? P.options : [],
    } : null;
    return {
      mode: 'tableau', you: p, names: this.names, score: this.names.map((_, i) => this.score(i)), turn: this.turn, over: this.over,
      winners: this.winners, counts: this.hands.map(h => h.length), drawCount: this.draw.length, hand: this.hands[p],
      boards: this.boards, options, skips: this.skip, msg: this.msg, log: this.log.slice(-12), final: this.finalTurns !== null, pending,
    };
  }
}
module.exports = { TableauGame };
