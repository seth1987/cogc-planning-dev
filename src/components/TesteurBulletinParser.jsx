import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, User, Calendar, Clock, Moon, Sun, Zap, RefreshCw } from 'lucide-react';

/**
 * TesteurBulletinParser v7.0
 * Interface de test pour le parsing des bulletins SNCF
 */

// ============================================================================
// SERVICE DE PARSING INTÉGRÉ
// ============================================================================

const SERVICE_CODES = {
  'CRC001': { service: '-', poste: 'CRC', type: 'matin' },
  'CRC002': { service: 'O', poste: 'CRC', type: 'soir' },
  'CRC003': { service: 'X', poste: 'CRC', type: 'nuit' },
  'ACR001': { service: '-', poste: 'ACR', type: 'matin' },
  'ACR002': { service: 'O', poste: 'ACR', type: 'soir' },
  'ACR003': { service: 'X', poste: 'ACR', type: 'nuit' },
  'CCU001': { service: '-', poste: 'CCU', type: 'matin' },
  'CCU002': { service: 'O', poste: 'CCU', type: 'soir' },
  'CCU003': { service: 'X', poste: 'CCU', type: 'nuit' },
  'CCU004': { service: '-', poste: 'RE', type: 'matin' },
  'CCU005': { service: 'O', poste: 'RE', type: 'soir' },
  'CCU006': { service: 'X', poste: 'RE', type: 'nuit' },
  'CENT001': { service: '-', poste: 'S/S', type: 'matin' },
  'CENT002': { service: 'O', poste: 'S/S', type: 'soir' },
  'CENT003': { service: 'X', poste: 'S/S', type: 'nuit' },
  'REO001': { service: '-', poste: 'RO', type: 'matin' },
  'REO002': { service: 'O', poste: 'RO', type: 'soir' },
  'REO008': { service: 'O', poste: 'RO', type: 'soir' },
  'RP': { service: 'RP', poste: '', type: 'repos' },
  'NU': { service: 'NU', poste: '', type: 'disponibilité' },
  'DISPO': { service: 'D', poste: '', type: 'disponibilité' },
  'INACTIN': { service: 'I', poste: '', type: 'indisponibilité' },
  'VISIMED': { service: 'VM', poste: '', type: 'visite' },
};

const PATTERNS = {
  dateComplete: /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
  agentNomPrenom: /^([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ]{2,})\s+([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][a-zàâäéèêëïîôùûüç]+)$/,
  numeroCP: /N°\s*CP\s*:\s*(\d{7}[A-Z])/i,
  periode: /Commande\s+allant\s+du\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+au\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
  edition: /Edition\s+le\s+(\d{1,2}\/\d{1,2}\/\d{4})\s*,?\s*(\d{1,2}:\d{2})/i,
  codePosteNum: /^([A-Z]{2,4})(\d{3})$/,
  codeSimple: /^(RP|NU|C|DISPO|INACTIN|HAB|VISIMED)$/i,
  horairesN: /N\d+\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})/,
  ignorer: /^(METRO|RS|TRACTION|SOCIETE|Page|Signature|Fin d'impression|CHEMINS|FER|FRANCAIS|du\s+[A-Z]{3}\d{3})/i
};

