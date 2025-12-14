import React, { useState, useRef } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, StickyNote, Users } from 'lucide-react';
import { CODE_COLORS, CURRENT_YEAR } from '../constants/config';
import planningService from '../services/planningService';

/**
 * PlanningTable - Grille mensuelle du planning
 * 
 * FIX v2.10: Ajout de currentYear pour calcul correct des jours du mois
 * FIX v2.11: Scrollbar horizontale toujours visible et stylée
 * FIX v2.12: Boutons navigation gauche/droite flottants en haut
 */
const PlanningTable = ({ 
  currentMonth, 
  currentYear = CURRENT_YEAR,
  planning, 
  agentsData, 
  onCellClick, 
  onAgentClick, 
  onDayHeaderClick 
}) => {
  const daysInMonth = planningService.getDaysInMonth(currentMonth, currentYear);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const scrollContainerRef = useRef(null);
  
  const toggleGroupCollapse = (groupName) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Fonction pour scroller horizontalement
  const scrollHorizontal = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300; // pixels à scroller
      const currentScroll = scrollContainerRef.current.scrollLeft;
      scrollContainerRef.current.scrollTo({
        left: direction === 'left' ? currentScroll - scrollAmount : currentScroll + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Aller au début ou à la fin du mois
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
  
  const getDayHeader = (day) => {
    const { isWeekend, isFerier } = planningService.getJourType(day, currentMonth, currentYear);
    const dayName = planningService.getDayName(day, currentMonth, currentYear);
    
    let className = 'px-1 py-2 text-center text-xs font-medium min-w-[55px] ';
    
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
    
    return (
      <th 
        key={day} 
        className={className}
        onClick={isClickable ? () => onDayHeaderClick(day) : undefined}
        title={isClickable ? `Voir les equipes du ${day}` : undefined}
      >
        <div className="flex flex-col items-center">
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
    const { isWeekend, isFerier } = planningService.getJourType(day, currentMonth, currentYear);
    
    let cellContent = '';
    let cellClass = 'border px-1 py-1 text-center text-xs cursor-pointer hover:bg-gray-100 transition-colors min-w-[55px] min-h-[40px] relative ';
    let hasNote = false;
    
    if (planningData) {
      if (typeof planningData === 'string') {
        cellContent = planningData;
        cellClass += CODE_COLORS[planningData] || 'bg-gray-100 text-gray-600';
      } else if (typeof planningData === 'object') {
        const service = planningData.service || '';
        const poste = planningData.poste || '';
        const postesSupplementaires = planningData.postesSupplementaires || 
          (planningData.posteSupplementaire ? [planningData.posteSupplementaire] : []);
        
        hasNote = Boolean(planningData.note);
        
        cellContent = (
          <div className="flex flex-col h-full justify-between">
            {hasNote && (
              <div className="absolute top-0 right-0 p-0.5" title="Note existante">
                <StickyNote className="w-3 h-3 text-amber-500" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-medium">{service}</span>
              {poste && <span className="text-xs font-bold">{poste}</span>}
            </div>
            {postesSupplementaires.length > 0 && (
              <div className="border-t border-gray-300 border-dashed mt-1 pt-0.5">
                <span className="text-[9px] italic text-purple-700 font-medium">
                  {postesSupplementaires.join(' ')}
                </span>
              </div>
            )}
          </div>
        );
        cellClass += CODE_COLORS[service] || 'bg-gray-100 text-gray-600';
      }
    } else {
      if (isFerier) {
        cellClass += 'bg-red-50';
      } else if (isWeekend) {
        cellClass += 'bg-green-50';
      } else {
        cellClass += 'bg-white';
      }
    }
    
    return (
      <td 
        key={`${agentName}_${day}`}
        className={cellClass}
        onClick={() => onCellClick(agentName, day)}
      >
        {cellContent}
      </td>
    );
  };

  // Styles pour scrollbar visible et stylée
  const scrollContainerStyle = {
    overflowX: 'scroll',
    scrollbarWidth: 'auto',
    scrollbarColor: '#3b82f6 #e5e7eb',
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden relative">
      {/* Barre de navigation horizontale en haut */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 flex items-center justify-between shadow-md">
        <button
          onClick={scrollToStart}
          className="flex items-center gap-1 px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-white text-sm transition-colors"
          title="Aller au début du mois"
        >
          <ChevronLeft size={16} />
          <ChevronLeft size={16} className="-ml-3" />
          <span className="hidden sm:inline">Début</span>
        </button>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => scrollHorizontal('left')}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
            title="Défiler vers la gauche"
          >
            <ChevronLeft size={20} />
          </button>
          
          <span className="text-white text-sm font-medium px-3">
            ◀ Navigation horizontale ▶
          </span>
          
          <button
            onClick={() => scrollHorizontal('right')}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
            title="Défiler vers la droite"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        
        <button
          onClick={scrollToEnd}
          className="flex items-center gap-1 px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-white text-sm transition-colors"
          title="Aller à la fin du mois"
        >
          <span className="hidden sm:inline">Fin</span>
          <ChevronRight size={16} />
          <ChevronRight size={16} className="-ml-3" />
        </button>
      </div>

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
                <span className="inline-block w-6 h-4 bg-white border border-gray-300 rounded text-center text-[10px] font-semibold">-</span>
                <span>Matin (06h-14h)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-6 h-4 bg-white border border-gray-300 rounded text-center text-[10px] font-semibold">O</span>
                <span>Soir (14h-22h)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-6 h-4 bg-white border border-gray-300 rounded text-center text-[10px] font-semibold">X</span>
                <span>Nuit (22h-06h)</span>
              </div>
            </div>
          </div>
          <div>
            <p className="font-medium mb-1">Repos / Conges :</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 bg-green-100 rounded"></span>
                <span>RP = Repos</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 bg-yellow-400 rounded"></span>
                <span>C = Conges</span>
              </div>
            </div>
          </div>
          <div>
            <p className="font-medium mb-1">Etats :</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 bg-blue-200 rounded"></span>
                <span>D = Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 bg-red-200 rounded"></span>
                <span>MA = Maladie</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 bg-orange-200 rounded"></span>
                <span>HAB/FO = Formation</span>
              </div>
            </div>
          </div>
          <div>
            <p className="font-medium mb-1">Postes supplementaires :</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-block px-1 border-t border-dashed border-gray-400 text-[8px] italic text-purple-700">+ACR +RO</span>
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
            <p className="font-medium mb-1">Equipes du jour :</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Clic sur en-tete jour</span>
              </div>
              <p className="text-gray-500 text-xs">Voir qui travaille</p>
              <p className="text-gray-500 text-xs">Par creneaux horaires</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanningTable;
