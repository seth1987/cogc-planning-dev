# Documents COGC

⚠️ **Les documents sont maintenant stockés dans Supabase Storage**

Ce dossier n'est plus utilisé pour stocker les fichiers.

## Architecture actuelle

- **Stockage** : Bucket Supabase `documents`
- **Métadonnées** : Table PostgreSQL `documents`
- **Gestion** : Via le modal Documents dans l'application

## Fonctionnalités

- ✅ Upload de documents (PDF/DOCX)
- ✅ Téléchargement
- ✅ Suppression
- ✅ Catégorisation (accidents, cet, greve, remuneration, autre)
- ✅ Recherche

## Catégories disponibles

| ID | Nom | Description |
|----|-----|-------------|
| accidents | Accidents du travail | AT/MP, déclarations |
| cet | Compte Épargne Temps | Épargne, monétisation |
| greve | Mouvements sociaux | Déclarations intention |
| remuneration | Rémunération | Paiements fériés, etc. |
| autre | Autres documents | Documents divers |
