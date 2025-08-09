# Guide de déploiement

## 📦 Build de production

```bash
npm run build
```

Cela créera un dossier `build` avec l'application optimisée pour la production.

## 🚀 Options de déploiement

### 1. Vercel (Recommandé)

1. Installer Vercel CLI:
```bash
npm i -g vercel
```

2. Déployer:
```bash
vercel
```

3. Suivre les instructions pour lier votre projet

### 2. Netlify

1. Build le projet:
```bash
npm run build
```

2. Glisser-déposer le dossier `build` sur [Netlify Drop](https://app.netlify.com/drop)

### 3. GitHub Pages

1. Installer gh-pages:
```bash
npm install --save-dev gh-pages
```

2. Ajouter dans package.json:
```json
"homepage": "https://seth1987.github.io/cogc-planning-dev",
"scripts": {
  "predeploy": "npm run build",
  "deploy": "gh-pages -d build"
}
```

3. Déployer:
```bash
npm run deploy
```

## ⚙️ Variables d'environnement

Assurez-vous de configurer les variables d'environnement sur votre plateforme de déploiement:

- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`

## 🔒 Sécurité

- Ne jamais commiter le fichier `.env` avec les vraies clés
- Utiliser HTTPS en production
- Activer les CORS appropriés dans Supabase
- Configurer les domaines autorisés dans Supabase