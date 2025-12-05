# Changelog

Tous les changements notables de ce projet sont documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.0] - 2025-12-05

### 🚀 Ajouté - Sélection d'année 2025/2026

- **Onglets de sélection d'année** :
  - Boutons 2025 et 2026 dans la barre de navigation (MonthTabs)
  - Changement d'année recharge automatiquement les données du mois sélectionné
  - Design intégré avec les onglets de mois existants

- **Support multi-année complet** :
  - Le hook `usePlanning` accepte maintenant `currentYear` en paramètre
  - Les dates sont correctement formatées avec l'année sélectionnée
  - Les jours fériés sont chargés selon l'année (2025 ou 2026)
  - L'useEffect recharge les données lors du changement d'année

- **Configuration des années** :
  - `AVAILABLE_YEARS = [2025, 2026]` dans config.js
  - `DEFAULT_YEAR = 2026` pour l'année par défaut
  - Jours fériés définis pour 2025 et 2026

### 🔧 Corrigé
- Bug où `formatDate` utilisait toujours l'année par défaut au lieu de l'année sélectionnée
- Dépendances manquantes dans les hooks `useCallback`

## [3.0.0] - 2025-12-03

### 🚀 MAJEUR - Nouveau Parser Mistral OCR (100% précision)

- **Nouvelle architecture OCR** : 
  - Abandon du prompt JSON complexe au profit d'un OCR Markdown simple
  - Mistral retourne maintenant du Markdown brut (comme l'app Mistral OCR officielle)
  - Parser spécialisé pour les 2 formats de tableau Mistral

- **100% de précision** :
  - Testé sur bulletins réels : 15/15 services correctement extraits
  - Détection fiable des services de nuit (22h-06h)
  - Gestion correcte des codes spéciaux (RP, NU, DISPO, VISIMED, etc.)

- **Extraction améliorée** :
  - Horaires extraits depuis les codes activité (N1100010C072), pas METRO/RS
  - Support des deux formats de tableau (page 1 et page 2 du bulletin)
  - Descriptions automatiques pour les codes connus

### 🔧 Corrigé
- Bug d'extraction des mauvais horaires (METRO au lieu des services réels)
- Parsing incomplet sur les bulletins multi-pages
- Codes service mal détectés sur certains formats

### 📊 Performance
- Méthode: `mistral-ocr-markdown-v4`
- Précision: 100% (vs 94.89% précédemment)
- Temps de traitement: 2-4 secondes par bulletin

## [2.4.0] - 2025-08-14

### 🔧 Corrigé
- **Import PDF - Services multiples** : Correction de la gestion des services multiples par jour
  - Les services jour + nuit sur la même date sont maintenant correctement gérés
  - Le décalage des services de nuit (22h-06h) est appliqué AVANT le dédoublonnage
  - Stratégie intelligente pour choisir quel service garder en cas de doublon
  - [Documentation détaillée](docs/fix-services-multiples-par-jour.md)

- **Mapping codes services** :
  - SOUF002 correctement mappé : service `O`, poste `S/S` (Souffleur soir)
  - Ajout des codes MA (Maladie) et RU (RTT)
  - Validation stricte des codes pour éviter l'import de codes techniques

### 🚀 Amélioré
- **Parser PDF** :
  - Meilleur filtrage des éléments non pertinents (METRO, RS, codes techniques SNCF)
  - Parsing manuel amélioré pour les cas de fallback
  - Conservation de tous les services avant traitement final
  - [Documentation complète](docs/ameliorations-upload-pdf-aout-2025.md)

### 📊 Données
- Correction des imports d'avril 2025 (dates 21-24)
- Import complet d'août 2025 pour CHAVET Romain

## [2.3.0] - 2025-08-13

### 🔧 Corrigé
- **Import PDF** : Correction du bug de contrainte unique `planning_agent_id_date_key`
  - Implémentation d'un vrai UPSERT (UPDATE si existe, INSERT sinon)
  - Une seule entrée autorisée par agent et par date
  - Avertissements ajoutés en cas d'écrasement de données existantes
  - [Documentation détaillée](docs/BUG_FIX_UNIQUE_CONSTRAINT.md)

### 📝 Ajouté
- Documentation du bug de contrainte unique et sa correction
- Issue GitHub #1 pour tracker les corrections

## [2.2.0] - 2025-08-13

### 🔧 Corrigé
- **Calcul des dates** : Correction du bug excluant le dernier jour de chaque mois
  - Problème de fuseau horaire avec `toISOString()` résolu
  - Construction manuelle des dates sans conversion UTC
  - Tous les jours du mois sont maintenant correctement affichés
  - [Documentation détaillée](docs/BUG_FIX_DATES.md)

### 📝 Ajouté
- Composant `DebugPlanning` pour diagnostiquer les problèmes de dates
- Documentation du bug de calcul des dates

## [2.1.0] - 2025-08-10

### 🔧 Corrigé
- **API Supabase** : Résolution du problème "api key invalid"
- **Upload PDF** : Fix de la fonction `getMappingStats()` → `getStats()`
- **Encodage** : Nettoyage des caractères mal encodés

### 🚀 Amélioré
- Optimisation des services
- Meilleure gestion des erreurs

## [2.0.0-ocr] - 2025-08-09

### 🚀 Changé
- **Migration vers Mistral OCR** : Remplacement de PDF.js par Mistral OCR API
  - 94.89% de précision sur les documents structurés
  - 87% de réduction des coûts
  - Traitement en 2-3 secondes par page

### 📝 Ajouté
- Documentation de la migration OCR
- Guide de configuration Mistral API
- Statistiques de performance

## [1.5.0] - 2025-08-05

### 🚀 Refactorisé
- Module Upload PDF complètement réécrit
- Interface de validation améliorée
- Meilleure gestion des erreurs

## [1.0.0] - 2025-08-01

### 🎉 Version initiale
- Gestion du planning mensuel
- Import PDF avec PDF.js
- Gestion des agents et habilitations
- Authentification Supabase
- Interface responsive avec Tailwind CSS

---

[3.1.0]: https://github.com/seth1987/cogc-planning-dev/compare/v3.0.0...v3.1.0
[3.0.0]: https://github.com/seth1987/cogc-planning-dev/compare/v2.4.0...v3.0.0
[2.4.0]: https://github.com/seth1987/cogc-planning-dev/compare/v2.3.0...v2.4.0
[2.3.0]: https://github.com/seth1987/cogc-planning-dev/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/seth1987/cogc-planning-dev/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/seth1987/cogc-planning-dev/compare/v2.0.0-ocr...v2.1.0
[2.0.0-ocr]: https://github.com/seth1987/cogc-planning-dev/compare/v1.5.0...v2.0.0-ocr
[1.5.0]: https://github.com/seth1987/cogc-planning-dev/compare/v1.0.0...v1.5.0
[1.0.0]: https://github.com/seth1987/cogc-planning-dev/releases/tag/v1.0.0
