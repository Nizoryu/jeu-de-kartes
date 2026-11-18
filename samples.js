// Jeux d'exemple (format compact : nom, points, symbole, couleur, quantité, effets).
(function (root) {
  const GAMES = {
    pirates: {
      name: 'Aventure en mer',
      rules: { mode: 'tableau', hand: 5, target: 0, notes: "Pose des cartes dans ta zone pour marquer des points. Attaque les autres avec Tempête, Scorbut… et protège-toi avec Citron, Beau temps ou l'Amulette. Les étiquettes (équipage, navire…) conditionnent ce que tu peux poser." },
      cards: [
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
      ],
    },
    batisseurs: {
      name: 'Bâtisseurs',
      rules: { mode: 'tableau', hand: 5, target: 0, notes: "Construis la plus belle cité. L'or sert de monnaie : les bâtiments en coûtent. Les catastrophes (incendie, peste, séisme) et les voleurs te guettent : garde en main des cartes de réaction (muraille, pluie, quarantaine) pour parer. Le plus de prestige à la fin de la pioche gagne." },
      cards: [
        ["Sac d'or", 0, '🪙', '#b59a00', 14, { kind: 'build', gives: 'or' }],
        ['Ouvrier', 1, '🔨', '#7a4b1b', 6, { kind: 'build', gives: 'ouvrier' }],
        ['Ferme', 2, '🌾', '#2b7a3d', 4, { kind: 'build', gives: 'ferme', requires: 'ouvrier', payTag: 'or', payN: 1 }],
        ['Maison', 3, '🏠', '#7a4b1b', 5, { kind: 'build', gives: 'maison', requires: 'ouvrier', payTag: 'or', payN: 2 }],
        ['Marché', 4, '🏪', '#d17a00', 3, { kind: 'build', gives: 'marché', requires: 'maison*2', payTag: 'or', payN: 2 }],
        ['Forge', 4, '⚒️', '#555555', 3, { kind: 'build', gives: 'forge', requires: 'maison', requiresAny: 'ferme, marché', forbids: 'incendie', payTag: 'or', payN: 2 }],
        ['Tour de garde', 3, '🏰', '#444444', 2, { kind: 'build', requires: 'maison', immune: 'voleur, pillage', payTag: 'or', payN: 3 }],
        ['Aqueduc', 2, '🌊', '#1b5fa8', 2, { kind: 'build', requires: 'maison', immune: 'incendie', payTag: 'or', payN: 2 }],
        ['Académie', 6, '📚', '#7a2fb5', 2, { kind: 'build', gives: 'savoir', requiresAny: 'marché, forge', payTag: 'or', payN: 3 }],
        ['Cathédrale', 10, '⛪', '#c0182b', 2, { kind: 'build', requires: 'maison*3, marché', forbids: 'peste', payTag: 'or', payN: 5 }],
        ['Incendie', -2, '🔥', '#c0182b', 3, { kind: 'attack', gives: 'incendie' }],
        ['Peste', -3, '☠️', '#2b7a3d', 3, { kind: 'attack', gives: 'peste' }],
        ['Séisme', 0, '🌋', '#555555', 2, { kind: 'attack', removes: 'maison' }],
        ['Voleur', 0, '🥷', '#222222', 2, { kind: 'attack', steal: 2 }],
        ['Pillage', 0, '💰', '#c0182b', 3, { kind: 'attack', takes: 'or' }],
        ['Brigands', 0, '🗡️', '#7a4b1b', 2, { kind: 'attack', skipTarget: true }],
        ['Taxe royale', 0, '👑', '#d17a00', 2, { kind: 'attack', targetDiscard: 2, all: true }],
        ['Pompiers', 0, '🚒', '#c0182b', 3, { kind: 'cure', cures: 'incendie' }],
        ['Médecin', 0, '⚕️', '#2b7a3d', 3, { kind: 'cure', cures: 'peste' }],
        ['Muraille !', 0, '🧱', '#444444', 2, { kind: 'reaction', reacts: 'voleur, pillage, brigands' }],
        ['Pluie', 0, '🌧️', '#1b5fa8', 2, { kind: 'reaction', reacts: 'incendie' }],
        ['Quarantaine', 0, '🚧', '#2b7a3d', 2, { kind: 'reaction', reacts: 'peste' }],
        ['Éclaireur', 0, '🧭', '#1b5fa8', 3, { kind: 'action', drawN: 2 }],
        ['Festival', 0, '🎪', '#7a2fb5', 2, { kind: 'action', extraTurn: true }],
      ],
    },
  };
  // Conversion en cartes complètes (utilisable par le navigateur et par Node).
  const toGame = (g, uid) => ({
    id: uid(), name: g.name, rules: { ...g.rules },
    cards: g.cards.map(([name, value, suit, color, qty, fx]) => ({ id: uid(), name, value, suit, color, qty, effect: '', ...fx })),
  });
  const api = { GAMES, toGame };
  if (typeof module !== 'undefined') module.exports = api; else root.SAMPLES = api;
})(typeof window !== 'undefined' ? window : globalThis);
