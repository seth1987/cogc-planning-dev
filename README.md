# COGC Planning Dev

Application de gestion de planning pour le COGC Paris Nord - Version développement

## 🚀 Technologies utilisées

- **Frontend**: React 18
- **Base de données**: Supabase (PostgreSQL)
- **Authentification**: Supabase Auth
- **UI Components**: React Calendar
- **Gestion des dates**: date-fns

## 📋 Prérequis

- Node.js 16+ et npm
- Un compte Supabase (gratuit)
- Git

## 🛠 Installation

1. Cloner le repository
```bash
git clone https://github.com/seth1987/cogc-planning-dev.git
cd cogc-planning-dev
```

2. Installer les dépendances
```bash
npm install
```

3. Configuration de l'environnement
```bash
cp .env.example .env
```

Modifiez le fichier `.env` avec vos propres clés Supabase si nécessaire.

4. Lancer l'application en développement
```bash
npm start
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

## 🗄 Base de données

Voir [DATABASE.md](DATABASE.md) pour la structure complète de la base de données.

## 🚀 Déploiement

Voir [DEPLOYMENT.md](DEPLOYMENT.md) pour les instructions de déploiement.

## 📝 Fonctionnalités principales

- ✅ Authentification des utilisateurs (médecins)
- ✅ Gestion des plannings (création, modification, suppression)
- ✅ Vue calendrier interactive
- ✅ Système de gardes (jour, nuit, weekend)
- ✅ Gestion des absences et congés
- ✅ Export des plannings
- ✅ Notifications et rappels
- ✅ Statistiques et rapports

## 👥 Équipe

Développé pour le COGC Paris Nord

## 📄 Licence

Propriétaire - COGC Paris Nord