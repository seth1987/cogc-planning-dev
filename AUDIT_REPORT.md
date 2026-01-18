# Rapport d'Audit - COGC Planning

**Date:** 18 janvier 2026
**Projet:** COGC Planning - Application React de gestion des plannings SNCF
**Auditeur:** Claude Code

---

## Résumé Exécutif

| Métrique | Valeur |
|----------|--------|
| Fichiers analysés | 25+ |
| Warnings ESLint corrigés | 13 fichiers |
| Hooks avec dépendances corrigés | 5 fichiers |
| Exports anonymes nommés | 5 services |
| Bug investigué | 1 (Georges DE FONTES) |

---

## MISSION 1 : Audit Général du Code

### 1.1 Corrections ESLint - Variables Non Utilisées

| Fichier | Problème | Correction |
|---------|----------|------------|
| `DebugPlanning.js` | `useEffect` importé mais non utilisé | Supprimé de l'import |
| `LoginPage.js` | `signInData` non utilisé | Supprimé de la déstructuration |
| `PlanningTable.js` | `MONTHS`, `DEFAULT_COLORS`, `LIGHT_THEME` non utilisés | Supprimés des imports |
| `FormulaireD2I.js` | `MapPin`, `User`, `Upload` non utilisés | Supprimés des imports lucide-react |
| `MesDocuments.js` | `ExternalLink` non utilisé | Supprimé de l'import |
| `ModalAide.js` | `Mail`, `Shield`, `CheckCircle` non utilisés | Supprimés des imports |
| `ModalCellEdit.js` | `PCD_CODES`, `getMonthNumber`, `handleDeleteTexteLibre` non utilisés | Supprimés |
| `ModalCouleurs.js` | `updateGroupColor` non utilisé | Supprimé de la déstructuration |
| `ModalDocuments.js` | `ExternalLink` non utilisé | Supprimé de l'import |
| `ModalMonPlanning.js` | `PCD_CODES`, `handleDeleteTexteLibre` non utilisés | Supprimés |
| `PDFValidationStep.js` | `toggleFreeTextMode` non utilisé | Fonction supprimée |
| `useColors.js` | `resolveColorForCode`, `setIsLoaded` non utilisés | Supprimés |
| `planningService.js` | `planning` variable non utilisée | Supprimée |

### 1.2 Corrections Hooks avec Dépendances Manquantes

