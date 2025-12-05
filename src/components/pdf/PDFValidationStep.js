// Composant pour l'étape de validation des données extraites
// Version 2.1 - Vue split-screen avec PDF en regard + scrollbar visible
import React, { useState, useEffect } from 'react';
import { AlertCircle, Check, X, Calendar, User, Eye, EyeOff, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

// Styles pour la scrollbar personnalisée
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 5px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #94a3b8;
    border-radius: 5px;
    border: 2px solid #f1f5f9;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #64748b;
  }
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #94a3b8 #f1f5f9;
  }
`;

const PDFValidationStep = ({ 
  data,  // Données extraites
  onChange,  // Pour gérer les modifications
  validation,  // Object contenant errors et warnings
  onValidate,  // Pour valider et importer
  onCancel,  // Pour annuler et revenir en arrière
  pdfFile,  // Fichier PDF original pour affichage
  loading  // État de chargement
}) => {
  
  // État pour l'affichage du PDF
  const [showPDF, setShowPDF] = useState(true);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [splitRatio, setSplitRatio] = useState(50); // % de largeur pour le PDF

  // Créer l'URL du PDF au montage
  useEffect(() => {
    if (pdfFile) {
      const url = URL.createObjectURL(pdfFile);
      setPdfUrl(url);
      console.log('📄 PDF URL créée pour prévisualisation');
      
      // Cleanup
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [pdfFile]);

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
        <button
          onClick={onCancel}
          className="mt-3 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Retour
        </button>
      </div>
    );
  }

  const getServiceLabel = (code) => {
    const labels = {
      '-': 'Matin',
      'O': 'Soir', 
      'X': 'Nuit',
      'RP': 'Repos',
      'C': 'Congé',
      'D': 'Dispo',
      'NU': 'Non Utilisé',
      'HAB': 'Formation',
      'MA': 'Maladie',
      'I': 'Inactif',
      'VISIMED': 'Visite Méd.'
    };
    return labels[code] || code;
  };

  const getServiceColor = (code) => {
    const colors = {
      '-': 'bg-blue-100 text-blue-700',
      'O': 'bg-orange-100 text-orange-700',
      'X': 'bg-purple-100 text-purple-700',
      'RP': 'bg-green-100 text-green-700',
      'C': 'bg-green-100 text-green-700',
      'D': 'bg-yellow-100 text-yellow-700',
      'NU': 'bg-gray-100 text-gray-700',
      'HAB': 'bg-indigo-100 text-indigo-700',
      'MA': 'bg-red-100 text-red-700',
      'I': 'bg-pink-100 text-pink-700',
      'VISIMED': 'bg-cyan-100 text-cyan-700'
    };
    return colors[code] || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    });
  };

  // Fonction pour modifier une cellule
  const handleCellEdit = (index, field, value) => {
    const updatedData = { ...data };
    updatedData.planning[index][field] = value;
    onChange(updatedData);
  };

  // Fonction pour supprimer une entrée
  const handleDeleteEntry = (index) => {
    const updatedData = { ...data };
    updatedData.planning = updatedData.planning.filter((_, i) => i !== index);
    onChange(updatedData);
  };

  // Fonction pour ajouter une entrée manuelle
  const handleAddEntry = () => {
    const today = new Date().toISOString().split('T')[0];
    const newEntry = {
      date: today,
      service_code: 'RP',
      poste_code: null,
      original_code: 'MANUEL',
      description: 'Ajouté manuellement'
    };
    const updatedData = { ...data };
    updatedData.planning = [...updatedData.planning, newEntry];
    onChange(updatedData);
  };

  // Grouper par date pour un affichage plus clair
  const groupedByDate = (data.planning || []).reduce((acc, entry, index) => {
    if (!acc[entry.date]) {
      acc[entry.date] = [];
    }
    acc[entry.date].push({ ...entry, index });
    return acc;
  }, {});

  // Composant de visualisation du PDF
  const PDFViewer = () => (
    <div className="h-full flex flex-col bg-gray-800 rounded-lg overflow-hidden">
      {/* Toolbar PDF */}
      <div className="bg-gray-700 px-3 py-2 flex items-center justify-between flex-shrink-0">
        <span className="text-white text-sm font-medium flex items-center gap-2">
          📄 Bulletin original
        </span>
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <button
            onClick={() => setPdfZoom(Math.max(50, pdfZoom - 25))}
            className="text-white hover:bg-gray-600 p-1 rounded"
            title="Zoom -"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-white text-xs min-w-[40px] text-center">{pdfZoom}%</span>
          <button
            onClick={() => setPdfZoom(Math.min(200, pdfZoom + 25))}
            className="text-white hover:bg-gray-600 p-1 rounded"
            title="Zoom +"
          >
            <ZoomIn size={16} />
          </button>
          {/* Toggle */}
          <button
            onClick={() => setShowPDF(false)}
            className="text-white hover:bg-gray-600 p-1 rounded ml-2"
            title="Masquer le PDF"
          >
            <EyeOff size={16} />
          </button>
        </div>
      </div>
      
      {/* PDF iframe */}
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

  // Composant des données extraites
  const DataEditor = () => (
    <div className="h-full flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header fixe */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 flex-shrink-0">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          📋 Données extraites
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            {data.planning ? data.planning.length : 0} entrées
          </span>
        </h3>
        {pdfFile && !showPDF && (
          <button
            onClick={() => setShowPDF(true)}
            className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
          >
            <Eye size={16} />
            Afficher le PDF
          </button>
        )}
      </div>

      {/* Contenu scrollable avec scrollbar visible */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {/* Agent détecté */}
        <div className="bg-blue-50 p-4 rounded-lg">
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
                  onChange={(e) => {
                    const updatedData = { ...data };
                    updatedData.agent.nom = e.target.value;
                    onChange(updatedData);
                  }}
                  className="ml-2 px-2 py-1 border rounded"
                  placeholder="Nom de l'agent"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Prénom:</label>
                <input
                  type="text"
                  value={data.agent.prenom || ''}
                  onChange={(e) => {
                    const updatedData = { ...data };
                    updatedData.agent.prenom = e.target.value;
                    onChange(updatedData);
                  }}
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
        {validation && validation.errors && validation.errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="text-red-600" size={20} />
              <span className="font-medium text-red-900">Erreurs à corriger</span>
            </div>
            <ul className="text-sm text-red-800 list-disc list-inside">
              {validation.errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Avertissements */}
        {validation && validation.warnings && validation.warnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="text-amber-600" size={20} />
              <span className="font-medium text-amber-900">Informations</span>
            </div>
            <ul className="text-sm text-amber-800 list-disc list-inside">
              {validation.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Planning extrait */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar size={20} />
              Planning
            </h3>
            <button
              onClick={handleAddEntry}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              + Ajouter
            </button>
          </div>

          {data.planning && data.planning.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              {Object.entries(groupedByDate).map(([date, entries]) => (
                <div key={date} className="border-b last:border-b-0">
                  <div className="bg-gray-100 px-3 py-2 sticky top-0 z-10 border-b">
                    <span className="font-medium text-sm">{formatDate(date)}</span>
                    <span className="text-xs text-gray-600 ml-2">({entries.length} service{entries.length > 1 ? 's' : ''})</span>
                  </div>
                  
                  <div className="p-2 space-y-1 bg-white">
                    {entries.map((entry) => (
                      <div key={entry.index} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded text-sm border border-transparent hover:border-gray-200">
                        {/* Service */}
                        <select
                          value={entry.service_code}
                          onChange={(e) => handleCellEdit(entry.index, 'service_code', e.target.value)}
                          className="flex-1 p-1 border rounded text-sm min-w-[100px]"
                        >
                          <option value="-">Matin (06h-14h)</option>
                          <option value="O">Soir (14h-22h)</option>
                          <option value="X">Nuit (22h-06h)</option>
                          <option value="RP">Repos</option>
                          <option value="C">Congé</option>
                          <option value="D">Disponible</option>
                          <option value="NU">Non Utilisé</option>
                          <option value="HAB">Formation</option>
                          <option value="MA">Maladie</option>
                          <option value="I">Inactif</option>
                          <option value="VISIMED">Visite Médicale</option>
                        </select>

                        {/* Badge service */}
                        <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getServiceColor(entry.service_code)}`}>
                          {getServiceLabel(entry.service_code)}
                        </span>

                        {/* Poste */}
                        {entry.poste_code && (
                          <select
                            value={entry.poste_code || ''}
                            onChange={(e) => handleCellEdit(entry.index, 'poste_code', e.target.value || null)}
                            className="w-20 p-1 border rounded text-xs"
                          >
                            <option value="">-</option>
                            <option value="CRC">CRC</option>
                            <option value="ACR">ACR</option>
                            <option value="CCU">CCU</option>
                            <option value="RE">RE</option>
                            <option value="RC">RC</option>
                            <option value="RO">RO</option>
                            <option value="CAC">CAC</option>
                            <option value="SOUF">SOUF</option>
                          </select>
                        )}

                        {/* Code original */}
                        {entry.original_code && (
                          <span className="text-xs text-gray-400 truncate max-w-[80px]" title={entry.original_code}>
                            ({entry.original_code})
                          </span>
                        )}

                        {/* Supprimer */}
                        <button
                          onClick={() => handleDeleteEntry(entry.index)}
                          className="text-red-500 hover:text-red-700 p-1 flex-shrink-0"
                          title="Supprimer cette entrée"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <p className="text-gray-600">Aucune entrée de planning détectée</p>
              <p className="text-sm text-gray-500 mt-2">Utilisez le bouton ci-dessus pour ajouter des entrées manuellement</p>
            </div>
          )}
        </div>

        {/* Résumé */}
        {data.planning && data.planning.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Période :</span>
                <span className="font-medium ml-1">
                  {formatDate(data.planning[0].date)} - 
                  {formatDate(data.planning[data.planning.length - 1].date)}
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
      </div>

      {/* Boutons d'action - fixés en bas */}
      <div className="flex justify-between p-4 border-t bg-gray-50 flex-shrink-0">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          ← Retour
        </button>
        <button
          onClick={onValidate}
          disabled={loading || !data.agent || !data.agent.nom || !data.agent.prenom || !data.planning || data.planning.length === 0}
          className={`px-6 py-2 rounded font-medium flex items-center gap-2 ${
            !loading && data.agent && data.agent.nom && data.agent.prenom && data.planning && data.planning.length > 0
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <>
              <span className="animate-spin">⏳</span>
              Import en cours...
            </>
          ) : (
            <>
              <Check size={18} />
              Valider et Importer
            </>
          )}
        </button>
      </div>
    </div>
  );

  // Rendu principal - Split View ou Vue simple
  return (
    <>
      {/* Injection des styles de scrollbar */}
      <style>{scrollbarStyles}</style>
      
      <div className="h-full">
        {/* Message d'aide */}
        {pdfFile && showPDF && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800">
              💡 <strong>Astuce :</strong> Comparez le bulletin original (à gauche) avec les données extraites (à droite). 
              Utilisez la barre de défilement pour parcourir toutes les entrées.
            </p>
          </div>
        )}

        {/* Layout Split ou Simple */}
        {pdfFile && showPDF ? (
          // Vue Split-Screen
          <div className="flex gap-4 h-[calc(100%-60px)]" style={{ minHeight: '500px' }}>
            {/* Panneau PDF - Gauche */}
            <div 
              className="flex-shrink-0 transition-all duration-300"
              style={{ width: `${splitRatio}%`, minWidth: '300px', maxWidth: '60%' }}
            >
              <PDFViewer />
            </div>

            {/* Séparateur redimensionnable */}
            <div 
              className="w-2 bg-gray-300 hover:bg-blue-400 cursor-col-resize rounded flex-shrink-0 flex items-center justify-center transition-colors"
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
              <div className="w-1 h-12 bg-gray-500 rounded" />
            </div>

            {/* Panneau Données - Droite */}
            <div className="flex-1 min-w-[350px]">
              <DataEditor />
            </div>
          </div>
        ) : (
          // Vue Simple (sans PDF)
          <div className="h-full">
            <DataEditor />
          </div>
        )}
      </div>
    </>
  );
};

export default PDFValidationStep;
