# Kartes

Application web pour **créer ses propres jeux de cartes** et y jouer **à plusieurs sur le réseau local** (2 à 6 joueurs).

## Lancer

```bash
npm start        # ou : node server.js   (Node 18+, aucune dépendance)
```

Le serveur affiche les adresses à ouvrir (ex. `http://192.168.1.20:3000`). Change le port avec `PORT=4000 npm start`.

## Utiliser

L'application est une **plateforme de jeux de cartes** avec deux espaces :

- **🛠️ Créer un jeu** : tu crées autant de jeux que tu veux. Pour chacun :
  1. **Cartes** : nom, valeur, famille, couleur, quantité, effet (ou, en mode Tableau, type et étiquettes, voir plus bas), ou charge un exemple.
  2. **Règles** : choisis le mode, le nombre de cartes en main, le score cible…
     - *Duel* : tout le monde joue une carte en même temps, la plus forte (ou faible) gagne le pli.
     - *Défausse* : à tour de rôle, on pose une carte de la même famille ou valeur ; le premier à vider sa main gagne.
     - *Tableau* : chaque joueur construit sa zone, attaque les autres et se défend avec des **cartes à effets**.
- **🎮 Jouer** : tu choisis un de tes jeux et tu **l'héberges** (code à 4 chiffres), ou tu **rejoins** la partie d'un autre joueur avec son code. Les autres joueurs n'ont pas besoin d'avoir le jeu : l'hôte l'envoie. Entre 2 et 6 joueurs, sur le même réseau.

Les jeux sont sauvegardés dans le navigateur (`localStorage`) ; la partie est gérée par le serveur (`engine.js`, `tableau.js`).

## Mode Tableau : des cartes qui impactent les joueurs

À chaque tour, on remplit sa main, puis on **joue** une carte ou on la **défausse**. Le score d'un joueur est la somme des points de sa zone (les malus ont des points négatifs). La partie s'arrête quand la pioche est vide (après un dernier tour de table) ou au score cible.

Chaque carte a un **type** et des **étiquettes** (mots libres : `marié`, `malade`, `navire`…) :

| Champ | Effet |
|---|---|
| Construction | se pose dans ta zone |
| Attaque | se pose dans la zone d'un adversaire (ou de tous) |
| Soin | retire de ta zone une carte portant l'étiquette indiquée |
| Action | effet immédiat, puis défausse |
| Réaction | se garde en main ; jouable seulement pour **parer une attaque** qui te vise |
| Donne l'étiquette | la carte, une fois posée, donne ces étiquettes à la zone |
| Requiert / Interdit si | conditions pour jouer la carte (étiquettes présentes / absentes dans ta zone). `maison*3` = au moins 3 cartes portant l'étiquette |
| Requiert l'un de | condition « OU » : au moins une des étiquettes listées |
| Coût | dépense N cartes de ta zone portant l'étiquette (ex. 2 × `or`) : c'est la monnaie du jeu |
| Immunise contre | tant que la carte est dans ta zone, les attaques portant ces étiquettes échouent |
| Détruit chez la cible | l'attaque retire de la zone adverse une carte portant cette étiquette |
| Pioche / Rejoue | piocher N cartes, rejouer immédiatement |
| La cible défausse / passe son tour | défausse N cartes au hasard, saute son prochain tour |
| Prend à la cible / Vole N cartes | déplace une carte de sa zone vers la tienne / pioche au hasard dans sa main |
| Réaction : pare les attaques | liste d'étiquettes ou de noms d'attaques que la carte peut annuler |
| Vise tous les adversaires | l'attaque touche tout le monde (sauf les immunisés) |

Quand une attaque vise un joueur qui a une carte de réaction adaptée, la partie attend son choix (parer ou subir ; 25 s max). Une attaque contre un joueur immunisé échoue sans réaction possible.

Deux jeux d'exemple sont fournis (boutons dans l'éditeur, code dans `samples.js`) : **Bâtisseurs** (cité, monnaie, catastrophes, vol, parades) et **Aventure en mer** (version simple).
