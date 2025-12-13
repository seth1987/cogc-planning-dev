// Composant pour l'étape de validation des données extraites
// Version 3.3 - Ajout option "Texte Libre" pour services et postes
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AlertCircle, Check, X, Calendar, User, Eye, EyeOff, ZoomIn, ZoomOut, ChevronDown, ChevronUp, Trash2, Edit3 } from 'lucide-react';
import { SERVICE_CODES, POSTES_CODES_WITH_LIBRE, LIBRE_MARKER } from '../../constants/config';
import useIsMobile from '../../hooks/useIsMobile';

// Codes standards pour détection texte libre
const STANDARD_SERVICE_CODES = SERVICE_CODES.filter(s => s.code !== LIBRE_MARKER).map(s => s.code);
const STANDARD_POSTE_CODES = POSTES_CODES_WITH_LIBRE.filter(p => p.code !== LIBRE_MARKER && p.code !== '').map(p => p.code);

const PDFValidationStep = React.memo(({ 
  data,  // Données extraites
  onChange,  // Pour gérer les modifications
  validation,  // Object contenant errors et warnings
  onValidate,  // Pour valider et importer
  onCancel,  // Pour annuler et revenir en arrière
  pdfFile,  // Fichier PDF original pour affichage
  loading  // État de chargement
}) => {
  const isMobile = useIsMobile();
  
  // Ref pour éviter recréation URL PDF
  const pdfFileRef = useRef(null);
  const pdfUrlRef = useRef(null);
  
  // État pour l'affichage du PDF (desktop uniquement)
  const [showPDF, setShowPDF] = useState(!isMobile);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [splitRatio, setSplitRatio] = useState(50);
  
  // État mobile : card en cours d'édition
  const [editingIndex, setEditingIndex] = useState(null);
  const [showAgentEdit, setShowAgentEdit] = useState(false);
  
  // État pour les champs en mode texte libre
  const [freeTextMode, setFreeTextMode] = useState({}); // { `${index}_service`: true, `${index}_poste`: true }

  // Debug render
  const renderCount = useRef(0);
  renderCount.current++;
  console.log(`📋 [PDFValidationStep] Render #${renderCount.current}`);

  // Créer l'URL du PDF au montage - STABLE (compare par nom de fichier)
  useEffect(() => {
    if (pdfFile && !isMobile) {
      // Vérifier si c'est vraiment un nouveau fichier
      if (pdfFileRef.current?.name === pdfFile.name && pdfFileRef.current?.size === pdfFile.size) {
        console.log('📄 PDF identique, pas de recréation URL');
        return;
      }
      
      // Nettoyer l'ancienne URL si elle existe
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
      }
      
      const url = URL.createObjectURL(pdfFile);
      pdfUrlRef.current = url;
      pdfFileRef.current = pdfFile;
      setPdfUrl(url);
      console.log('📄 Nouvelle URL PDF créée');
    }
    
    return () => {
      // Cleanup seulement au démontage complet
    };
  }, [pdfFile, isMobile]);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = null;
        pdfFileRef.current = null;
      }
    };
  }, []);

  // === FONCTIONS UTILITAIRES MÉMORISÉES ===
  
  // Vérifie si une valeur est du texte libre (pas dans les codes standards)
  const isServiceFreeText = useCallback((code) => {
    if (!code) return false;
    return !STANDARD_SERVICE_CODES.includes(code);
  }, []);

  const isPosteFreeText = useCallback((code) => {
    if (!code) return false;
    return !STANDARD_POSTE_CODES.includes(code);
  }, []);
  
  const getServiceLabel = useCallback((code) => {
    if (!code) return '';
    const found = SERVICE_CODES.find(s => s.code === code);
    if (found) {
      const labels = {
        '-': 'Matin', 'O': 'Soir', 'X': 'Nuit', 'RP': 'Repos',
        'C': 'Congé', 'D': 'Dispo', 'NU': 'Non Utilisé',
        'HAB': 'Formation', 'MA': 'Maladie', 'I': 'Inactif', 'VISIMED': 'Visite Méd.',
        'FO': 'Formation', 'VT': 'Temps partiel', 'D2I': 'D2I'
      };
      return labels[code] || code;
    }
    // C'est du texte libre
    return code;
  }, []);

  const getServiceColor = useCallback((code) => {
    const colors = {
      '-': 'bg-blue-100 text-blue-700 border-blue-300',
      'O': 'bg-orange-100 text-orange-700 border-orange-300',
      'X': 'bg-purple-100 text-purple-700 border-purple-300',
      'RP': 'bg-green-100 text-green-700 border-green-300',
      'C': 'bg-green-100 text-green-700 border-green-300',
      'D': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      'NU': 'bg-gray-100 text-gray-700 border-gray-300',
      'HAB': 'bg-indigo-100 text-indigo-700 border-indigo-300',
      'MA': 'bg-red-100 text-red-700 border-red-300',
      'I': 'bg-pink-100 text-pink-700 border-pink-300',
      'VISIMED': 'bg-cyan-100 text-cyan-700 border-cyan-300',
      'FO': 'bg-indigo-100 text-indigo-700 border-indigo-300',
      'VT': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      'D2I': 'bg-gray-200 text-gray-700 border-gray-300'
    };
    // Pour texte libre, utiliser un style distinctif
    if (!colors[code]) {
      return 'bg-teal-100 text-teal-700 border-teal-300';
    }
    return colors[code];
  }, []);

  const formatDate = useCallback((dateStr) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
  }, []);

  const formatDateShort = useCallback((dateStr) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  }, []);

  // === HANDLERS STABILISÉS ===

  const handleCellEdit = useCallback((index, field, value) => {
    console.log(`📝 handleCellEdit: index=${index}, field=${field}, value=${value}`);
    onChange(prevData => {
      const newPlanning = [...prevData.planning];
      newPlanning[index] = { ...newPlanning[index], [field]: value };
      return { ...prevData, planning: newPlanning };
    });
  }, [onChange]);

  const handleAgentEdit = useCallback((field, value) => {
    console.log(`👤 handleAgentEdit: field=${field}, value=${value}`);
    onChange(prevData => ({
      ...prevData,
      agent: { ...prevData.agent, [field]: value }
    }));
  }, [onChange]);

  const handleDeleteEntry = useCallback((index) => {
    console.log(`🗑️ handleDeleteEntry: index=${index}`);
    onChange(prevData => ({
      ...prevData,
      planning: prevData.planning.filter((_, i) => i !== index)
    }));
    setEditingIndex(null);
  }, [onChange]);

  const handleAddEntry = useCallback(() => {
    console.log('➕ handleAddEntry');
    onChange(prevData => {
      let defaultDate;
      
      if (prevData.stats?.missingDates && prevData.stats.missingDates.length > 0) {
        defaultDate = prevData.stats.missingDates[0];
      } else if (prevData.planning && prevData.planning.length > 0) {
        const sortedPlanning = [...prevData.planning].sort((a, b) => a.date.localeCompare(b.date));
        const lastEntry = sortedPlanning[sortedPlanning.length - 1];
        const lastDate = new Date(lastEntry.date + 'T12:00:00');
        lastDate.setDate(lastDate.getDate() + 1);
        defaultDate = lastDate.toISOString().split('T')[0];
      } else {
        defaultDate = new Date().toISOString().split('T')[0];
      }
      
      const newEntry = {
        date: defaultDate,
        service_code: 'RP',
        poste_code: null,
        original_code: 'MANUEL',
        description: 'Ajouté manuellement'
      };
      
      const newPlanning = [...prevData.planning, newEntry];
      setEditingIndex(newPlanning.length - 1);
      
      return { ...prevData, planning: newPlanning };
    });
  }, [onChange]);

  // Handler pour basculer en mode texte libre
  const toggleFreeTextMode = useCallback((index, field) => {
    const key = `${index}_${field}`;
    setFreeTextMode(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Handler pour le changement de service (gère le switch vers texte libre)
  const handleServiceChange = useCallback((index, value) => {
    if (value === LIBRE_MARKER) {
      // Basculer en mode texte libre
      setFreeTextMode(prev => ({ ...prev, [`${index}_service`]: true }));
      // Mettre une valeur vide pour commencer
      handleCellEdit(index, 'service_code', '');
    } else {
      // Sortir du mode texte libre si on sélectionne un code standard
      setFreeTextMode(prev => ({ ...prev, [`${index}_service`]: false }));
      handleCellEdit(index, 'service_code', value);
    }
  }, [handleCellEdit]);

  // Handler pour le changement de poste (gère le switch vers texte libre)
  const handlePosteChange = useCallback((index, value) => {
    if (value === LIBRE_MARKER) {
      // Basculer en mode texte libre
      setFreeTextMode(prev => ({ ...prev, [`${index}_poste`]: true }));
      // Mettre une valeur vide pour commencer
      handleCellEdit(index, 'poste_code', '');
    } else {
      // Sortir du mode texte libre si on sélectionne un code standard
      setFreeTextMode(prev => ({ ...prev, [`${index}_poste`]: false }));
      handleCellEdit(index, 'poste_code', value || null);
    }
  }, [handleCellEdit]);

  // === DONNÉES MÉMORISÉES ===

  const groupedByDate = useMemo(() => {
    if (!data?.planning) return {};
    return data.planning.reduce((acc, entry, index) => {
      if (!acc[entry.date]) acc[entry.date] = [];
      acc[entry.date].push({ ...entry, index });
      return acc;
    }, {});
  }, [data?.planning]);

  const canValidate = useMemo(() => {
    return data?.agent?.nom && data?.agent?.prenom && data?.planning?.length > 0;
  }, [data?.agent?.nom, data?.agent?.prenom, data?.planning?.length]);

  // Vérifications de sécurité
  if (!data || !data.planning) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="text-amber-600" size={20} />
          <span className="font-medium text-amber-900">Aucune donnée extraite</span>
        </div>
        <p className="text-sm text-amber-800 mt-2">
          Le PDF n'a pas pu être analysé. Veuillez réessayer avec un autre fichier.
        </p>
        <button onClick={onCancel} className="mt-3 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
          Retour
        </button>
      </div>
    );
  }

  // === COMPOSANTS RÉUTILISABLES ===

  // Composant pour le sélecteur de service avec option texte libre
  const ServiceSelector = ({ index, value }) => {
    const isFreeText = freeTextMode[`${index}_service`] || isServiceFreeText(value);
    
    if (isFreeText) {
      return (
        <div className="flex gap-1 items-center">
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleCellEdit(index, 'service_code', e.target.value)}
            placeholder="Texte libre..."
            className="flex-1 px-2 py-1 border rounded text-sm bg-teal-50 border-teal-300 focus:ring-2 focus:ring-teal-500"
            autoFocus
          />
          <button
            onClick={() => {
              setFreeTextMode(prev => ({ ...prev, [`${index}_service`]: false }));
              handleCellEdit(index, 'service_code', 'RP'); // Valeur par défaut
            }}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Revenir à la liste"
          >
            <X size={16} />
          </button>
        </div>
      );
    }
    
    return (
      <select
        value={value || ''}
        onChange={(e) => handleServiceChange(index, e.target.value)}
        className="w-full px-2 py-1 border rounded text-sm bg-white"
      >
        {SERVICE_CODES.map(({ code, desc }) => (
          <option key={code} value={code}>{desc}</option>
        ))}
      </select>
    );
  };

  // Composant pour le sélecteur de poste avec option texte libre
  const PosteSelector = ({ index, value, compact = false }) => {
    const isFreeText = freeTextMode[`${index}_poste`] || isPosteFreeText(value);
    
    if (isFreeText) {
      return (
        <div className="flex gap-1 items-center">
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleCellEdit(index, 'poste_code', e.target.value || null)}
            placeholder="Poste libre..."
            className={`flex-1 px-2 py-1 border rounded text-sm bg-teal-50 border-teal-300 focus:ring-2 focus:ring-teal-500 ${compact ? 'w-20' : ''}`}
            autoFocus
          />
          <button
            onClick={() => {
              setFreeTextMode(prev => ({ ...prev, [`${index}_poste`]: false }));
              handleCellEdit(index, 'poste_code', null);
            }}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Revenir à la liste"
          >
            <X size={14} />
          </button>
        </div>
      );
    }
    
    return (
      <select
        value={value || ''}
        onChange={(e) => handlePosteChange(index, e.target.value)}
        className={`px-2 py-1 border rounded text-sm bg-white ${compact ? 'w-28' : 'w-full'}`}
      >
        {POSTES_CODES_WITH_LIBRE.map(({ code, desc }) => (
          <option key={code} value={code}>{desc}</option>
        ))}
      </select>
    );
  };

  // ========== VERSION MOBILE - CARDS ==========
  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        {/* Header mobile avec résumé */}
        <div className="bg-blue-50 border-b border-blue-200 p-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-blue-900">
                {data.planning.length} service{data.planning.length > 1 ? 's' : ''} extrait{data.planning.length > 1 ? 's' : ''}
              </p>
              {data.agent?.nom && (
                <p className="text-sm text-blue-700">{data.agent.prenom} {data.agent.nom}</p>
              )}
            </div>
            <button onClick={() => setShowAgentEdit(!showAgentEdit)} className="p-2 bg-blue-600 text-white rounded-lg">
              <User size={20} />
            </button>
          </div>
          
          {/* Zone édition agent (collapsible) */}
          {showAgentEdit && (
            <div className="mt-3 pt-3 border-t border-blue-200 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={data.agent?.nom || ''}
                  onChange={(e) => handleAgentEdit('nom', e.target.value)}
                  placeholder="Nom"
                  className="flex-1 px-3 py-2 border rounded-lg text-base"
                />
                <input
                  type="text"
                  value={data.agent?.prenom || ''}
                  onChange={(e) => handleAgentEdit('prenom', e.target.value)}
                  placeholder="Prénom"
                  className="flex-1 px-3 py-2 border rounded-lg text-base"
                />
              </div>
              <button onClick={() => setShowAgentEdit(false)} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
                Fermer
              </button>
            </div>
          )}
        </div>

        {/* Erreurs/Warnings condensés */}
        {validation?.errors?.length > 0 && (
          <div className="bg-red-50 border-b border-red-200 px-3 py-2 flex-shrink-0">
            <p className="text-sm text-red-800 font-medium">⚠️ {validation.errors.join(' • ')}</p>
          </div>
        )}

        {/* Liste scrollable des services (cards) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 pb-24">
          {data.planning.map((entry, index) => {
            const isEditing = editingIndex === index;
            const serviceIsFree = isServiceFreeText(entry.service_code) || freeTextMode[`${index}_service`];
            const posteIsFree = isPosteFreeText(entry.poste_code) || freeTextMode[`${index}_poste`];
            
            return (
              <div 
                key={`${entry.date}-${index}`}
                className={`border rounded-xl overflow-hidden transition-all ${
                  isEditing ? 'border-blue-500 shadow-lg' : `${getServiceColor(entry.service_code)} border`
                }`}
              >
                {/* Card header */}
                <div 
                  className={`p-3 flex items-center justify-between cursor-pointer ${isEditing ? 'bg-blue-50' : ''}`}
                  onClick={() => setEditingIndex(isEditing ? null : index)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`px-3 py-1 rounded-lg font-bold text-sm ${getServiceColor(entry.service_code)}`}>
                      {serviceIsFree && <Edit3 size={12} className="inline mr-1" />}
                      {getServiceLabel(entry.service_code)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{formatDateShort(entry.date)}</p>
                      {entry.poste_code && (
                        <p className="text-xs text-gray-500">
                          {posteIsFree && '✏️ '}
                          {entry.poste_code}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.original_code && entry.original_code !== 'MANUEL' && (
                      <span className="text-xs text-gray-400 hidden sm:inline">{entry.original_code}</span>
                    )}
                    {isEditing ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {/* Card body - édition */}
                {isEditing && (
                  <div className="p-3 bg-white border-t space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Date</label>
                      <input
                        type="date"
                        value={entry.date}
                        onChange={(e) => handleCellEdit(index, 'date', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-base"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Service</label>
                      <ServiceSelector index={index} value={entry.service_code} />
                    </div>

                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Poste (optionnel)</label>
                      <PosteSelector index={index} value={entry.poste_code} />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button onClick={() => setEditingIndex(null)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium">
                        Fermer
                      </button>
                      <button onClick={() => handleDeleteEntry(index)} className="px-4 py-2 bg-red-100 text-red-600 rounded-lg">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <button
            onClick={handleAddEntry}
            className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            + Ajouter un service
          </button>
        </div>

        {/* Footer fixe */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-3 flex gap-3 z-10">
          <button onClick={onCancel} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold">
            ← Retour
          </button>
          <button
            onClick={onValidate}
            disabled={loading || !canValidate}
            className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 ${
              !loading && canValidate ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
            }`}
          >
            {loading ? (<><span className="animate-spin">⏳</span>Import...</>) : (<><Check size={20} />Importer</>)}
          </button>
        </div>
      </div>
    );
  }

  // ========== VERSION DESKTOP ==========
  
  const PDFViewer = () => (
    <div className="h-full flex flex-col bg-gray-800 rounded-lg overflow-hidden">
      <div className="bg-gray-700 px-3 py-2 flex items-center justify-between flex-shrink-0">
        <span className="text-white text-sm font-medium flex items-center gap-2">📄 Bulletin original</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setPdfZoom(Math.max(50, pdfZoom - 25))} className="text-white hover:bg-gray-600 p-1 rounded" title="Zoom -">
            <ZoomOut size={16} />
          </button>
          <span className="text-white text-xs min-w-[40px] text-center">{pdfZoom}%</span>
          <button onClick={() => setPdfZoom(Math.min(200, pdfZoom + 25))} className="text-white hover:bg-gray-600 p-1 rounded" title="Zoom +">
            <ZoomIn size={16} />
          </button>
          <button onClick={() => setShowPDF(false)} className="text-white hover:bg-gray-600 p-1 rounded ml-2" title="Masquer le PDF">
            <EyeOff size={16} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto bg-gray-600 p-2">
        {pdfUrl ? (
          <iframe
            src={`${pdfUrl}#zoom=${pdfZoom}&toolbar=0&navpanes=0`}
            className="w-full h-full rounded bg-white"
            style={{ 
              minHeight: '500px',
              transform: `scale(${pdfZoom / 100})`,
              transformOrigin: 'top left',
              width: `${100 / (pdfZoom / 100)}%`,
              height: `${100 / (pdfZoom / 100)}%`
            }}
            title="Bulletin de commande PDF"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>PDF non disponible</p>
          </div>
        )}
      </div>
    </div>
  );

  const DataEditor = () => (
    <div className="flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden" style={{ height: '100%', maxHeight: '100%' }}>
      {/* Header fixe */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-100 to-slate-50 border-b border-gray-200 flex-shrink-0">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          📋 Données extraites
          <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
            {data.planning ? data.planning.length : 0} entrées
          </span>
        </h3>
        {pdfFile && !showPDF && (
          <button onClick={() => setShowPDF(true)} className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200">
            <Eye size={16} /> Afficher le PDF
          </button>
        )}
      </div>

      {/* Contenu scrollable */}
      <div className="flex-1 p-4 space-y-4 overflow-y-scroll" style={{ minHeight: 0, scrollbarWidth: 'auto', scrollbarColor: '#6b7280 #e5e7eb' }}>
        {/* Agent détecté */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <User className="text-blue-600" size={20} />
            <h3 className="font-semibold">Agent</h3>
          </div>
          {data.agent && (data.agent.nom || data.agent.prenom) ? (
            <div className="flex gap-4 flex-wrap">
              <div>
                <label className="text-sm text-gray-600">Nom:</label>
                <input
                  type="text"
                  value={data.agent.nom || ''}
                  onChange={(e) => handleAgentEdit('nom', e.target.value)}
                  className="ml-2 px-2 py-1 border rounded"
                  placeholder="Nom de l'agent"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Prénom:</label>
                <input
                  type="text"
                  value={data.agent.prenom || ''}
                  onChange={(e) => handleAgentEdit('prenom', e.target.value)}
                  className="ml-2 px-2 py-1 border rounded"
                  placeholder="Prénom de l'agent"
                />
              </div>
            </div>
          ) : (
            <p className="text-amber-600">Agent non détecté - Veuillez remplir manuellement</p>
          )}
        </div>

        {/* Erreurs */}
        {validation?.errors?.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="text-red-600" size={20} />
              <span className="font-medium text-red-900">Erreurs à corriger</span>
            </div>
            <ul className="text-sm text-red-800 list-disc list-inside">
              {validation.errors.map((error, i) => <li key={i}>{error}</li>)}
            </ul>
          </div>
        )}

        {/* Avertissements */}
        {validation?.warnings?.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="text-amber-600" size={20} />
              <span className="font-medium text-amber-900">Informations</span>
            </div>
            <ul className="text-sm text-amber-800 list-disc list-inside">
              {validation.warnings.map((warning, i) => <li key={i}>{warning}</li>)}
            </ul>
          </div>
        )}

        {/* Planning extrait */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2"><Calendar size={20} /> Planning</h3>
            <button onClick={handleAddEntry} className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
              + Ajouter
            </button>
          </div>

          {data.planning?.length > 0 ? (
            <div className="border rounded-lg overflow-hidden shadow-sm">
              {Object.entries(groupedByDate).map(([date, entries]) => (
                <div key={date} className="border-b last:border-b-0">
                  <div className="bg-slate-200 px-3 py-2 border-b">
                    <span className="font-semibold text-sm text-slate-700">{formatDate(date)}</span>
                    <span className="text-xs text-slate-500 ml-2">({entries.length} service{entries.length > 1 ? 's' : ''})</span>
                  </div>
                  
                  <div className="p-2 space-y-1 bg-white">
                    {entries.map((entry) => {
                      const serviceIsFree = isServiceFreeText(entry.service_code) || freeTextMode[`${entry.index}_service`];
                      
                      return (
                        <div key={`${entry.date}-${entry.index}`} className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded text-sm border border-transparent hover:border-blue-200 transition-colors">
                          <input
                            type="date"
                            value={entry.date}
                            onChange={(e) => handleCellEdit(entry.index, 'date', e.target.value)}
                            className="p-1 border rounded text-xs w-32"
                          />
                          
                          <div className="flex-1 min-w-[120px]">
                            <ServiceSelector index={entry.index} value={entry.service_code} />
                          </div>

                          <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getServiceColor(entry.service_code)}`}>
                            {serviceIsFree && <Edit3 size={10} className="inline mr-1" />}
                            {getServiceLabel(entry.service_code)}
                          </span>

                          <div className="w-32">
                            <PosteSelector index={entry.index} value={entry.poste_code} compact={true} />
                          </div>

                          {entry.original_code && (
                            <span className="text-xs text-gray-400 truncate max-w-[80px]" title={entry.original_code}>
                              ({entry.original_code})
                            </span>
                          )}

                          <button
                            onClick={() => handleDeleteEntry(entry.index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded flex-shrink-0"
                            title="Supprimer cette entrée"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-6 text-center border">
              <p className="text-gray-600">Aucune entrée de planning détectée</p>
              <p className="text-sm text-gray-500 mt-2">Utilisez le bouton ci-dessus pour ajouter des entrées manuellement</p>
            </div>
          )}
        </div>

        {/* Résumé */}
        {data.planning?.length > 0 && (
          <div className="bg-slate-100 rounded-lg p-3 border">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Période :</span>
                <span className="font-medium ml-1">
                  {formatDate(data.planning[0].date)} - {formatDate(data.planning[data.planning.length - 1].date)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Services :</span>
                <span className="font-medium ml-1">{data.planning.length}</span>
              </div>
              <div>
                <span className="text-gray-600">Mode :</span>
                <span className="font-medium ml-1">
                  {data.parsing_mode === 'mistral' || data.parsing_mode === 'simple-vision' ? '🤖 IA' : '📝 Manuel'}
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div className="h-4"></div>
      </div>

      {/* Boutons d'action */}
      <div className="flex justify-between p-4 border-t bg-gradient-to-r from-slate-100 to-slate-50 flex-shrink-0">
        <button onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-medium">
          ← Retour
        </button>
        <button
          onClick={onValidate}
          disabled={loading || !canValidate}
          className={`px-6 py-2 rounded font-medium flex items-center gap-2 ${
            !loading && canValidate ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {loading ? (<><span className="animate-spin">⏳</span>Import en cours...</>) : (<><Check size={18} />Valider et Importer</>)}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        .data-scroll-container::-webkit-scrollbar { width: 12px; }
        .data-scroll-container::-webkit-scrollbar-track { background: #e5e7eb; border-radius: 6px; }
        .data-scroll-container::-webkit-scrollbar-thumb { background: #6b7280; border-radius: 6px; border: 2px solid #e5e7eb; }
        .data-scroll-container::-webkit-scrollbar-thumb:hover { background: #4b5563; }
      `}</style>
      
      <div style={{ height: 'calc(70vh)', minHeight: '500px' }}>
        {pdfFile && showPDF && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
            <p className="text-sm text-blue-800">
              💡 <strong>Astuce :</strong> Comparez le bulletin original (à gauche) avec les données extraites (à droite).
            </p>
          </div>
        )}

        {pdfFile && showPDF ? (
          <div className="flex gap-4" style={{ height: 'calc(100% - 50px)' }}>
            <div className="flex-shrink-0 transition-all duration-300" style={{ width: `${splitRatio}%`, minWidth: '300px', maxWidth: '60%', height: '100%' }}>
              <PDFViewer />
            </div>

            <div 
              className="w-3 bg-gray-300 hover:bg-blue-500 cursor-col-resize rounded flex-shrink-0 flex items-center justify-center transition-colors"
              style={{ height: '100%' }}
              onMouseDown={(e) => {
                const startX = e.clientX;
                const startRatio = splitRatio;
                const onMouseMove = (moveEvent) => {
                  const delta = moveEvent.clientX - startX;
                  const containerWidth = e.target.parentElement.offsetWidth;
                  const newRatio = startRatio + (delta / containerWidth) * 100;
                  setSplitRatio(Math.min(60, Math.max(30, newRatio)));
                };
                const onMouseUp = () => {
                  document.removeEventListener('mousemove', onMouseMove);
                  document.removeEventListener('mouseup', onMouseUp);
                };
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
              }}
            >
              <div className="w-1 h-16 bg-gray-500 rounded" />
            </div>

            <div className="flex-1 min-w-[350px]" style={{ height: '100%' }}>
              <DataEditor />
            </div>
          </div>
        ) : (
          <div style={{ height: '100%' }}>
            <DataEditor />
          </div>
        )}
      </div>
    </>
  );
});

PDFValidationStep.displayName = 'PDFValidationStep';

export default PDFValidationStep;
