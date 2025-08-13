# Correction du bug de calcul des dates

## 🐛 Description du problème

Un bug de calcul des dates causait l'exclusion du dernier jour de chaque mois dans l'application planning COGC. Le problème était dû à l'utilisation de `toISOString()` qui convertit les dates en UTC, causant un décalage d'un jour selon le fuseau horaire local.

## 🔍 Exemple du problème

Pour avril 2025 :
- ❌ **Dates erronées générées** :
  - `startDate`: "2025-03-31" (31 mars au lieu du 1er avril)
  - `endDate`: "2025-04-29" (29 avril au lieu du 30 avril)
- ✅ **Dates attendues** :
  - `startDate`: "2025-04-01"
  - `endDate`: "2025-04-30"

## 🔧 Code problématique

```javascript
// Ancien code avec bug
const startDate = new Date(2025, monthIndex, 1).toISOString().split('T')[0];
const endDate = new Date(2025, monthIndex + 1, 0).toISOString().split('T')[0];
```

Le problème : `toISOString()` convertit la date locale en UTC, ce qui peut la décaler d'un jour.

## ✅ Solution appliquée

```javascript
// Code corrigé - Construction manuelle des dates
// Premier jour du mois
const firstDay = new Date(year, monthIndex, 1);
const startDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;

// Dernier jour du mois
const lastDay = new Date(year, monthIndex + 1, 0);
const lastDayOfMonth = lastDay.getDate();
const endDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
```

## 📍 Fichiers modifiés

1. **src/App.js** - Fonction `loadData()` (lignes 124-131)
2. **src/components/DebugPlanning.js** - Fonction `debugMonth()` (lignes 27-28)

## 📅 Date de correction

- **13 août 2025** - Commits à 10:06:20 et 10:07:52

## 💡 Leçon apprise

Toujours faire attention aux conversions de dates et fuseaux horaires en JavaScript :
- Éviter `toISOString()` pour les dates locales
- Construire manuellement les chaînes de dates au format requis
- Tester avec différents fuseaux horaires

## 🧪 Vérification

Pour vérifier que la correction fonctionne :
1. Ouvrir l'application
2. Naviguer vers n'importe quel mois
3. Cliquer sur "Afficher Debug Planning"
4. Vérifier que `hasLastDay` est `true` et que le dernier jour a des données

## Impact

Cette correction garantit que :
- ✅ Tous les jours du mois sont correctement inclus dans les requêtes
- ✅ Les données du dernier jour de chaque mois sont visibles
- ✅ Le planning est complet et précis pour tous les agents
