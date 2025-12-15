import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, StickyNote, Users, Palette, Type } from 'lucide-react';
import { MONTHS } from '../constants/config';
import { DEFAULT_COLORS } from '../constants/defaultColors';
import { getPaieType, PAIE_ICONS } from '../constants/paie2026';
import useColors from '../hooks/useColors';
import planningService from '../services/planningService';
import ModalCouleurs from './modals/ModalCouleurs';

/**
 * PlanningTable - Grille mensuelle du planning
 * 
 * FIX v2.10: Ajout de currentYear pour calcul correct des jours du mois
 * FIX v2.11: Scrollbar horizontale toujours visible et stylée
 * FIX v2.12: Barre navigation via PORTAIL React (fixe bas écran)
 * FIX v2.13: Calcul correct des jours de la semaine avec l'année dynamique
 * FIX v2.14: Réduction hauteur barre navigation (moins intrusive sur mobile)
 * NEW v2.15: Personnalisation des couleurs via ModalCouleurs
 * FIX v2.16: Affichage correct du texte libre (service=LIBRE + texteLibre)
 * NEW v2.17: Synchronisation multi-appareils des couleurs via Supabase
 * FIX v2.18: Debug log pour currentUser
 * FIX v2.19: Support des codes combinés (ex: "FO CRC -", "MA O")
 * FIX v2.20: Affichage 2 lignes pour codes combinés (horaire en haut, catégorie en bas)
 * FIX v2.21: Couleur basée sur POSTE+SERVICE combiné (réserve vs roulement)
 * NEW v4.5.0: Support statut_conge combinable (C, C?, CNA) avec service/poste
 * NEW v4.6.0: Icônes paie 2026 (Digiposte/Virement) dans les en-têtes de jours
 */

// Horaires simples pour détecter les combinaisons
const HORAIRES_SIMPLES = ['-', 'O', 'X', 'I'];
// Codes spéciaux qui ne sont PAS des horaires (repos, absences, etc.)
const CODES_NON_HORAIRES = ['RP', 'NU', 'F', 'MA', 'D', 'DISPO', 'VL', 'INAC', 'INACTIN', 'VM', 'EIA', 'DPX', 'PSE', 'VT', 'D2I', 'RU', 'RA', 'RN', 'RQ', 'TY', 'AY', 'AH', 'DD', 'HAB', 'FO', 'LIBRE'];
// Codes statut congé (stockés dans statut_conge, pas dans service_code)
const STATUT_CONGE_CODES = ['C', 'C?', 'CNA'];

// Couleurs pour les statuts congé
const STATUT_CONGE_COLORS = {
  'C': { bg: '#facc15', text: '#713f12' },      // Jaune vif - Congé accordé
  'C?': { bg: '#fef08a', text: '#854d0e' },     // Jaune clair - En attente
  'CNA': { bg: '#fca5a5', text: '#991b1b' }     // Rouge clair - Refusé
};

/**
 * Parse un code combiné et retourne horaire + catégorie séparés
 * "FO RO -" → { horaire: "-", categorie: "FO RO" }
 * "MA O" → { horaire: "O", categorie: "MA" }
 * "HAB" → { horaire: null, categorie: "HAB" }
 * "-" → { horaire: "-", categorie: null }
 * "RP" → { horaire: "RP", categorie: null }
 */
const parseCombinedCode = (serviceCode) => {
  if (!serviceCode) return { horaire: null, categorie: null };
  
  const trimmed = serviceCode.trim();
  const parts = trimmed.split(' ');
  
  // Code simple (1 seul élément)
  if (parts.length === 1) {
    // Si c'est un horaire simple, pas de catégorie
    if (HORAIRES_SIMPLES.includes(trimmed)) {
      return { horaire: trimmed, categorie: null };
    }
    // Sinon c'est une catégorie seule (ex: "HAB", "VL", "D", "RP")
    return { horaire: null, categorie: trimmed };
  }
  
  // Code combiné (plusieurs éléments)
  const lastPart = parts[parts.length - 1];
  
  // Si le dernier élément est un horaire simple → combinaison catégorie + horaire
  if (HORAIRES_SIMPLES.includes(lastPart)) {
    const categorie = parts.slice(0, -1).join(' ');
    return { horaire: lastPart, categorie: categorie || null };
  }
  
  // Sinon tout est catégorie (ex: "FO RO" sans horaire)
  return { horaire: null, categorie: trimmed };
};

