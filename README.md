# Kartes

Application web pour **créer ses propres jeux de cartes** et y jouer **à plusieurs sur le réseau local** (2 à 6 joueurs).

## Lancer

```bash
npm start        # ou : node server.js   (Node 18+, aucune dépendance)
```

Le serveur affiche les adresses à ouvrir (ex. `http://192.168.1.20:3000`). Change le port avec `PORT=4000 npm start`.

## Utiliser

1. **Cartes** : crée ton paquet (nom, valeur, famille, couleur, quantité, effet) ou charge un jeu de 52 cartes.
2. **Règles** : choisis le mode, le nombre de cartes en main, le score cible…
   - *Duel* : tout le monde joue une carte en même temps, la plus forte (ou faible) gagne le pli.
   - *Défausse* : à tour de rôle, on pose une carte de la même famille ou valeur ; le premier à vider sa main gagne.
3. **Jouer** : un joueur héberge (il obtient un code à 4 chiffres), les autres ouvrent la même adresse sur leur appareil et rejoignent avec le code.

Effets de cartes : rejouer, l'adversaire suivant pioche 2, points ×2 (duel), joker.
Les jeux sont sauvegardés dans le navigateur (`localStorage`) ; la partie est gérée par le serveur (`engine.js`).
