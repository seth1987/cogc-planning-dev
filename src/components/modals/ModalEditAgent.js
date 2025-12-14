import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, AlertTriangle, UserPlus, Mail, Phone, RefreshCw, CheckCircle, Loader2 } from 'lucide-react';
import { GROUPES_PAR_STATUT } from '../../constants/config';
import { generateSNCFEmail, createAgentAccount, DEFAULT_PASSWORD } from '../../services/userManagementService';
import { supabase } from '../../lib/supabaseClient';

/**
 * ModalEditAgent - Module central de gestion des agents
 * 
 * Fonctionnalités:
 * - Création/modification des informations de base (nom, prénom, groupe, site, dates)
 * - Gestion des coordonnées (email auto-généré, téléphone)
 * - Création automatique du compte Auth Supabase à la création
 * - Ajout automatique dans l'annuaire (groupes_contacts)
 * 
 * v2.1 - Ajout insertion annuaire + email obligatoire
 */

/**
 * Extrait le groupe_code pour l'annuaire à partir du groupe agent
 * "ACR - ROULEMENT ACR COGC" → "ACR"
 * "RESERVE REGULATEUR PN" → "RESERVE PN"
 * "RESERVE PCD - DENFERT" → "PCD"
 */
const extractGroupeCode = (groupe) => {
  if (!groupe) return '';
  
  // Cas spéciaux pour les réserves
  if (groupe.startsWith('RESERVE REGULATEUR')) {
    return groupe.replace('RESERVE REGULATEUR ', 'RESERVE ');
  }
  if (groupe.startsWith('RESERVE PCD')) {
    return 'PCD';
  }
  
  // Cas standard : extraire le code avant " - "
  return groupe.split(' - ')[0];
};

