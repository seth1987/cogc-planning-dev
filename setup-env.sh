#!/bin/bash

# Script de configuration automatique pour COGC Planning Dev
# Ce script crée le fichier .env avec les clés API nécessaires

echo "🚀 Configuration de l'environnement COGC Planning..."

# Créer le fichier .env
cat > .env << 'EOF'
# Configuration API - COGC Planning
# Généré automatiquement le $(date)

# Supabase Configuration
REACT_APP_SUPABASE_URL=https://kbihxjbazmjmpsxkeydf.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiaWh4amJhem1qbXBzeGtleWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgzOTIyNDMsImV4cCI6MjA0Mzk2ODI0M30.l6c7QBQLO-tCae5CdBx-qScUHblJ3L6g_J-BLSEj0hs

# Mistral AI Configuration
REACT_APP_MISTRAL_API_KEY=SABnA5l5iTJh4wdTHKpVwhcQ9D1g4wWD
EOF

echo "✅ Fichier .env créé avec succès !"
echo ""
echo "📋 Configuration appliquée :"
echo "   - Supabase URL : ✓"
echo "   - Supabase Key : ✓"
echo "   - Mistral API Key : ✓"
echo ""
echo "🎯 Prochaines étapes :"
echo "   1. npm install (si pas déjà fait)"
echo "   2. npm start"
echo ""
echo "⚠️  ATTENTION : Ces clés sont exposées publiquement."
echo "    Il est fortement recommandé de les régénérer pour la production."
