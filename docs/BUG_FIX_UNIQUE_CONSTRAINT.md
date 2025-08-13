# Correction du bug de contrainte unique lors de l'import PDF

## 🐛 Description du problème

Lors de l'import de bulletins de commande par PDF, l'application générait des erreurs de type :
```
duplicate key value violates unique constraint "planning_agent_id_date_key"
```

## 🔍 Cause du problème

La base de données a une contrainte unique sur la combinaison `agent_id + date`, ce qui signifie qu'un agent ne peut avoir qu'une seule entrée par jour.

Le code d'import tentait d'insérer de nouvelles entrées sans vérifier si une entrée existait déjà pour cet agent à cette date, ce qui violait la contrainte unique.

## 📝 Exemple du problème

Si GILLON avait déjà une entrée pour le 13 mai 2025 (créée manuellement), et qu'on importait un PDF avec une autre entrée pour le même jour, le système tentait de créer une deuxième ligne, ce qui causait l'erreur.

## ✅ Solution appliquée

### 1. Implémentation d'un vrai UPSERT
```javascript
// Ancien comportement : INSERT seulement
// Nouveau comportement : UPDATE si existe, INSERT sinon
```

### 2. Consolidation des entrées par date
Si le PDF contient plusieurs entrées pour la même date, seule la dernière est conservée.

### 3. Logique modifiée
- **Avant** : Vérifiait l'existence par `agent_id + date + service_code + poste_code`
- **Après** : Vérifie l'existence par `agent_id + date` seulement (respectant la contrainte)

## 🔧 Code modifié

**Fichier** : `src/services/planningImportService.js`

**Nouvelle méthode `upsertPlanningEntry`** :
- Vérifie si une entrée existe pour cet agent à cette date
- Si oui : UPDATE de l'entrée existante
- Si non : INSERT d'une nouvelle entrée
- Ajoute un avertissement en cas d'écrasement

## ⚠️ Impact utilisateur

- **Positif** : Plus d'erreurs lors de l'import
- **À noter** : Si une entrée existe déjà, elle sera écrasée par l'import PDF
- **Avertissements** : L'utilisateur est prévenu des écrasements

## 📊 Exemple de rapport d'import

```json
{
  "entriesUpdated": 8,  // Entrées mises à jour (existaient déjà)
  "entriesInserted": 23, // Nouvelles entrées créées
  "warnings": [
    "[2025-05-13] Écrasement: D/null → -/CRC",
    "[2025-05-14] Écrasement: RP/null → -/CRC"
  ]
}
```

## 💡 Recommandations

1. **Vérifier avant import** : Toujours vérifier le planning existant avant d'importer un PDF
2. **Attention aux écrasements** : Les données du PDF écrasent les données existantes
3. **Validation manuelle** : Utiliser l'interface de validation pour vérifier les changements

## 📅 Date de correction

- **13 août 2025** - Implémentation du fix UPSERT
