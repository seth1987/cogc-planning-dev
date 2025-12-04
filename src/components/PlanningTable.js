import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { CODE_COLORS } from '../constants/config';
import planningService from '../services/planningService';

const PlanningTable = ({ currentMonth, planning, agentsData, onCellClick, onAgentClick }) => {
  const daysInMonth = planningService.getDaysInMonth(currentMonth);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  
  const toggleGroupCollapse = (groupName) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };
  
  const getDayHeader = (day) => {
    const { isWeekend, isFerier } = planningService.getJourType(day, currentMonth);
    const dayName = planningService.getDayName(day, currentMonth);
    
    let className = 'px-1 py-2 text-center text-xs font-medium min-w-[60px] ';
    
    if (isFerier) {
      className += 'bg-red-100 text-red-900';
    } else if (isWeekend) {
      className += 'bg-green-100 text-green-800';
    } else {
      className += 'bg-gray-50 text-gray-700';
    }
    
    return (
      <th key={day} className={className}>
        <div className="flex flex-col">
          <span className="text-xs uppercase">{dayName}</span>
          <span className="font-bold text-sm">{day}</span>
          {isFerier && <span className="text-xs">Férié</span>}
        </div>
      </th>
    );
  };

  const renderPlanningCell = (agent, day) => {
    const agentName = `${agent.nom} ${agent.prenom}`;
    const planningData = planning[agentName]?.[day];
    const { isWeekend, isFerier } = planningService.getJourType(day, currentMonth);
    
    let cellContent = '';
    let cellClass = 'border px-1 py-1 text-center text-xs cursor-pointer hover:bg-gray-100 transition-colors min-w-[60px] ';
    
    if (planningData) {
      if (typeof planningData === 'string') {
        cellContent = planningData;
        cellClass += CODE_COLORS[planningData] || 'bg-gray-100 text-gray-600';
      } else if (typeof planningData === 'object') {
        const service = planningData.service || '';
        const poste = planningData.poste || '';
        const posteSupplementaire = planningData.posteSupplementaire || '';
        
        cellContent = (
          <div className="flex flex-col relative">
            <span>{service}</span>
            {poste && <span className="text-xs font-bold">{poste}</span>}
            {posteSupplementaire && (
              <span className="text-xs italic text-purple-700 opacity-80 absolute bottom-0 right-0 text-[10px]">
                {posteSupplementaire}
              </span>
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

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
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
                      {/* En-tête du groupe avec bouton de réduction */}
                      <tr className="bg-blue-50">
                        <td colSpan={daysInMonth + 1}>
                          <div className="flex items-center justify-between px-4 py-2">
                            <span className="font-semibold text-sm text-blue-900">
                              {displayGroupe} ({agents.length} agents)
                            </span>
                            <button
                              onClick={() => toggleGroupCollapse(groupe)}
                              className="p-1 hover:bg-blue-100 rounded transition-colors"
                              title={isCollapsed ? "Afficher" : "Réduire"}
                            >
                              {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {!isCollapsed && (
                        <>
                          {/* En-tête des jours pour chaque groupe */}
                          <tr className="bg-gray-50">
                            <th className="w-48 px-4 py-2 text-left text-xs font-medium text-gray-700 sticky left-0 bg-gray-50 z-10">
                              Agent
                            </th>
                            {Array.from({ length: daysInMonth }, (_, i) => getDayHeader(i + 1))}
                          </tr>
                          
                          {/* Lignes des agents */}
                          {agents.map((agent) => (
                            <tr key={agent.id || `${agent.nom}_${agent.prenom}`} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r">
                                <div className="flex items-center justify-between">
                                  <button
                                    onClick={() => onAgentClick && onAgentClick(agent)}
                                    className="text-left hover:text-blue-600 hover:underline transition-colors"
                                    title="Cliquer pour voir les détails"
                                  >
                                    <span>{agent.nom} {agent.prenom}</span>
                                  </button>
                                  {agent.site === 'Denfert-Rochereau' && (
                                    <span className="text-xs text-purple-600 ml-2">DR</span>
                                  )}
                                </div>
                              </td>
                              {Array.from({ length: daysInMonth }, (_, dayIndex) => 
                                renderPlanningCell(agent, dayIndex + 1)
                              )}
                            </tr>
                          ))}
                        </>
                      )}
                      
                      {/* Séparateur entre les groupes */}
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
      
      {/* Légende mise à jour */}
      <div className="p-4 bg-gray-50 border-t">
        <h4 className="font-semibold text-sm mb-2">Légende des codes</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <p className="font-medium mb-1">Services :</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 bg-blue-100 rounded"></span>
                <span>- = Matin (06h-14h)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 bg-orange-100 rounded"></span>
                <span>O = Soir (14h-22h)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 bg-purple-100 rounded"></span>
                <span>X = Nuit (22h-06h)</span>
              </div>
            </div>
          </div>
          <div>
            <p className="font-medium mb-1">Repos :</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 bg-green-100 rounded"></span>
                <span>RP = Repos</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 bg-green-100 rounded"></span>
                <span>C = Congés</span>
              </div>
            </div>
          </div>
          <div>
            <p className="font-medium mb-1">États :</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 bg-yellow-100 rounded"></span>
                <span>D = Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 bg-red-100 rounded"></span>
                <span>MA = Maladie</span>
              </div>
            </div>
          </div>
          <div>
            <p className="font-medium mb-1">Postes supplémentaires :</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 bg-purple-100 rounded italic text-[8px] flex items-center justify-center text-purple-700">+</span>
                <span className="italic">+ACR, +RO, +RE...</span>
              </div>
              <p className="text-gray-500 text-xs">Affichés en italique</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanningTable;
