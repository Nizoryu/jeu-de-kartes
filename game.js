const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2','3','4','5','6','7','8','9','10','V','D','R','A'];

const $ = id => document.getElementById(id);
let player, cpu, pot;

function newDeck() {
  const d = [];
  for (const s of SUITS) RANKS.forEach((r, i) => d.push({ s, r, v: i }));
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function show(el, c) {
  el.className = 'card' + (c && (c.s === '♥' || c.s === '♦') ? ' red' : '') + (c ? '' : ' back');
  el.textContent = c ? c.r + c.s : '';
}

function update(msg) {
  $('playerCount').textContent = player.length;
  $('cpuCount').textContent = cpu.length;
  if (msg) $('message').textContent = msg;
}

function start() {
  const d = newDeck();
  player = d.slice(0, 26);
  cpu = d.slice(26);
  pot = [];
  show($('playerCard'), null);
  show($('cpuCard'), null);
  $('play').disabled = false;
  update('Nouvelle partie ! Clique sur « Jouer un pli ».');
}

function playRound() {
  const p = player.shift(), c = cpu.shift();
  pot.push(p, c);
  show($('playerCard'), p);
  show($('cpuCard'), c);
  let msg;
  if (p.v === c.v) {
    msg = 'Égalité ! Les cartes restent sur la table pour le prochain pli.';
  } else {
    const winner = p.v > c.v ? player : cpu;
    winner.push(...pot.sort(() => Math.random() - .5));
    pot = [];
    msg = p.v > c.v ? 'Tu gagnes le pli !' : "L'ordinateur gagne le pli.";
  }
  update(msg);
  if (!player.length || !cpu.length) {
    $('play').disabled = true;
    update(player.length ? '🎉 Tu as gagné la partie !' : "💀 L'ordinateur a gagné la partie.");
  }
}

$('play').addEventListener('click', playRound);
$('restart').addEventListener('click', start);
start();
