# 📋 ANALYSE BULLETIN COMMANDE - GILLON THOMAS

## Informations Agent
- **Nom:** GILLON THOMAS  
- **N° CP:** 8409385L
- **UOP:** COGC PN
- **Période:** 21/04/2025 au 30/04/2025

## Services Extraits

| Date | Code Service | Description | Horaires | Couleur App |
|------|--------------|-------------|----------|-------------|
| 21/04/2025 (Lun) | CCU004 | Régulateur Table PARC Denfert | 06:00-14:00 | - (service) |
| 22/04/2025 (Mar) | CRC001 | Coordonnateur Régional Circulation | 06:00-14:00 | - (service) |
| 23/04/2025 (Mer) | CCU004 | Régulateur Table PARC Denfert | 06:00-14:00 | - (service) |
| 24/04/2025 (Jeu) | NU | Utilisable non utilisé | 04:05-09:00 | bg-gray-100 |
| 24/04/2025 (Jeu) | CCU003 | CRC/CCU DENFERT (Nuit) | 22:00-06:00 | - (service nuit) |
| 25/04/2025 (Ven) | CCU003 | CRC/CCU DENFERT (Nuit) | 22:00-06:00 | - (service nuit) |
| 27/04/2025 (Dim) | RP | Repos périodique | - | bg-green-100 |
| 28/04/2025 (Lun) | RP | Repos périodique | - | bg-green-100 |
| 29/04/2025 (Mar) | INACTIN | Formation TRACTION | 08:00-15:45 | bg-gray-300 |
| 30/04/2025 (Mer) | DISPO | Disponible | 08:00-15:45 | bg-blue-200 |

## Codes Couleur Validés ✅

| Code | Catégorie | Classe Tailwind | Statut |
|------|-----------|-----------------|--------|
| MA | Maladie | bg-red-200 text-red-800 | 🔴 Rouge ✅ |
| HAB/FO/VL/VM/VT/EIA | Formation/Habilitation | bg-orange-200 text-orange-800 | 🟠 Orange ✅ |
| DISPO/D | Disponible | bg-blue-200 text-blue-800 | 🔵 Bleu ✅ |
| C | Congé | bg-yellow-400 text-yellow-900 | 🟡 Jaune/Or ✅ |
| RP/RU | Repos | bg-green-100 text-green-700 | 🟢 Vert |
| NU | Non utilisé | bg-gray-100 text-gray-500 | ⚪ Gris clair |
| INACTIN | Inactif | bg-gray-300 text-gray-700 | ⬜ Gris |

## Points d'Attention

1. **Services de nuit (22h-06h):** Le 24/04 et 25/04 ont des services CCU003 de nuit qui s'étendent sur le jour suivant
2. **Double entrée le 24/04:** NU le matin + CCU003 le soir (deux lignes distinctes)
3. **TRACTION:** Référence transport (METRO/RS) à ne pas confondre avec le code service
4. **N1100010CO72:** Code interne SNCF de composition (à ignorer dans le parsing)

## Mapping Service → Code Interne

| Code SNCF | Code Interne App | Période |
|-----------|------------------|---------|
| CCU001-006 | CCU | Variable |
| CRC001-003 | CRC | Variable |
| ACR001-004 | ACR | Variable |
| REO001-008 | RE | Variable |
| RP | RP | Journée |
| DISPO | D | Journée |
| INACTIN | INACTIN | Variable |
| NU | NU | Variable |

---
*Généré le: 05/12/2025*
*Source: Bulletin de commande SNCF - COGC PN*