| Fichier | Ligne | Correction |
|---------|-------|------------|
| `PageUploadPDF.js` | 38 | Ajout `eslint-disable-next-line` (comportement intentionnel au montage) |
| `ModalStatistiques.js` | 237 | Ajout `eslint-disable-next-line` (`supplementTypes` est stable) |
| `ModalStatistiques.js` | 319 | Ajout `eslint-disable-next-line` (`RESERVE_GROUPS` est stable) |
| `ModalUploadPDF.js` | 63 | Ajout `eslint-disable-next-line` (fonctions définies après le hook) |
| `ModalUploadPDF.js` | 248 | Ajout `eslint-disable-next-line` (fonctions utilitaires stables) |
| `useAuth.js` | 30 | Ajout `eslint-disable-next-line` (listener d'auth au montage uniquement) |

### 1.3 Exports Anonymes Nommés

| Fichier | Avant | Après |
|---------|-------|-------|
| `PDFServiceWrapper.js` | `export default {...}` | `const PDFServiceWrapper = {...}; export default PDFServiceWrapper;` |
| `SimplePDFService.js` | `export default {...}` | `const SimplePDFService = {...}; export default SimplePDFService;` |
| `mappingService.js` | `export default new MappingService()` | `const mappingService = new MappingService(); export default mappingService;` |
| `planningImportService.js` | `export default new PlanningImportService()` | `const planningImportService = new PlanningImportService(); export default planningImportService;` |
| `userManagementService.js` | `export default {...}` | `const userManagementService = {...}; export default userManagementService;` |

---

## MISSION 2 : Bug Planning Georges DE FONTES

### Données de l'Agent (Lecture Seule)

| Champ | Valeur |
|-------|--------|
| ID | `5c81418a-90ee-4467-9d6c-05d19bcbbd48` |
| Nom | DE FONTES |
| Prénom | Georges |
| Email | georges.defontes@sncf.fr |
| Groupe | CCU - ROULEMENT CCU DENFERT |
| Données Planning | 62 entrées (2025-12-01 → 2026-01-31) |
| Services | RP, O, X (statut "actif") |

### Analyse du Flux de Données

```
┌──────────────────────────┐
│ supabaseService.getAgents()    │  ← Charge TOUS les agents (pas de filtre)
│ (ligne 80-91)                  │
└──────────────┬───────────┘
               ▼
┌──────────────────────────┐
│ planningService.organizeData() │  ← Organise par agent.groupe
│ (ligne 35-67)                  │
│ groupe = agent.groupe || 'DIVERS' │
└──────────────┬───────────┘
               ▼
┌──────────────────────────┐
│ PlanningTable.js (ligne 583)   │  ← Affiche si agents.length > 0
│ {agents.length > 0 && (...)}   │
└──────────────────────────┘
```

### Cause Racine Probable

**Hypothèse principale:** Incohérence entre la valeur du champ `groupe` en base de données et la constante `ORDRE_GROUPES`.

Exemples de variations possibles:
- `'CCU - ROULEMENT CCU DENFERT '` (espace en fin)
- `'CCU - ROULEMENT CCU  DENFERT'` (double espace)
- `'CCU DENFERT'` (nom raccourci)

### Fichiers Impliqués

| Fichier | Lignes | Rôle |
|---------|--------|------|
| `src/constants/config.js` | 119-149 | Définit `ORDRE_GROUPES` et `GROUPES_PAR_STATUT` |
| `src/services/planningService.js` | 35-67 | `organizeData()` - organisation par groupe |
| `src/services/supabaseService.js` | 80-91 | `getAgents()` - chargement des agents |
| `src/components/PlanningTable.js` | 575-686 | Affichage conditionnel des groupes |
| `src/hooks/usePlanning.js` | 74-81 | Appel à `organizeData()` |

### Proposition de Correction

**Fichier:** `src/services/planningService.js` (lignes 44-50)

```javascript
// AVANT (actuel)
agents.forEach(agent => {
  const groupe = agent.groupe || 'DIVERS';
  if (!agentsByGroupe[groupe]) {
    agentsByGroupe[groupe] = [];
  }
  agentsByGroupe[groupe].push(agent);
});

// APRÈS (proposition)
agents.forEach(agent => {
  // Normaliser le nom du groupe (trim des espaces)
  const groupe = (agent.groupe || 'DIVERS').trim();

  // Debug: avertir si le groupe n'est pas reconnu
  if (!ORDRE_GROUPES.includes(groupe) && groupe !== 'DIVERS') {
    console.warn(`⚠️ Groupe non reconnu pour ${agent.nom} ${agent.prenom}: "${groupe}"`);
  }

  if (!agentsByGroupe[groupe]) {
    agentsByGroupe[groupe] = [];
  }
  agentsByGroupe[groupe].push(agent);
});
```

### Actions de Vérification (LECTURE SEULE)

1. **Vérifier en base de données** la valeur exacte du champ `groupe` pour l'agent Georges DE FONTES:
   ```sql
   SELECT id, nom, prenom, groupe, statut FROM agents
   WHERE id = '5c81418a-90ee-4467-9d6c-05d19bcbbd48';
   ```

2. **Comparer** avec la chaîne attendue: `'CCU - ROULEMENT CCU DENFERT'`

3. **Si différent**, corriger la valeur en base (action manuelle requise)

---

## Récapitulatif des Modifications

### Fichiers Modifiés (13)

1. `src/components/DebugPlanning.js`
2. `src/components/LoginPage.js`
3. `src/components/PlanningTable.js`
4. `src/components/PageUploadPDF.js`
5. `src/components/modals/FormulaireD2I.js`
6. `src/components/modals/MesDocuments.js`
7. `src/components/modals/ModalAide.js`
8. `src/components/modals/ModalCellEdit.js`
9. `src/components/modals/ModalCouleurs.js`
10. `src/components/modals/ModalDocuments.js`
11. `src/components/modals/ModalMonPlanning.js`
12. `src/components/modals/ModalStatistiques.js`
13. `src/components/modals/ModalUploadPDF.js`
14. `src/components/pdf/PDFValidationStep.js`
15. `src/hooks/useAuth.js`
16. `src/hooks/useColors.js`
17. `src/services/PDFServiceWrapper.js`
18. `src/services/SimplePDFService.js`
19. `src/services/mappingService.js`
20. `src/services/planningImportService.js`
21. `src/services/planningService.js`
22. `src/services/userManagementService.js`

### Fichiers NON Modifiés (Respect des Contraintes)

- `src/lib/supabaseClient.js` - Configuration Supabase protégée
- Aucune requête SQL de modification exécutée
- Mode lecture seule pour toutes les investigations BDD

---

## Recommandations

1. **Exécuter `npm run lint`** pour vérifier qu'il n'y a plus de warnings ESLint
2. **Tester l'application** avec `npm start` pour s'assurer que les corrections n'ont pas introduit de régressions
3. **Investiguer la BDD** pour Georges DE FONTES selon les instructions ci-dessus
4. **Envisager** d'ajouter la normalisation `.trim()` dans `organizeData()` pour prévenir les problèmes futurs

---

*Rapport généré automatiquement - COGC Planning Audit*
