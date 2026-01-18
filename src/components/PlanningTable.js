import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, StickyNote, Users, Palette, Type, Moon, Sun } from 'lucide-react';
import useColors from '../hooks/useColors';
import useTheme, { NEXAVERSE_THEME } from '../hooks/useTheme';
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
 * NEW v2.19: Toggle Mode Clair / Mode Sombre (Nexaverse) avec option "Se souvenir"
 */

// Composant barre de navigation rendu via portail - VERSION AVEC TOGGLE THEME
const NavigationBar = ({ 
  onScrollLeft, 
  onScrollRight, 
  onScrollStart, 
  onScrollEnd, 
  onOpenColors,
  isDarkMode,
  onToggleTheme,
  rememberChoice,
  onToggleRemember
}) => {
  const [showThemePopover, setShowThemePopover] = useState(false);
  
  return ReactDOM.createPortal(
    <div 
      className={`fixed bottom-0 left-0 right-0 z-[9999] px-2 py-1.5 flex items-center justify-center gap-2 ${
        isDarkMode 
          ? 'bg-gradient-to-r from-[#1a1a2e] to-[#16213e] border-t border-[rgba(0,240,255,0.3)]' 
          : 'bg-gradient-to-r from-blue-600 to-blue-700'
      }`}
      style={{ 
        boxShadow: isDarkMode ? '0 -2px 20px rgba(0, 240, 255, 0.2)' : '0 -2px 10px rgba(0, 0, 0, 0.3)',
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
        className={`p-1.5 rounded-full transition-colors ${
          isDarkMode 
            ? 'bg-[rgba(0,240,255,0.2)] hover:bg-[rgba(0,240,255,0.3)] text-[#00f0ff]' 
            : 'bg-white/20 hover:bg-white/30 text-white'
        }`}
        title="Personnaliser les couleurs"
      >
        <Palette size={18} />
      </button>

      {/* Toggle Thème avec popover */}
      <div className="relative">
        <button
          onClick={() => setShowThemePopover(!showThemePopover)}
          className={`p-1.5 rounded-full transition-all ${
            isDarkMode 
              ? 'bg-[rgba(0,240,255,0.2)] hover:bg-[rgba(0,240,255,0.3)] text-[#00f0ff]' 
              : 'bg-white/20 hover:bg-white/30 text-white'
          }`}
          title={isDarkMode ? "Mode Sombre actif" : "Mode Clair actif"}
        >
          {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        
        {/* Popover pour le toggle */}
        {showThemePopover && (
          <>
            {/* Overlay pour fermer */}
            <div 
              className="fixed inset-0 z-[9998]" 
              onClick={() => setShowThemePopover(false)}
            />
            
            {/* Contenu du popover */}
            <div 
              className={`absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 p-3 rounded-lg shadow-lg z-[10000] min-w-[200px] ${
                isDarkMode 
                  ? 'bg-[#16213e] border border-[rgba(0,240,255,0.3)]' 
                  : 'bg-white border border-gray-200'
              }`}
              style={{ 
                boxShadow: isDarkMode 
                  ? '0 -4px 20px rgba(0, 240, 255, 0.2)' 
                  : '0 -4px 20px rgba(0, 0, 0, 0.15)'
              }}
            >
              {/* Toggle principal */}
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                  {isDarkMode ? '🌙 Mode Sombre' : '☀️ Mode Clair'}
                </span>
                <button
                  onClick={() => {
                    onToggleTheme();
                  }}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    isDarkMode 
                      ? 'bg-[#00f0ff]' 
                      : 'bg-gray-300'
                  }`}
                >
                  <span 
                    className={`absolute top-1 w-4 h-4 rounded-full transition-transform ${
                      isDarkMode 
                        ? 'translate-x-7 bg-[#1a1a2e]' 
                        : 'translate-x-1 bg-white'
                    }`}
                  />
                </button>
              </div>
              
              {/* Séparateur */}
              <div className={`border-t mb-3 ${isDarkMode ? 'border-[rgba(255,255,255,0.1)]' : 'border-gray-100'}`} />
              
              {/* Checkbox "Se souvenir" */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberChoice}
                  onChange={(e) => onToggleRemember(e.target.checked)}
                  className={`w-4 h-4 rounded ${
                    isDarkMode 
                      ? 'accent-[#00f0ff]' 
                      : 'accent-blue-600'
                  }`}
                />
                <span className={`text-xs ${isDarkMode ? 'text-[rgba(255,255,255,0.7)]' : 'text-gray-600'}`}>
                  Se souvenir de mon choix
                </span>
              </label>
              
              {/* Indication */}
              {rememberChoice && (
                <p className={`text-xs mt-2 ${isDarkMode ? 'text-[#00f0ff]' : 'text-blue-600'}`}>
                  ✓ Préférence sauvegardée
                </p>
              )}
            </div>
          </>
        )}
      </div>

      <button
        onClick={onScrollStart}
        className={`flex items-center gap-0.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
          isDarkMode 
            ? 'bg-[rgba(0,240,255,0.2)] hover:bg-[rgba(0,240,255,0.3)] text-[#00f0ff]' 
            : 'bg-white/20 hover:bg-white/30 text-white'
        }`}
        title="Aller au début du mois (Jour 1)"
      >
        <ChevronLeft size={14} />
        <ChevronLeft size={14} className="-ml-2" />
        <span>J1</span>
      </button>
      
      <button
        onClick={onScrollLeft}
        className={`p-1.5 rounded-full transition-colors ${
          isDarkMode 
            ? 'bg-[rgba(0,240,255,0.2)] hover:bg-[rgba(0,240,255,0.3)] text-[#00f0ff]' 
            : 'bg-white/20 hover:bg-white/30 text-white'
        }`}
        title="Défiler vers la gauche"
      >
        <ChevronLeft size={18} />
      </button>
      
      <span className={`text-xs font-medium px-2 hidden sm:block ${isDarkMode ? 'text-[#00f0ff]' : 'text-white'}`}>
        ◀ ▶
      </span>
      
      <button
        onClick={onScrollRight}
        className={`p-1.5 rounded-full transition-colors ${
          isDarkMode 
            ? 'bg-[rgba(0,240,255,0.2)] hover:bg-[rgba(0,240,255,0.3)] text-[#00f0ff]' 
            : 'bg-white/20 hover:bg-white/30 text-white'
        }`}
        title="Défiler vers la droite"
      >
        <ChevronRight size={18} />
      </button>
      
      <button
        onClick={onScrollEnd}
        className={`flex items-center gap-0.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
          isDarkMode 
            ? 'bg-[rgba(0,240,255,0.2)] hover:bg-[rgba(0,240,255,0.3)] text-[#00f0ff]' 
            : 'bg-white/20 hover:bg-white/30 text-white'
        }`}
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
  
  // Hook pour le thème clair/sombre
  const { isDarkMode, toggleTheme, rememberChoice, setRememberChoice } = useTheme('general');
  
  // State pour la modal couleurs
  const [showColorModal, setShowColorModal] = useState(false);
  
  useEffect(() => {
    console.log(`📅 PlanningTable: currentMonth=${currentMonth}, currentYear prop=${currentYear}, year utilisé=${year}`);
    console.log(`🌓 PlanningTable: isDarkMode=${isDarkMode}, rememberChoice=${rememberChoice}`);
  }, [currentMonth, currentYear, year, isDarkMode, rememberChoice]);
  
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
  
  const getDayHeader = (day) => {
    const { isWeekend, isFerier } = planningService.getJourType(day, currentMonth, year);
    const dayName = planningService.getDayName(day, currentMonth, year);
    
    // Classes de base communes
    let baseClasses = 'px-1 py-2 text-center text-xs font-medium min-w-[55px] ';
    
    // Styles selon le thème et le type de jour
    let bgColor, textColor;
    
    if (isDarkMode) {
      if (isFerier) {
        bgColor = 'rgba(239, 68, 68, 0.3)'; // Rouge semi-transparent
        textColor = '#fca5a5';
      } else if (isWeekend) {
        bgColor = 'rgba(34, 197, 94, 0.2)'; // Vert semi-transparent
        textColor = '#86efac';
      } else {
        bgColor = 'rgba(255, 255, 255, 0.05)';
        textColor = 'rgba(255, 255, 255, 0.8)';
      }
    } else {
      if (isFerier) {
        bgColor = '#fef2f2';
        textColor = '#991b1b';
      } else if (isWeekend) {
        bgColor = '#f0fdf4';
        textColor = '#166534';
      } else {
        bgColor = '#f9fafb';
        textColor = '#374151';
      }
    }
    
    const isClickable = typeof onDayHeaderClick === 'function';
    
    return (
      <th 
        key={day} 
        className={`${baseClasses} ${isClickable ? 'cursor-pointer group' : ''}`}
        style={{ 
          backgroundColor: bgColor, 
          color: textColor,
          transition: 'all 0.2s'
        }}
        onClick={isClickable ? () => onDayHeaderClick(day) : undefined}
        title={isClickable ? `Voir les equipes du ${day}` : undefined}
      >
        <div className="flex flex-col items-center">
          <span className="text-xs uppercase">{dayName}</span>
          <span className="font-bold text-sm">{day}</span>
          {isFerier && <span className="text-xs">Ferie</span>}
          {isClickable && (
            <Users className={`w-3 h-3 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${
              isDarkMode ? 'text-[#00f0ff]' : 'text-blue-600'
            }`} />
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
        cellContent = planningData;
        cellStyle = getCellColorStyle(planningData);
      } else if (typeof planningData === 'object') {
        const service = planningData.service || '';
        const poste = planningData.poste || '';
        const texteLibre = planningData.texteLibre || '';
        const statutConge = planningData.statutConge || ''; // ✅ FIX v2.19: Support statut congé
        const postesSupplementaires = planningData.postesSupplementaires || 
          (planningData.posteSupplementaire ? [planningData.posteSupplementaire] : []);
        
        hasNote = Boolean(planningData.note);
        isTexteLibre = service === 'LIBRE' && texteLibre;
        
        // Couleurs pour les statuts congé
        const STATUT_CONGE_COLORS = {
          'C': { bg: '#facc15', text: '#713f12' },
          'C?': { bg: '#fef08a', text: '#854d0e' },
          'CNA': { bg: '#fca5a5', text: '#991b1b' }
        };
        
        // Couleur selon le type
        if (isTexteLibre) {
          // Utiliser la couleur configurée pour le texte libre
          const texteLibreColors = colors.texteLibre || { bg: '#fef3c7', text: '#92400e' };
          cellStyle = {
            backgroundColor: texteLibreColors.bg,
            color: texteLibreColors.text,
          };
        } else {
          cellStyle = getCellColorStyle(service);
        }
        
        // Couleur des postes supplémentaires
        const postesColor = colors.postesSupp?.text || '#8b5cf6';
        
        // Texte à afficher : texteLibre si LIBRE, sinon service
        const displayText = isTexteLibre ? texteLibre : service;
        
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
              <span className={`font-medium ${isTexteLibre ? 'text-[10px]' : ''}`}>{displayText}</span>
              {poste && <span className="text-xs font-bold">{poste}</span>}
            </div>
            {/* ✅ FIX v2.19: Affichage statut congé (C, C?, CNA) */}
            {statutConge && (
              <span 
                className="text-[8px] font-bold px-1 rounded mt-0.5"
                style={{
                  backgroundColor: STATUT_CONGE_COLORS[statutConge]?.bg || '#e5e7eb',
                  color: STATUT_CONGE_COLORS[statutConge]?.text || '#374151'
                }}
              >
                {statutConge}
              </span>
            )}
            {postesSupplementaires.length > 0 && (
              <div className={`border-t border-dashed mt-1 pt-0.5 ${isDarkMode ? 'border-gray-500' : 'border-gray-300'}`}>
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
    } else {
      // Cellule vide - couleurs de fond selon jour et thème
      if (isDarkMode) {
        if (isFerier) {
          cellStyle = { backgroundColor: 'rgba(239, 68, 68, 0.15)' };
        } else if (isWeekend) {
          cellStyle = { backgroundColor: 'rgba(34, 197, 94, 0.1)' };
        } else {
          cellStyle = { backgroundColor: 'rgba(255, 255, 255, 0.03)' };
        }
      } else {
        if (isFerier) {
          cellStyle = { backgroundColor: '#fef2f2' }; // red-50
        } else if (isWeekend) {
          cellStyle = { backgroundColor: '#f0fdf4' }; // green-50
        } else {
          cellStyle = { backgroundColor: '#ffffff' };
        }
      }
    }
    
    // Ajouter la couleur de bordure selon le thème
    cellStyle.borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e5e7eb';
    
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
    scrollbarColor: isDarkMode ? '#00f0ff #1a1a2e' : '#3b82f6 #e5e7eb',
    paddingBottom: '50px',
  };

  // Styles pour le thème sombre
  const containerStyle = isDarkMode ? {
    backgroundColor: NEXAVERSE_THEME.bgPrimary,
    border: `1px solid ${NEXAVERSE_THEME.borderColor}`,
    boxShadow: NEXAVERSE_THEME.shadowCard,
  } : {};

  return (
    <div 
      className={`rounded-lg shadow overflow-hidden relative ${isDarkMode ? '' : 'bg-white'}`}
      style={containerStyle}
    >
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
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
          rememberChoice={rememberChoice}
          onToggleRemember={setRememberChoice}
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
            background: ${isDarkMode ? '#1a1a2e' : '#e5e7eb'};
            border-radius: 7px;
          }
          .planning-scroll-container::-webkit-scrollbar-thumb {
            background: ${isDarkMode 
              ? 'linear-gradient(180deg, #00f0ff 0%, #0066b3 100%)' 
              : 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)'};
            border-radius: 7px;
            border: 2px solid ${isDarkMode ? '#1a1a2e' : '#e5e7eb'};
          }
          .planning-scroll-container::-webkit-scrollbar-thumb:hover {
            background: ${isDarkMode 
              ? 'linear-gradient(180deg, #00f0ff 0%, #00c4cc 100%)' 
              : 'linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)'};
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
                      <tr style={{ 
                        backgroundColor: isDarkMode ? 'rgba(0, 240, 255, 0.1)' : '#eff6ff' 
                      }}>
                        <td colSpan={daysInMonth + 1}>
                          <div className="flex items-center justify-between px-4 py-2">
                            <span className={`font-semibold text-sm ${
                              isDarkMode ? 'text-[#00f0ff]' : 'text-blue-900'
                            }`}>
                              {displayGroupe} ({agents.length} agents)
                            </span>
                            <button
                              onClick={() => toggleGroupCollapse(groupe)}
                              className={`p-1 rounded transition-colors ${
                                isDarkMode 
                                  ? 'hover:bg-[rgba(0,240,255,0.2)] text-[#00f0ff]' 
                                  : 'hover:bg-blue-100 text-blue-800'
                              }`}
                              title={isCollapsed ? "Afficher" : "Reduire"}
                            >
                              {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {!isCollapsed && (
                        <>
                          <tr style={{ 
                            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f9fafb' 
                          }}>
                            <th 
                              className="px-2 py-2 text-left text-xs font-medium sticky left-0 z-10"
                              style={{ 
                                minWidth: '95px', 
                                width: '95px',
                                backgroundColor: isDarkMode ? '#1a1a2e' : '#f9fafb',
                                color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : '#374151'
                              }}
                            >
                              Agent
                            </th>
                            {Array.from({ length: daysInMonth }, (_, i) => getDayHeader(i + 1))}
                          </tr>
                          
                          {agents.map((agent) => {
                            const fullName = `${agent.nom} ${agent.prenom}`;
                            return (
                              <tr 
                                key={agent.id || `${agent.nom}_${agent.prenom}`} 
                                className={isDarkMode ? '' : 'hover:bg-gray-50'}
                                style={{
                                  backgroundColor: isDarkMode ? 'transparent' : undefined
                                }}
                              >
                                <td 
                                  className="px-2 py-1 sticky left-0 z-10 border-r"
                                  style={{ 
                                    minWidth: '95px', 
                                    width: '95px',
                                    backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff',
                                    color: isDarkMode ? '#ffffff' : '#111827',
                                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e5e7eb'
                                  }}
                                >
                                  <button
                                    onClick={() => onAgentClick && onAgentClick(agent)}
                                    className={`text-left transition-colors w-full ${
                                      isDarkMode 
                                        ? 'hover:text-[#00f0ff]' 
                                        : 'hover:text-blue-600 hover:underline'
                                    }`}
                                    title={fullName}
                                  >
                                    <div className="flex flex-col leading-tight">
                                      <span className="font-semibold text-xs">{agent.nom}</span>
                                      <span className={`text-[10px] ${
                                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                      }`}>{agent.prenom}</span>
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
                        <tr className="h-2" style={{ 
                          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f3f4f6' 
                        }}>
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
      
      {/* Légende */}
      <div 
        className="p-4 border-t"
        style={{
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : '#f9fafb',
          borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e5e7eb'
        }}
      >
        <h4 className={`font-semibold text-sm mb-2 ${isDarkMode ? 'text-[#00f0ff]' : 'text-gray-900'}`}>
          Legende des codes
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-xs">
          <div>
            <p className={`font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>Services :</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span 
                  className="inline-block w-6 h-4 border rounded text-center text-[10px] font-semibold"
                  style={{
                    ...getCellColorStyle('-'),
                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : '#d1d5db'
                  }}
                >-</span>
                <span className={isDarkMode ? 'text-gray-300' : ''}>Matin (06h-14h)</span>
              </div>
              <div className="flex items-center gap-2">
                <span 
                  className="inline-block w-6 h-4 border rounded text-center text-[10px] font-semibold"
                  style={{
                    ...getCellColorStyle('O'),
                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : '#d1d5db'
                  }}
                >O</span>
                <span className={isDarkMode ? 'text-gray-300' : ''}>Soir (14h-22h)</span>
              </div>
              <div className="flex items-center gap-2">
                <span 
                  className="inline-block w-6 h-4 border rounded text-center text-[10px] font-semibold"
                  style={{
                    ...getCellColorStyle('X'),
                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : '#d1d5db'
                  }}
                >X</span>
                <span className={isDarkMode ? 'text-gray-300' : ''}>Nuit (22h-06h)</span>
              </div>
            </div>
          </div>
          <div>
            <p className={`font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>Repos / Conges :</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span 
                  className="inline-block w-4 h-4 rounded"
                  style={{ backgroundColor: getServiceColor('RP').bg }}
                ></span>
                <span className={isDarkMode ? 'text-gray-300' : ''}>RP = Repos</span>
              </div>
              <div className="flex items-center gap-2">
                <span 
                  className="inline-block w-4 h-4 rounded"
                  style={{ backgroundColor: getServiceColor('C').bg }}
                ></span>
                <span className={isDarkMode ? 'text-gray-300' : ''}>C = Conges</span>
              </div>
            </div>
          </div>
          <div>
            <p className={`font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>Etats :</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span 
                  className="inline-block w-4 h-4 rounded"
                  style={{ backgroundColor: getServiceColor('D').bg }}
                ></span>
                <span className={isDarkMode ? 'text-gray-300' : ''}>D = Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <span 
                  className="inline-block w-4 h-4 rounded"
                  style={{ backgroundColor: getServiceColor('MA').bg }}
                ></span>
                <span className={isDarkMode ? 'text-gray-300' : ''}>MA = Maladie</span>
              </div>
              <div className="flex items-center gap-2">
                <span 
                  className="inline-block w-4 h-4 rounded"
                  style={{ backgroundColor: getServiceColor('FO').bg }}
                ></span>
                <span className={isDarkMode ? 'text-gray-300' : ''}>HAB/FO = Formation</span>
              </div>
            </div>
          </div>
          <div>
            <p className={`font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>Postes supplementaires :</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span 
                  className={`inline-block px-1 border-t border-dashed text-[8px] italic ${
                    isDarkMode ? 'border-gray-500' : 'border-gray-400'
                  }`}
                  style={{ color: colors.postesSupp?.text || '#8b5cf6' }}
                >+ACR +RO</span>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>En bas de cellule, italique</p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Selection multiple possible</p>
            </div>
          </div>
          <div>
            <p className={`font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>Notes :</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-amber-500" />
                <span className={isDarkMode ? 'text-gray-300' : ''}>Note/Commentaire</span>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Icone en haut a droite</p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Cliquer pour voir/modifier</p>
            </div>
          </div>
          <div>
            <p className={`font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>Texte libre :</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-purple-500" />
                <span className={isDarkMode ? 'text-gray-300' : ''}>Texte personnalise</span>
              </div>
              <div className="flex items-center gap-2">
                <span 
                  className="inline-block px-1 h-4 rounded text-[8px] flex items-center"
                  style={{ 
                    backgroundColor: colors.texteLibre?.bg || '#fef3c7',
                    color: colors.texteLibre?.text || '#92400e'
                  }}
                >RDV</span>
                <span className={isDarkMode ? 'text-gray-300' : ''}>Fond jaune clair</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Indicateur du thème actuel */}
        <div className={`mt-4 pt-3 border-t flex items-center justify-center gap-2 text-xs ${
          isDarkMode ? 'border-[rgba(255,255,255,0.1)] text-gray-400' : 'border-gray-200 text-gray-500'
        }`}>
          {isDarkMode ? <Moon size={14} className="text-[#00f0ff]" /> : <Sun size={14} className="text-amber-500" />}
          <span>
            Thème {isDarkMode ? 'Nexaverse (Sombre)' : 'Clair'} 
            {rememberChoice && ' • Sauvegardé'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PlanningTable;