// Composant barre de navigation rendu via portail - VERSION COMPACTE
const NavigationBar = ({ onScrollLeft, onScrollRight, onScrollStart, onScrollEnd, onOpenColors }) => {
  return ReactDOM.createPortal(
    <div 
      className="fixed bottom-0 left-0 right-0 z-[9999] bg-gradient-to-r from-blue-600 to-blue-700 px-2 py-1.5 flex items-center justify-center gap-2"
      style={{ 
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.3)',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
      }}
    >
      {/* Bouton couleurs à gauche */}
      <button
        onClick={onOpenColors}
        className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors mr-2"
        title="Personnaliser les couleurs"
      >
        <Palette size={18} />
      </button>

      <button
        onClick={onScrollStart}
        className="flex items-center gap-0.5 px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-white text-xs font-medium transition-colors"
        title="Aller au début du mois (Jour 1)"
      >
        <ChevronLeft size={14} />
        <ChevronLeft size={14} className="-ml-2" />
        <span>J1</span>
      </button>
      
      <button
        onClick={onScrollLeft}
        className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
        title="Défiler vers la gauche"
      >
        <ChevronLeft size={18} />
      </button>
      
      <span className="text-white text-xs font-medium px-2 hidden sm:block">
        ◀ ▶
      </span>
      
      <button
        onClick={onScrollRight}
        className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
        title="Défiler vers la droite"
      >
        <ChevronRight size={18} />
      </button>
      
      <button
        onClick={onScrollEnd}
        className="flex items-center gap-0.5 px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-white text-xs font-medium transition-colors"
        title="Aller à la fin du mois (Jour 31)"
      >
        <span>J31</span>
        <ChevronRight size={14} />
        <ChevronRight size={14} className="-ml-2" />
      </button>
    </div>,
    document.body
  );
};

