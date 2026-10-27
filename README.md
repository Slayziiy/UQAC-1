# Projet de base : **Delta-Talk**
https://slayziiy.github.io/UQAC-1/views/

## Obectifs :
- Faire communiquer plusieurs personnes entres-elles.
  - Groupe ? Channel de discussion ouvert à tous, pas de channel privé.
  - Gestion d'ami ? Non implémenté car non nécessaire pour un site comme celui là. On préfère que les échanges soient publiques et communautaires. 
- Assurer une bonne communication entre 2 intermédiaires. Réussi
- Créer/Se connecter à un compte Réussi

## Secondaire :
- Principe de point via question / activité + classement
    - le jeton sert à envoyer un message Fait
- Barres d'évolutions (addictivité) Fait

## Public ciblé :
- jeunes habitué du web Style du site orienté pour
- fun + compéptitif Fait et reussi

## Contraintes :
- Compatible avec les autres messageries des fil rouge à tester
- DB avec les pseudo + mdp Fait
- Utilisable sur téléphone Oui
 
### Arborescence :
UQAC-1/
├── public/
│   ├── css/
│   │   ├── discussion-style.css
│   │   ├── register-additions.css
│   │   └── style.css
│   ├── img/
│   │   ├── chat.png
│   │   └── logo.png
│   └── js/
│       ├── script.js
│       └── supabase.js
├── views/
│   ├── auth/
│   │   ├── login.html
│   │   └── register.html
│   ├── exception/
│   │   └── 404.html
│   ├── legal/
│   │   ├── guide.html
│   │   └── legals.html
│   └── user/
│       ├── discussion.html
│       └── profile.html
├── index.html
├── ranking.html
└── README.md

## Palette de couleurs :

- `#e4951d` Orange doré
- `#f8e5b5` Beige clair
- `#1b7aa0` Bleu canard 


## Test effectué par un ami en cyber en France le 26/10/2026 :
Une phase de tests d'intrusion sur la première version du site a mis en évidence plusieurs vulnérabilités liées au stockage côté client. Elles ont depuis été corrigées. Dans cette version initiale, un utilisateur averti pouvait ouvrir la console du navigateur et modifier ses données dans le localStorage. Il pouvait aussi s'attribuer des jetons en illimité, prendre le pseudo d'un autre joueur, ou interroger directement l'API publique de Supabase pour lister le contenu de la table des utilisateurs.

Pour corriger ces failles, tout le code JavaScript a d'abord été encapsulé dans des fonctions isolées (IIFE), ce qui rend les variables et fonctions internes inaccessibles depuis la console F12. Côté Supabase, la sécurité au niveau des lignes (RLS) a été activée et les accès directs aux tables coupés, pour empêcher toute énumération ou modification sauvage des données. Toute la logique sensible passe désormais par des fonctions serveur PostgreSQL (RPC), associées à un jeton de session unique (session_token) attribué à la connexion. C'est le serveur qui génère les quiz de mathématiques, vérifie l'exactitude de la réponse avant d'ajouter les jetons, déduit un jeton à l'envoi d'un message et force l'affichage du vrai pseudo associé au jeton de session. Les mots de passe des comptes sont maintenant hachés en base avec l'algorithme bcrypt, via l'extension pgcrypto.

## 2nd test après le patch d'urgence
Les champs optionnels du prénom et du nom n'étaient pas filtrés : on pouvait y envoyer n'importe quel caractère spécial, ou un texte bien trop long. C'est corrigé, avec une double vérification, côté client et côté serveur.
Dans le navigateur, le fichier HTML limite maintenant la saisie entre 2 et 40 caractères, et le script JavaScript bloque l'envoi si le texte contient autre chose que des lettres, des accents, des espaces ou des tirets. Côté base, la fonction PostgreSQL register_user sur Supabase applique la même expression régulière avant l'insertion. Passer par la console du navigateur ne suffit donc plus à contourner la vérification du formulaire.
