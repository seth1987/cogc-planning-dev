# Configuration API Mistral

## 🔑 Comment obtenir une clé API Mistral

1. **Créer un compte** sur [console.mistral.ai](https://console.mistral.ai/)
2. **Valider votre email**
3. **Aller dans "API Keys"** dans le menu de gauche
4. **Créer une nouvelle clé** avec le bouton "Create new key"
5. **Copier la clé** (elle ne sera plus visible après)

## ⚙️ Configuration dans le projet

1. **Créer le fichier `.env`** à la racine du projet :
```bash
cp .env.example .env
```

2. **Éditer le fichier `.env`** et ajouter votre clé :
```
REACT_APP_MISTRAL_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
```

3. **Redémarrer l'application** :
```bash
# Arrêter avec Ctrl+C
npm start
```

## 🎯 Tarifs Mistral

- **Mistral Large** : ~$4 pour 1M tokens (recommandé pour la précision)
- Un bulletin de commande = environ 2000 tokens
- Coût par bulletin : ~$0.008 (moins d'1 centime)

## 🔧 Mode de secours

Si la clé API n'est pas configurée ou si l'API est indisponible :
- Le module bascule automatiquement en **mode parsing manuel**
- Moins précis mais fonctionnel
- Un message vous indique le mode utilisé

## ❓ Problèmes fréquents

### Erreur 401 : Clé invalide
- Vérifiez que la clé commence par `sk-`
- Vérifiez qu'elle est bien copiée sans espaces

### Erreur 429 : Limite atteinte
- Attendez quelques minutes
- Vérifiez votre quota sur console.mistral.ai

### L'API ne répond pas
- Le module bascule automatiquement en mode manuel
- Vérifiez votre connexion internet

## 📊 Suivi des uploads

Les uploads sont enregistrés dans la table `uploads_pdf` avec :
- Le nom du fichier
- L'agent concerné
- Le nombre d'entrées importées
- Le mode de parsing utilisé (mistral ou manuel)

## 📝 Format des bulletins supportés

Le module reconnaît automatiquement :
- Les codes horaires (ACR001, CCU002, etc.)
- Les repos (RP, RPP)
- Les congés (C, CONGE)
- Les services spéciaux (DISPO, HAB, VISIMED, etc.)
- **Important** : Les nuits (003) sont automatiquement décalées au lendemain

## 🆘 Support

En cas de problème :
1. Vérifiez le fichier `.env`
2. Vérifiez la console du navigateur (F12)
3. Testez avec le mode manuel
4. Contactez le support technique