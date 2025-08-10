#!/bin/bash
# Script de nettoyage sécurité - À exécuter après avoir récupéré les modifications

echo "🔒 Script de sécurisation du projet"
echo "===================================="
echo ""

# Supprimer les fichiers .env exposés localement et de git
echo "📝 Suppression des fichiers .env exposés..."
git rm --cached .env.local 2>/dev/null || echo "  .env.local déjà supprimé"
git rm --cached .env.configured 2>/dev/null || echo "  .env.configured déjà supprimé"

# Commit si nécessaire
if git diff --cached --quiet; then
    echo "✅ Aucun fichier .env à supprimer"
else
    git commit -m "🔒 Suppression des fichiers .env exposés pour sécurité"
    echo "✅ Fichiers .env supprimés du repository"
fi

echo ""
echo "📦 Installation des dépendances..."
npm install

echo ""
echo "🔑 Configuration des clés API..."
echo "================================"
echo ""

# Créer le fichier .env s'il n'existe pas
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Fichier .env créé depuis .env.example"
    echo ""
    echo "⚠️  ACTIONS REQUISES :"
    echo "---------------------"
    echo "1. Allez sur https://console.mistral.ai"
    echo "   → Régénérez votre clé API (l'ancienne est compromise)"
    echo ""
    echo "2. Allez sur https://app.supabase.com/project/kbihxjbazmjmpsxkeydf/settings/api"
    echo "   → Cliquez sur 'Roll' pour régénérer la clé anon"
    echo ""
    echo "3. Éditez le fichier .env avec vos nouvelles clés :"
    echo "   nano .env"
    echo ""
    echo "4. Redémarrez l'application :"
    echo "   npm start"
else
    echo "✅ Fichier .env existe déjà"
    echo ""
    echo "📝 Vérifiez que vos clés sont à jour dans .env"
    echo "   Si vous avez des erreurs d'API, régénérez vos clés"
fi

echo ""
echo "✅ Script terminé !"