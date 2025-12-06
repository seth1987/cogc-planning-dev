import React, { useState } from 'react';
import { X, Search, Phone, Mail, Users } from 'lucide-react';

/**
 * ModalAnnuaire - Annuaire téléphonique du COGC
 * 
 * Affiche les contacts des agents organisés par groupe/roulement.
 * Permet la recherche et le filtrage par groupe.
 */
const ModalAnnuaire = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');

  // Données de l'annuaire
  const annuaireData = [
    {
      groupe: 'CRC - ROULEMENT CRC COGC',
      contact: 'CRC PARIS NORD',
      telephone: '01 48 78 84 15',
      email: 'chef-regul.pc@sncf.fr',
      agents: [
        { nom: 'BOUCHEMAL Fahim', telephone: '', email: '' },
        { nom: 'LUCHIER Fabien', telephone: '', email: '' },
        { nom: 'MANSOURI Djamel', telephone: '', email: '' },
        { nom: 'BOUCHER Gregory', telephone: '06 29 75 05 49', email: 'gregory.boucher@sncf.fr' }
      ]
    },
    {
      groupe: 'ACR - ROULEMENT ACR GOGC',
      contact: 'ACR',
      telephone: '01 55 31 34 12',
      email: 'te.pcpn@sncf.fr',
      agents: [
        { nom: 'BARROIRE Suzy', telephone: '', email: '' },
        { nom: 'AVAKIAN Jason', telephone: '', email: '' },
        { nom: 'SIMON Jeremie', telephone: '', email: '' },
        { nom: 'VERHELLE Julian', telephone: '', email: '' }
      ]
    },
    {
      groupe: 'RC - ROULEMENT REGULATEUR CENTRE',
      contact: 'Régulateur Centre',
      telephone: '',
      email: '',
      agents: [
        { nom: 'CHEVALIER Stephane', telephone: '06 18 91 21 30', email: 's.chevalier02@reseau.sncf.fr' },
        { nom: 'LAOURI Bilal', telephone: '', email: '' },
        { nom: 'GALOPIN Sandra', telephone: '', email: '' },
        { nom: 'DELEZAY Julien', telephone: '', email: '' },
        { nom: 'KASMI Youssef', telephone: '', email: '' }
      ]
    },
    {
      groupe: 'RO - ROULEMENT REGULATEUR TABLE OUEST',
      contact: 'Régulateur Ouest',
      telephone: '',
      email: '',
      agents: [
        { nom: 'BLEUBAR Karine', telephone: '', email: '' },
        { nom: 'COCU Cyril', telephone: '', email: '' }
      ]
    },
    {
      groupe: 'RESERVE REGULATEUR PN',
      contact: '',
      telephone: '',
      email: '',
      agents: [
        { nom: 'ESPARON Gregory', telephone: '06 61 47 33 34', email: 'gregory.esparon@reseau.sncf.fr' },
        { nom: 'GREVIN Jodie', telephone: '06 26 80 82 30', email: '' },
        { nom: 'GILLON Thomas', telephone: '', email: '' },
        { nom: 'LAHOGUE Raphael', telephone: '', email: '' },
        { nom: 'GALLAI Mathieu', telephone: '', email: '' },
        { nom: 'MAHENDRAN Nitharsan', telephone: '06 52 62 52 00', email: 'nitharsan.mahendran@reseau.sncf.fr' },
        { nom: 'CHAVET Romain', telephone: '06 64 90 83 92', email: 'romain.chavet@reseau.sncf.fr' },
        { nom: 'CRESPIN Ilyas', telephone: '06 11 49 05 16', email: '' },
        { nom: 'GUYON Vincent', telephone: '06 77 33 38 53', email: 'v.guyon@reseau.sncf.fr' }
      ]
    },
    {
      groupe: 'RESERVE REGULATEUR DR',
      contact: '',
      telephone: '',
      email: '',
      agents: [
        { nom: 'MEFTAH Islam', telephone: '', email: '' },
        { nom: 'BAPTISTE Brice', telephone: '', email: '' },
        { nom: 'HAMMAMI Zakariya', telephone: '', email: '' },
        { nom: 'DENELE Charlotte', telephone: '', email: '' },
        { nom: 'FRANCOIS Armelle', telephone: '06 68 47 50 46', email: 'armelle.francois@reseau.sncf.fr' }
      ]
    },
    {
      groupe: 'CCU - ROULEMENT CCU DENFERT',
      contact: 'CRC PARC',
      telephone: '01 55 31 17 46',
      email: 'pn-eic.crc-ccu@sncf.fr',
      agents: [
        { nom: 'DECAYEUX Fabien', telephone: '', email: '' },
        { nom: 'DE FONTES Georges', telephone: '06 99 91 36 47', email: '' },
        { nom: 'MIMOUNI Yassine', telephone: '', email: '' },
        { nom: 'LOIAL Jennifer', telephone: '', email: '' }
      ]
    },
    {
      groupe: 'RE - ROULEMENT REGULATEUR TABLE EST DENFERT',
      contact: 'Régulateur PARC',
      telephone: '01 55 31 87 28',
      email: '',
      agents: [
        { nom: 'MORIN Luka', telephone: '', email: '' },
        { nom: 'OSIRIS Alexandre', telephone: '', email: '' },
        { nom: 'ABDOUL WAHAB Sef', telephone: '', email: '' },
        { nom: 'BOUHAFS Saladin', telephone: '', email: '' }
      ]
    },
    {
      groupe: 'CAC - ROULEMENT DENFERT',
      contact: '',
      telephone: '',
      email: '',
      agents: [
        { nom: 'KADOUM Aurelie', telephone: '', email: '' },
        { nom: 'WARLOUZEL Remi', telephone: '06 61 30 65 88', email: '' }
      ]
    },
    {
      groupe: 'PCD',
      contact: '',
      telephone: '',
      email: '',
      agents: [
        { nom: 'DECLEMY Jean Marc', telephone: '', email: '' },
        { nom: 'LACOUBERIE Nicolas', telephone: '', email: '' }
      ]
    },
    {
      groupe: 'EAC',
      contact: '',
      telephone: '',
      email: '',
      agents: [
        { nom: 'DJEBAR Abderahman', telephone: '', email: '' },
        { nom: 'LAFRANCE Cyril', telephone: '', email: '' },
        { nom: 'ISAAC Jean-Charles', telephone: '', email: '' },
        { nom: 'SACHS Cyril', telephone: '', email: '' }
      ]
    }
  ];

  // Liste des groupes pour le filtre
  const groupes = ['all', ...annuaireData.map(g => g.groupe)];

  // Filtrer les données
  const filteredData = annuaireData
    .filter(group => selectedGroup === 'all' || group.groupe === selectedGroup)
    .map(group => ({
      ...group,
      agents: group.agents.filter(agent =>
        agent.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.telephone.includes(searchTerm) ||
        agent.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }))
    .filter(group => group.agents.length > 0 || 
      (searchTerm === '' && (group.contact || group.telephone || group.email)));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-cyan-500/30"
        style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.98) 100%)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-cyan-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Annuaire COGC</h2>
              <p className="text-sm text-gray-400">Paris Nord • Denfert-Rochereau</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Search & Filter */}
        <div className="p-4 border-b border-gray-700/50 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher un nom, téléphone ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500/50"
          >
            <option value="all">Tous les groupes</option>
            {annuaireData.map(g => (
              <option key={g.groupe} value={g.groupe}>
                {g.groupe.split(' - ')[0]}
              </option>
            ))}
          </select>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-4">
          {filteredData.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              Aucun résultat trouvé
            </div>
          ) : (
            <div className="space-y-6">
              {filteredData.map((group, index) => (
                <div key={index} className="bg-gray-800/30 rounded-lg overflow-hidden border border-gray-700/50">
                  {/* Group Header */}
                  <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 px-4 py-3 border-b border-gray-700/50">
                    <h3 className="font-semibold text-cyan-400">{group.groupe}</h3>
                    {(group.contact || group.telephone || group.email) && (
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-400">
                        {group.contact && <span>{group.contact}</span>}
                        {group.telephone && (
                          <a href={`tel:${group.telephone}`} className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
                            <Phone className="w-3 h-3" />
                            {group.telephone}
                          </a>
                        )}
                        {group.email && (
                          <a href={`mailto:${group.email}`} className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
                            <Mail className="w-3 h-3" />
                            {group.email}
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Agents Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                          <th className="px-4 py-2">Nom</th>
                          <th className="px-4 py-2">Téléphone</th>
                          <th className="px-4 py-2">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.agents.map((agent, agentIndex) => (
                          <tr 
                            key={agentIndex}
                            className="border-t border-gray-700/30 hover:bg-gray-700/20 transition-colors"
                          >
                            <td className="px-4 py-3 text-white font-medium">
                              {agent.nom}
                            </td>
                            <td className="px-4 py-3">
                              {agent.telephone ? (
                                <a 
                                  href={`tel:${agent.telephone}`}
                                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                                >
                                  <Phone className="w-3 h-3" />
                                  {agent.telephone}
                                </a>
                              ) : (
                                <span className="text-gray-600">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {agent.email ? (
                                <a 
                                  href={`mailto:${agent.email}`}
                                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 break-all"
                                >
                                  <Mail className="w-3 h-3 flex-shrink-0" />
                                  {agent.email}
                                </a>
                              ) : (
                                <span className="text-gray-600">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalAnnuaire;