const ModalEditAgent = ({ isOpen, agent, onClose, onSave, onDelete, onCreate }) => {
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    statut: 'roulement',
    groupe: '',
    site: 'Paris Nord',
    date_arrivee: '',
    date_depart: '',
    email: '',
    telephone: ''
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [emailManuallyEdited, setEmailManuallyEdited] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accountStatus, setAccountStatus] = useState(null); // null, 'creating', 'created', 'exists', 'error'
  const [accountError, setAccountError] = useState(null);
  
  // Mode création ou édition
  const isCreation = !agent;

  // Générer l'email automatiquement quand nom/prénom changent (en mode création)
  useEffect(() => {
    if (isCreation && !emailManuallyEdited && formData.nom && formData.prenom) {
      const generatedEmail = generateSNCFEmail(formData.nom, formData.prenom);
      setFormData(prev => ({ ...prev, email: generatedEmail }));
    }
  }, [formData.nom, formData.prenom, isCreation, emailManuallyEdited]);

  useEffect(() => {
    if (agent) {
      // Mode édition : charger les données existantes
      setFormData({
        nom: agent.nom || '',
        prenom: agent.prenom || '',
        statut: agent.statut || 'roulement',
        groupe: agent.groupe || '',
        site: agent.site || 'Paris Nord',
        date_arrivee: agent.date_arrivee || '',
        date_depart: agent.date_depart || '',
        email: agent.email || '',
        telephone: agent.telephone || ''
      });
      setEmailManuallyEdited(false);
      setAccountStatus(null);
      setAccountError(null);
    } else {
      // Mode création : réinitialiser
      setFormData({
        nom: '',
        prenom: '',
        statut: 'roulement',
        groupe: '',
        site: 'Paris Nord',
        date_arrivee: new Date().toISOString().split('T')[0],
        date_depart: '',
        email: '',
        telephone: ''
      });
      setEmailManuallyEdited(false);
      setAccountStatus(null);
      setAccountError(null);
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

  const handleEmailChange = (value) => {
    setFormData(prev => ({ ...prev, email: value }));
    setEmailManuallyEdited(true);
  };

  const handleRegenerateEmail = () => {
    if (formData.nom && formData.prenom) {
      const generatedEmail = generateSNCFEmail(formData.nom, formData.prenom);
      setFormData(prev => ({ ...prev, email: generatedEmail }));
      setEmailManuallyEdited(false);
    }
  };

  const handleSave = async () => {
    // Validation basique - Email maintenant obligatoire en création
    if (!formData.nom || !formData.prenom || !formData.groupe) {
      alert('Veuillez remplir tous les champs obligatoires (nom, prénom, groupe)');
      return;
    }
    
    // Email obligatoire en mode création
    if (isCreation && !formData.email) {
      alert('L\'email est obligatoire pour créer un agent');
      return;
    }
    
    if (isCreation) {
      // MODE CRÉATION : créer agent + compte Auth + annuaire automatiquement
      setCreatingAccount(true);
      setAccountStatus('creating');
      
      try {
        // 1. Créer l'agent en BDD (via onCreate qui appelle supabaseService.createAgent)
        // Le formData inclut maintenant email et telephone
        if (onCreate) {
          const createdAgent = await onCreate(formData);
          
          // 2. Créer le compte Auth automatiquement
          if (createdAgent && createdAgent.id) {
            const accountResult = await createAgentAccount({
              id: createdAgent.id,
              nom: formData.nom,
              prenom: formData.prenom,
              email: formData.email
            });
            
            if (accountResult.success) {
              setAccountStatus('created');
              console.log(`✅ Compte créé pour ${formData.nom} ${formData.prenom}`);
            } else if (accountResult.exists) {
              setAccountStatus('exists');
              console.log(`ℹ️ Compte existant pour ${formData.email}`);
            } else {
              setAccountStatus('error');
              setAccountError(accountResult.error);
              console.error(`❌ Erreur création compte: ${accountResult.error}`);
            }
            
            // 3. Ajouter dans l'annuaire (groupes_contacts)
            try {
              const groupeCode = extractGroupeCode(formData.groupe);
              const nomComplet = `${formData.nom} ${formData.prenom}`;
              
              const { error: annuaireError } = await supabase
                .from('groupes_contacts')
                .insert({
                  groupe_code: groupeCode,
                  nom_complet: nomComplet,
                  email: formData.email,
                  telephone: formData.telephone || null
                });
              
              if (annuaireError) {
                console.error(`⚠️ Erreur ajout annuaire: ${annuaireError.message}`);
              } else {
                console.log(`✅ Agent ajouté à l'annuaire (groupe: ${groupeCode})`);
              }
            } catch (annuaireErr) {
              console.error(`⚠️ Erreur insertion annuaire:`, annuaireErr);
              // On ne bloque pas la création si l'annuaire échoue
            }
          }
        }
        
        // Fermer après un court délai pour montrer le statut
        setTimeout(() => {
          onClose();
        }, 500);
        
      } catch (err) {
        setAccountStatus('error');
        setAccountError(err.message);
        console.error('Erreur création agent:', err);
      } finally {
        setCreatingAccount(false);
      }
    } else {
      // MODE ÉDITION : mettre à jour l'agent
      if (onSave) {
        onSave(agent.id, formData);
      }
      onClose();
    }
  };

  const handleDelete = () => {
    if (onDelete && agent) {
      onDelete(agent.id);
    }
    setShowDeleteConfirm(false);
    onClose();
  };

  const groupesDisponibles = GROUPES_PAR_STATUT[formData.statut] || [];

  // Validation pour désactiver le bouton
  const isFormValid = formData.nom && formData.prenom && formData.groupe && (!isCreation || formData.email);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
          {/* === SECTION IDENTITÉ === */}
          <div className="pb-3 border-b border-gray-200">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Identité</h4>
            
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
          </div>

          {/* === SECTION AFFECTATION === */}
          <div className="pb-3 border-b border-gray-200">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Affectation</h4>
            
            <div className="space-y-3">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de départ</label>
                  <input
                    type="date"
                    value={formData.date_depart}
                    onChange={(e) => handleInputChange('date_depart', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* === SECTION COORDONNÉES === */}
          <div className="pb-3 border-b border-gray-200">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Coordonnées</h4>
            
            <div className="space-y-3">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail className="inline w-4 h-4 mr-1" />
                  Email {isCreation && <span className="text-red-500">*</span>}
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    className={`flex-1 px-3 py-2 border rounded text-sm ${
                      isCreation && !formData.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="prenom.nom@reseau.sncf.fr"
                  />
                  {emailManuallyEdited && formData.nom && formData.prenom && (
                    <button
                      type="button"
                      onClick={handleRegenerateEmail}
                      className="px-3 py-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                      title="Régénérer l'email automatiquement"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {isCreation && (
                  <p className="text-xs text-gray-500 mt-1">
                    {emailManuallyEdited ? (
                      <span className="text-orange-600">✏️ Email modifié manuellement</span>
                    ) : formData.email ? (
                      <span className="text-green-600">✓ Généré automatiquement</span>
                    ) : (
                      <span className="text-red-500">⚠️ Email requis pour la connexion</span>
                    )}
                  </p>
                )}
              </div>

              {/* Téléphone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="inline w-4 h-4 mr-1" />
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => handleInputChange('telephone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  placeholder="06 XX XX XX XX"
                />
              </div>
            </div>
          </div>

          {/* === INFO COMPTE (création uniquement) === */}
          {isCreation && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-blue-800 mb-2">
                🔐 Compte utilisateur
              </h4>
              <p className="text-xs text-blue-700">
                Un compte sera créé automatiquement avec le mot de passe : 
                <code className="bg-blue-100 px-2 py-0.5 rounded ml-1">{DEFAULT_PASSWORD}</code>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                📇 L'agent sera également ajouté à l'annuaire
              </p>
              {accountStatus === 'creating' && (
                <p className="text-xs text-blue-600 mt-2 flex items-center">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Création du compte en cours...
                </p>
              )}
              {accountStatus === 'created' && (
                <p className="text-xs text-green-600 mt-2 flex items-center">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Compte créé avec succès !
                </p>
              )}
              {accountStatus === 'exists' && (
                <p className="text-xs text-orange-600 mt-2">
                  ℹ️ Un compte existe déjà pour cet email
                </p>
              )}
              {accountStatus === 'error' && (
                <p className="text-xs text-red-600 mt-2">
                  ❌ Erreur: {accountError}
                </p>
              )}
            </div>
          )}
        </div>

        {/* === BOUTONS ACTION === */}
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
            <button 
              onClick={onClose} 
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              disabled={creatingAccount}
            >
              Annuler
            </button>
            <button 
              onClick={handleSave}
              disabled={!isFormValid || creatingAccount}
              className="flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
            >
              {creatingAccount ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Création...
                </>
              ) : isCreation ? (
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

        {/* === MODAL CONFIRMATION SUPPRESSION === */}
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