function parseBulletin(texte) {
  const lignes = texte.split(/[\r\n]+/).map(l => l.trim()).filter(l => l.length > 0);
  const logs = [];
  
  // Extraction agent
  let agent = null;
  for (let i = 0; i < Math.min(15, lignes.length); i++) {
    const ligne = lignes[i];
    if (/^Agent\s*:?\s*$/i.test(ligne) && i + 2 < lignes.length) {
      const l1 = lignes[i + 1];
      const l2 = lignes[i + 2];
      if (l1 === 'COGC PN' && PATTERNS.agentNomPrenom.test(l2)) {
        agent = l2;
        logs.push(`✅ Agent trouvé: ${agent}`);
        break;
      }
    }
    if (PATTERNS.agentNomPrenom.test(ligne) && ligne !== 'COGC PN' && !ligne.includes('BULLETIN')) {
      agent = ligne;
      logs.push(`✅ Agent trouvé: ${agent}`);
      break;
    }
  }
  
  // Extraction N° CP
  let numeroCP = null;
  for (const ligne of lignes) {
    const match = ligne.match(PATTERNS.numeroCP);
    if (match) {
      numeroCP = match[1];
      logs.push(`✅ N° CP: ${numeroCP}`);
      break;
    }
  }
  
  // Extraction période
  let periode = null;
  for (const ligne of lignes) {
    const match = ligne.match(PATTERNS.periode);
    if (match) {
      periode = { debut: match[1], fin: match[2] };
      logs.push(`✅ Période: ${periode.debut} → ${periode.fin}`);
      break;
    }
  }
  
  // Extraction services
  const services = [];
  let indexDebut = lignes.findIndex(l => l.includes('pu déjà être notifié') || l.includes('Commande allant du'));
  if (indexDebut === -1) indexDebut = 0;
  
  for (let i = indexDebut; i < lignes.length; i++) {
    const ligne = lignes[i];
    const matchDate = ligne.match(PATTERNS.dateComplete);
    
    if (matchDate) {
      const dateStr = `${matchDate[3]}-${matchDate[2].padStart(2, '0')}-${matchDate[1].padStart(2, '0')}`;
      const contexte = lignes.slice(i, Math.min(i + 12, lignes.length));
      
      let codeService = null;
      let codePoste = '';
      let estNuit = false;
      
      for (const ctx of contexte) {
        if (PATTERNS.ignorer.test(ctx)) continue;
        
        const matchCode = ctx.match(PATTERNS.codePosteNum);
        if (matchCode && !codeService) {
          const codeComplet = `${matchCode[1]}${matchCode[2]}`;
          const mapping = SERVICE_CODES[codeComplet];
          if (mapping) {
            codeService = mapping.service;
            codePoste = mapping.poste;
            estNuit = mapping.type === 'nuit';
          }
        }
        
        const matchSimple = ctx.match(PATTERNS.codeSimple);
        if (matchSimple && !codeService) {
          const code = matchSimple[0].toUpperCase();
          const mapping = SERVICE_CODES[code];
          if (mapping) {
            codeService = mapping.service;
            codePoste = mapping.poste;
          }
        }
        
        if (!codeService) {
          if (/Repos\s+périodique/i.test(ctx)) codeService = 'RP';
          else if (/Utilisable\s+non\s+utilisé/i.test(ctx)) codeService = 'NU';
          else if (/Disponible/i.test(ctx)) codeService = 'D';
          else if (/INACTIN/i.test(ctx)) codeService = 'I';
          else if (/VISIMED/i.test(ctx)) codeService = 'VM';
        }
        
        if (codeService) break;
      }
      
      if (codeService) {
        services.push({
          date: dateStr,
          code_service: codeService,
          poste: codePoste,
          est_nuit: estNuit
        });
        logs.push(`📅 ${dateStr}: ${codeService} ${codePoste ? `(${codePoste})` : ''} ${estNuit ? '🌙' : ''}`);
      }
    }
  }
  
  // Post-traitement nuits
  const servicesFinaux = [];
  const nuitsAjoutees = new Set();
  
  for (const service of services) {
    servicesFinaux.push(service);
    
    if (service.est_nuit && service.code_service === 'X') {
      const dateOrigine = new Date(service.date);
      dateOrigine.setDate(dateOrigine.getDate() + 1);
      const dateLendemain = dateOrigine.toISOString().split('T')[0];
      
      const dejaPresent = services.some(s => s.date === dateLendemain);
      
      if (!dejaPresent && !nuitsAjoutees.has(dateLendemain)) {
        servicesFinaux.push({
          date: dateLendemain,
          code_service: 'X',
          poste: service.poste,
          est_nuit: true,
          genere_auto: true,
          source_nuit: service.date
        });
        nuitsAjoutees.add(dateLendemain);
        logs.push(`🌙 Auto-ajout X pour ${dateLendemain} (fin nuit ${service.date})`);
      }
    }
  }
  
  servicesFinaux.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  return { agent, numeroCP, periode, services: servicesFinaux, logs };
}

// ============================================================================
// COMPOSANT REACT
// ============================================================================

