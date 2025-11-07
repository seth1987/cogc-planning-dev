import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, AlertTriangle, UserPlus } from 'lucide-react';
import { GROUPES_PAR_STATUT } from '../../constants/config';

const ModalEditAgent = ({ isOpen, agent, onClose, onSave, onDelete, onCreate }) => {
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    statut: 'roulement',
    groupe: '',
    site: 'Paris Nord',
    date_arrivee: '',
    date_depart: ''
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Mode création ou édition
  const isCreation = !agent;

  useEffect(() => {
    if (agent) {
      setFormData({
        nom: agent.nom || '',
        prenom: agent.prenom || '',
        statut: agent.statut || 'roulement',
        groupe: agent.groupe || '',
        site: agent.site || 'Paris Nord',
        date_arrivee: agent.date_arrivee || '',
        date_depart: agent.date_depart || ''
      });
    } else {
      // Réinitialiser pour la création
      setFormData({
        nom: '',
        prenom: '',
        statut: 'roulement',
        groupe: '',
        site: 'Paris Nord',
        date_arrivee: new Date().toISOString().split('T')[0], // Date du jour par défaut
        date_depart: ''
      });
    }
  }, [agent]);

  if (!isOpen) return null;

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      if (field === 'statut') {
        newData.groupe = '';
      }
      return newData;
    });
  };

  const handleSave = () => {
    // Validation basique
    if (!formData.nom || !formData.prenom || !formData.groupe) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    if (isCreation) {
      // Appeler onCreate pour la création
      if (onCreate) {
        onCreate(formData);
      }
    } else {
      // Appeler onSave pour la mise à jour
      if (onSave) {
        onSave(agent.id, formData);
      }
    }
    onClose();
  };

  const handleDelete = () => {
    if (onDelete && agent) {
      onDelete(agent.id);
    }
    setShowDeleteConfirm(false);
    onClose();
  };

  const groupesDisponibles = GROUPES_PAR_STATUT[formData.statut] || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold">
              {isCreation ? (
                <>
                  <UserPlus className="inline w-5 h-5 mr-2 text-green-600" />
                  Créer un nouvel agent
                </>
              ) : (
                'Modifier Agent'
              )}
            </h3>
            {!isCreation && (
              <p className="text-sm text-gray-600">{agent.nom} {agent.prenom}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nom}
                onChange={(e) => handleInputChange('nom', e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                placeholder="NOM"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prénom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.prenom}
                onChange={(e) => handleInputChange('prenom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                placeholder="Prénom"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select
              value={formData.statut}
              onChange={(e) => handleInputChange('statut', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="roulement">Roulement</option>
              <option value="reserve">Réserve</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Groupe <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.groupe}
              onChange={(e) => handleInputChange('groupe', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="">Sélectionner un groupe</option>
              {groupesDisponibles.map(groupe => (
                <option key={groupe} value={groupe}>{groupe}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
            <select
              value={formData.site}
              onChange={(e) => handleInputChange('site', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="Paris Nord">Paris Nord</option>
              <option value="Denfert-Rochereau">Denfert-Rochereau</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date d'arrivée</label>
              <input
                type="date"
                value={formData.date_arrivee}
                onChange={(e) => handleInputChange('date_arrivee', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de départ (optionnel)</label>
              <input
                type="date"
                value={formData.date_depart}
                onChange={(e) => handleInputChange('date_depart', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-6">
          {!isCreation && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Supprimer
            </button>
          )}
          
          <div className={`flex space-x-2 ${isCreation ? 'ml-auto' : ''}`}>
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50">
              Annuler
            </button>
            <button 
              onClick={handleSave}
              disabled={!formData.nom || !formData.prenom || !formData.groupe}
              className="flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
            >
              {isCreation ? (
                <>
                  <UserPlus className="w-4 h-4 mr-1" />
                  Créer
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1" />
                  Sauvegarder
                </>
              )}
            </button>
          </div>
        </div>

        {showDeleteConfirm && !isCreation && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
                <h4 className="text-lg font-semibold">Confirmer la suppression</h4>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Êtes-vous sûr de vouloir supprimer <strong>{agent.nom} {agent.prenom}</strong> ?
                <br />
                <span className="text-red-600">Cette action supprimera également tout son planning et ses habilitations.</span>
              </p>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Supprimer définitivement
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalEditAgent;