# Planning COGC Paris Nord

Application de gestion de planning pour le COGC Paris Nord avec importation automatique des bulletins de commande via **Mistral OCR**.

## 🚀 Nouveauté : Migration vers Mistral OCR

L'application utilise maintenant **Mistral OCR** (`mistral-ocr-latest`) pour l'extraction de documents, offrant :
- 📊 **94.89% de précision** sur les documents structurés
- 💰 **87% de réduction des coûts** par rapport à l'ancienne méthode
- ⚡ **Traitement plus rapide** (2-3s par bulletin)
- 🎯 **Meilleure gestion** des tableaux et mises en page complexes

## Fonctionnalités

- 📅 **Gestion du planning** : Visualisation et édition du planning mensuel
- 👥 **Gestion des agents** : Création, modification, suppression d'agents
- 🎯 **Gestion des habilitations** : Attribution des postes aux agents
- 📄 **Import PDF avec OCR** : Extraction intelligente via Mistral OCR API
- 🔐 **Authentification** : Connexion sécurisée via Supabase
- 📊 **Groupes réductibles** : Interface optimisée avec groupes réductibles
- 🗄️ **Base de données** : 69 codes services mappés dans la BDD

## Installation

1. Clonez le repository :
```bash
git clone https://github.com/seth1987/cogc-planning-dev.git
cd cogc-planning-dev
```

2. Installez les dépendances :
```bash
npm install
```

3. Configurez les variables d'environnement :
```bash
cp .env.example .env
```

Puis éditez le fichier `.env` avec vos clés :
```
REACT_APP_SUPABASE_URL=votre_url_supabase
REACT_APP_SUPABASE_ANON_KEY=votre_clé_anon_supabase
REACT_APP_MISTRAL_API_KEY=votre_clé_api_mistral  # Obligatoire pour l'OCR
```

## Module Upload PDF avec Mistral OCR

Le module d'upload PDF utilise **Mistral OCR API** pour extraire automatiquement et intelligemment les informations des bulletins de commande.

### Configuration de l'API Mistral

1. Créez un compte sur [Mistral AI](https://console.mistral.ai/)
2. Générez une clé API dans votre console
3. Ajoutez la clé dans votre fichier `.env`

### Utilisation

1. Cliquez sur "Upload PDF" dans l'en-tête
2. Sélectionnez votre bulletin de commande PDF
3. **Mistral OCR** extrait automatiquement :
   - Le nom de l'agent
   - Les dates et services
   - Les codes horaires (matin/soir/nuit)
   - Les postes assignés
   - Les tableaux complexes
4. **Interface de validation** : Vérifiez et corrigez si nécessaire
5. Cliquez sur "Valider et Enregistrer"

### Avantages de Mistral OCR

| Fonctionnalité | Performance |
|----------------|-------------|
| Précision globale | 94.89% |
| Reconnaissance tableaux | 96.12% |
| Documents scannés | 98.96% |
| Coût par page | 0.001$ |
| Temps de traitement | 2-3 secondes |

### Format des codes

Le système convertit automatiquement avec la table `codes_services` :
- **Horaires** : 001 = Matin (-), 002 = Soir (O), 003 = Nuit (X)
- **Repos** : RP/RPP → RP
- **Congés** : C/CONGE → C
- **Disponible** : DISPO → D
- **Formation** : HAB/FORMATION → HAB
- **Maladie** : MA/MALADIE → MA

## Structure de la base de données

- `agents` : Informations des agents
- `planning` : Entrées du planning
- `habilitations` : Habilitations des agents
- `uploads_pdf` : Historique des imports PDF
- `codes_services` : Mapping des codes SNCF (69 codes)
- `notes` : Notes sur les agents

## Technologies utilisées

- React 18
- Supabase (PostgreSQL)
- **Mistral OCR API** (nouvelle)
- ~~PDF.js~~ (supprimé - remplacé par Mistral OCR)
- Tailwind CSS
- Lucide React Icons

## Démarrage

```bash
npm start
```

L'application sera accessible sur http://localhost:3000

## Déploiement

Build de production :
```bash
npm run build
```

## Documentation

- 📝 [Guide d'installation rapide](INSTALLATION_RAPIDE.md)
- 🚀 [Documentation de la migration OCR](MIGRATION_MISTRAL_OCR.md)
- 📄 [Refactoring du module PDF](REFACTORING_UPLOAD_PDF.md)
- 🗄️ [Structure de la base de données](DATABASE.md)
- 🚀 [Guide de déploiement](DEPLOYMENT.md)

## Versions

- **v2.1.0** : Corrections et améliorations (10/08/2025)
- **v2.0.0-ocr** : Migration vers Mistral OCR
- **v1.5.0** : Refactoring complet du module Upload PDF
- **v1.0.0** : Version initiale avec PDF.js

## Corrections récentes (v2.1.0)

✅ **Correction du problème "api key invalid"**
- Mise à jour de la clé API Supabase
- Résolution des problèmes de connexion

✅ **Correction de l'upload PDF**
- Fix de la fonction `getMappingStats()` → `getStats()`
- Résolution de l'erreur "is not a function"

✅ **Améliorations du code**
- Nettoyage de l'encodage des caractères
- Optimisation des services

## Support

Pour toute question ou problème, contactez l'équipe de développement.

---

*Dernière mise à jour : 10 Août 2025*