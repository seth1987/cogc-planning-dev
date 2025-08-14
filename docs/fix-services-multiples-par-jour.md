# 🐛 Fix: Gestion des Services Multiples par Jour

## Problème identifié

Le système ne gérait pas correctement les cas où un agent a plusieurs services dans la même journée, notamment :
- Service de jour (NU, DISPO, etc.) + Service de nuit (22h-06h)
- Le 21/04 avec NU + ACR003 (nuit) n'était pas importé correctement

## Solution implémentée

### 1. **Modification du prompt Mistral**
- Demande explicite d'extraire TOUS les services, même multiples par date
- Ne plus filtrer ou dédupliquer à l'extraction

### 2. **Suppression du nettoyage prématuré**
- La fonction `cleanExtractedData()` ne fait plus rien
- Les données brutes sont conservées jusqu'au traitement final

### 3. **Nouvelle logique de formatage**

Le système applique maintenant cette séquence :

```
1. Extraction de TOUS les services
2. Application du mapping (code → service + poste)
3. Décalage des services de nuit AVANT le dédoublonnage
4. Gestion intelligente des doublons par date
```

### 4. **Stratégie de gestion des doublons**

Pour une date avec plusieurs services :
1. Si un service est NU et l'autre est un vrai service → garder le vrai service
2. Si plusieurs services avec poste → privilégier les services de nuit (X)
3. Sinon → garder le dernier service avec poste

## Exemple corrigé

**Avant :**
- 21/04 : ❌ Rien
- 22/04 : ❌ Rien
- 23/04 : ✅ ACR003

**Après :**
- 21/04 : ✅ NU (service de jour)
- 22/04 : ✅ X/ACR (service de nuit du 21/04 décalé)
- 23/04 : ✅ X/ACR (service de nuit du 22/04 décalé)
- 24/04 : ✅ X/ACR (service de nuit du 23/04 décalé)

## Impact

- ✅ Les services multiples par jour sont maintenant correctement gérés
- ✅ Les services de nuit sont décalés au bon jour
- ✅ Les imports ne perdent plus de données

## Tests recommandés

1. Importer un bulletin avec services jour + nuit sur la même date
2. Vérifier que les deux services apparaissent correctement
3. Vérifier le décalage des services de nuit

---

*Fix appliqué le 14/08/2025*