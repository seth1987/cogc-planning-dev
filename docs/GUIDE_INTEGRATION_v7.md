# 📋 BulletinParserService v7.0 - Guide d'Intégration

## 🎯 Résumé des Améliorations

### ✅ Détection du Nom de l'Agent
**Avant :** Ne détectait que le format "NOM Prénom" (ex: "GILLON Thomas")
**Après :** Détecte aussi "NOM PRÉNOM" tout en majuscules (ex: "GILLON THOMAS")

**Stratégies de détection :**
1. Pattern direct après "Agent :" sur la même ligne
2. Recherche dans les 3 lignes suivant "Agent :" (en sautant "COGC PN")
3. Recherche générale dans les 15 premières lignes

### ✅ Gestion Automatique des Services de Nuit
**Logique SNCF :**
- Service de nuit = 22h00 (J) → 06h00 (J+1)
- Le "X" doit apparaître sur le jour J de DÉBUT du service
- Un "X" automatique est généré sur J+1 pour marquer la fin de nuit

**Exemple :**
```
24/04/2025 CCU003 (22:00-06:00) → X sur le 24/04
                                  → X auto-généré sur le 25/04 (fin de nuit)
```

### ✅ Mapping Complet des 89+ Codes SNCF
Tous les codes de service sont correctement mappés :

| Code PDF | Service | Poste | Type |
|----------|---------|-------|----- |
| CRC001 | - | CRC | Matin |
| CRC002 | O | CRC | Soir |
| CRC003 | X | CRC | Nuit |
| ACR001 | - | ACR | Matin |
| ACR002 | O | ACR | Soir |
| ACR003 | X | ACR | Nuit |
| CCU001 | - | CCU | Matin |
| CCU002 | O | CCU | Soir |
| CCU003 | X | CCU | Nuit |
| CCU004 | - | **RE** | Matin |
| CCU005 | O | **RE** | Soir |
| CCU006 | X | **RE** | Nuit |
| RP | RP | - | Repos |
| NU | NU | - | Non utilisé |
| DISPO | D | - | Disponible |
| INACTIN | I | - | Indisponible |

---

## 📁 Fichiers Créés

### 1. `BulletinParserService.js`
Service principal de parsing avec toutes les améliorations.

**Utilisation :**
```javascript
import BulletinParserService from './BulletinParserService';

const parser = new BulletinParserService();
const resultat = parser.parseBulletin(texteOCR);

console.log(resultat.agent);      // "GILLON THOMAS"
console.log(resultat.numeroCP);   // "8409385L"
console.log(resultat.services);   // Array des services
```

### 2. `TesteurBulletinParser.jsx`
Composant React interactif pour tester le parsing.

---

## 🔧 Intégration dans le Projet COGC

### Étape 1 : Le fichier a été remplacé automatiquement
Le fichier `src/services/BulletinParserService.js` a été mis à jour avec la v7.

### Étape 2 : Mettre à jour les imports si nécessaire
```javascript
// Dans pdfParserServiceV2.js ou le module d'upload
import BulletinParserService from './BulletinParserService';
```

### Étape 3 : Utiliser le nouveau parser
```javascript
const parser = new BulletinParserService();
const resultat = parser.parseBulletin(texteOCR);

// Accéder aux données
const agent = resultat.agent;           // Nom de l'agent
const services = resultat.services;     // Array des services

// Chaque service contient :
// {
//   date: "2025-04-21",
//   code_service: "-",
//   poste: "RE",
//   est_nuit: false,
//   genere_auto: false  // true si X auto-généré
// }
```

---

## 📊 Résultats du Test (Bulletin GILLON THOMAS)

```
📋 MÉTADONNÉES:
  Agent:    GILLON THOMAS ✅
  N° CP:    8409385L ✅
  Période:  21/04/2025 → 30/04/2025 ✅

📅 SERVICES EXTRAITS (11 total):
Date        │ Service │ Poste │ Type    │ Notes
────────────────────────────────────────────────
2025-04-21  │   -     │ RE    │ ☀️ Jour │
2025-04-22  │   -     │ CRC   │ ☀️ Jour │
2025-04-23  │   -     │ RE    │ ☀️ Jour │
2025-04-24  │   NU    │ -     │ ☀️ Jour │
2025-04-24  │   X     │ CCU   │ 🌙 Nuit │
2025-04-25  │   X     │ CCU   │ 🌙 Nuit │
2025-04-26  │   X     │ CCU   │ 🌙 Nuit │ (auto)
2025-04-27  │   RP    │ -     │ ☀️ Jour │
2025-04-28  │   RP    │ -     │ ☀️ Jour │
2025-04-29  │   I     │ -     │ ☀️ Jour │
2025-04-30  │   D     │ -     │ ☀️ Jour │
```

---

## 🐛 Problèmes Résolus

| Problème | Avant | Après |
|----------|-------|-------|
| Nom agent non détecté | ❌ "GILLON THOMAS" ignoré | ✅ Détecté correctement |
| CCU004 → mauvais poste | Pas de poste | ✅ Poste RE |
| Nuits non décalées | X sur mauvais jour | ✅ X auto sur J+1 |
| Doublons NU + Nuit | Conflit | ✅ 2 entrées distinctes |

---

## 📝 Notes Techniques

### Pattern de détection des codes
```javascript
// Accepte "CCU004 Lun" ou "CCU004" seul
/\b([A-Z]{2,4})(\d{3})\b/
```

### Post-traitement des nuits
```javascript
if (service.est_nuit && service.code_service === 'X') {
  // Calculer la date du lendemain
  const dateLendemain = addDays(service.date, 1);
  
  // Ajouter X auto seulement si pas déjà de service ce jour
  if (!existeService(dateLendemain)) {
    ajouterService({
      date: dateLendemain,
      code_service: 'X',
      genere_auto: true
    });
  }
}
```

---

## 🚀 Prochaines Améliorations Suggérées

1. **Validation avec Supabase** - Vérifier que l'agent existe en base
2. **Détection de conflits** - Alerter si un service existe déjà à cette date
3. **Support multi-pages** - Gérer les bulletins de plus de 2 pages
4. **Export CSV** - Permettre l'export des données parsées

---

*Version 7.0.0 - Créé le 04/12/2025*
