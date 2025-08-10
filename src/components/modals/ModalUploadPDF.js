import React, { useState } from 'react';
import { Upload, FileText, Check, X, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const ModalUploadPDF = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState('');
  const [validationMode, setValidationMode] = useState(false);
  const [editedData, setEditedData] = useState(null);

  // Configuration Mistral API
  const MISTRAL_API_KEY = process.env.REACT_APP_MISTRAL_API_KEY;
  const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError('');
    } else {
      setError('Veuillez sélectionner un fichier PDF valide');
    }
  };

  const extractTextFromPDF = async (file) => {
    // Utilisation de PDF.js pour extraire le texte
    const pdfjsLib = window.pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }

      return fullText;
    } catch (err) {
      console.error('Erreur extraction PDF:', err);
      throw new Error('Impossible d\'extraire le texte du PDF');
    }
  };

  const parseWithMistral = async (text) => {
    const prompt = `Analyse ce bulletin de commande SNCF et extrais les informations suivantes au format JSON:
    
    TEXTE DU BULLETIN:
    ${text}
    
    INSTRUCTIONS:
    1. Extrais le nom complet de l'agent (nom et prénom)
    2. Pour chaque date, extrais:
       - La date au format YYYY-MM-DD
       - Le code service principal (exemples: ACR, CCU, CRC, RE, RO, CAC, CENT, SOUF)
       - Le code horaire: 001=matin(6h-14h), 002=soir(14h-22h), 003=nuit(22h-6h)
       - Les codes spéciaux: RP (repos), C (congé), DISPO (disponible), NU (non utilisé), HAB (formation), MA (maladie)
    3. Ignore les lignes avec NU (non utilisé) si elles sont suivies d'un autre service le même jour
    4. Pour les codes comme ACR001, garde "ACR" comme poste_code et "001" indique l'horaire (matin)
    
    Format JSON attendu:
    {
      "agent": {
        "nom": "NOM",
        "prenom": "PRENOM"
      },
      "planning": [
        {
          "date": "YYYY-MM-DD",
          "service_code": "-" ou "O" ou "X" ou "RP" ou "C" ou "D" ou "MA" ou "HAB",
          "poste_code": "ACR" ou "CCU" ou "CRC" etc. (null si pas de poste)
        }
      ]
    }
    
    Règles de conversion:
    - ACR001, CRC001, CCU001, CENT001 = matin = "-"
    - ACR002, CRC002, CCU002, CENT002 = soir = "O" 
    - ACR003, CRC003, CCU003, CENT003 = nuit = "X"
    - RP ou RPP = "RP"
    - C ou CONGE = "C"
    - DISPO = "D"
    - NU = ignorer
    - HAB ou FORMATION = "HAB"
    - MA ou MALADIE = "MA"
    
    Réponds UNIQUEMENT avec le JSON, sans texte supplémentaire.`;

    try {
      const response = await fetch(MISTRAL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MISTRAL_API_KEY}`
        },
        body: JSON.stringify({
          model: 'mistral-large-latest',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error('Erreur API Mistral');
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Nettoyer la réponse pour ne garder que le JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Format de réponse invalide');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error('Erreur Mistral:', err);
      throw new Error('Erreur lors du parsing avec Mistral');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Veuillez sélectionner un fichier');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Extraire le texte du PDF
      const text = await extractTextFromPDF(file);
      
      // 2. Parser avec Mistral
      const parsed = await parseWithMistral(text);
      
      // 3. Préparer les données pour validation
      setParsedData(parsed);
      setEditedData(JSON.parse(JSON.stringify(parsed))); // Deep copy
      setValidationMode(true);
      
    } catch (err) {
      setError(err.message || 'Erreur lors du traitement du fichier');
    } finally {
      setLoading(false);
    }
  };

  const handleCellEdit = (index, field, value) => {
    const newData = { ...editedData };
    newData.planning[index][field] = value;
    setEditedData(newData);
  };

  const handleValidate = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Vérifier si l'agent existe
      const { data: agents, error: agentError } = await supabase
        .from('agents')
        .select('id')
        .eq('nom', editedData.agent.nom.toUpperCase())
        .eq('prenom', editedData.agent.prenom.toUpperCase())
        .single();

      if (agentError || !agents) {
        throw new Error(`Agent ${editedData.agent.nom} ${editedData.agent.prenom} non trouvé`);
      }

      const agentId = agents.id;

      // 2. Sauvegarder le planning
      for (const entry of editedData.planning) {
        if (entry.service_code) {
          // Supprimer l'entrée existante si elle existe
          await supabase
            .from('planning')
            .delete()
            .eq('agent_id', agentId)
            .eq('date', entry.date);

          // Insérer la nouvelle entrée
          const { error: insertError } = await supabase
            .from('planning')
            .insert({
              agent_id: agentId,
              date: entry.date,
              service_code: entry.service_code,
              poste_code: entry.poste_code
            });

          if (insertError) {
            console.error('Erreur insertion:', insertError);
          }
        }
      }

      // 3. Enregistrer l'upload
      await supabase
        .from('uploads_pdf')
        .insert({
          agent_id: agentId,
          fichier_nom: file.name,
          agent_nom: `${editedData.agent.nom} ${editedData.agent.prenom}`,
          services_count: editedData.planning.length,
          metadata: {
            agent: editedData.agent,
            services_imported: editedData.planning.length,
            import_date: new Date().toISOString()
          }
        });

      onSuccess && onSuccess();
      handleClose();
      
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData(null);
    setEditedData(null);
    setValidationMode(false);
    setError('');
    onClose();
  };

  const getServiceLabel = (code) => {
    const labels = {
      '-': 'Matin',
      'O': 'Soir', 
      'X': 'Nuit',
      'RP': 'Repos',
      'C': 'Congé',
      'D': 'Dispo',
      'HAB': 'Formation',
      'MA': 'Maladie'
    };
    return labels[code] || code;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText size={24} />
              {validationMode ? 'Validation des données' : 'Upload Bulletin de Commande'}
            </h2>
            <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {!validationMode ? (
            <>
              {/* Mode Upload */}
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label
                    htmlFor="pdf-upload"
                    className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Cliquez pour sélectionner un PDF
                  </label>
                  {file && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-900">
                        Fichier sélectionné : {file.name}
                      </p>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <AlertCircle className="text-red-600" size={20} />
                    <span className="text-red-700">{error}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Mode Validation */}
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Agent détecté :</h3>
                  <p className="text-lg">
                    {editedData.agent.nom} {editedData.agent.prenom}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Planning extrait ({editedData.planning.length} entrées) :</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border p-2 text-left">Date</th>
                          <th className="border p-2 text-left">Service</th>
                          <th className="border p-2 text-left">Poste</th>
                          <th className="border p-2 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editedData.planning.map((entry, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border p-2">
                              {new Date(entry.date).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="border p-2">
                              <select
                                value={entry.service_code}
                                onChange={(e) => handleCellEdit(index, 'service_code', e.target.value)}
                                className="w-full p-1 border rounded"
                              >
                                <option value="-">Matin (06h-14h)</option>
                                <option value="O">Soir (14h-22h)</option>
                                <option value="X">Nuit (22h-06h)</option>
                                <option value="RP">Repos</option>
                                <option value="C">Congé</option>
                                <option value="D">Disponible</option>
                                <option value="HAB">Formation</option>
                                <option value="MA">Maladie</option>
                              </select>
                            </td>
                            <td className="border p-2">
                              <select
                                value={entry.poste_code || ''}
                                onChange={(e) => handleCellEdit(index, 'poste_code', e.target.value || null)}
                                className="w-full p-1 border rounded"
                              >
                                <option value="">-</option>
                                <option value="CRC">CRC</option>
                                <option value="ACR">ACR</option>
                                <option value="CCU">CCU</option>
                                <option value="RC">RC</option>
                                <option value="RO">RO</option>
                                <option value="RE">RE</option>
                                <option value="CAC">CAC</option>
                              </select>
                            </td>
                            <td className="border p-2">
                              <button
                                onClick={() => {
                                  const newData = { ...editedData };
                                  newData.planning.splice(index, 1);
                                  setEditedData(newData);
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <AlertCircle className="text-red-600" size={20} />
                    <span className="text-red-700">{error}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Annuler
            </button>
            {!validationMode ? (
              <button
                onClick={handleUpload}
                disabled={!file || loading}
                className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 ${
                  !file || loading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    Traitement...
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    Analyser le PDF
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleValidate}
                disabled={loading}
                className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 ${
                  loading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Check size={20} />
                    Valider et Enregistrer
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalUploadPDF;