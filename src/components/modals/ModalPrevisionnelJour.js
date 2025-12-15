import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Moon, Sun, Sunset, ChevronDown, ChevronUp, Users, AlertCircle, Loader2, Briefcase } from 'lucide-react';
import supabaseService from '../../services/supabaseService';

/**
 * Modal "Équipes du Jour" - Affiche les agents travaillant sur une journée donnée
 * Répartis par créneaux horaires (Nuit, Matin, Soirée, Jour) et par poste
 * 
 * @version 1.6.0 - Ajout catégorie "Jour" + badges statut congé (C, C?, CNA)
 * @param {boolean} isOpen - État d'ouverture du modal
 * @param {Date|string} selectedDate - Date sélectionnée (format YYYY-MM-DD)
 * @param {Array} agents - Liste des agents
 * @param {Object} planningData - Données du planning {agentName: {day: service}}
 * @param {function} onClose - Callback de fermeture
 */
const ModalPrevisionnelJour = ({ 
  isOpen, 
  selectedDate, 
  agents = [], 
  planningData = {}, 
  onClose 
}) => {
  // États pour les postes figés/rapatriés par créneau
  const [postesStatus, setPostesStatus] = useState({
    nuitAvant: {},
    matin: {},
    soir: {},
    jour: {},
    nuitApres: {}
  });
  
  // État de chargement pour les postes figés
  const [loadingPostes, setLoadingPostes] = useState(false);
  const [savingPoste, setSavingPoste] = useState(null); // Format: "creneau-poste"
  
  // Menu déroulant ouvert
  const [openDropdown, setOpenDropdown] = useState(null);

  // Codes de service de jour (depuis config.js)
  const SERVICE_JOUR_CODES = useMemo(() => ['VL', 'D', 'DISPO', 'EIA', 'DPX', 'PSE', 'INAC', 'VM'], []);

  // Configuration des créneaux
  const CRENEAUX = useMemo(() => ({
    nuitAvant: {
      id: 'nuitAvant',
      label: 'Nuit',
      symbole: 'X',
      colonneJour: 'J', // Lire X dans colonne J
      icon: Moon,
      postes: ['CRC', 'ACR', 'RC', 'CCU', 'RE'],
      color: 'indigo'
    },
    matin: {
      id: 'matin',
      label: 'Matin',
      symbole: '-',
      colonneJour: 'J',
      icon: Sun,
      postes: ['CRC', 'ACR', 'RC', 'RO', 'CCU', 'RE', 'CAC'],
      color: 'yellow'
    },
    soir: {
      id: 'soir',
      label: 'Soirée',
      symbole: 'O',
      colonneJour: 'J',
      icon: Sunset,
      postes: ['CRC', 'ACR', 'RC', 'RO', 'SOUFF', 'CCU', 'RE', 'CAC'],
      color: 'orange'
    },
    jour: {
      id: 'jour',
      label: 'Jour',
      symbole: 'VL/D/...',
      colonneJour: 'J',
      icon: Briefcase,
      postes: ['CRC', 'ACR', 'RC', 'RO', 'CCU', 'RE', 'CAC'],
      color: 'blue'
    },
    nuitApres: {
      id: 'nuitApres',
      label: 'Nuit',
      symbole: 'X',
      colonneJour: 'J+1', // Lire X dans colonne J+1
      icon: Moon,
      postes: ['CRC', 'ACR', 'RC', 'CCU', 'RE'],
      color: 'indigo'
    }
  }), []);

  // Postes avec menu déroulant (FIGÉ ou RAPATRIÉ PN)
  const POSTES_AVEC_MENU = useMemo(() => ['CCU', 'RE'], []);

  /**
   * Formater la date sélectionnée en ISO (YYYY-MM-DD)
   */
  const dateISO = useMemo(() => {
    if (!selectedDate) return null;
    const d = new Date(selectedDate);
    return d.toISOString().split('T')[0];
  }, [selectedDate]);

  /**
   * Charger les postes figés depuis Supabase pour la date sélectionnée
   */
  const loadPostesFiges = useCallback(async () => {
    if (!dateISO) return;
    
    setLoadingPostes(true);
    try {
      const data = await supabaseService.getPostesFiges(dateISO);
      setPostesStatus(prev => ({
        ...prev,
        ...data
      }));
      console.log(`✅ Postes figés chargés pour ${dateISO}:`, data);
    } catch (err) {
      console.error('Erreur chargement postes figés:', err);
      // En cas d'erreur, initialiser avec des valeurs vides
      setPostesStatus({
        nuitAvant: {},
        matin: {},
        soir: {},
        jour: {},
        nuitApres: {}
      });
    } finally {
      setLoadingPostes(false);
    }
  }, [dateISO]);

  /**
   * Sauvegarder ou supprimer un poste figé
   */
  const savePosteFige = useCallback(async (creneauId, poste, status) => {
    if (!dateISO) return;
    
    const key = `${creneauId}-${poste}`;
    setSavingPoste(key);
    
    try {
      if (status === null) {
        // Supprimer
        await supabaseService.deletePosteFige(dateISO, creneauId, poste);
      } else {
        // Sauvegarder
        await supabaseService.savePosteFige(dateISO, creneauId, poste, status);
      }
    } catch (err) {
      console.error('Erreur sauvegarde poste figé:', err);
      // Recharger les données en cas d'erreur
      loadPostesFiges();
    } finally {
      setSavingPoste(null);
    }
  }, [dateISO, loadPostesFiges]);

  // Charger les postes figés quand la date change
  useEffect(() => {
    if (isOpen && dateISO) {
      loadPostesFiges();
      setOpenDropdown(null);
    }
  }, [isOpen, dateISO, loadPostesFiges]);

  // Formatage de la date
  const formattedDate = useMemo(() => {
    if (!selectedDate) return '';
    const date = new Date(selectedDate);
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('fr-FR', options);
  }, [selectedDate]);

  // Extraire le jour du mois depuis la date sélectionnée
  const selectedDay = useMemo(() => {
    if (!selectedDate) return null;
    return new Date(selectedDate).getDate();
  }, [selectedDate]);

  // Calculer J+1 (jour suivant)
  const nextDay = useMemo(() => {
    if (!selectedDate) return null;
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    return d.getDate();
  }, [selectedDate]);

  /**
   * Obtenir le groupe simplifié d'un agent (CRC, CCU, RC, etc.)
   */
  const getGroupeSimple = useCallback((agent) => {
    if (!agent?.groupe) return null;
    const groupe = agent.groupe.toUpperCase();
    
    // 1. Vérifications avec préfixe explicite (plus spécifique)
    if (groupe.startsWith('CRC ') || groupe.startsWith('CRC-')) return 'CRC';
    if (groupe.startsWith('ACR ') || groupe.startsWith('ACR-')) return 'ACR';
    if (groupe.startsWith('CCU ') || groupe.startsWith('CCU-')) return 'CCU';
    if (groupe.startsWith('CAC ') || groupe.startsWith('CAC-')) return 'CAC';
    
    // 2. RE doit être vérifié AVANT RO car "ROULEMENT" contient "RO"
    if (groupe.includes('TABLE EST') || groupe.startsWith('RE ') || groupe.startsWith('RE-')) return 'RE';
    
    // 3. RO maintenant (après RE)
    if (groupe.includes('TABLE OUEST') || groupe.startsWith('RO ') || groupe.startsWith('RO-')) return 'RO';
    
    // 4. RC - vérifié après car "REGULATEUR CENTRE" est explicite
    if (groupe.includes('REGULATEUR CENTRE') || groupe.startsWith('RC ') || groupe.startsWith('RC-')) return 'RC';
    
    // 5. EAC - Apport Denfert - traité comme RE (poste réserve)
    if (groupe.startsWith('EAC ') || groupe.includes('EAC -') || groupe.includes('APPORT')) return 'RE';
    
    // 6. Groupes de réserve - TOUS traités comme RE (poste réserve)
    if (groupe.includes('RESERVE') && groupe.includes('PN')) return 'RE';
    if (groupe.includes('RESERVE') && groupe.includes('DR')) return 'RE';
    if (groupe.includes('RESERVE') && groupe.includes('PCD')) return 'RE';
    if (groupe.includes('RESERVE')) return 'RE';
    
    // 7. Autres groupes spéciaux
    if (groupe.includes('SOUFF') || groupe.includes('SOUFFLEUR')) return 'SOUFF';
    
    // 8. Fallback
    if (groupe.includes('CRC')) return 'CRC';
    if (groupe.includes('ACR')) return 'ACR';
    if (groupe.includes('CCU')) return 'CCU';
    
    return null;
  }, []);

  /**
   * Normaliser un code de poste (SOUF → SOUFF)
   */
  const normalizePosteCode = useCallback((posteCode) => {
    if (!posteCode) return null;
    const cleaned = posteCode.toUpperCase().replace(/^\+/, '').trim();
    if (cleaned === 'SOUF') return 'SOUFF';
    return cleaned;
  }, []);

  /**
   * Vérifie si un code brut est une variante de normalisation d'un poste
   */
  const isNormalizationOf = useCallback((rawCode, normalizedPoste) => {
    if (!rawCode || !normalizedPoste) return false;
    const raw = rawCode.toUpperCase().trim();
    const norm = normalizedPoste.toUpperCase().trim();
    
    if ((raw === 'SOUF' && norm === 'SOUFF') || (raw === 'SOUFF' && norm === 'SOUFF')) {
      return true;
    }
    if (raw === norm) {
      return true;
    }
    return false;
  }, []);

  /**
   * Vérifie si un code est un code de service de jour
   */
  const isServiceJourCode = useCallback((code) => {
    if (!code) return false;
    const upperCode = code.toUpperCase().trim();
    // Vérifier le code exact ou le premier mot si c'est une combinaison
    const firstPart = upperCode.split(' ')[0];
    return SERVICE_JOUR_CODES.includes(upperCode) || SERVICE_JOUR_CODES.includes(firstPart);
  }, [SERVICE_JOUR_CODES]);

  // Calculer les équipes pour chaque créneau
  const equipesParCreneau = useMemo(() => {
    if (!selectedDate || !agents.length || !selectedDay) {
      return { nuitAvant: {}, matin: {}, soir: {}, jour: {}, nuitApres: {} };
    }

    const result = {
      nuitAvant: {},
      matin: {},
      soir: {},
      jour: {},
      nuitApres: {}
    };

    // Initialiser tous les postes avec des tableaux vides
    Object.keys(CRENEAUX).forEach(creneau => {
      CRENEAUX[creneau].postes.forEach(poste => {
        result[creneau][poste] = [];
      });
    });

    // Parcourir chaque agent
    agents.forEach(agent => {
      const agentName = `${agent.nom} ${agent.prenom}`;
      const agentPlanning = planningData[agentName];
      
      if (!agentPlanning) return;

      const posteAgent = getGroupeSimple(agent);
      if (!posteAgent) return;

      // Récupérer le service du jour J
      const serviceJ = agentPlanning[selectedDay];
      const serviceCodeJ = typeof serviceJ === 'object' ? serviceJ?.service : serviceJ;
      const posteCodeJRaw = typeof serviceJ === 'object' ? serviceJ?.poste : null;
      const posteCodeJ = normalizePosteCode(posteCodeJRaw);
      // Postes supplémentaires (stockés en base ou en local)
      const postesSupplementairesJ = typeof serviceJ === 'object' 
        ? (serviceJ?.postesSupplementaires || [])
        : [];
      // Statut congé (C, C?, CNA)
      const statutCongeJ = typeof serviceJ === 'object' 
        ? (serviceJ?.statut_conge || serviceJ?.statutConge || '')
        : '';

      // Récupérer le service du jour J+1 (pour nuit J→J+1)
      const serviceJ1 = nextDay ? agentPlanning[nextDay] : null;
      const serviceCodeJ1 = typeof serviceJ1 === 'object' ? serviceJ1?.service : serviceJ1;
      const posteCodeJ1Raw = typeof serviceJ1 === 'object' ? serviceJ1?.poste : null;
      const posteCodeJ1 = normalizePosteCode(posteCodeJ1Raw);
      const postesSupplementairesJ1 = typeof serviceJ1 === 'object'
        ? (serviceJ1?.postesSupplementaires || [])
        : [];
      const statutCongeJ1 = typeof serviceJ1 === 'object'
        ? (serviceJ1?.statut_conge || serviceJ1?.statutConge || '')
        : '';

      // Déterminer le poste effectif (poste affecté ou groupe par défaut)
      const posteEffectif = posteCodeJ || posteAgent;

      const agentInfo = {
        ...agent,
        posteEffectif,
        serviceCode: serviceCodeJ,
        posteCode: posteCodeJ,
        posteCodeRaw: posteCodeJRaw,
        postesSupplementaires: postesSupplementairesJ,
        statutConge: statutCongeJ
      };

      // Nuit J-1 → J : X dans colonne J
      if (serviceCodeJ === 'X') {
        if (CRENEAUX.nuitAvant.postes.includes(posteEffectif)) {
          result.nuitAvant[posteEffectif].push(agentInfo);
        }
        postesSupplementairesJ.forEach(posteSupp => {
          const posteNorm = normalizePosteCode(posteSupp);
          if (CRENEAUX.nuitAvant.postes.includes(posteNorm) && result.nuitAvant[posteNorm]) {
            result.nuitAvant[posteNorm].push({ ...agentInfo, fromPosteSupp: posteSupp });
          }
        });
      }

      // Matin : - dans colonne J
      if (serviceCodeJ === '-') {
        if (CRENEAUX.matin.postes.includes(posteEffectif)) {
          result.matin[posteEffectif].push(agentInfo);
        }
        postesSupplementairesJ.forEach(posteSupp => {
          const posteNorm = normalizePosteCode(posteSupp);
          if (CRENEAUX.matin.postes.includes(posteNorm) && result.matin[posteNorm]) {
            result.matin[posteNorm].push({ ...agentInfo, fromPosteSupp: posteSupp });
          }
        });
      }

      // Soirée : O dans colonne J
      if (serviceCodeJ === 'O') {
        if (CRENEAUX.soir.postes.includes(posteEffectif)) {
          result.soir[posteEffectif].push(agentInfo);
        }
        postesSupplementairesJ.forEach(posteSupp => {
          const posteNorm = normalizePosteCode(posteSupp);
          if (CRENEAUX.soir.postes.includes(posteNorm) && result.soir[posteNorm]) {
            result.soir[posteNorm].push({ ...agentInfo, fromPosteSupp: posteSupp });
          }
        });
      }

      // Jour : codes SERVICE_JOUR (VL, D, DISPO, EIA, DPX, PSE, INAC, VM)
      if (isServiceJourCode(serviceCodeJ)) {
        if (CRENEAUX.jour.postes.includes(posteEffectif)) {
          result.jour[posteEffectif].push(agentInfo);
        }
        postesSupplementairesJ.forEach(posteSupp => {
          const posteNorm = normalizePosteCode(posteSupp);
          if (CRENEAUX.jour.postes.includes(posteNorm) && result.jour[posteNorm]) {
            result.jour[posteNorm].push({ ...agentInfo, fromPosteSupp: posteSupp });
          }
        });
      }

      // Nuit J → J+1 : X dans colonne J+1
      if (serviceCodeJ1 === 'X') {
        const posteEffectifJ1 = posteCodeJ1 || posteAgent;
        const agentInfoJ1 = {
          ...agent,
          posteEffectif: posteEffectifJ1,
          serviceCode: serviceCodeJ1,
          posteCode: posteCodeJ1,
          posteCodeRaw: posteCodeJ1Raw,
          postesSupplementaires: postesSupplementairesJ1,
          statutConge: statutCongeJ1
        };
        if (CRENEAUX.nuitApres.postes.includes(posteEffectifJ1)) {
          result.nuitApres[posteEffectifJ1].push(agentInfoJ1);
        }
        postesSupplementairesJ1.forEach(posteSupp => {
          const posteNorm = normalizePosteCode(posteSupp);
          if (CRENEAUX.nuitApres.postes.includes(posteNorm) && result.nuitApres[posteNorm]) {
            result.nuitApres[posteNorm].push({ ...agentInfoJ1, fromPosteSupp: posteSupp });
          }
        });
      }
    });

    return result;
  }, [selectedDate, selectedDay, nextDay, agents, planningData, CRENEAUX, getGroupeSimple, normalizePosteCode, isServiceJourCode]);

  // Gestion du clic sur un bouton de poste
  const handlePosteClick = useCallback((creneauId, poste) => {
    if (POSTES_AVEC_MENU.includes(poste)) {
      const key = `${creneauId}-${poste}`;
      setOpenDropdown(prev => prev === key ? null : key);
    } else {
      const currentStatus = postesStatus[creneauId]?.[poste];
      const newStatus = currentStatus === 'fige' ? null : 'fige';
      
      setPostesStatus(prev => ({
        ...prev,
        [creneauId]: {
          ...prev[creneauId],
          [poste]: newStatus
        }
      }));
      
      savePosteFige(creneauId, poste, newStatus);
    }
  }, [POSTES_AVEC_MENU, postesStatus, savePosteFige]);

  // Gestion de la sélection dans le menu déroulant
  const handleMenuSelect = useCallback((creneauId, poste, status) => {
    const currentStatus = postesStatus[creneauId]?.[poste];
    const newStatus = currentStatus === status ? null : status;
    
    setPostesStatus(prev => ({
      ...prev,
      [creneauId]: {
        ...prev[creneauId],
        [poste]: newStatus
      }
    }));
    setOpenDropdown(null);
    
    savePosteFige(creneauId, poste, newStatus);
  }, [postesStatus, savePosteFige]);

  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  // Rendu d'un bouton de poste
  const renderPosteButton = useCallback((creneauId, poste) => {
    const status = postesStatus[creneauId]?.[poste];
    const hasMenu = POSTES_AVEC_MENU.includes(poste);
    const dropdownKey = `${creneauId}-${poste}`;
    const isDropdownOpen = openDropdown === dropdownKey;
    const isSaving = savingPoste === dropdownKey;

    let buttonClass = 'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 flex items-center gap-1 ';
    
    if (status === 'fige') {
      buttonClass += 'bg-red-500 text-white hover:bg-red-600 shadow-sm';
    } else if (status === 'rapatrie') {
      buttonClass += 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm';
    } else {
      buttonClass += 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300';
    }

    const buttonLabel = status === 'fige' 
      ? `${poste} FIGÉ` 
      : status === 'rapatrie' 
        ? `${poste} RAP. PN` 
        : poste;

    return (
      <div className="relative" key={poste} style={{ zIndex: isDropdownOpen ? 100 : 1 }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePosteClick(creneauId, poste);
          }}
          className={buttonClass}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : null}
          {buttonLabel}
          {hasMenu && !isSaving && (
            isDropdownOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
          )}
        </button>

        {hasMenu && isDropdownOpen && (
          <div 
            className="absolute left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl min-w-[140px]"
            style={{ 
              zIndex: 9999,
              bottom: '100%',
              marginBottom: '4px',
              top: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => handleMenuSelect(creneauId, poste, 'fige')}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 rounded-t-lg
                ${status === 'fige' ? 'bg-red-50 text-red-700' : 'text-gray-700'}`}
            >
              <span className={`w-2 h-2 rounded-full ${status === 'fige' ? 'bg-red-500' : 'bg-gray-300'}`} />
              FIGÉ
            </button>
            <button
              onClick={() => handleMenuSelect(creneauId, poste, 'rapatrie')}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 rounded-b-lg
                ${status === 'rapatrie' ? 'bg-orange-50 text-orange-700' : 'text-gray-700'}`}
            >
              <span className={`w-2 h-2 rounded-full ${status === 'rapatrie' ? 'bg-orange-500' : 'bg-gray-300'}`} />
              RAPATRIÉ PN
            </button>
          </div>
        )}
      </div>
    );
  }, [postesStatus, openDropdown, handlePosteClick, handleMenuSelect, POSTES_AVEC_MENU, savingPoste]);

  // Rendu d'un agent dans la liste
  const renderAgent = useCallback((agent, creneauId, poste) => {
    const posteStatus = postesStatus[creneauId]?.[poste];
    
    let statusBadge = null;
    if (posteStatus === 'fige') {
      statusBadge = <span className="ml-2 text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-medium">[FIGÉ]</span>;
    } else if (posteStatus === 'rapatrie') {
      statusBadge = <span className="ml-2 text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded font-medium">[RAPATRIÉ PN]</span>;
    }

    // Badge statut congé (C, C?, CNA)
    let congeBadge = null;
    if (agent.statutConge) {
      const conge = agent.statutConge;
      if (conge === 'C') {
        congeBadge = (
          <span className="ml-1.5 text-xs px-1.5 py-0.5 bg-yellow-400 text-yellow-900 rounded font-semibold">
            C
          </span>
        );
      } else if (conge === 'C?') {
        congeBadge = (
          <span className="ml-1.5 text-xs px-1.5 py-0.5 bg-yellow-200 text-yellow-800 rounded font-semibold flex items-center gap-0.5">
            ⚠️ C?
          </span>
        );
      } else if (conge === 'CNA') {
        congeBadge = (
          <span className="ml-1.5 text-xs px-1.5 py-0.5 bg-red-300 text-red-900 rounded font-semibold">
            CNA
          </span>
        );
      }
    }

    // Ne PAS afficher le badge si c'est juste une normalisation (SOUF → SOUFF)
    let additionalInfo = null;
    if (agent.posteCodeRaw && !isNormalizationOf(agent.posteCodeRaw, poste)) {
      additionalInfo = <span className="ml-1 text-xs text-blue-500">({agent.posteCodeRaw})</span>;
    }

    // Afficher le code service pour le créneau "jour"
    let serviceCodeInfo = null;
    if (creneauId === 'jour' && agent.serviceCode) {
      serviceCodeInfo = <span className="ml-1 text-xs text-blue-600 font-medium">[{agent.serviceCode}]</span>;
    }

    // Afficher les postes supplémentaires en italique violet
    let postesSupp = null;
    if (agent.fromPosteSupp) {
      postesSupp = (
        <span className="ml-1 text-xs italic text-purple-600 font-medium">
          (+{agent.fromPosteSupp.replace(/^\+/, '')})
        </span>
      );
    } else if (agent.postesSupplementaires && agent.postesSupplementaires.length > 0) {
      postesSupp = (
        <span className="ml-1 text-xs italic text-purple-600 font-medium">
          (+{agent.postesSupplementaires.map(p => p.replace(/^\+/, '')).join(' +')})
        </span>
      );
    }

    const uniqueKey = agent.fromPosteSupp 
      ? `${agent.id}-${agent.fromPosteSupp}` 
      : agent.id;

    return (
      <div key={uniqueKey} className="flex items-center text-sm py-0.5 flex-wrap">
        <span className={`font-medium ${posteStatus === 'fige' ? 'text-red-700' : posteStatus === 'rapatrie' ? 'text-orange-700' : 'text-gray-800'}`}>
          {agent.nom} {agent.prenom}
        </span>
        {serviceCodeInfo}
        {additionalInfo}
        {postesSupp}
        {congeBadge}
        {statusBadge}
      </div>
    );
  }, [postesStatus, isNormalizationOf]);

  // Rendu d'un créneau complet
  const renderCreneau = useCallback((creneauConfig, periodLabel = null) => {
    const { id, label, icon: Icon, postes, color } = creneauConfig;
    const equipes = equipesParCreneau[id] || {};

    const colorClasses = {
      indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'text-indigo-600', header: 'bg-indigo-100' },
      yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-600', header: 'bg-yellow-100' },
      orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-600', header: 'bg-orange-100' },
      blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', header: 'bg-blue-100' }
    };

    const colors = colorClasses[color] || colorClasses.indigo;

    // Compter le nombre d'agents dans ce créneau
    const totalAgents = Object.values(equipes).reduce((sum, arr) => sum + arr.length, 0);

    // Ne pas afficher le créneau s'il n'y a aucun agent (sauf pour les créneaux principaux)
    if (id === 'jour' && totalAgents === 0) {
      return null;
    }

    return (
      <div className={`rounded-lg border ${colors.border} ${colors.bg}`} style={{ overflow: 'visible' }}>
        <div className={`${colors.header} px-4 py-2.5 flex items-center justify-between rounded-t-lg`}>
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${colors.icon}`} />
            <span className="font-semibold text-gray-800">
              {periodLabel || label}
            </span>
            {id === 'jour' && (
              <span className="text-xs text-gray-500 ml-2">
                (VL, D, DISPO, EIA, DPX, PSE, INAC, VM)
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {id === 'jour' ? 'Service de jour' : `Symbole: ${creneauConfig.symbole}`}
          </div>
        </div>

        <div className="px-4 py-3 space-y-2">
          {postes.map(poste => {
            const agentsPoste = equipes[poste] || [];
            
            return (
              <div key={poste} className="flex items-start">
                <div className="w-14 flex-shrink-0 font-mono text-xs font-bold text-gray-600 pt-0.5">
                  {poste}
                </div>
                <div className="flex-1 pl-2 border-l border-gray-200">
                  {agentsPoste.length > 0 ? (
                    agentsPoste.map(agent => renderAgent(agent, id, poste))
                  ) : (
                    <span className="text-gray-400 text-sm">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className={`${colors.header} px-4 py-2 border-t ${colors.border} rounded-b-lg`} style={{ overflow: 'visible' }}>
          <div className="text-xs text-gray-600 mb-2">Postes figés / Rapatriés :</div>
          <div className="flex flex-wrap gap-2" style={{ overflow: 'visible' }}>
            {postes.map(poste => renderPosteButton(id, poste))}
          </div>
        </div>
      </div>
    );
  }, [equipesParCreneau, renderAgent, renderPosteButton]);

  // Stats par créneau
  const statsCreneaux = useMemo(() => {
    const stats = {};
    Object.keys(equipesParCreneau).forEach(creneauId => {
      stats[creneauId] = Object.values(equipesParCreneau[creneauId])
        .reduce((sum, arr) => sum + arr.length, 0);
    });
    return stats;
  }, [equipesParCreneau]);

  // Labels nuit
  const nuitAvantLabel = useMemo(() => {
    if (!selectedDate) return '🌙 Nuit (avant)';
    const d = new Date(selectedDate);
    const prevDay = new Date(d);
    prevDay.setDate(prevDay.getDate() - 1);
    return `🌙 Nuit (${prevDay.toLocaleDateString('fr-FR', {weekday: 'short'})} → ${d.toLocaleDateString('fr-FR', {weekday: 'short'})})`;
  }, [selectedDate]);

  const nuitApresLabel = useMemo(() => {
    if (!selectedDate) return '🌙 Nuit (après)';
    const d = new Date(selectedDate);
    const nextD = new Date(d);
    nextD.setDate(nextD.getDate() + 1);
    return `🌙 Nuit (${d.toLocaleDateString('fr-FR', {weekday: 'short'})} → ${nextD.toLocaleDateString('fr-FR', {weekday: 'short'})})`;
  }, [selectedDate]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col"
        style={{ overflow: 'visible' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex justify-between items-center rounded-t-xl">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">
                Équipes du Jour
              </h2>
              <p className="text-blue-100 text-sm capitalize">
                {formattedDate}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="bg-gray-50 px-6 py-3 border-b flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-indigo-500" />
            <span className="text-gray-600">Nuit (avant):</span>
            <span className="font-bold text-indigo-700">{statsCreneaux.nuitAvant || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-yellow-500" />
            <span className="text-gray-600">Matin:</span>
            <span className="font-bold text-yellow-700">{statsCreneaux.matin || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <Sunset className="w-4 h-4 text-orange-500" />
            <span className="text-gray-600">Soir:</span>
            <span className="font-bold text-orange-700">{statsCreneaux.soir || 0}</span>
          </div>
          {statsCreneaux.jour > 0 && (
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-500" />
              <span className="text-gray-600">Jour:</span>
              <span className="font-bold text-blue-700">{statsCreneaux.jour}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-indigo-500" />
            <span className="text-gray-600">Nuit (après):</span>
            <span className="font-bold text-indigo-700">{statsCreneaux.nuitApres || 0}</span>
          </div>
          {loadingPostes && (
            <div className="flex items-center gap-1 text-gray-400 ml-auto">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="text-xs">Chargement...</span>
            </div>
          )}
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto p-6" style={{ overflow: 'visible auto' }}>
          {!selectedDate ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <AlertCircle className="w-12 h-12 mb-2 text-gray-400" />
              <p>Sélectionnez une date pour voir les équipes</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ overflow: 'visible' }}>
              {renderCreneau(CRENEAUX.nuitAvant, nuitAvantLabel)}
              {renderCreneau(CRENEAUX.matin, '☀️ Matin')}
              {renderCreneau(CRENEAUX.soir, '🌆 Soirée')}
              {renderCreneau(CRENEAUX.jour, '💼 Jour')}
              {renderCreneau(CRENEAUX.nuitApres, nuitApresLabel)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t flex flex-wrap justify-between items-center gap-2 rounded-b-xl">
          <div className="text-xs text-gray-500 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500"></span> FIGÉ
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span> RAPATRIÉ PN
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="italic text-purple-600">(+SOUF)</span> Poste supp.
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="px-1 py-0.5 bg-yellow-400 text-yellow-900 rounded text-xs font-semibold">C</span> Congé
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="px-1 py-0.5 bg-yellow-200 text-yellow-800 rounded text-xs font-semibold">C?</span> Congé en attente
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="px-1 py-0.5 bg-red-300 text-red-900 rounded text-xs font-semibold">CNA</span> Congé refusé
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalPrevisionnelJour;
