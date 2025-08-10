# Planning COGC Paris Nord

Application de gestion de planning pour le COGC Paris Nord avec importation automatique des bulletins de commande.

## Fonctionnalités

- 📅 **Gestion du planning** : Visualisation et édition du planning mensuel
- 👥 **Gestion des agents** : Création, modification, suppression d'agents
- 🎯 **Gestion des habilitations** : Attribution des postes aux agents
- 📄 **Import PDF** : Importation automatique des bulletins de commande via l'API Mistral
- 🔒 **Authentification** : Connexion sécurisée via Supabase
- 📊 **Groupes réductibles** : Interface optimisée avec groupes réductibles

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
REACT_APP_MISTRAL_API_KEY=votre_clé_api_mistral
```

## Module Upload PDF

Le module d'upload PDF utilise l'API Mistral pour extraire automatiquement les informations des bulletins de commande.

### Configuration de l'API Mistral

1. Créez un compte sur [Mistral AI](https://console.mistral.ai/)
2. Générez une clé API dans votre console
3. Ajoutez la clé dans votre fichier `.env`

### Utilisation

1. Cliquez sur "Upload PDF" dans l'en-tête
2. Sélectionnez votre bulletin de commande PDF
3. L'IA extrait automatiquement :
   - Le nom de l'agent
   - Les dates et services
   - Les codes horaires (matin/soir/nuit)
   - Les postes assignés
4. **Interface de validation** : Vérifiez et corrigez si nécessaire
5. Cliquez sur "Valider et Enregistrer"

### Format des codes

Le système convertit automatiquement :
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

## Technologies utilisées

- React 18
- Supabase (PostgreSQL)
- Mistral AI API
- PDF.js
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

## Support

Pour toute question ou problème, contactez l'équipe de développement.