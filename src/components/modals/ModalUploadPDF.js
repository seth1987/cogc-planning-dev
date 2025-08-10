import React, { useState } from 'react';
import { Upload, FileText, Check, X, AlertCircle, Loader, Key } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const ModalUploadPDF = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState('');
  const [validationMode, setValidationMode] = useState(false);
  const [editedData, setEditedData] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [showManualParsing, setShowManualParsing] = useState(false);

  // Configuration Mistral API
  const MISTRAL_API_KEY = process.env.REACT_APP_MISTRAL_API_KEY;
  const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

  // Vérifier si la clé API est configurée
  const isApiConfigured = MISTRAL_API_KEY && 
                          MISTRAL_API_KEY !== 'your_mistral_api_key_here' &&
                          MISTRAL_API_KEY.length > 10;

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

  const parseManually = (text) => {
    // Parser manuel basique pour extraction des données
    const lines = text.split('\n');
    const result = {
      agent: { nom: '', prenom: '' },
      planning: []
    };

    // Recherche du nom de l'agent
    const agentMatch = text.match(/Agent\s*:\s*COGC\s+PN\s+([A-Z]+)\s+([A-Z]+)/);
    if (agentMatch) {
      result.agent.nom = agentMatch[1];
      result.agent.prenom = agentMatch[2];
    }

    // Map pour gérer les entrées multiples par date
    const planningMap = new Map();

    // Recherche des dates et services
    const datePattern = /(\d{2})\/(\d{2})\/(\d{4})/g;
    const dates = text.match(datePattern);
    
    if (dates) {
      dates.forEach(dateStr => {
        const [day, month, year] = dateStr.split('/');
        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        
        // Recherche du service pour cette date
        const dateIndex = text.indexOf(dateStr);
        const lineEnd = text.indexOf('\n', dateIndex);
        const dateLine = text.substring(dateIndex, lineEnd);
        
        let serviceCode = '';
        let posteCode = null;
        let shouldShift = false; // Flag pour décaler la date
        
        // Détection des codes
        if (dateLine.includes('ACR001') || dateLine.includes('CRC001') || dateLine.includes('CCU001')) {
          serviceCode = '-';
          posteCode = dateLine.includes('ACR') ? 'ACR' : dateLine.includes('CRC') ? 'CRC' : 'CCU';
        } else if (dateLine.includes('ACR002') || dateLine.includes('CRC002') || dateLine.includes('CCU002')) {
          serviceCode = 'O';
          posteCode = dateLine.includes('ACR') ? 'ACR' : dateLine.includes('CRC') ? 'CRC' : 'CCU';
        } else if (dateLine.includes('ACR003') || dateLine.includes('CRC003') || dateLine.includes('CCU003')) {
          // Nuit de travail - décaler au lendemain
          serviceCode = 'X';
          posteCode = dateLine.includes('ACR') ? 'ACR' : dateLine.includes('CRC') ? 'CRC' : 'CCU';
          shouldShift = true;
        } else if (dateLine.includes('RP003') || dateLine.includes('RPP003')) {
          // Repos de nuit - NE PAS décaler
          serviceCode = 'RP';
          shouldShift = false;
        } else if (dateLine.includes('RP') || dateLine.includes('Repos')) {
          serviceCode = 'RP';
        } else if (dateLine.includes('CONGE') || /\bC\s+Congé/.test(dateLine)) {
          serviceCode = 'C';
        } else if (dateLine.includes('DISPO')) {
          serviceCode = 'D';
        } else if (dateLine.includes('NU') || dateLine.includes('non utilisé')) {
          serviceCode = 'NU';
        } else if (dateLine.includes('HAB') || dateLine.includes('FORMATION')) {
          serviceCode = 'HAB';
        } else if (dateLine.includes('VISIMED') || dateLine.includes('VMT') || dateLine.includes('INACTIN')) {
          serviceCode = 'I';
        }
        
        if (serviceCode) {
          let entryDate = formattedDate;
          
          // Décaler uniquement les services de nuit (pas les repos de nuit)
          if (shouldShift) {
            const nextDate = new Date(formattedDate);
            nextDate.setDate(nextDate.getDate() + 1);
            entryDate = nextDate.toISOString().split('T')[0];
          }
          
          // Ajouter l'entrée au planning
          const key = `${entryDate}_${serviceCode}_${posteCode || 'null'}`;
          if (!planningMap.has(key)) {
            planningMap.set(key, {
              date: entryDate,
              service_code: serviceCode,
              poste_code: posteCode
            });
          }
        }
      });
    }

    // Convertir la map en array
    result.planning = Array.from(planningMap.values()).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    return result;
  };

  const parseWithMistral = async (text) => {
    const prompt = `Analyse ce bulletin de commande SNCF et extrais les informations suivantes au format JSON:
    
    TEXTE DU BULLETIN:
    ${text}
    
    INSTRUCTIONS IMPORTANTES:
    1. Extrais le nom complet de l'agent (nom et prénom)
    2. Pour chaque date, extrais TOUTES les entrées (y compris NU):
       - La date au format YYYY-MM-DD
       - Le code service principal
       - Le code poste si présent
    
    3. RÈGLE CRITIQUE POUR LES NUITS (003):
       - Les services de TRAVAIL de nuit (ACR003, CRC003, CCU003) qui commencent à 22h00 doivent être décalés au JOUR SUIVANT
       - EXCEPTION: Les REPOS de nuit (RP003, RPP003) restent sur leur date d'origine (ne pas décaler)
       - Exemple: 21/04 ACR003 → enregistrer sur le 22/04 (service de nuit)
       - Exemple: 21/04 RP003 → reste sur le 21/04 (repos de nuit)
    
    4. Conversion des codes:
       - XXX001 (matin 6h-14h) = service "-"
       - XXX002 (soir 14h-22h) = service "O"
       - XXX003 (nuit 22h-6h) = service "X" (DÉCALER AU JOUR SUIVANT sauf si RP/RPP)
       - XXX004, XXX005 = vérifier les horaires (généralement matin="-" ou soir="O")
       - RP ou RPP ou RP003 ou RPP003 = "RP" (repos, jamais décalé)
       - C ou CONGE = "C"
       - DISPO = "D"
       - NU = "NU" (garder tel quel)
       - HAB ou FORMATION = "HAB"
       - MA ou MALADIE = "MA"
       - VISIMED ou VMT = "I"
       - INACTIN = "I"
    
    5. Pour les codes comme ACR001, CRC002, CCU003:
       - Les 3 lettres = poste_code (ACR, CRC, CCU, RE, RO, CAC, etc.)
       - Le chiffre = indicateur horaire pour conversion
    
    6. Si une date a plusieurs entrées:
       - Garder TOUTES les entrées uniques
       - Les nuits de TRAVAIL (003) sont décalées au lendemain
       - Les repos de nuit (RP003) restent sur leur date
       - NU reste sur sa date originale
       - Éviter les doublons (même date + même service + même poste)
    
    Format JSON attendu:
    {
      "agent": {
        "nom": "NOM",
        "prenom": "PRENOM"
      },
      "planning": [
        {
          "date": "YYYY-MM-DD",
          "service_code": "-" ou "O" ou "X" ou "RP" ou "C" ou "D" ou "NU" ou "HAB" ou "MA" ou "I",
          "poste_code": "ACR" ou "CCU" ou "CRC" etc. (null si pas de poste)
        }
      ]
    }
    
    EXEMPLES CONCRETS:
    1. Si le bulletin montre:
       21/04/2025 NU
       21/04/2025 ACR003 (22h-6h)
       Tu dois retourner:
       - {"date": "2025-04-21", "service_code": "NU", "poste_code": null}
       - {"date": "2025-04-22", "service_code": "X", "poste_code": "ACR"} (décalé au lendemain)
    
    2. Si le bulletin montre:
       21/04/2025 RP003 (repos de nuit)
       Tu dois retourner:
       - {"date": "2025-04-21", "service_code": "RP", "poste_code": null} (PAS décalé)
    
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
        const errorData = await response.json().catch(() => ({}));
        console.error('Erreur API Mistral:', errorData);
        
        if (response.status === 401) {
          throw new Error('Clé API Mistral invalide. Vérifiez votre configuration.');
        } else if (response.status === 429) {
          throw new Error('Limite de requêtes atteinte. Réessayez dans quelques instants.');
        } else {
          throw new Error(`Erreur API Mistral (${response.status})`);
        }
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
      throw err;
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
      setExtractedText(text);
      
      let parsed;
      
      // 2. Parser avec Mistral ou manuellement
      if (isApiConfigured) {
        try {
          parsed = await parseWithMistral(text);
        } catch (mistralError) {
          console.error('Erreur Mistral, bascule en mode manuel:', mistralError);
          setError(`Erreur API Mistral: ${mistralError.message}. Utilisation du parsing manuel.`);
          parsed = parseManually(text);
          setShowManualParsing(true);
        }
      } else {
        setError('Clé API Mistral non configurée. Utilisation du parsing manuel.');
        parsed = parseManually(text);
        setShowManualParsing(true);
      }
      
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
      // 1. Recherche de l'agent avec insensibilité à la casse
      console.log('Recherche agent:', editedData.agent.nom, editedData.agent.prenom);
      
      // Utilisation de ilike pour recherche insensible à la casse
      const { data: agents, error: agentError } = await supabase
        .from('agents')
        .select('id, nom, prenom')
        .ilike('nom', editedData.agent.nom)
        .ilike('prenom', editedData.agent.prenom)
        .single();

      if (agentError || !agents) {
        // Essai avec des variations de casse
        const { data: agentsAlt, error: agentErrorAlt } = await supabase
          .from('agents')
          .select('id, nom, prenom')
          .or(`nom.ilike.${editedData.agent.nom},nom.ilike.${editedData.agent.nom.toLowerCase()},nom.ilike.${editedData.agent.nom.charAt(0).toUpperCase() + editedData.agent.nom.slice(1).toLowerCase()}`)
          .or(`prenom.ilike.${editedData.agent.prenom},prenom.ilike.${editedData.agent.prenom.toLowerCase()},prenom.ilike.${editedData.agent.prenom.charAt(0).toUpperCase() + editedData.agent.prenom.slice(1).toLowerCase()}`)
          .single();
        
        if (agentErrorAlt || !agentsAlt) {
          throw new Error(`Agent ${editedData.agent.nom} ${editedData.agent.prenom} non trouvé dans la base`);
        }
        
        agents = agentsAlt;
      }

      const agentId = agents.id;
      console.log('Agent trouvé:', agents.nom, agents.prenom, 'ID:', agentId);

      // 2. Regrouper les entrées par date pour gérer les doublons
      const entriesByDate = {};
      editedData.planning.forEach(entry => {
        if (!entriesByDate[entry.date]) {
          entriesByDate[entry.date] = [];
        }
        // Éviter les doublons exacts
        const exists = entriesByDate[entry.date].some(e => 
          e.service_code === entry.service_code && 
          e.poste_code === entry.poste_code
        );
        if (!exists) {
          entriesByDate[entry.date].push(entry);
        }
      });

      // 3. Sauvegarder le planning
      let insertedCount = 0;
      for (const [date, entries] of Object.entries(entriesByDate)) {
        // Supprimer toutes les entrées existantes pour cette date
        await supabase
          .from('planning')
          .delete()
          .eq('agent_id', agentId)
          .eq('date', date);

        // Insérer toutes les nouvelles entrées pour cette date
        for (const entry of entries) {
          if (entry.service_code) {
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
            } else {
              insertedCount++;
            }
          }
        }
      }

      // 4. Enregistrer l'upload
      await supabase
        .from('uploads_pdf')
        .insert({
          agent_id: agentId,
          fichier_nom: file.name,
          agent_nom: `${agents.nom} ${agents.prenom}`,
          services_count: insertedCount,
          metadata: {
            agent: {
              nom: agents.nom,
              prenom: agents.prenom,
              nom_detecte: editedData.agent.nom,
              prenom_detecte: editedData.agent.prenom
            },
            services_imported: insertedCount,
            dates_count: Object.keys(entriesByDate).length,
            import_date: new Date().toISOString(),
            parsing_mode: showManualParsing ? 'manual' : 'mistral'
          }
        });

      console.log(`Import réussi: ${insertedCount} entrées insérées`);
      onSuccess && onSuccess();
      handleClose();
      
    } catch (err) {
      console.error('Erreur validation:', err);
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
    setExtractedText('');
    setShowManualParsing(false);
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
      'NU': 'Non Utilisé',
      'HAB': 'Formation',
      'MA': 'Maladie',
      'I': 'Inactif'
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
      'I': 'bg-pink-100 text-pink-700'
    };
    return colors[code] || 'bg-gray-100 text-gray-700';
  };

  // Fonction pour détecter les doublons dans le planning
  const getDuplicateDates = () => {
    if (!editedData || !editedData.planning) return [];
    
    const dateCounts = {};
    editedData.planning.forEach(entry => {
      dateCounts[entry.date] = (dateCounts[entry.date] || 0) + 1;
    });
    
    return Object.entries(dateCounts)
      .filter(([date, count]) => count > 1)
      .map(([date]) => date);
  };

  const duplicateDates = validationMode ? getDuplicateDates() : [];

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
                {/* Alerte si API non configurée */}
                {!isApiConfigured && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <Key className="text-amber-600 mt-1" size={20} />
                      <div className="flex-1">
                        <p className="font-medium text-amber-900">Configuration API Mistral requise</p>
                        <p className="text-sm text-amber-800 mt-1">
                          Pour un parsing optimal, configurez votre clé API Mistral dans le fichier .env :
                        </p>
                        <pre className="bg-amber-100 p-2 rounded mt-2 text-xs">
                          REACT_APP_MISTRAL_API_KEY=votre_clé_ici
                        </pre>
                        <p className="text-sm text-amber-700 mt-2">
                          Le parsing manuel est disponible mais moins précis.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

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
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-900 mb-2">Rappel important :</h3>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• Les services de nuit (22h-6h) sont décalés au jour suivant</li>
                    <li>• Les repos de nuit (RP003) restent sur leur date d'origine</li>
                    <li>• Les codes NU (Non Utilisé) sont conservés</li>
                    <li>• Les doublons (même date/service/poste) sont automatiquement filtrés</li>
                    <li>• Mode : {isApiConfigured ? '🤖 IA Mistral' : '📝 Parsing manuel'}</li>
                  </ul>
                </div>
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
                  {showManualParsing && (
                    <p className="text-sm text-blue-600 mt-2">
                      ⚠️ Données extraites manuellement - Vérifiez attentivement
                    </p>
                  )}
                </div>

                {duplicateDates.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-amber-900 font-medium">
                      ⚠️ Dates avec entrées multiples détectées :
                    </p>
                    <p className="text-sm text-amber-800 mt-1">
                      {duplicateDates.map(date => new Date(date).toLocaleDateString('fr-FR')).join(', ')}
                    </p>
                    <p className="text-xs text-amber-700 mt-2">
                      C'est normal si vous avez NU + service ou plusieurs services le même jour.
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-2">Planning extrait ({editedData.planning.length} entrées) :</h3>
                  <div className="bg-yellow-50 p-2 rounded mb-2 text-sm">
                    <span className="font-medium">Note :</span> Les nuits de travail (X) ont été décalées au jour suivant. Les repos de nuit (RP) restent sur leur date.
                  </div>
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
                        {editedData.planning.map((entry, index) => {
                          const isDuplicate = duplicateDates.includes(entry.date);
                          return (
                            <tr key={index} className={`hover:bg-gray-50 ${isDuplicate ? 'bg-amber-50' : ''}`}>
                              <td className="border p-2">
                                {new Date(entry.date).toLocaleDateString('fr-FR')}
                                {isDuplicate && (
                                  <span className="ml-2 text-xs text-amber-600">(Multiple)</span>
                                )}
                              </td>
                              <td className="border p-2">
                                <div className="flex items-center gap-2">
                                  <select
                                    value={entry.service_code}
                                    onChange={(e) => handleCellEdit(index, 'service_code', e.target.value)}
                                    className="flex-1 p-1 border rounded"
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
                                    <option value="I">Inactif/Visite</option>
                                  </select>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${getServiceColor(entry.service_code)}`}>
                                    {getServiceLabel(entry.service_code)}
                                  </span>
                                </div>
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
                                  <option value="CENT">Centre</option>
                                  <option value="SOUF">Souffleur</option>
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
                          );
                        })}
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