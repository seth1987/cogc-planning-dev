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

  // Fonction pour réinitialiser tous les états
  const resetAllStates = () => {
    setParsedData(null);
    setEditedData(null);
    setValidationMode(false);
    setError('');
    setExtractedText('');
    setShowManualParsing(false);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError('');
      // Réinitialiser les données précédentes quand un nouveau fichier est sélectionné
      resetAllStates();
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

  // Mapping des codes vers les postes réels
  const getPosteFromCode = (code) => {
    const mapping = {
      'CRC001': { service: '-', poste: 'CRC' },  // Matin CRC
      'CRC002': { service: 'O', poste: 'CRC' },  // Soir CRC
      'CRC003': { service: 'X', poste: 'CRC' },  // Nuit CRC
      
      'ACR001': { service: '-', poste: 'ACR' },  // Matin ACR
      'ACR002': { service: 'O', poste: 'ACR' },  // Soir ACR
      'ACR003': { service: 'X', poste: 'ACR' },  // Nuit ACR
      
      'CCU001': { service: '-', poste: 'CCU' },  // Matin CCU
      'CCU002': { service: 'O', poste: 'CCU' },  // Soir CCU
      'CCU003': { service: 'X', poste: 'CCU' },  // Nuit CCU
      
      'CCU004': { service: '-', poste: 'RE' },   // Matin RE (pas CCU!)
      'CCU005': { service: 'O', poste: 'RE' },   // Soir RE (pas CCU!)
      'CCU006': { service: 'X', poste: 'RE' },   // Nuit RE (pas CCU!)
      
      'CENT001': { service: '-', poste: 'RC' },  // Matin RC (pas CENT!)
      'CENT002': { service: 'O', poste: 'RC' },  // Soir RC (pas CENT!)
      'CENT003': { service: 'X', poste: 'RC' },  // Nuit RC (pas CENT!)
      
      'SOUF001': { service: '-', poste: 'SOUF' }, // Matin Souffleur
      'SOUF002': { service: 'O', poste: 'SOUF' }, // Soir Souffleur
      
      'REO007': { service: '-', poste: 'RO' },   // Matin RO
      'REO008': { service: 'O', poste: 'RO' },   // Soir RO
    };
    
    const result = mapping[code.toUpperCase()] || null;
    if (result) {
      console.log(`Mapping ${code} -> Service: ${result.service}, Poste: ${result.poste}`);
    } else {
      console.log(`Pas de mapping pour ${code}`);
    }
    return result;
  };

  const parseManually = (text) => {
    console.log('Début du parsing manuel...');
    const result = {
      agent: { nom: '', prenom: '' },
      planning: []
    };

    // Extraction du nom de l'agent - format : "COGC PN" sur une ligne, puis "NOM PRENOM" sur la ligne suivante
    const agentMatch = text.match(/COGC\s+PN\s+([A-Z]+)\s+([A-Z]+)/);
    if (agentMatch) {
      result.agent.nom = agentMatch[1];
      result.agent.prenom = agentMatch[2];
      console.log('Agent détecté:', result.agent.nom, result.agent.prenom);
    }

    // Extraire toutes les dates et leur contenu
    const datePattern = /(\d{2})\/(\d{2})\/(\d{4})/g;
    const dateMatches = [...text.matchAll(datePattern)];
    
    // Créer une map pour stocker les entrées par date
    const entriesByDate = new Map();
    
    for (let i = 0; i < dateMatches.length; i++) {
      const match = dateMatches[i];
      const dateStr = match[0];
      const [day, month, year] = dateStr.split('/');
      const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      
      // Extraire le contenu entre cette date et la suivante
      const startIndex = match.index;
      const endIndex = (i < dateMatches.length - 1) ? dateMatches[i + 1].index : text.length;
      const dateContent = text.substring(startIndex, endIndex);
      
      console.log(`\nAnalyse de ${dateStr} (${formattedDate}):`);
      
      // Parser le contenu pour cette date
      const entries = parseEntriesForDate(dateContent, formattedDate);
      
      // Ajouter chaque entrée à la bonne date
      entries.forEach(entry => {
        if (!entriesByDate.has(entry.date)) {
          entriesByDate.set(entry.date, []);
        }
        
        // Vérifier les doublons
        const existingEntries = entriesByDate.get(entry.date);
        const isDuplicate = existingEntries.some(e => 
          e.service_code === entry.service_code && 
          e.poste_code === entry.poste_code
        );
        
        if (!isDuplicate) {
          existingEntries.push(entry);
          console.log(`  -> ${entry.date}: ${entry.service_code} ${entry.poste_code || '-'}`);
        }
      });
    }
    
    // Convertir la map en array et trier par date
    const allDates = Array.from(entriesByDate.keys()).sort();
    allDates.forEach(date => {
      const entries = entriesByDate.get(date);
      entries.forEach(entry => {
        result.planning.push(entry);
      });
    });

    console.log(`\nTotal: ${result.planning.length} entrées`);
    console.log('Planning final:', result.planning.map(e => `${e.date} ${e.service_code} ${e.poste_code}`));
    
    return result;
  };

  // Fonction pour parser les entrées d'une date donnée
  const parseEntriesForDate = (content, formattedDate) => {
    const entries = [];
    
    // Vérifier NU (Non Utilisé)
    if (content.includes('NU Utilisable non utilisé') || (content.includes('NU') && content.includes('non utilisé'))) {
      entries.push({
        date: formattedDate,
        service_code: 'NU',
        poste_code: null
      });
      console.log(`    NU trouvé pour ${formattedDate}`);
    }
    
    // Vérifier RP/RPP (Repos)
    if (content.includes('RP Repos périodique') || content.includes('RPP')) {
      entries.push({
        date: formattedDate,
        service_code: 'RP',
        poste_code: null
      });
      console.log(`    RP trouvé pour ${formattedDate}`);
    }
    
    // Vérifier Congés
    if (content.includes('C Congé') || content.includes('CONGE')) {
      entries.push({
        date: formattedDate,
        service_code: 'C',
        poste_code: null
      });
      console.log(`    Congé trouvé pour ${formattedDate}`);
    }
    
    // Vérifier DISPO
    if (content.includes('Disponible') || content.includes('DISPO')) {
      entries.push({
        date: formattedDate,
        service_code: 'D',
        poste_code: null
      });
      console.log(`    DISPO trouvé pour ${formattedDate}`);
    }
    
    // Vérifier VISIMED
    if (content.includes('VISIMED') || content.includes('VMT')) {
      entries.push({
        date: formattedDate,
        service_code: 'I',
        poste_code: null
      });
      console.log(`    VISIMED trouvé pour ${formattedDate}`);
    }
    
    // Vérifier INACTIN
    if (content.includes('INACTIN')) {
      entries.push({
        date: formattedDate,
        service_code: 'I',
        poste_code: null
      });
      console.log(`    INACTIN trouvé pour ${formattedDate}`);
    }
    
    // Vérifier Formation/HAB
    if (content.includes('HAB-QF') || content.includes('FORMATION') || content.includes('PERFECTIONNEMENT')) {
      entries.push({
        date: formattedDate,
        service_code: 'HAB',
        poste_code: null
      });
      console.log(`    Formation trouvée pour ${formattedDate}`);
    }
    
    // Pattern pour les codes services avec numéros
    const serviceCodePattern = /(?:^|\s)(CRC001|CRC002|CRC003|ACR001|ACR002|ACR003|CCU001|CCU002|CCU003|CCU004|CCU005|CCU006|CENT001|CENT002|CENT003|SOUF001|SOUF002|REO007|REO008)(?:\s|$)/g;
    const serviceMatches = [...content.matchAll(serviceCodePattern)];
    
    if (serviceMatches.length > 0) {
      console.log(`    Codes services trouvés: ${serviceMatches.map(m => m[1]).join(', ')}`);
    }
    
    serviceMatches.forEach(match => {
      const fullCode = match[1];
      const mapping = getPosteFromCode(fullCode);
      
      if (mapping) {
        let entryDate = formattedDate;
        
        // Décaler la date pour les services de nuit (service_code === 'X')
        if (mapping.service === 'X') {
          // Calculer le jour suivant
          const currentDate = new Date(formattedDate + 'T12:00:00'); // Midi pour éviter les problèmes de timezone
          currentDate.setDate(currentDate.getDate() + 1);
          entryDate = currentDate.toISOString().split('T')[0];
          console.log(`    ${fullCode} (nuit) décalé de ${formattedDate} vers ${entryDate}`);
        } else {
          console.log(`    ${fullCode} reste le ${formattedDate}`);
        }
        
        entries.push({
          date: entryDate,
          service_code: mapping.service,
          poste_code: mapping.poste
        });
      }
    });
    
    return entries;
  };

  const parseWithMistral = async (text) => {
    const prompt = `Analyse ce bulletin de commande SNCF et extrais EXACTEMENT les informations au format JSON.

TEXTE DU BULLETIN:
${text}

INSTRUCTIONS CRITIQUES:

1. AGENT:
   - Cherche "COGC PN" suivi du NOM et PRÉNOM
   - Format: COGC PN [NOM] [PRÉNOM]

2. DATES IMPORTANTES:
   - TOUTES les dates doivent être comprises entre le 13/05/2025 et le 01/06/2025
   - Si une nuit du 31/05 se décale, elle va au 01/06/2025

3. MAPPING EXACT DES CODES:
   
   CODES CRC:
   - CRC001 = Matin CRC → service: "-", poste: "CRC"
   - CRC002 = Soir CRC → service: "O", poste: "CRC"
   - CRC003 = Nuit CRC → service: "X", poste: "CRC" (DÉCALER AU LENDEMAIN)
   
   CODES ACR:
   - ACR001 = Matin ACR → service: "-", poste: "ACR"
   - ACR002 = Soir ACR → service: "O", poste: "ACR"
   - ACR003 = Nuit ACR → service: "X", poste: "ACR" (DÉCALER AU LENDEMAIN)
   
   CODES CCU:
   - CCU001 = Matin CCU → service: "-", poste: "CCU"
   - CCU002 = Soir CCU → service: "O", poste: "CCU"
   - CCU003 = Nuit CCU → service: "X", poste: "CCU" (DÉCALER AU LENDEMAIN)
   - CCU004 = Matin RE → service: "-", poste: "RE"
   - CCU005 = Soir RE → service: "O", poste: "RE"
   - CCU006 = Nuit RE → service: "X", poste: "RE" (DÉCALER AU LENDEMAIN)
   
   CODES CENT:
   - CENT001 = Matin RC → service: "-", poste: "RC"
   - CENT002 = Soir RC → service: "O", poste: "RC"
   - CENT003 = Nuit RC → service: "X", poste: "RC" (DÉCALER AU LENDEMAIN)
   
   AUTRES:
   - RP ou RPP = Repos → service: "RP", poste: null
   - C ou CONGE = Congé → service: "C", poste: null
   - NU = Non Utilisé → service: "NU", poste: null
   - DISPO = Disponible → service: "D", poste: null
   - HAB-QF = Formation → service: "HAB", poste: null

4. RÈGLE DES NUITS (TRÈS IMPORTANT):
   - TOUS les services de nuit (X) sont DÉCALÉS AU JOUR SUIVANT
   - 18/05 avec NU + CCU003 → NU reste le 18/05, CCU003 va au 19/05
   - 30/05 avec RP + CENT003 → RP reste le 30/05, CENT003 va au 31/05
   - 31/05 avec ACR003 → ACR003 va au 01/06

FORMAT JSON:
{
  "agent": {
    "nom": "NOM",
    "prenom": "PRENOM"
  },
  "planning": [
    {
      "date": "YYYY-MM-DD",
      "service_code": "code",
      "poste_code": "poste ou null"
    }
  ]
}

RÉPONDS UNIQUEMENT AVEC LE JSON.`;

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
          max_tokens: 3000
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

      const parsedResult = JSON.parse(jsonMatch[0]);
      
      // Log pour debug
      console.log('Résultat Mistral brut:', parsedResult);
      if (parsedResult.planning) {
        console.log('Planning Mistral:', parsedResult.planning.map(e => `${e.date} ${e.service_code} ${e.poste_code}`));
      }
      
      return parsedResult;
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
    
    // IMPORTANT: Réinitialiser toutes les données avant de commencer le parsing
    resetAllStates();

    try {
      // 1. Extraire le texte du PDF
      const text = await extractTextFromPDF(file);
      setExtractedText(text);
      console.log('Texte extrait:', text.substring(0, 500));
      
      let parsed;
      
      // 2. Parser avec Mistral ou manuellement
      if (isApiConfigured) {
        try {
          parsed = await parseWithMistral(text);
          console.log('Résultat Mistral:', parsed);
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
      // IMPORTANT: Créer de nouvelles instances pour éviter les références
      const freshParsedData = JSON.parse(JSON.stringify(parsed));
      const freshEditedData = JSON.parse(JSON.stringify(parsed));
      
      setParsedData(freshParsedData);
      setEditedData(freshEditedData);
      setValidationMode(true);
      
      console.log('Données parsées:', freshParsedData.planning.length, 'entrées');
      
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
    resetAllStates();
    onClose();
  };

  // Fonction pour revenir à l'upload
  const handleBackToUpload = () => {
    // Garder le fichier mais réinitialiser le reste
    resetAllStates();
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
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
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
                    <li>• Les repos (RP) restent toujours sur leur date d'origine</li>
                    <li>• Les codes NU (Non Utilisé) sont conservés sur leur date</li>
                    <li>• CCU004/005/006 → Poste RE (pas CCU)</li>
                    <li>• CENT001/002/003 → Poste RC (pas CENT)</li>
                    <li>• Mode : {isApiConfigured ? '🤖 IA Mistral' : '📝 Parsing manuel'}</li>
                  </ul>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Référence des codes services :</h3>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-blue-100">
                            <th className="border border-blue-300 px-2 py-1 text-left">Code</th>
                            <th className="border border-blue-300 px-2 py-1 text-left">Service</th>
                            <th className="border border-blue-300 px-2 py-1 text-left">Poste</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="hover:bg-blue-50">
                            <td className="border border-blue-200 px-2 py-1 font-mono">CRC001</td>
                            <td className="border border-blue-200 px-2 py-1">Matin</td>
                            <td className="border border-blue-200 px-2 py-1 font-semibold">CRC</td>
                          </tr>
                          <tr className="hover:bg-blue-50">
                            <td className="border border-blue-200 px-2 py-1 font-mono">CRC002</td>
                            <td className="border border-blue-200 px-2 py-1">Soir</td>
                            <td className="border border-blue-200 px-2 py-1 font-semibold">CRC</td>
                          </tr>
                          <tr className="hover:bg-blue-50">
                            <td className="border border-blue-200 px-2 py-1 font-mono">CRC003</td>
                            <td className="border border-blue-200 px-2 py-1">Nuit ⚠️</td>
                            <td className="border border-blue-200 px-2 py-1 font-semibold">CRC</td>
                          </tr>
                          <tr className="hover:bg-blue-50">
                            <td className="border border-blue-200 px-2 py-1 font-mono">ACR001</td>
                            <td className="border border-blue-200 px-2 py-1">Matin</td>
                            <td className="border border-blue-200 px-2 py-1 font-semibold">ACR</td>
                          </tr>
                          <tr className="hover:bg-blue-50">
                            <td className="border border-blue-200 px-2 py-1 font-mono">ACR002</td>
                            <td className="border border-blue-200 px-2 py-1">Soir</td>
                            <td className="border border-blue-200 px-2 py-1 font-semibold">ACR</td>
                          </tr>
                          <tr className="hover:bg-blue-50">
                            <td className="border border-blue-200 px-2 py-1 font-mono">ACR003</td>
                            <td className="border border-blue-200 px-2 py-1">Nuit ⚠️</td>
                            <td className="border border-blue-200 px-2 py-1 font-semibold">ACR</td>
                          </tr>
                          <tr className="hover:bg-blue-50">
                            <td className="border border-blue-200 px-2 py-1 font-mono">CCU001</td>
                            <td className="border border-blue-200 px-2 py-1">Matin</td>
                            <td className="border border-blue-200 px-2 py-1 font-semibold">CCU</td>
                          </tr>
                          <tr className="hover:bg-blue-50">
                            <td className="border border-blue-200 px-2 py-1 font-mono">CCU002</td>
                            <td className="border border-blue-200 px-2 py-1">Soir</td>
                            <td className="border border-blue-200 px-2 py-1 font-semibold">CCU</td>
                          </tr>
                          <tr className="hover:bg-blue-50">
                            <td className="border border-blue-200 px-2 py-1 font-mono">CCU003</td>
                            <td className="border border-blue-200 px-2 py-1">Nuit ⚠️</td>
                            <td className="border border-blue-200 px-2 py-1 font-semibold">CCU</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div>
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-blue-100">
                            <th className="border border-blue-300 px-2 py-1 text-left">Code</th>
                            <th className="border border-blue-300 px-2 py-1 text-left">Service</th>
                            <th className="border border-blue-300 px-2 py-1 text-left">Poste</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="hover:bg-blue-50 bg-yellow-50">
                            <td className="border border-blue-200 px-2 py-1 font-mono">CCU004</td>
                            <td className="border border-blue-200 px-2 py-1">Matin</td>
                            <td className="border border-blue-200 px-2 py-1 font-bold text-red-600">RE ⚠️</td>
                          </tr>
                          <tr className="hover:bg-blue-50 bg-yellow-50">
                            <td className="border border-blue-200 px-2 py-1 font-mono">CCU005</td>
                            <td className="border border-blue-200 px-2 py-1">Soir</td>
                            <td className="border border-blue-200 px-2 py-1 font-bold text-red-600">RE ⚠️</td>
                          </tr>
                          <tr className="hover:bg-blue-50 bg-yellow-50">
                            <td className="border border-blue-200 px-2 py-1 font-mono">CCU006</td>
                            <td className="border border-blue-200 px-2 py-1">Nuit ⚠️</td>
                            <td className="border border-blue-200 px-2 py-1 font-bold text-red-600">RE ⚠️</td>
                          </tr>
                          <tr className="hover:bg-blue-50 bg-green-50">
                            <td className="border border-blue-200 px-2 py-1 font-mono">CENT001</td>
                            <td className="border border-blue-200 px-2 py-1">Matin</td>
                            <td className="border border-blue-200 px-2 py-1 font-bold text-green-600">RC ⚠️</td>
                          </tr>
                          <tr className="hover:bg-blue-50 bg-green-50">
                            <td className="border border-blue-200 px-2 py-1 font-mono">CENT002</td>
                            <td className="border border-blue-200 px-2 py-1">Soir</td>
                            <td className="border border-blue-200 px-2 py-1 font-bold text-green-600">RC ⚠️</td>
                          </tr>
                          <tr className="hover:bg-blue-50 bg-green-50">
                            <td className="border border-blue-200 px-2 py-1 font-mono">CENT003</td>
                            <td className="border border-blue-200 px-2 py-1">Nuit ⚠️</td>
                            <td className="border border-blue-200 px-2 py-1 font-bold text-green-600">RC ⚠️</td>
                          </tr>
                          <tr className="hover:bg-blue-50">
                            <td className="border border-blue-200 px-2 py-1 font-mono">SOUF002</td>
                            <td className="border border-blue-200 px-2 py-1">Soir</td>
                            <td className="border border-blue-200 px-2 py-1 font-semibold">SOUF</td>
                          </tr>
                          <tr className="hover:bg-blue-50">
                            <td className="border border-blue-200 px-2 py-1 font-mono">REO007</td>
                            <td className="border border-blue-200 px-2 py-1">Matin</td>
                            <td className="border border-blue-200 px-2 py-1 font-semibold">RO</td>
                          </tr>
                          <tr className="hover:bg-blue-50">
                            <td className="border border-blue-200 px-2 py-1 font-mono">REO008</td>
                            <td className="border border-blue-200 px-2 py-1">Soir</td>
                            <td className="border border-blue-200 px-2 py-1 font-semibold">RO</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <p className="text-xs text-blue-700 mt-2">
                    ⚠️ = Attention au mapping | Nuits décalées au lendemain | 
                    <span className="text-red-600 font-bold"> CCU004/005/006 → RE</span> | 
                    <span className="text-green-600 font-bold"> CENT001/002/003 → RC</span>
                  </p>
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
                      {duplicateDates.map(date => {
                        const d = new Date(date + 'T12:00:00');
                        return d.toLocaleDateString('fr-FR');
                      }).join(', ')}
                    </p>
                    <p className="text-xs text-amber-700 mt-2">
                      Normal pour : NU + service, RP + service de nuit
                    </p>
                  </div>
                )}

                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-900 font-medium">⚠️ Vérifiez particulièrement :</p>
                  <ul className="text-sm text-red-800 mt-1 list-disc list-inside">
                    <li>CCU004/005/006 → doit afficher <strong>RE</strong> (pas CCU)</li>
                    <li>CENT001/002/003 → doit afficher <strong>RC</strong> (pas CENT)</li>
                    <li>REO007/008 → doit afficher <strong>RO</strong> (pas REO)</li>
                    <li>Services de nuit (31/05) → décalés au 01/06</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Planning extrait ({editedData.planning.length} entrées) :</h3>
                  <div className="bg-yellow-50 p-2 rounded mb-2 text-sm">
                    <span className="font-medium">Note :</span> Les nuits (X) sont décalées au lendemain
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
                          const needsAttention = entry.poste_code === 'RE' || entry.poste_code === 'RC' || entry.poste_code === 'RO';
                          const dateObj = new Date(entry.date + 'T12:00:00');
                          const isJune = entry.date.startsWith('2025-06');
                          
                          return (
                            <tr key={index} className={`hover:bg-gray-50 ${isDuplicate ? 'bg-amber-50' : ''} ${needsAttention ? 'font-semibold' : ''} ${isJune ? 'bg-purple-50' : ''}`}>
                              <td className="border p-2">
                                {dateObj.toLocaleDateString('fr-FR')}
                                {isDuplicate && (
                                  <span className="ml-2 text-xs text-amber-600">(Multiple)</span>
                                )}
                                {isJune && (
                                  <span className="ml-2 text-xs text-purple-600">(Juin)</span>
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
                                  className={`w-full p-1 border rounded ${needsAttention ? 'bg-yellow-100 font-bold' : ''}`}
                                >
                                  <option value="">-</option>
                                  <option value="CRC">CRC</option>
                                  <option value="ACR">ACR</option>
                                  <option value="CCU">CCU</option>
                                  <option value="RE" className="font-bold text-red-600">RE (CCU004/005/006)</option>
                                  <option value="RC" className="font-bold text-green-600">RC (CENT001/002/003)</option>
                                  <option value="RO" className="font-bold text-orange-600">RO (REO007/008)</option>
                                  <option value="SOUF">Souffleur</option>
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
            {validationMode ? (
              <>
                <button
                  onClick={handleBackToUpload}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2"
                >
                  <Upload size={18} />
                  Nouveau PDF
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Annuler
                  </button>
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
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Annuler
                </button>
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalUploadPDF;