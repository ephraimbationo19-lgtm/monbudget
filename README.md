# MonBudget

Application mobile de gestion d'argent, 100 % locale : tes données restent sur ton téléphone.

## Fonctionnalités

- **Tableau de bord** : solde du mois, revenus/dépenses, répartition par catégorie (donut), évolution sur 6 mois, alertes budget, dernières transactions.
- **Transactions** : saisie de dépenses/revenus, catégories, notes, dates, recherche et filtres, modification et suppression.
- **Budgets** : plafond mensuel par catégorie avec barre de progression et alertes de dépassement.
- **Objectifs d'épargne** : montant cible, échéance, versements (positifs ou négatifs), suivi de progression.
- **Dettes** : « je dois » / « on me doit », montant restant, échéances, paiements partiels, retard.
- **Récurrents** : loyer, abonnements, salaire… création automatique des transactions chaque mois.
- **Réglages** : devise (EUR, USD, XOF, GBP, CAD), données d'exemple, remise à zéro.

## Stack

Expo SDK 58 · Expo Router · React Native · TypeScript · expo-sqlite · react-native-svg · @expo/vector-icons

## Démarrer

```bash
cd budg-app
bun install
bunx expo start
```

Ensuite :

- **Sur ton téléphone** : installe **Expo Go**, scanne le QR code affiché dans le terminal. Toutes les bibliothèques utilisées sont incluses dans Expo Go.
- **Émulateur Android** : appuie sur `a` dans le terminal Expo.
- **Web** : appuie sur `w` (aperçu dans le navigateur).

## Vérifications

```bash
bunx tsc --noEmit   # typage
bunx expo lint      # lint
bunx expo-doctor    # santé des dépendances
```

## Structure

```
src/
├── app/                 # écrans Expo Router
│   ├── _layout.tsx      # providers SQLite + données
│   └── (tabs)/          # Accueil, Transactions, Budgets, Objectifs, Dettes
├── components/          # UI, graphiques, formulaires
├── context/             # état partagé des données
├── db/                  # schéma SQLite + requêtes
├── lib/                 # dates, formatage, statistiques
└── theme.ts
```

La base de données `monbudget.db` est créée automatiquement au premier lancement. Aucun serveur n'est nécessaire.
