# 🚀 Configuration Rapide

## 📋 Copier-coller pour votre fichier .env local

Créez un fichier `.env` à la racine de votre projet et copiez-collez ceci :

```env
# Configuration Supabase
REACT_APP_SUPABASE_URL=https://kbihxjbazmjmpsxkeydf.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiaWh4amJhem1qbXBzeGtleWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzMTEzNjksImV4cCI6MjA2Njg4NzM2OX0.lvbPBBbiweTEIUi0JK7hvLvTD7EuF9EazN7l2PZbiYU

# Configuration API Mistral
REACT_APP_MISTRAL_API_KEY=SABnA5l5iTJh4wdTHKpVwhcQ9D1g4wWD

# Environnement
REACT_APP_ENV=development
```

## 🔧 Étapes pour démarrer

1. **Récupérer les dernières modifications** :
```bash
git pull origin main
```

2. **Créer le fichier .env** (copiez le contenu ci-dessus) :
```bash
nano .env
# Ou utilisez votre éditeur préféré
```

3. **Installer les dépendances** (si pas déjà fait) :
```bash
npm install
```

4. **Démarrer l'application** :
```bash
npm start
```

## ✅ Vérification

L'application devrait démarrer sur http://localhost:3000

- **Module Upload PDF** : Devrait maintenant fonctionner avec votre clé Mistral
- **Base de données** : Connectée à Supabase
- **Mode** : Si l'API Mistral échoue, bascule automatiquement en mode parsing manuel

## 🎯 Test rapide

1. Connectez-vous à l'application
2. Allez dans la section Upload
3. Testez avec un bulletin de commande PDF
4. Vérifiez que le parsing fonctionne (avec Mistral ou en mode manuel)

## ⚠️ Important

**NE JAMAIS** commiter le fichier `.env` sur GitHub ! Il est déjà dans `.gitignore`.

## 📝 Problèmes connus résolus

- ✅ Erreur API Mistral → Mode parsing manuel automatique
- ✅ Clé Mistral manquante → Instructions claires affichées
- ✅ Format de clé différent (pas de préfixe sk-) → Accepté

## 🆘 Support

Si vous avez des problèmes après cette configuration :
1. Vérifiez la console du navigateur (F12)
2. Vérifiez que le fichier `.env` est bien à la racine
3. Redémarrez le serveur après modification du `.env`