const TesteurBulletinParser = () => {
  const [texteInput, setTexteInput] = useState('');
  const [resultat, setResultat] = useState(null);
  const [showLogs, setShowLogs] = useState(false);

  const bulletinExemple = `BULLETIN DE COMMANDE UOP :
Agent :
COGC PN
GILLON THOMAS
N° CP : 8409385L
Date Utilisation Composition
Message :
Edition le 11/04/2025 , 15:07
Cette commande annule le service qui aurait
Commande allant du 21/04/2025 au 30/04/2025
pu déjà être notifié par un bulletin précédent.
21/04/2025
Régulateur Table PARC Denfert
CCU004 Lun
N1100010CO72 06:00 14:00
22/04/2025
Coordonnateur Régional Circulation
CRC001 Mar
N1100010CO72 06:00 14:00
23/04/2025
Régulateur Table PARC Denfert
CCU004 Mer
N1100010CO72 06:00 14:00
24/04/2025
NU Utilisable non utilisé Jeu
24/04/2025
CRC/CCU DENFERT
CCU003 Jeu
N1100010CO72 22:00 06:00
25/04/2025
CRC/CCU DENFERT
CCU003 Ven
N1100010CO72 22:00 06:00
27/04/2025
Dim RP Repos périodique
28/04/2025
RP Repos périodique Lun
29/04/2025
INACTIN Mar
N82F00100000 08:00 15:45 TRACTION
30/04/2025
Disponible
DISPO Mer
N82Z00100000 08:00 15:45`;

  const lancerParsing = () => {
    if (!texteInput.trim()) return;
    const res = parseBulletin(texteInput);
    setResultat(res);
  };

  const chargerExemple = () => {
    setTexteInput(bulletinExemple);
    setResultat(null);
  };

  const getServiceColor = (code) => {
    const colors = {
      '-': 'bg-blue-100 text-blue-800 border-blue-300',
      'O': 'bg-orange-100 text-orange-800 border-orange-300',
      'X': 'bg-purple-100 text-purple-800 border-purple-300',
      'RP': 'bg-green-100 text-green-800 border-green-300',
      'NU': 'bg-gray-100 text-gray-600 border-gray-300',
      'D': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'I': 'bg-red-100 text-red-800 border-red-300',
      'VM': 'bg-pink-100 text-pink-800 border-pink-300'
    };
    return colors[code] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-xl">
              <FileText className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Testeur Bulletin Parser v7.0</h1>
              <p className="text-gray-500">Parsing des bulletins de commande SNCF avec gestion des nuits</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                <Upload size={20} className="text-blue-500" />
                Texte du bulletin
              </h2>
              <button
                onClick={chargerExemple}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600 flex items-center gap-1 transition-colors"
              >
                <RefreshCw size={14} />
                Charger exemple
              </button>
            </div>
            
            <textarea
              value={texteInput}
              onChange={(e) => setTexteInput(e.target.value)}
              placeholder="Collez ici le texte OCR du bulletin de commande..."
              className="w-full h-96 p-4 border border-gray-200 rounded-xl font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <button
              onClick={lancerParsing}
              disabled={!texteInput.trim()}
              className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Zap size={18} />
              Analyser le bulletin
            </button>
          </div>

          {/* Résultat */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <CheckCircle size={20} className="text-green-500" />
              Résultat du parsing
            </h2>

            {!resultat ? (
              <div className="h-96 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <FileText size={48} className="mx-auto mb-3 opacity-50" />
                  <p>Collez un bulletin et cliquez sur "Analyser"</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Info agent */}
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center gap-3 mb-2">
                    <User size={20} className="text-blue-600" />
                    <span className="font-semibold text-blue-800">
                      {resultat.agent || '❌ Agent non détecté'}
                    </span>
                  </div>
                  {resultat.numeroCP && (
                    <p className="text-sm text-blue-600 ml-8">N° CP: {resultat.numeroCP}</p>
                  )}
                  {resultat.periode && (
                    <p className="text-sm text-blue-600 ml-8 flex items-center gap-1">
                      <Calendar size={14} />
                      {resultat.periode.debut} → {resultat.periode.fin}
                    </p>
                  )}
                </div>

                {/* Services */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                    <span className="font-medium text-gray-700">
                      {resultat.services.length} services extraits
                    </span>
                    <div className="flex gap-2">
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full flex items-center gap-1">
                        <Moon size={12} />
                        Nuits auto
                      </span>
                    </div>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-gray-600">Date</th>
                          <th className="px-4 py-2 text-left text-gray-600">Service</th>
                          <th className="px-4 py-2 text-left text-gray-600">Poste</th>
                          <th className="px-4 py-2 text-center text-gray-600">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultat.services.map((service, idx) => (
                          <tr 
                            key={idx} 
                            className={`border-t border-gray-100 ${service.genere_auto ? 'bg-purple-50' : ''}`}
                          >
                            <td className="px-4 py-2 font-mono">{service.date}</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-1 rounded border ${getServiceColor(service.code_service)}`}>
                                {service.code_service}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-gray-600">{service.poste || '-'}</td>
                            <td className="px-4 py-2 text-center">
                              {service.est_nuit ? (
                                <Moon size={16} className="text-purple-500 inline" />
                              ) : (
                                <Sun size={16} className="text-yellow-500 inline" />
                              )}
                              {service.genere_auto && (
                                <span className="ml-1 text-xs text-purple-600">(auto)</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Logs */}
                <div>
                  <button
                    onClick={() => setShowLogs(!showLogs)}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <AlertTriangle size={14} />
                    {showLogs ? 'Masquer' : 'Afficher'} les logs ({resultat.logs.length})
                  </button>
                  
                  {showLogs && (
                    <div className="mt-2 bg-gray-900 rounded-lg p-3 max-h-40 overflow-y-auto">
                      {resultat.logs.map((log, idx) => (
                        <div key={idx} className="text-xs font-mono text-green-400">
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Légende */}
        <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-semibold text-gray-700 mb-3">Légende des codes de service</h3>
          <div className="flex flex-wrap gap-3">
            {[
              { code: '-', label: 'Matin (06h-14h)' },
              { code: 'O', label: 'Soir (14h-22h)' },
              { code: 'X', label: 'Nuit (22h-06h)' },
              { code: 'RP', label: 'Repos' },
              { code: 'NU', label: 'Non utilisé' },
              { code: 'D', label: 'Disponible' },
              { code: 'I', label: 'Indisponible' }
            ].map(({ code, label }) => (
              <div key={code} className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded border text-sm ${getServiceColor(code)}`}>
                  {code}
                </span>
                <span className="text-sm text-gray-600">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TesteurBulletinParser;
