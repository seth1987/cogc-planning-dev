# Module Upload PDF - Documentation

## 📚 Architecture refactorisée

Le module Upload PDF a été complètement refactorisé pour une meilleure maintenabilité et performance.

### Structure des fichiers

```
src/
├── services/
│   ├── mappingService.js       # Gestion mapping codes via BDD
│   ├── pdfParserService.js     # Extraction et parsing PDF
│   └── planningImportService.js # Import dans la base de données
├── components/
│   ├── modals/
│   │   └── ModalUploadPDF.js   # Modal principal (refactorisé)
│   └── pdf/
│       ├── PDFUploadStep.js    # Étape 1: Upload
│       ├── PDFValidationStep.js # Étape 2: Validation
│       └── PDFImportResult.js  # Étape 3: Résultat
```

## 🚀 Améliorations principales

### 1. Utilisation de la table `codes_services`
- **69 codes** mappés dans la base de données
- Plus de mapping hardcodé dans le code
- Cache intelligent (5 minutes) pour les performances
- Fallback automatique si BDD inaccessible

### 2. Architecture modulaire
- **Services séparés** : logique métier isolée
- **Composants réutilisables** : UI divisée en étapes
- **Code réduit** : Modal principal de 46KB → 13KB

### 3. Nouvelles fonctionnalités
- **Statistiques en temps réel** : affichage des codes disponibles
- **Validation améliorée** : détection erreurs/warnings
- **Import intelligent** : gestion des doublons et mise à jour
- **Rollback** : possibilité d'annuler le dernier import
- **Mode multi-étapes** : workflow clair avec progression

## 📊 Table `codes_services`

### Structure
```sql
CREATE TABLE codes_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR NOT NULL UNIQUE,        -- Code SNCF (ex: CRC001)
  service_code VARCHAR NOT NULL,       -- Service (-, O, X, RP, etc.)
  poste_code VARCHAR,                  -- Poste (CRC, ACR, RE, etc.)
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Codes spéciaux à noter
- **CCU004/005/006** → Poste **RE** (pas CCU)
- **CENT001/002/003** → Poste **RC** (pas CENT)
- **REO007** → Poste **RO** (attention au mapping)
- **REO008** → Poste **RO**
- **SOUF001/002** → Poste **S/S** ou **SOUF**

## 🔄 Workflow d'import

### 1. Upload (PDFUploadStep)
- Sélection du fichier PDF
- Vérification de la configuration API
- Affichage des stats de mapping

### 2. Parsing
- Extraction du texte avec PDF.js
- Parsing IA (Mistral) ou manuel
- Conversion avec mapping BDD
- Gestion des services de nuit (décalage J+1)

### 3. Validation (PDFValidationStep)
- Affichage groupé par date
- Édition possible des entrées
- Détection des doublons
- Validation des données

### 4. Import (planningImportService)
- Recherche de l'agent
- Gestion des conflits
- Import en base
- Rapport détaillé

### 5. Résultat (PDFImportResult)
- Statistiques d'import
- Erreurs et warnings
- Possibilité de rollback

## 🛠️ Configuration

### Variables d'environnement
```env
# API Mistral pour parsing IA (optionnel)
REACT_APP_MISTRAL_API_KEY=your_key_here

# Supabase
REACT_APP_SUPABASE_URL=your_url
REACT_APP_SUPABASE_ANON_KEY=your_key
```

### Mise à jour du mapping
```javascript
// Ajouter un nouveau code
await mappingService.addMapping(
  'NEW001',      // code
  '-',           // service_code (-, O, X)
  'NEW',         // poste_code
  'Description'  // description
);

// Mettre à jour un code existant
await mappingService.updateMapping('CRC001', {
  service_code: 'O',
  description: 'Nouveau description'
});
```

## 🐛 Corrections à apporter dans la BDD

### Codes à vérifier
1. **CENT001** : `poste_code` est NULL, devrait être "RC" ?
2. **REO007** : Vérifier si c'est bien "RO" et non "RE"

### Script de correction SQL
```sql
-- Corriger CENT001
UPDATE codes_services 
SET poste_code = 'RC' 
WHERE code = 'CENT001';

-- Vérifier/Corriger REO007
UPDATE codes_services 
SET poste_code = 'RO' 
WHERE code = 'REO007';
```

## 📈 Performances

### Optimisations appliquées
- **Cache mapping** : 5 minutes (évite requêtes répétées)
- **Batch processing** : traitement groupé par date
- **Deep copy** : évite les mutations d'état
- **Lazy loading** : composants chargés à la demande

### Métriques
- Taille du modal : **-72%** (46KB → 13KB)
- Temps de parsing : ~2-3 secondes
- Import : ~1-2 secondes pour 30 jours

## 🔮 Évolutions futures

### Court terme
- [ ] Support multi-fichiers PDF
- [ ] Export CSV des données parsées
- [ ] Prévisualisation PDF dans le modal
- [ ] Historique des imports avec détails

### Moyen terme
- [ ] Web Workers pour parsing lourd
- [ ] OCR pour PDF scannés
- [ ] Templates de mapping personnalisés
- [ ] API REST pour import externe

### Long terme
- [ ] Machine Learning pour améliorer le parsing
- [ ] Détection automatique des patterns
- [ ] Import depuis email automatique
- [ ] Intégration API SNCF directe

## 📝 Notes importantes

1. **Services de nuit** : Toujours décalés au jour suivant
2. **Doublons** : Gérés automatiquement (mise à jour)
3. **Cache** : Invalidé après chaque modification
4. **Fallback** : Mapping minimal si BDD inaccessible
5. **Rollback** : Possible uniquement pour le dernier import

## 🤝 Contribution

Pour modifier le module :
1. Services dans `/src/services/`
2. Composants dans `/src/components/pdf/`
3. Tests dans `/__tests__/`
4. Documentation ici

---

*Dernière mise à jour : 10/08/2025*
