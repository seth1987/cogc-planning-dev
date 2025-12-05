import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Moon, Sun, Sunset, ChevronDown, ChevronUp, Users, AlertCircle } from 'lucide-react';
import supabaseService from '../../services/supabaseService';

/**
 * Modal "Équipes du Jour" - Affiche les agents travaillant sur une journée donnée
 * Répartis par créneaux horaires (Nuit, Matin, Soirée) et par poste
 * 
 * @version 1.0.0
 * @param {boolean} isOpen - État d'ouverture du modal
 * @param {Date|string} selectedDate - Date sélectionnée
 * @param {Array} agents - Liste des agents
 * @param {Array} planningData - Données du planning pour le mois
 * @param {function} onClose - Callback de fermeture
 */
const ModalPrevisionnelJour = ({ 
  isOpen, 
  selectedDate, 
  agents = [], 
  planningData = [], 
  onClose 
}) => {
  // États pour les postes figés/rapatriés par créneau
  const [postesStatus, setPostesStatus] = useState({
    nuitAvant: {},
    matin: {},
    soir: {},
    nuitApres: {}
  });
  
  // Menu déroulant ouvert
  const [openDropdown, setOpenDropdown] = useState(null);
  
  // Chargement
  const [loading, setLoading] = useState(false);

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
  const POSTES_AVEC_MENU = ['CCU', 'RE'];

  // Reset status quand la date change
  useEffect(() => {
    if (selectedDate) {
      setPostesStatus({
        nuitAvant: {},
        matin: {},
        soir: {},
        nuitApres: {}
      });
      setOpenDropdown(null);
    }
  }, [selectedDate]);

  // Formatage de la date
  const formattedDate = useMemo(() => {
    if (!selectedDate) return '';
    const date = new Date(selectedDate);
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('fr-FR', options);
  }, [selectedDate]);

  // Calcul de J+1 pour le créneau Nuit J→J+1
  const getNextDay = useCallback((date) => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Obtenir le groupe simplifié d'un agent (CRC, CCU, RC, etc.)
  const getGroupeSimple = useCallback((agent) => {
    if (!agent?.groupe) return null;
    const groupe = agent.groupe.toUpperCase();
    
    if (groupe.includes('CRC')) return 'CRC';
    if (groupe.includes('ACR')) return 'ACR';
    if (groupe.includes('RC') && !groupe.includes('ACR') && !groupe.includes('CRC')) return 'RC';
    if (groupe.includes('RO')) return 'RO';
    if (groupe.includes('CCU')) return 'CCU';
    if (groupe.includes('RE ') || groupe.includes('REGULATEUR TABLE EST')) return 'RE';
    if (groupe.includes('CAC')) return 'CAC';
    if (groupe.includes('RESERVE') && groupe.includes('PN')) return 'RESERVE_PN';
    if (groupe.includes('RESERVE') && groupe.includes('DR')) return 'RESERVE_DR';
    if (groupe.includes('SOUFF') || groupe.includes('SOUFFLEUR')) return 'SOUFF';
    
    return null;
  }, []);

  // Déterminer le poste effectif d'un agent pour un service
  const getPosteEffectif = useCallback((agent, planningEntry) => {
    // Si poste_code est défini (réserve affectée), l'utiliser
    if (planningEntry?.poste_code) {
      return planningEntry.poste_code.toUpperCase();
    }
    // Sinon utiliser le groupe de l'agent
    return getGroupeSimple(agent);
  }, [getGroupeSimple]);

  // Calculer les équipes pour chaque créneau
  const equipesParCreneau = useMemo(() => {
    if (!selectedDate || !agents.length) {
      return { nuitAvant: {}, matin: {}, soir: {}, nuitApres: {} };
    }

    const dateJ = new Date(selectedDate).toISOString().split('T')[0];
    const dateJ1 = getNextDay(selectedDate);

    const result = {
      nuitAvant: {},
      matin: {},
      soir: {},
      nuitApres: {}
    };

    // Initialiser tous les postes avec des tableaux vides
    Object.keys(CRENEAUX).forEach(creneau => {
      CRENEAUX[creneau].postes.forEach(poste => {
        result[creneau][poste] = [];
      });
    });

    // Parcourir les données du planning
    planningData.forEach(entry => {
      const agent = agents.find(a => a.id === entry.agent_id);
      if (!agent) return;

      const entryDate = entry.date;
      const serviceCode = entry.service_code?.toUpperCase();
      const posteEffectif = getPosteEffectif(agent, entry);
      const isAdditional = entry.is_additional || false;

      // Nuit J-1 → J : X dans colonne J
      if (entryDate === dateJ && serviceCode === 'X') {
        if (CRENEAUX.nuitAvant.postes.includes(posteEffectif)) {
          result.nuitAvant[posteEffectif].push({
            ...agent,
            posteEffectif,
            isAdditional,
            entry
          });
        }
      }

      // Matin : - dans colonne J
      if (entryDate === dateJ && serviceCode === '-') {
        if (CRENEAUX.matin.postes.includes(posteEffectif)) {
          result.matin[posteEffectif].push({
            ...agent,
            posteEffectif,
            isAdditional,
            entry
          });
        }
      }

      // Soirée : O dans colonne J
      if (entryDate === dateJ && serviceCode === 'O') {
        if (CRENEAUX.soir.postes.includes(posteEffectif)) {
          result.soir[posteEffectif].push({
            ...agent,
            posteEffectif,
            isAdditional,
            entry
          });
        }
      }

      // Nuit J → J+1 : X dans colonne J+1
      if (entryDate === dateJ1 && serviceCode === 'X') {
        if (CRENEAUX.nuitApres.postes.includes(posteEffectif)) {
          result.nuitApres[posteEffectif].push({
            ...agent,
            posteEffectif,
            isAdditional,
            entry
          });
        }
      }
    });

    return result;
  }, [selectedDate, agents, planningData, CRENEAUX, getNextDay, getPosteEffectif]);

  // Gestion du clic sur un bouton de poste
  const handlePosteClick = useCallback((creneauId, poste) => {
    if (POSTES_AVEC_MENU.includes(poste)) {
      // Toggle le menu déroulant
      const key = `${creneauId}-${poste}`;
      setOpenDropdown(prev => prev === key ? null : key);
    } else {
      // Toggle simple FIGÉ
      setPostesStatus(prev => ({
        ...prev,
        [creneauId]: {
          ...prev[creneauId],
          [poste]: prev[creneauId]?.[poste] === 'fige' ? null : 'fige'
        }
      }));
    }
  }, []);

  // Gestion de la sélection dans le menu déroulant
  const handleMenuSelect = useCallback((creneauId, poste, status) => {
    setPostesStatus(prev => ({
      ...prev,
      [creneauId]: {
        ...prev[creneauId],
        [poste]: prev[creneauId]?.[poste] === status ? null : status
      }
    }));
    setOpenDropdown(null);
  }, []);

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
      <div className="relative" key={poste}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePosteClick(creneauId, poste);
          }}
          className={buttonClass}
        >
          {buttonLabel}
          {hasMenu && (
            isDropdownOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
          )}
        </button>

        {hasMenu && isDropdownOpen && (
          <div 
            className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[140px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => handleMenuSelect(creneauId, poste, 'fige')}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2
                ${status === 'fige' ? 'bg-red-50 text-red-700' : 'text-gray-700'}`}
            >
              <span className={`w-2 h-2 rounded-full ${status === 'fige' ? 'bg-red-500' : 'bg-gray-300'}`} />
              FIGÉ
            </button>
            <button
              onClick={() => handleMenuSelect(creneauId, poste, 'rapatrie')}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2
                ${status === 'rapatrie' ? 'bg-orange-50 text-orange-700' : 'text-gray-700'}`}
            >
              <span className={`w-2 h-2 rounded-full ${status === 'rapatrie' ? 'bg-orange-500' : 'bg-gray-300'}`} />
              RAPATRIÉ PN
            </button>
          </div>
        )}
      </div>
    );
  }, [postesStatus, openDropdown, handlePosteClick, handleMenuSelect]);

  // Rendu d'un agent dans la liste
  const renderAgent = useCallback((agent, creneauId, poste) => {
    const posteStatus = postesStatus[creneauId]?.[poste];
    
    let statusBadge = null;
    if (posteStatus === 'fige') {
      statusBadge = <span className="ml-2 text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-medium">[FIGÉ]</span>;
    } else if (posteStatus === 'rapatrie') {
      statusBadge = <span className="ml-2 text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded font-medium">[RAPATRIÉ PN]</span>;
    }

    let additionalInfo = null;
    if (agent.isAdditional) {
      additionalInfo = <span className="ml-1 text-xs text-gray-500 italic">(suppl.)</span>;
    }
    if (agent.entry?.poste_code && agent.entry.poste_code !== poste) {
      additionalInfo = <span className="ml-1 text-xs text-blue-500">({agent.entry.poste_code})</span>;
    }

    return (
      <div key={agent.id} className="flex items-center text-sm py-0.5">
        <span className={`font-medium ${posteStatus === 'fige' ? 'text-red-700' : posteStatus === 'rapatrie' ? 'text-orange-700' : 'text-gray-800'}`}>
          {agent.nom} {agent.prenom}
        </span>
        {additionalInfo}
        {statusBadge}
      </div>
    );
  }, [postesStatus]);

  // Rendu d'un créneau complet
  const renderCreneau = useCallback((creneauConfig, periodLabel = null) => {
    const { id, label, icon: Icon, postes, color } = creneauConfig;
    const equipes = equipesParCreneau[id] || {};

    const colorClasses = {
      indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'text-indigo-600', header: 'bg-indigo-100' },
      yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-600', header: 'bg-yellow-100' },
      orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-600', header: 'bg-orange-100' }
    };

    const colors = colorClasses[color] || colorClasses.indigo;

    return (
      <div className={`rounded-lg border ${colors.border} ${colors.bg} overflow-hidden`}>
        {/* Header du créneau */}
        <div className={`${colors.header} px-4 py-2.5 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${colors.icon}`} />
            <span className="font-semibold text-gray-800">
              {periodLabel || label}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Symbole: {creneauConfig.symbole}
          </div>
        </div>

        {/* Liste des équipes par poste */}
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

        {/* Boutons de postes figés */}
        <div className={`${colors.header} px-4 py-2 border-t ${colors.border}`}>
          <div className="text-xs text-gray-600 mb-2">Postes figés / Rapatriés :</div>
          <div className="flex flex-wrap gap-2">
            {postes.map(poste => renderPosteButton(id, poste))}
          </div>
        </div>
      </div>
    );
  }, [equipesParCreneau, renderAgent, renderPosteButton]);

  // Calcul du nombre total d'agents par créneau
  const statsCreneaux = useMemo(() => {
    const stats = {};
    Object.keys(equipesParCreneau).forEach(creneauId => {
      stats[creneauId] = Object.values(equipesParCreneau[creneauId])
        .reduce((sum, arr) => sum + arr.length, 0);
    });
    return stats;
  }, [equipesParCreneau]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex justify-between items-center">
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

        {/* Stats rapides */}
        <div className="bg-gray-50 px-6 py-3 border-b flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-indigo-500" />
            <span className="text-gray-600">Nuit (avant):</span>
            <span className="font-bold text-indigo-700">{statsCreneaux.nuitAvant}</span>
          </div>
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-yellow-500" />
            <span className="text-gray-600">Matin:</span>
            <span className="font-bold text-yellow-700">{statsCreneaux.matin}</span>
          </div>
          <div className="flex items-center gap-2">
            <Sunset className="w-4 h-4 text-orange-500" />
            <span className="text-gray-600">Soir:</span>
            <span className="font-bold text-orange-700">{statsCreneaux.soir}</span>
          </div>
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-indigo-500" />
            <span className="text-gray-600">Nuit (après):</span>
            <span className="font-bold text-indigo-700">{statsCreneaux.nuitApres}</span>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : !selectedDate ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <AlertCircle className="w-12 h-12 mb-2 text-gray-400" />
              <p>Sélectionnez une date pour voir les équipes</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Nuit J-1 → J */}
              {renderCreneau(CRENEAUX.nuitAvant, 
                `🌙 Nuit (${new Date(new Date(selectedDate).getTime() - 86400000).toLocaleDateString('fr-FR', {weekday: 'short'})} → ${new Date(selectedDate).toLocaleDateString('fr-FR', {weekday: 'short'})})`
              )}
              
              {/* Matin */}
              {renderCreneau(CRENEAUX.matin, '☀️ Matin')}
              
              {/* Soirée */}
              {renderCreneau(CRENEAUX.soir, '🌆 Soirée')}
              
              {/* Nuit J → J+1 */}
              {renderCreneau(CRENEAUX.nuitApres,
                `🌙 Nuit (${new Date(selectedDate).toLocaleDateString('fr-FR', {weekday: 'short'})} → ${new Date(getNextDay(selectedDate)).toLocaleDateString('fr-FR', {weekday: 'short'})})`
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t flex justify-between items-center">
          <div className="text-xs text-gray-500">
            <span className="inline-flex items-center gap-1 mr-4">
              <span className="w-2 h-2 rounded-full bg-red-500"></span> FIGÉ
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span> RAPATRIÉ PN
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
