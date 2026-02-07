# 🔍 PROMPT AUDIT CODE - COGC Planning

## CONTEXTE
Tu es chargé d'auditer le code du projet COGC Planning, une application React de gestion des plannings pour agents SNCF.

**Chemin projet:** `C:\Users\Julian\Documents\projet\cogc planing`

---

## ⛔ RÈGLES CRITIQUES

### INTERDICTIONS ABSOLUES
1. **NE PAS TOUCHER À SUPABASE** - Aucune modification de la base de données
2. **NE PAS MODIFIER les fichiers de configuration Supabase** (`src/lib/supabaseClient.js`)
3. **NE PAS EXÉCUTER de requêtes SQL** qui modifient des données
4. **MODE LECTURE SEULE** pour tout ce qui touche à la BDD

### CE QUE TU PEUX FAIRE
- Analyser le code source (lecture)
- Identifier les bugs et erreurs
- Proposer des corrections (sans les appliquer automatiquement sur la BDD)
- Corriger les warnings ESLint dans les fichiers React

---

## 🎯 MISSIONS

### MISSION 1 : Audit général du code

Vérifie les éléments suivants :

1. **Warnings ESLint à corriger** (variables non utilisées, dépendances manquantes) :
   - `src/components/DebugPlanning.js` - useEffect non utilisé
   - `src/components/LoginPage.js` - signInData non utilisé
   - `src/components/PlanningTable.js` - MONTHS, DEFAULT_COLORS, LIGHT_THEME non utilisés
   - `src/components/modals/FormulaireD2I.js` - MapPin, User, Upload non utilisés
   - `src/components/modals/MesDocuments.js` - ExternalLink non utilisé
   - `src/components/modals/ModalAide.js` - Mail, Shield, CheckCircle non utilisés
   - `src/components/modals/ModalCellEdit.js` - PCD_CODES, getMonthNumber, handleDeleteTexteLibre non utilisés
   - `src/components/modals/ModalCouleurs.js` - updateGroupColor non utilisé
   - `src/components/modals/ModalDocuments.js` - ExternalLink non utilisé
   - `src/components/modals/ModalMonPlanning.js` - PCD_CODES, handleDeleteTexteLibre non utilisés
   - `src/components/pdf/PDFValidationStep.js` - toggleFreeTextMode non utilisé
   - `src/hooks/useColors.js` - resolveColorForCode, setIsLoaded non utilisés
   - `src/services/planningService.js` - planning non utilisé

2. **Hooks avec dépendances manquantes** :
   - `src/components/PageUploadPDF.js` ligne 38
   - `src/components/modals/ModalCellEdit.js` ligne 255
   - `src/components/modals/ModalStatistiques.js` lignes 237, 319
   - `src/components/modals/ModalUploadPDF.js` lignes 63, 248
   - `src/hooks/useAuth.js` ligne 30

3. **Exports anonymes** (à nommer) :
   - `src/services/PDFServiceWrapper.js`
   - `src/services/SimplePDFService.js`
   - `src/services/mappingService.js`
   - `src/services/planningImportService.js`
   - `src/services/userManagementService.js`

---

### MISSION 2 : Bug planning Georges DE FONTES

**Problème signalé:** Le planning ne s'affiche pas correctement pour l'agent Georges DE FONTES.

**Données de l'agent (lecture seule - NE PAS MODIFIER) :**
```
ID: 5c81418a-90ee-4467-9d6c-05d19bcbbd48
Nom: DE FONTES
Prénom: Georges
Email: georges.defontes@sncf.fr
Groupe: CCU - ROULEMENT CCU DENFERT
```

**Données planning existantes:**
- 62 entrées du 2025-12-01 au 2026-01-31
- Services: RP, O, X (données valides avec statut "actif")

**Pistes d'investigation (LECTURE SEULE) :**

1. **Vérifier le filtrage par groupe** dans :
   - `src/components/PlanningTable.js`
   - `src/services/planningService.js`
   - Le groupe "CCU - ROULEMENT CCU DENFERT" est-il bien reconnu ?

2. **Vérifier le mapping des groupes** dans :
   - `src/constants/` (chercher les définitions de groupes)
   - Le groupe CCU Denfert est-il dans la liste des groupes valides ?

3. **Vérifier les requêtes de chargement** :
   - Comment sont chargés les agents par groupe ?
   - Y a-t-il un filtre qui exclut certains groupes ?

4. **Vérifier l'affichage conditionnel** :
   - Y a-t-il des conditions qui masquent certains agents ?
   - Le site "Denfert-Rochereau" est-il correctement géré ?

**Output attendu :**
- Identifier la CAUSE RACINE du problème
- Proposer la CORRECTION (code à modifier)
- NE PAS appliquer de modification sur Supabase

---

## 📁 STRUCTURE PROJET

```
src/
├── components/
│   ├── modals/           # Fenêtres modales (FormulaireD2I, ModalCouleurs, etc.)
│   ├── pdf/              # Composants validation PDF
│   ├── PlanningTable.js  # Table principale du planning
│   └── ...
├── constants/            # Constantes (codes services, groupes, couleurs)
├── hooks/                # Hooks React personnalisés
├── lib/
│   └── supabaseClient.js # ⛔ NE PAS MODIFIER
├── services/             # Services métier
└── utils/                # Utilitaires
```

---

## ✅ LIVRABLES ATTENDUS

1. **Rapport d'audit** avec liste des problèmes trouvés
2. **Corrections ESLint** appliquées aux fichiers concernés
3. **Diagnostic Georges DE FONTES** avec cause et solution proposée
4. **Commits Git** avec messages descriptifs (préfixe: 🔧 ou 🐛)

---

## 🚀 COMMANDES UTILES

```bash
# Lancer l'app en dev
npm start

# Vérifier les erreurs ESLint
npx eslint src/ --ext .js,.jsx

# Voir les branches
git branch -a
```

---

*Prompt généré le 18 janvier 2026 - COGC Planning Dev*
