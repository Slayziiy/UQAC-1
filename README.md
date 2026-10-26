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


Test effectué par une amie en cyber en France. On a cherché les failles les plus critiques et corrigées au plus vite. Un patch a été fait aujourd'hui pour protéger la base de données