const PlanningTable = ({ 
  currentMonth, 
  currentYear,
  planning, 
  agentsData, 
  onCellClick, 
  onAgentClick, 
  onDayHeaderClick,
  currentUser,  // NEW: pour la synchronisation des couleurs
}) => {
  const year = currentYear || new Date().getFullYear();
  const userEmail = currentUser?.email || null;
  
  // DEBUG: Log pour tracer currentUser et userEmail
  useEffect(() => {
    console.log('🎨 PlanningTable - currentUser:', currentUser);
    console.log('🎨 PlanningTable - userEmail extrait:', userEmail);
  }, [currentUser, userEmail]);
  
  // Hook pour les couleurs personnalisées (avec sync si userEmail présent)
  const { colors, getServiceColor, reloadColors } = useColors('general', userEmail);
  
  // State pour la modal couleurs
  const [showColorModal, setShowColorModal] = useState(false);
  
  useEffect(() => {
    console.log(`📅 PlanningTable: currentMonth=${currentMonth}, currentYear prop=${currentYear}, year utilisé=${year}`);
  }, [currentMonth, currentYear, year]);
  
  const daysInMonth = planningService.getDaysInMonth(currentMonth, year);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [showNavBar, setShowNavBar] = useState(true);
  const scrollContainerRef = useRef(null);
  
  useEffect(() => {
    setShowNavBar(true);
    return () => setShowNavBar(false);
  }, []);

  // Recharger les couleurs après fermeture de la modal
  const handleCloseColorModal = () => {
    setShowColorModal(false);
    reloadColors();
    console.log('🎨 Couleurs general rechargées après fermeture du panneau');
  };

  const toggleGroupCollapse = (groupName) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const scrollHorizontal = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      const currentScroll = scrollContainerRef.current.scrollLeft;
      scrollContainerRef.current.scrollTo({
        left: direction === 'left' ? currentScroll - scrollAmount : currentScroll + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const scrollToStart = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  const scrollToEnd = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ 
        left: scrollContainerRef.current.scrollWidth, 
        behavior: 'smooth' 
      });
    }
  };
  
  /**
   * v2.21: Construit le code complet pour la recherche de couleur
   * 
   * LOGIQUE:
   * - Si service est un horaire simple (-, O, X) ET poste est défini → "POSTE SERVICE" (ex: "CRC -")
   * - Si service est un code non-horaire (RP, MA, C, etc.) → utiliser service seul
   * - Si service seul (pas de poste) → utiliser service tel quel
   * 
   * Cela permet:
   * - Agents ROULEMENT avec "-" seul → catégorie "Horaires"
   * - Agents RÉSERVE avec "-" + poste "CRC" → catégorie "Poste (Réserve)" via "CRC -"
   */
  const buildColorCode = (service, poste) => {
    if (!service) return null;
    
    // Si le service est un horaire simple ET on a un poste → combiner
    if (HORAIRES_SIMPLES.includes(service) && poste) {
      return `${poste} ${service}`;
    }
    
    // Sinon utiliser le service tel quel
    return service;
  };
  
  // Fonction pour obtenir le style de couleur d'une cellule
  const getCellColorStyle = (serviceCode) => {
    if (!serviceCode) return {};
    
    const colorConfig = getServiceColor(serviceCode);
    
    if (!colorConfig) return {};
    
    return {
      backgroundColor: colorConfig.bg === 'transparent' ? 'transparent' : colorConfig.bg,
      color: colorConfig.text,
    };
  };

  // Fonction pour obtenir le style de couleur d'un statut congé
  const getStatutCongeStyle = (statutConge) => {
    if (!statutConge || !STATUT_CONGE_COLORS[statutConge]) return {};
    return {
      backgroundColor: STATUT_CONGE_COLORS[statutConge].bg,
      color: STATUT_CONGE_COLORS[statutConge].text,
    };
  };
  
  /**
   * v4.6.0: Génère l'en-tête de jour avec icône paie si applicable
   */
  const getDayHeader = (day) => {
    const { isWeekend, isFerier } = planningService.getJourType(day, currentMonth, year);
    const dayName = planningService.getDayName(day, currentMonth, year);
    
    // Vérifier si c'est une date de paie 2026
    const paieType = getPaieType(day, currentMonth, year);
    
    let className = 'px-1 py-2 text-center text-xs font-medium min-w-[55px] relative ';
    
    if (isFerier) {
      className += 'bg-red-100 text-red-900';
    } else if (isWeekend) {
      className += 'bg-green-100 text-green-800';
    } else {
      className += 'bg-gray-50 text-gray-700';
    }
    
    const isClickable = typeof onDayHeaderClick === 'function';
    if (isClickable) {
      className += ' cursor-pointer hover:bg-blue-100 hover:text-blue-800 transition-colors group';
    }
    
    // Déterminer l'icône à afficher
    let backgroundIcon = null;
    if (paieType === 'digiposte') {
      backgroundIcon = PAIE_ICONS.general.digiposte;
    } else if (paieType === 'virement') {
      backgroundIcon = PAIE_ICONS.general.euro;
    } else if (paieType === 'both') {
      // Si les deux tombent le même jour (rare), priorité Digiposte
      backgroundIcon = PAIE_ICONS.general.digiposte;
    }
    
    return (
      <th 
        key={day} 
        className={className}
        onClick={isClickable ? () => onDayHeaderClick(day) : undefined}
        title={isClickable ? `Voir les equipes du ${day}` : undefined}
        style={backgroundIcon ? {
          backgroundImage: `url(${backgroundIcon})`,
          backgroundSize: '32px 32px',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        } : undefined}
      >
        {/* Overlay semi-transparent pour lisibilité si icône présente */}
        {backgroundIcon && (
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundColor: isFerier ? 'rgba(254, 226, 226, 0.75)' : 
                             isWeekend ? 'rgba(240, 253, 244, 0.75)' : 
                             'rgba(249, 250, 251, 0.75)',
            }}
          />
        )}
        <div className="flex flex-col items-center relative z-10">
          <span className="text-xs uppercase">{dayName}</span>
          <span className="font-bold text-sm">{day}</span>
          {isFerier && <span className="text-xs">Ferie</span>}
          {isClickable && (
            <Users className="w-3 h-3 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
          )}
        </div>
      </th>
    );
  };

  const renderPlanningCell = (agent, day) => {
    const agentName = `${agent.nom} ${agent.prenom}`;
    const planningData = planning[agentName]?.[day];
    const { isWeekend, isFerier } = planningService.getJourType(day, currentMonth, year);
    
    let cellContent = '';
    let cellStyle = {};
    let baseCellClass = 'border px-1 py-1 text-center text-xs cursor-pointer hover:opacity-80 transition-all min-w-[55px] min-h-[40px] relative ';
    let hasNote = false;
    let isTexteLibre = false;
    
    if (planningData) {
      if (typeof planningData === 'string') {
        // ===== String simple: code direct =====
        const { horaire, categorie } = parseCombinedCode(planningData);
        cellStyle = getCellColorStyle(planningData);
        
        // Si c'est un code combiné (horaire + catégorie), afficher sur 2 lignes
        if (horaire && categorie) {
          cellContent = (
            <div className="flex flex-col h-full justify-center">
              <span className="font-medium">{horaire}</span>
              <span className="text-xs font-bold">{categorie}</span>
            </div>
          );
        } else {
          // Code simple - afficher tel quel
          cellContent = planningData;
        }
      } else if (typeof planningData === 'object') {
        // ===== Objet: service + poste + statut_conge + extras =====
        const service = planningData.service || '';
        const poste = planningData.poste || '';
        const texteLibre = planningData.texteLibre || '';
        const statutConge = planningData.statut_conge || planningData.statutConge || '';
        const postesSupplementaires = planningData.postesSupplementaires || 
          (planningData.posteSupplementaire ? [planningData.posteSupplementaire] : []);
        
        hasNote = Boolean(planningData.note);
        isTexteLibre = service === 'LIBRE' && texteLibre;
        
        // ===== v2.21: Construire le code complet pour la couleur =====
        const colorCode = buildColorCode(service, poste);
        
        // Couleur selon le type
        if (isTexteLibre) {
          const texteLibreColors = colors.texteLibre || { bg: '#fef3c7', text: '#92400e' };
          cellStyle = {
            backgroundColor: texteLibreColors.bg,
            color: texteLibreColors.text,
          };
        } else if (statutConge && !service) {
          // Statut congé seul (ex: C? en attente de commande)
          cellStyle = getStatutCongeStyle(statutConge);
        } else {
          cellStyle = getCellColorStyle(colorCode);
        }
        
        // Couleur des postes supplémentaires
        const postesColor = colors.postesSupp?.text || '#8b5cf6';
        
        // Parser le service pour affichage
        const { horaire, categorie } = parseCombinedCode(service);
        const displayText = isTexteLibre ? texteLibre : (horaire || service);
        // La catégorie du service combiné OU le poste existant
        const displayCategorie = categorie || poste;
        
        // ===== v4.5.0: Affichage avec statut congé =====
        const renderBottomLine = () => {
          // Cas 1: Statut congé seul (pas de service ni poste)
          if (statutConge && !service && !poste) {
            return null; // Centré, géré plus bas
          }
          
          // Cas 2: Service + Poste + Statut congé → "Poste | Statut"
          if (displayCategorie && statutConge) {
            return (
              <div className="flex items-center justify-center gap-0.5">
                <span className="text-xs font-bold">{displayCategorie}</span>
                <span className="text-gray-400 mx-0.5">|</span>
                <span 
                  className="text-[10px] font-semibold px-1 rounded"
                  style={getStatutCongeStyle(statutConge)}
                >
                  {statutConge}
                </span>
              </div>
            );
          }
          
          // Cas 3: Service + Statut congé (sans poste) → Statut en bas
          if (statutConge && !displayCategorie) {
            return (
              <span 
                className="text-[10px] font-semibold px-1 rounded"
                style={getStatutCongeStyle(statutConge)}
              >
                {statutConge}
              </span>
            );
          }
          
          // Cas 4: Poste seul (pas de statut congé)
          if (displayCategorie) {
            return <span className="text-xs font-bold">{displayCategorie}</span>;
          }
          
          return null;
        };
        
        // Statut congé seul → centré
        if (statutConge && !service && !poste) {
          cellContent = (
            <div className="flex flex-col h-full justify-center items-center">
              {hasNote && (
                <div className="absolute top-0 right-0 p-0.5" title="Note existante">
                  <StickyNote className="w-3 h-3 text-amber-500" />
                </div>
              )}
              <span 
                className="text-sm font-bold px-1.5 py-0.5 rounded"
                style={getStatutCongeStyle(statutConge)}
              >
                {statutConge}
              </span>
            </div>
          );
        } else {
          // Affichage normal avec service/poste et éventuellement statut congé
          cellContent = (
            <div className="flex flex-col h-full justify-between">
              {hasNote && (
                <div className="absolute top-0 right-0 p-0.5" title="Note existante">
                  <StickyNote className="w-3 h-3 text-amber-500" />
                </div>
              )}
              {isTexteLibre && (
                <div className="absolute top-0 left-0 p-0.5" title="Texte libre">
                  <Type className="w-3 h-3 text-purple-500" />
                </div>
              )}
              <div className="flex flex-col">
                {displayText && <span className={`font-medium ${isTexteLibre ? 'text-[10px]' : ''}`}>{displayText}</span>}
                {renderBottomLine()}
              </div>
              {postesSupplementaires.length > 0 && (
                <div className="border-t border-gray-300 border-dashed mt-1 pt-0.5">
                  <span 
                    className="text-[9px] italic font-medium"
                    style={{ color: postesColor }}
                  >
                    {postesSupplementaires.join(' ')}
                  </span>
                </div>
              )}
            </div>
          );
        }
      }
    } else {
      // Cellule vide - couleurs de fond selon jour
      if (isFerier) {
        cellStyle = { backgroundColor: '#fef2f2' }; // red-50
      } else if (isWeekend) {
        cellStyle = { backgroundColor: '#f0fdf4' }; // green-50
      } else {
        cellStyle = { backgroundColor: '#ffffff' };
      }
    }
    
    return (
      <td 
        key={`${agentName}_${day}`}
        className={baseCellClass}
        style={cellStyle}
        onClick={() => onCellClick(agentName, day)}
      >
        {cellContent}
      </td>
    );
  };

  const scrollContainerStyle = {
    overflowX: 'scroll',
    scrollbarWidth: 'auto',
    scrollbarColor: '#3b82f6 #e5e7eb',
    paddingBottom: '50px',
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden relative">
      {/* Modal personnalisation couleurs */}
      <ModalCouleurs 
        isOpen={showColorModal} 
        onClose={handleCloseColorModal}
        context="general"
        userEmail={userEmail}
      />
      
      {/* Barre de navigation via portail */}
      {showNavBar && (
        <NavigationBar 
          onScrollLeft={() => scrollHorizontal('left')}
          onScrollRight={() => scrollHorizontal('right')}
          onScrollStart={scrollToStart}
          onScrollEnd={scrollToEnd}
          onOpenColors={() => setShowColorModal(true)}
        />
      )}

      {/* Container avec scrollbar horizontale */}
      <div 
        ref={scrollContainerRef}
        className="planning-scroll-container"
        style={scrollContainerStyle}
      >
        <style>{`
          .planning-scroll-container::-webkit-scrollbar {
            height: 14px;
          }
          .planning-scroll-container::-webkit-scrollbar-track {
            background: #e5e7eb;
            border-radius: 7px;
          }
          .planning-scroll-container::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
            border-radius: 7px;
            border: 2px solid #e5e7eb;
          }
          .planning-scroll-container::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%);
          }
        `}</style>
        <table className="w-full">
          <tbody>
            {Object.entries(agentsData).map(([groupe, agents], groupIndex) => {
              const isCollapsed = collapsedGroups[groupe];
              const displayGroupe = groupe === 'ACR - ROULEMENT ACR GOGC' 
                ? 'ACR - ROULEMENT ACR COGC' 
                : groupe;
              
              return (
                <React.Fragment key={groupe}>
                  {agents.length > 0 && (
                    <>
                      <tr className="bg-blue-50">
                        <td colSpan={daysInMonth + 1}>
                          <div className="flex items-center justify-between px-4 py-2">
                            <span className="font-semibold text-sm text-blue-900">
                              {displayGroupe} ({agents.length} agents)
                            </span>
                            <button
                              onClick={() => toggleGroupCollapse(groupe)}
                              className="p-1 hover:bg-blue-100 rounded transition-colors"
                              title={isCollapsed ? "Afficher" : "Reduire"}
                            >
                              {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {!isCollapsed && (
                        <>
                          <tr className="bg-gray-50">
                            <th 
                              className="px-2 py-2 text-left text-xs font-medium text-gray-700 sticky left-0 bg-gray-50 z-10"
                              style={{ minWidth: '95px', width: '95px' }}
                            >
                              Agent
                            </th>
                            {Array.from({ length: daysInMonth }, (_, i) => getDayHeader(i + 1))}
                          </tr>
                          
                          {agents.map((agent) => {
                            const fullName = `${agent.nom} ${agent.prenom}`;
                            return (
                              <tr key={agent.id || `${agent.nom}_${agent.prenom}`} className="hover:bg-gray-50">
                                <td 
                                  className="px-2 py-1 text-gray-900 sticky left-0 bg-white z-10 border-r"
                                  style={{ minWidth: '95px', width: '95px' }}
                                >
                                  <button
                                    onClick={() => onAgentClick && onAgentClick(agent)}
                                    className="text-left hover:text-blue-600 hover:underline transition-colors w-full"
                                    title={fullName}
                                  >
                                    <div className="flex flex-col leading-tight">
                                      <span className="font-semibold text-xs">{agent.nom}</span>
                                      <span className="text-[10px] text-gray-600">{agent.prenom}</span>
                                    </div>
                                  </button>
                                </td>
                                {Array.from({ length: daysInMonth }, (_, dayIndex) => 
                                  renderPlanningCell(agent, dayIndex + 1)
                                )}
                              </tr>
                            );
                          })}
                        </>
                      )}
                      
                      {groupIndex < Object.entries(agentsData).length - 1 && (
                        <tr className="h-2 bg-gray-100">
                          <td colSpan={daysInMonth + 1}></td>
                        </tr>
                      )}
                    </>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="p-4 bg-gray-50 border-t">
        <h4 className="font-semibold text-sm mb-2">Legende des codes</h4>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-xs">
          <div>
            <p className="font-medium mb-1">Services :</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span 
                  className="inline-block w-6 h-4 border border-gray-300 rounded text-center text-[10px] font-semibold"
                  style={getCellColorStyle('-')}
                >-</span>
                <span>Matin (06h-14h)</span>
              </div>
              <div className="flex items-center gap-2">
                <span 
                  className="inline-block w-6 h-4 border border-gray-300 rounded text-center text-[10px] font-semibold"
                  style={getCellColorStyle('O')}
                >O</span>
                <span>Soir (14h-22h)</span>
              </div>
              <div className="flex items-center gap-2">
                <span 
                  className="inline-block w-6 h-4 border border-gray-300 rounded text-center text-[10px] font-semibold"
                  style={getCellColorStyle('X')}
                >X</span>
                <span>Nuit (22h-06h)</span>
              </div>
            </div>
          </div>
          <div>
            <p className="font-medium mb-1">Repos / Conges :</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span 
                  className="inline-block w-4 h-4 rounded"
                  style={{ backgroundColor: getServiceColor('RP').bg }}
                ></span>
                <span>RP = Repos</span>
              </div>
              <div className="flex items-center gap-2">
                <span 
                  className="inline-block w-4 h-4 rounded"
                  style={{ backgroundColor: STATUT_CONGE_COLORS['C'].bg }}
                ></span>
                <span>C = Conges</span>
              </div>
              <div className="flex items-center gap-2">
                <span 
                  className="inline-block w-4 h-4 rounded"
                  style={{ backgroundColor: STATUT_CONGE_COLORS['C?'].bg }}
                ></span>
                <span>C? = En attente</span>
              </div>
              <div className="flex items-center gap-2">
                <span 
                  className="inline-block w-4 h-4 rounded"
                  style={{ backgroundColor: STATUT_CONGE_COLORS['CNA'].bg }}
                ></span>
                <span>CNA = Refusé</span>
              </div>
            </div>
          </div>
          <div>
            <p className="font-medium mb-1">Etats :</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span 
                  className="inline-block w-4 h-4 rounded"
                  style={{ backgroundColor: getServiceColor('D').bg }}
                ></span>
                <span>D = Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <span 
                  className="inline-block w-4 h-4 rounded"
                  style={{ backgroundColor: getServiceColor('MA').bg }}
                ></span>
                <span>MA = Maladie</span>
              </div>
              <div className="flex items-center gap-2">
                <span 
                  className="inline-block w-4 h-4 rounded"
                  style={{ backgroundColor: getServiceColor('FO').bg }}
                ></span>
                <span>HAB/FO = Formation</span>
              </div>
            </div>
          </div>
          <div>
            <p className="font-medium mb-1">Postes supplementaires :</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span 
                  className="inline-block px-1 border-t border-dashed border-gray-400 text-[8px] italic"
                  style={{ color: colors.postesSupp?.text || '#8b5cf6' }}
                >+ACR +RO</span>
              </div>
              <p className="text-gray-500 text-xs">En bas de cellule, italique</p>
              <p className="text-gray-500 text-xs">Selection multiple possible</p>
            </div>
          </div>
          <div>
            <p className="font-medium mb-1">Notes :</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-amber-500" />
                <span>Note/Commentaire</span>
              </div>
              <p className="text-gray-500 text-xs">Icone en haut a droite</p>
              <p className="text-gray-500 text-xs">Cliquer pour voir/modifier</p>
            </div>
          </div>
          <div>
            <p className="font-medium mb-1">Texte libre :</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-purple-500" />
                <span>Texte personnalise</span>
              </div>
              <div className="flex items-center gap-2">
                <span 
                  className="inline-block px-1 h-4 rounded text-[8px] flex items-center"
                  style={{ 
                    backgroundColor: colors.texteLibre?.bg || '#fef3c7',
                    color: colors.texteLibre?.text || '#92400e'
                  }}
                >RDV</span>
                <span>Fond jaune clair</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Légende Paie 2026 */}
        <div className="mt-4 pt-3 border-t border-gray-200">
          <p className="font-medium mb-2 text-sm">📅 Dates de paie 2026 :</p>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded border border-gray-300 bg-gray-50"
                style={{
                  backgroundImage: `url(${PAIE_ICONS.general.digiposte})`,
                  backgroundSize: '24px 24px',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}
              />
              <span>Bulletin Digiposte disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded border border-gray-300 bg-gray-50"
                style={{
                  backgroundImage: `url(${PAIE_ICONS.general.euro})`,
                  backgroundSize: '24px 24px',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}
              />
              <span>Virement salaire</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanningTable;
