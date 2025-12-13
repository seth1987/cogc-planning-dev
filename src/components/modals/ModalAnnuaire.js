import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, Phone, Mail, Users, Edit2, Save, Loader2, CheckCircle, AlertCircle, Building2, ChevronDown, ChevronUp } from 'lucide-react';
import supabaseService from '../../services/supabaseService';
import useIsMobile from '../../hooks/useIsMobile';

/**
 * ModalAnnuaire - Annuaire téléphonique du COGC
 * 
 * Version responsive : Cards sur mobile, Table sur desktop
 * 
 * v4.0 - Version responsive mobile/desktop
 *   - Détection automatique via useIsMobile
 *   - Layout Cards sur mobile (< 768px)
 *   - Layout Table sur desktop (>= 768px)
 *   - Touch targets optimisés (44px minimum)
 *   - Groupes collapsibles sur mobile
 * 
 * @param {boolean} isOpen - État d'ouverture du modal
 * @param {function} onClose - Callback de fermeture
 * @param {object} currentUser - Utilisateur connecté (pour info seulement)
 */
const ModalAnnuaire = ({ isOpen, onClose, currentUser }) => {
  const isMobile = useIsMobile();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [agents, setAgents] = useState([]);
  const [groupesContacts, setGroupesContacts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Groupes collapsés sur mobile
  const [collapsedGroups, setCollapsedGroups] = useState({});
  
  // État d'édition agent
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ telephone: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  
  // État d'édition groupe
  const [editingGroupCode, setEditingGroupCode] = useState(null);
  const [editGroupForm, setEditGroupForm] = useState({ telephone: '', email: '' });
  const [savingGroup, setSavingGroup] = useState(false);
  const [saveGroupMessage, setSaveGroupMessage] = useState(null);

  // Toggle collapse groupe (mobile)
  const toggleGroupCollapse = (groupCode) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupCode]: !prev[groupCode]
    }));
  };

  // Charger les agents et contacts de groupe depuis Supabase
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const supabase = supabaseService.client;
      
      // Charger les agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('id, nom, prenom, telephone, email, groupe_travail, groupe, site')
        .order('groupe_travail')
        .order('nom');
      
      if (agentsError) throw agentsError;
      
      // Charger les contacts de groupe
      const { data: groupesData, error: groupesError } = await supabase
        .from('groupes_contacts')
        .select('*');
      
      if (groupesError) throw groupesError;
      
      setAgents(agentsData || []);
      
      // Transformer en objet indexé par groupe_code
      const groupesMap = {};
      (groupesData || []).forEach(g => {
        groupesMap[g.groupe_code] = g;
      });
      setGroupesContacts(groupesMap);
      
    } catch (err) {
      console.error('Erreur chargement annuaire:', err);
      setError('Impossible de charger l\'annuaire');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  // Vérifier si c'est l'utilisateur courant
  const isCurrentUser = useCallback((agent) => {
    if (!currentUser) return false;
    
    if (currentUser.email && agent.email) {
      return currentUser.email.toLowerCase() === agent.email.toLowerCase();
    }
    
    if (currentUser.nom && currentUser.prenom) {
      return (
        agent.nom?.toLowerCase() === currentUser.nom.toLowerCase() &&
        agent.prenom?.toLowerCase() === currentUser.prenom.toLowerCase()
      );
    }
    
    if (typeof currentUser === 'string') {
      const fullName = `${agent.nom} ${agent.prenom}`.toLowerCase();
      return fullName.includes(currentUser.toLowerCase());
    }
    
    return false;
  }, [currentUser]);

  // === Fonctions d'édition AGENT ===
  const startEdit = (agent) => {
    setEditingId(agent.id);
    setEditForm({
      telephone: agent.telephone || '',
      email: agent.email || ''
    });
    setSaveMessage(null);
    setEditingGroupCode(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ telephone: '', email: '' });
    setSaveMessage(null);
  };

  const saveEdit = async (agentId) => {
    try {
      setSaving(true);
      setSaveMessage(null);
      
      const supabase = supabaseService.client;
      const { error: updateError } = await supabase
        .from('agents')
        .update({
          telephone: editForm.telephone || null,
          email: editForm.email || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', agentId);
      
      if (updateError) throw updateError;
      
      setAgents(prev => prev.map(a => 
        a.id === agentId 
          ? { ...a, telephone: editForm.telephone, email: editForm.email }
          : a
      ));
      
      setSaveMessage({ type: 'success', text: 'Mis à jour !' });
      
      setTimeout(() => {
        setEditingId(null);
        setSaveMessage(null);
      }, 1500);
      
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      setSaveMessage({ type: 'error', text: 'Erreur' });
    } finally {
      setSaving(false);
    }
  };

  // === Fonctions d'édition GROUPE ===
  const startGroupEdit = (groupeCode) => {
    const groupeInfo = groupesContacts[groupeCode] || {};
    setEditingGroupCode(groupeCode);
    setEditGroupForm({
      telephone: groupeInfo.telephone || '',
      email: groupeInfo.email || ''
    });
    setSaveGroupMessage(null);
    setEditingId(null);
  };

  const cancelGroupEdit = () => {
    setEditingGroupCode(null);
    setEditGroupForm({ telephone: '', email: '' });
    setSaveGroupMessage(null);
  };

  const saveGroupEdit = async (groupeCode) => {
    try {
      setSavingGroup(true);
      setSaveGroupMessage(null);
      
      const supabase = supabaseService.client;
      const existingGroup = groupesContacts[groupeCode];
      
      if (existingGroup) {
        const { error: updateError } = await supabase
          .from('groupes_contacts')
          .update({
            telephone: editGroupForm.telephone || null,
            email: editGroupForm.email || null,
            updated_at: new Date().toISOString()
          })
          .eq('groupe_code', groupeCode);
        
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('groupes_contacts')
          .insert({
            groupe_code: groupeCode,
            nom_complet: groupeCode,
            telephone: editGroupForm.telephone || null,
            email: editGroupForm.email || null
          });
        
        if (insertError) throw insertError;
      }
      
      setGroupesContacts(prev => ({
        ...prev,
        [groupeCode]: {
          ...prev[groupeCode],
          telephone: editGroupForm.telephone,
          email: editGroupForm.email
        }
      }));
      
      setSaveGroupMessage({ type: 'success', text: 'Mis à jour !' });
      
      setTimeout(() => {
        setEditingGroupCode(null);
        setSaveGroupMessage(null);
      }, 1500);
      
    } catch (err) {
      console.error('Erreur sauvegarde groupe:', err);
      setSaveGroupMessage({ type: 'error', text: 'Erreur' });
    } finally {
      setSavingGroup(false);
    }
  };

  const getGroupDisplayName = (groupeCode) => {
    const groupeInfo = groupesContacts[groupeCode];
    return groupeInfo?.nom_complet || groupeCode;
  };

  // Grouper les agents par groupe_travail
  const groupedAgents = agents.reduce((acc, agent) => {
    const groupKey = agent.groupe_travail || 'AUTRE';
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(agent);
    return acc;
  }, {});

  const groupOrder = ['CRC', 'ACR', 'RC', 'RO', 'CCU', 'RE', 'CAC', 'EAC', 'PCD', 'RESERVE PN', 'RESERVE DR', 'AUTRE'];
  
  const availableGroups = Object.keys(groupedAgents).sort((a, b) => {
    const indexA = groupOrder.indexOf(a);
    const indexB = groupOrder.indexOf(b);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  const filteredGroups = availableGroups
    .filter(group => selectedGroup === 'all' || group === selectedGroup)
    .map(group => ({
      groupe: group,
      agents: groupedAgents[group].filter(agent => {
        const searchLower = searchTerm.toLowerCase();
        const fullName = `${agent.nom} ${agent.prenom}`.toLowerCase();
        return (
          fullName.includes(searchLower) ||
          (agent.telephone || '').includes(searchTerm) ||
          (agent.email || '').toLowerCase().includes(searchLower)
        );
      })
    }))
    .filter(group => group.agents.length > 0);

  if (!isOpen) return null;

  // ==========================================
  // RENDU CARTE AGENT (Mobile)
  // ==========================================
  const renderAgentCard = (agent) => {
    const isCurrent = isCurrentUser(agent);
    const isEditing = editingId === agent.id;

    return (
      <div 
        key={agent.id}
        className={`
          p-4 rounded-lg border transition-all
          ${isCurrent 
            ? 'bg-cyan-500/15 border-cyan-500/40' 
            : 'bg-gray-800/40 border-gray-700/50'
          }
        `}
      >
        {/* Nom + Badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${isCurrent ? 'text-cyan-300' : 'text-white'}`}>
              {agent.nom} {agent.prenom}
            </span>
            {isCurrent && (
              <span className="text-xs bg-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded">
                Vous
              </span>
            )}
          </div>
          {!isEditing && (
            <button
              onClick={() => startEdit(agent)}
              className="p-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <Edit2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {isEditing ? (
          // Mode édition
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <input
                type="tel"
                value={editForm.telephone}
                onChange={(e) => setEditForm(prev => ({ ...prev, telephone: e.target.value }))}
                placeholder="06 XX XX XX XX"
                className="flex-1 px-3 py-2 bg-gray-700 border border-cyan-500/50 rounded-lg text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="prenom.nom@sncf.fr"
                className="flex-1 px-3 py-2 bg-gray-700 border border-cyan-500/50 rounded-lg text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              {saving ? (
                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              ) : saveMessage ? (
                <span className={`text-sm flex items-center gap-1 ${saveMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {saveMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {saveMessage.text}
                </span>
              ) : (
                <>
                  <button
                    onClick={() => saveEdit(agent.id)}
                    className="flex-1 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                    style={{ minHeight: '44px' }}
                  >
                    <Save className="w-4 h-4" /> Enregistrer
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex-1 py-2 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 rounded-lg transition-colors"
                    style={{ minHeight: '44px' }}
                  >
                    Annuler
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          // Mode affichage - Boutons d'action directe
          <div className="space-y-2">
            {agent.telephone ? (
              <a 
                href={`tel:${agent.telephone}`}
                className="flex items-center gap-3 p-3 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors"
                style={{ minHeight: '44px' }}
              >
                <Phone className="w-5 h-5" />
                <span className="font-medium">{agent.telephone}</span>
              </a>
            ) : (
              <div className="flex items-center gap-3 p-3 text-gray-600">
                <Phone className="w-5 h-5" />
                <span>Pas de téléphone</span>
              </div>
            )}
            
            {agent.email ? (
              <a 
                href={`mailto:${agent.email}`}
                className="flex items-center gap-3 p-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                style={{ minHeight: '44px' }}
              >
                <Mail className="w-5 h-5" />
                <span className="font-medium text-sm break-all">{agent.email}</span>
              </a>
            ) : (
              <div className="flex items-center gap-3 p-3 text-gray-600">
                <Mail className="w-5 h-5" />
                <span>Pas d'email</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ==========================================
  // RENDU LIGNE TABLE (Desktop)
  // ==========================================
  const renderAgentRow = (agent) => {
    const isCurrent = isCurrentUser(agent);
    const isEditing = editingId === agent.id;

    return (
      <tr 
        key={agent.id}
        className={`
          border-t border-gray-700/30 transition-colors
          ${isCurrent ? 'bg-cyan-500/10 hover:bg-cyan-500/15' : 'hover:bg-gray-700/20'}
        `}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={`font-medium ${isCurrent ? 'text-cyan-300' : 'text-white'}`}>
              {agent.nom} {agent.prenom}
            </span>
            {isCurrent && (
              <span className="text-xs bg-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded">
                Vous
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          {isEditing ? (
            <input
              type="tel"
              value={editForm.telephone}
              onChange={(e) => setEditForm(prev => ({ ...prev, telephone: e.target.value }))}
              placeholder="06 XX XX XX XX"
              className="w-full px-2 py-1 bg-gray-700 border border-cyan-500/50 rounded text-white text-sm focus:outline-none focus:border-cyan-400"
            />
          ) : agent.telephone ? (
            <a href={`tel:${agent.telephone}`} className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {agent.telephone}
            </a>
          ) : (
            <span className="text-gray-600">-</span>
          )}
        </td>
        <td className="px-4 py-3">
          {isEditing ? (
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="prenom.nom@reseau.sncf.fr"
              className="w-full px-2 py-1 bg-gray-700 border border-cyan-500/50 rounded text-white text-sm focus:outline-none focus:border-cyan-400"
            />
          ) : agent.email ? (
            <a href={`mailto:${agent.email}`} className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 break-all">
              <Mail className="w-3 h-3 flex-shrink-0" />
              {agent.email}
            </a>
          ) : (
            <span className="text-gray-600">-</span>
          )}
        </td>
        <td className="px-4 py-3">
          {isEditing ? (
            <div className="flex items-center gap-1">
              {saving ? (
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              ) : saveMessage ? (
                saveMessage.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )
              ) : (
                <>
                  <button
                    onClick={() => saveEdit(agent.id)}
                    className="p-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded transition-colors"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="p-1.5 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => startEdit(agent)}
              className="p-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </td>
      </tr>
    );
  };

  // ==========================================
  // RENDU GROUPE
  // ==========================================
  const renderGroup = (group) => {
    const groupeContact = groupesContacts[group.groupe] || {};
    const isEditingGroup = editingGroupCode === group.groupe;
    const isCollapsed = collapsedGroups[group.groupe];

    return (
      <div key={group.groupe} className="bg-gray-800/30 rounded-lg overflow-hidden border border-gray-700/50">
        {/* Header du groupe */}
        <div 
          className={`
            bg-gradient-to-r from-cyan-500/10 to-blue-500/10 px-4 py-3 border-b border-gray-700/50
            ${isMobile ? 'cursor-pointer active:bg-cyan-500/20' : ''}
          `}
          onClick={isMobile ? () => toggleGroupCollapse(group.groupe) : undefined}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                <h3 className="font-semibold text-cyan-400">
                  {getGroupDisplayName(group.groupe)}
                </h3>
                {isMobile && (
                  isCollapsed 
                    ? <ChevronDown className="w-4 h-4 text-gray-500" />
                    : <ChevronUp className="w-4 h-4 text-gray-500" />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {group.agents.length} agent{group.agents.length > 1 ? 's' : ''}
              </p>
              
              {/* Contact groupe - Édition */}
              {isEditingGroup ? (
                <div className="mt-3 p-3 bg-gray-800/50 rounded-lg space-y-2" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3 text-gray-500" />
                    <input
                      type="tel"
                      value={editGroupForm.telephone}
                      onChange={(e) => setEditGroupForm(prev => ({ ...prev, telephone: e.target.value }))}
                      placeholder="01 XX XX XX XX"
                      className="flex-1 px-2 py-1 bg-gray-700 border border-cyan-500/50 rounded text-white text-sm focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3 h-3 text-gray-500" />
                    <input
                      type="email"
                      value={editGroupForm.email}
                      onChange={(e) => setEditGroupForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="groupe@sncf.fr"
                      className="flex-1 px-2 py-1 bg-gray-700 border border-cyan-500/50 rounded text-white text-sm focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {savingGroup ? (
                      <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                    ) : saveGroupMessage ? (
                      <span className={`text-xs flex items-center gap-1 ${saveGroupMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                        {saveGroupMessage.type === 'success' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {saveGroupMessage.text}
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => saveGroupEdit(group.groupe)}
                          className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs rounded transition-colors flex items-center gap-1"
                        >
                          <Save className="w-3 h-3" /> Enregistrer
                        </button>
                        <button
                          onClick={cancelGroupEdit}
                          className="px-3 py-1 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 text-xs rounded transition-colors"
                        >
                          Annuler
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm" onClick={e => e.stopPropagation()}>
                  {groupeContact.telephone && (
                    <a href={`tel:${groupeContact.telephone}`} className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {groupeContact.telephone}
                    </a>
                  )}
                  {groupeContact.email && (
                    <a href={`mailto:${groupeContact.email}`} className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {groupeContact.email}
                    </a>
                  )}
                  {!groupeContact.telephone && !groupeContact.email && (
                    <span className="text-gray-600 text-xs italic">Pas de contact générique</span>
                  )}
                </div>
              )}
            </div>
            
            {/* Bouton édition groupe */}
            {!isEditingGroup && (
              <button
                onClick={(e) => { e.stopPropagation(); startGroupEdit(group.groupe); }}
                className="p-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors"
                style={{ minWidth: '44px', minHeight: '44px' }}
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Contenu du groupe (collapsible sur mobile) */}
        {(!isMobile || !isCollapsed) && (
          isMobile ? (
            // Vue Cards (Mobile)
            <div className="p-3 space-y-3">
              {group.agents.map(renderAgentCard)}
            </div>
          ) : (
            // Vue Table (Desktop)
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-2">Nom</th>
                    <th className="px-4 py-2">Téléphone</th>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {group.agents.map(renderAgentRow)}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    );
  };

  // ==========================================
  // RENDU PRINCIPAL
  // ==========================================
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div 
        className={`
          bg-gray-900 rounded-xl shadow-2xl overflow-hidden border border-cyan-500/30
          ${isMobile 
            ? 'w-full h-full max-h-full rounded-none' 
            : 'w-full max-w-5xl max-h-[90vh]'
          }
        `}
        style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.98) 100%)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-cyan-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Annuaire COGC</h2>
              <p className="text-xs sm:text-sm text-gray-400">
                {agents.length} agents
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-gray-700/50 rounded-lg transition-colors"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Search & Filter */}
        <div className="p-3 sm:p-4 border-b border-gray-700/50 space-y-3 sm:space-y-0 sm:flex sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 text-base"
            />
          </div>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="w-full sm:w-auto px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500/50 text-base"
          >
            <option value="all">Tous les groupes</option>
            {availableGroups.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* Content */}
        <div 
          className="overflow-y-auto p-3 sm:p-4"
          style={{ 
            maxHeight: isMobile 
              ? 'calc(100vh - 200px)' 
              : 'calc(90vh - 220px)' 
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <span className="ml-3 text-gray-400">Chargement...</span>
            </div>
          ) : error ? (
            <div className="text-center py-10 text-red-400">
              <AlertCircle className="w-10 h-10 mx-auto mb-3" />
              {error}
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              Aucun résultat trouvé
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {filteredGroups.map(renderGroup)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-gray-700/50 flex justify-between items-center">
          <p className="text-xs text-gray-500 hidden sm:block">
            Données sécurisées sur Supabase
          </p>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
            style={{ minHeight: '44px' }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalAnnuaire;
