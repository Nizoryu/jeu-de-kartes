'use strict';
// Mode « Tableau » : chaque joueur construit une zone personnelle ; les cartes portent des étiquettes
// (tags), des conditions (requiert / interdit si), des immunités et des effets sur les autres joueurs.
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

class TableauGame {
  constructor(def, names, buildDeck) {
    this.def = def; this.r = def.rules; this.names = names; this.n = names.length;
    this.draw = buildDeck(def.cards); this.discard = [];
    this.hands = names.map(() => []); this.boards = names.map(() => []); this.skip = names.map(() => 0);
    this.turn = 0; this.over = false; this.winners = []; this.finalTurns = null; this.log = []; this.nextId = 100000;
    this.say('La partie commence ! ' + names[0] + ' joue en premier.');
    this.startTurn();
  }
  static minCards(r, n) { return n * r.hand + 1; }
  say(t) { this.log.push(t); if (this.log.length > 40) this.log.shift(); }
  get msg() { return this.log[this.log.length - 1] || ''; }
  tags(p) { const s = new Set(); this.boards[p].forEach(c => c.gives.forEach(t => s.add(t))); return s; }
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
    this.over = true; const sc = this.names.map((_, i) => this.score(i)), m = Math.max(...sc);
    this.winners = sc.map((s, i) => s === m ? i : -1).filter(i => i >= 0);
    this.say('Partie terminée : ' + (this.winners.length > 1 ? 'égalité entre ' : 'victoire de ') + this.winners.map(i => this.names[i]).join(', ') + ` (${m} pts) !`);
  }

  canHit(c, t) {
    const tg = this.tags(t);
    return c.gives.every(g => !tg.has(g)) && (!c.removes || tg.has(c.removes));
  }
  check(p, c) {
    const own = this.tags(p);
    const miss = c.requires.filter(t => !own.has(t));
    if (miss.length) return { ok: false, reason: 'Il te manque : ' + miss.join(', ') };
    const bad = c.forbids.filter(t => own.has(t));
    if (bad.length) return { ok: false, reason: 'Bloqué par : ' + bad.join(', ') };
    if (c.kind === 'cure' && !own.has(c.cures)) return { ok: false, reason: 'Rien à soigner' };
    if (c.kind === 'attack') {
      const targets = this.names.map((_, i) => i).filter(i => i !== p && this.canHit(c, i));
      if (!targets.length) return { ok: false, reason: 'Aucune cible possible' };
      return { ok: true, targets, all: c.all };
    }
    return { ok: true };
  }

  play(p, cardId, target) {
    if (this.over) return 'Partie terminée.';
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
    const me = this.names[p];
    let placed = false;
    if (c.kind === 'build') { this.boards[p].push(c); placed = true; this.say(`${me} pose ${c.name} ${c.suit}.`); }
    else if (c.kind === 'cure') {
      const i = this.boards[p].findIndex(k => k.gives.includes(c.cures));
      this.discard.push(...this.boards[p].splice(i, 1)); this.say(`${me} se soigne avec ${c.name} : ${c.cures} disparaît.`);
    } else if (c.kind === 'action') this.say(`${me} joue ${c.name} ${c.suit}.`);
    else {
      targets.forEach(t => {
        const T = this.names[t], blocked = [...c.gives, c.removes].filter(Boolean).find(x => this.immune(t).has(x));
        if (blocked) { this.say(`${me} lance ${c.name} sur ${T}, mais ${T} est immunisé (${blocked}) !`); return; }
        let fx = [];
        if (c.gives.length) { this.boards[t].push({ ...c, id: this.nextId++ }); placed = true; fx.push(`subit ${c.gives.join(', ')}`); }
        if (c.removes) { const i = this.boards[t].findIndex(k => k.gives.includes(c.removes)); const [lost] = this.boards[t].splice(i, 1); this.discard.push(lost); fx.push(`perd ${lost.name}`); }
        if (c.skipTarget) { this.skip[t]++; fx.push('passera son prochain tour'); }
        for (let k = 0; k < c.targetDiscard && this.hands[t].length; k++) { const j = Math.floor(Math.random() * this.hands[t].length); this.discard.push(...this.hands[t].splice(j, 1)); fx.length || fx.push(''); }
        if (c.targetDiscard) fx.push(`défausse ${c.targetDiscard} carte(s) au hasard`);
        this.say(`${me} attaque ${T} avec ${c.name} ${c.suit} : ${T} ${fx.filter(Boolean).join(', ') || 'résiste'}.`);
      });
    }
    if (!placed) this.discard.push(c);
    for (let k = 0; k < c.drawN; k++) this.pull(p);
    if (c.drawN) this.say(`${me} pioche ${c.drawN} carte(s).`);
    if (c.extraTurn) this.say(`${me} rejoue !`);
    const t = this.r.target;
    if (t && this.names.some((_, i) => this.score(i) >= t)) { this.say(`Score cible atteint !`); return this.finish(), null; }
    this.advance(c.extraTurn);
    return null;
  }
  discardCard(p, cardId) {
    if (this.over) return 'Partie terminée.';
    if (this.turn !== p) return "Ce n'est pas ton tour.";
    const c = this.hands[p].find(k => k.id === cardId);
    if (!c) return 'Carte inconnue.';
    this.hands[p] = this.hands[p].filter(k => k !== c); this.discard.push(c);
    this.say(`${this.names[p]} défausse une carte.`); this.advance(false); return null;
  }
  view(p) {
    const options = {};
    if (!this.over && this.turn === p) this.hands[p].forEach(c => { options[c.id] = this.check(p, c); });
    return {
      mode: 'tableau', you: p, names: this.names, score: this.names.map((_, i) => this.score(i)), turn: this.turn, over: this.over,
      winners: this.winners, counts: this.hands.map(h => h.length), drawCount: this.draw.length, hand: this.hands[p],
      boards: this.boards, options, skips: this.skip, msg: this.msg, log: this.log.slice(-12), final: this.finalTurns !== null,
    };
  }
}
module.exports = { TableauGame };
