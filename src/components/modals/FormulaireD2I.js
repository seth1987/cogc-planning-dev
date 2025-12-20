import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Calendar, Clock, MapPin, User, Building, Hash,
  CheckSquare, Square, AlertCircle, Printer, Download, Eye, X
} from 'lucide-react';

/**
 * FormulaireD2I - Formulaire de Déclaration Individuelle d'Intention
 * 
 * Génère le formulaire D2I pour les mouvements sociaux (grèves)
 * avec pré-remplissage automatique des infos agent
 * 
 * @param {object} agent - Infos de l'agent connecté {nom, prenom, cp, signature_url}
 * @param {function} onClose - Callback de fermeture
 */
const FormulaireD2I = ({ agent, onClose }) => {
  // États des cases à cocher pour activer/désactiver les cadres
  const [cadre1Actif, setCadre1Actif] = useState(false);
  const [cadre2Actif, setCadre2Actif] = useState(false);
  
  // État du formulaire
  const [formData, setFormData] = useState({
    // Mouvement social (toujours actif)
    num_dii: '',
    etablissement_ms: 'EIC Paris Nord',
    etablissement_ms_libre: '',
    preavis_date_debut: '',
    preavis_heure_debut: '',
    preavis_date_fin: '',
    preavis_heure_fin: '',
    
    // Cadre 1 - Participation
    nom_1: agent?.nom || '',
    prenom_1: agent?.prenom || '',
    cp_1: agent?.cp || '',
    etablissement_1: 'EIC Paris Nord',
    etablissement_1_libre: '',
    date_greve: '',
    heure_greve: '',
    lieu_1: 'Paris',
    lieu_1_libre: '',
    date_sign_1: new Date().toISOString().split('T')[0],
    
    // Cadre 2 - Renonciation/Reprise
    nom_2: agent?.nom || '',
    prenom_2: agent?.prenom || '',
    cp_2: agent?.cp || '',
    choix_renonciation: '', // 'renoncer' ou 'reprendre'
    date_reprise: '',
    heure_reprise: '',
    lieu_2: 'Paris',
    lieu_2_libre: '',
    date_sign_2: new Date().toISOString().split('T')[0],
  });

  // États pour la validation
  const [errors, setErrors] = useState({});
  const [showPreview, setShowPreview] = useState(false);
  
  const printRef = useRef();

  // Mettre à jour les dates de signature quand les cadres sont activés
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (cadre1Actif) {
      setFormData(prev => ({ ...prev, date_sign_1: today }));
    }
    if (cadre2Actif) {
      setFormData(prev => ({ ...prev, date_sign_2: today }));
    }
  }, [cadre1Actif, cadre2Actif]);

  // Mettre à jour les infos agent dans le cadre 2 quand le cadre 1 change
  useEffect(() => {
    if (cadre2Actif) {
      setFormData(prev => ({
        ...prev,
        nom_2: prev.nom_1,
        prenom_2: prev.prenom_1,
        cp_2: prev.cp_1,
      }));
    }
  }, [cadre2Actif, formData.nom_1, formData.prenom_1, formData.cp_1]);

  // Effacer date/heure reprise si on choisit "renoncer"
  useEffect(() => {
    if (formData.choix_renonciation === 'renoncer') {
      setFormData(prev => ({
        ...prev,
        date_reprise: '',
        heure_reprise: '',
      }));
    }
  }, [formData.choix_renonciation]);

  // Handler de changement générique
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Effacer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Validation du formulaire
  const validateForm = () => {
    const newErrors = {};
    
    // Mouvement social - toujours obligatoire
    if (formData.etablissement_ms === 'Texte libre' && !formData.etablissement_ms_libre.trim()) {
      newErrors.etablissement_ms_libre = 'Établissement requis';
    }
    if (!formData.preavis_date_debut) newErrors.preavis_date_debut = 'Date requise';
    if (!formData.preavis_heure_debut) newErrors.preavis_heure_debut = 'Heure requise';
    if (!formData.preavis_date_fin) newErrors.preavis_date_fin = 'Date requise';
    if (!formData.preavis_heure_fin) newErrors.preavis_heure_fin = 'Heure requise';
    
    // Validation date fin >= date début
    if (formData.preavis_date_debut && formData.preavis_date_fin) {
      if (formData.preavis_date_fin < formData.preavis_date_debut) {
        newErrors.preavis_date_fin = 'Date fin doit être ≥ date début';
      }
    }

    // N° DII obligatoire si cadre 2 actif
    if (cadre2Actif && !formData.num_dii.trim()) {
      newErrors.num_dii = 'N° DII obligatoire si cadre 2 rempli';
    }
    
    // Cadre 1 - si actif, tous champs obligatoires
    if (cadre1Actif) {
      if (!formData.nom_1.trim()) newErrors.nom_1 = 'Nom requis';
      if (!formData.prenom_1.trim()) newErrors.prenom_1 = 'Prénom requis';
      if (formData.etablissement_1 === 'Texte libre' && !formData.etablissement_1_libre.trim()) {
        newErrors.etablissement_1_libre = 'Établissement requis';
      }
      if (!formData.date_greve) newErrors.date_greve = 'Date requise';
      if (!formData.heure_greve) newErrors.heure_greve = 'Heure requise';
      if (formData.lieu_1 === 'Texte libre' && !formData.lieu_1_libre.trim()) {
        newErrors.lieu_1_libre = 'Lieu requis';
      }
      if (!formData.date_sign_1) newErrors.date_sign_1 = 'Date requise';
    }
    
    // Cadre 2 - si actif
    if (cadre2Actif) {
      if (!formData.nom_2.trim()) newErrors.nom_2 = 'Nom requis';
      if (!formData.prenom_2.trim()) newErrors.prenom_2 = 'Prénom requis';
      if (!formData.choix_renonciation) newErrors.choix_renonciation = 'Choix requis';
      
      // Date/heure obligatoires UNIQUEMENT si "reprendre le travail" est sélectionné
      if (formData.choix_renonciation === 'reprendre') {
        if (!formData.date_reprise) newErrors.date_reprise = 'Date requise';
        if (!formData.heure_reprise) newErrors.heure_reprise = 'Heure requise';
      }
      
      if (formData.lieu_2 === 'Texte libre' && !formData.lieu_2_libre.trim()) {
        newErrors.lieu_2_libre = 'Lieu requis';
      }
      if (!formData.date_sign_2) newErrors.date_sign_2 = 'Date requise';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Générer le PDF (aperçu puis impression)
  const handleGenerate = () => {
    if (validateForm()) {
      setShowPreview(true);
    }
  };

  // Formater la date en français
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR');
  };

  // Composant pour les menus déroulants avec option "Texte libre"
  const SelectWithFreeText = ({ 
    value, 
    freeTextValue, 
    onChange, 
    onFreeTextChange, 
    options, 
    disabled,
    error,
    freeTextError 
  }) => (
    <div className="flex gap-2 flex-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`
          px-3 py-2 rounded-lg border transition-colors
          ${disabled 
            ? 'bg-gray-700/50 border-gray-600 text-gray-500 cursor-not-allowed' 
            : 'bg-gray-800 border-gray-600 text-white focus:border-cyan-500'}
          ${error ? 'border-red-500' : ''}
        `}
      >
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
        <option value="Texte libre">Texte libre...</option>
      </select>
      {value === 'Texte libre' && (
        <input
          type="text"
          value={freeTextValue}
          onChange={(e) => onFreeTextChange(e.target.value)}
          disabled={disabled}
          placeholder="Saisir..."
          className={`
            flex-1 px-3 py-2 rounded-lg border transition-colors
            ${disabled 
              ? 'bg-gray-700/50 border-gray-600 text-gray-500 cursor-not-allowed' 
              : 'bg-gray-800 border-gray-600 text-white focus:border-cyan-500'}
            ${freeTextError ? 'border-red-500' : ''}
          `}
        />
      )}
    </div>
  );

  // Composant aperçu/impression du formulaire
  const D2IPreview = () => (
    <div 
      id="d2i-print-content"
      ref={printRef}
      className="bg-white text-black p-8 max-w-[210mm] mx-auto"
      style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', lineHeight: '1.4' }}
    >
      {/* En-tête */}
      <div className="text-xs italic mb-4">Continuité de service à l'EIC Paris Nord</div>
      
      <h1 className="text-center text-lg font-bold mb-1">
        DECLARATION INDIVIDUELLE D'INTENTION N°{formData.num_dii || '______'}
      </h1>
      <p className="text-center text-xs mb-1">Lois du 21 août 2007 et du 19 mars 2012</p>
      <p className="text-center text-xs mb-4">Informations à réceptionner par le service concerné</p>
      
      {/* Encadré Mouvement Social */}
      <div className="border border-black p-3 mb-4">
        <span className="font-bold underline mr-4">Mouvement social :</span>
        <span>Etablissement : </span>
        <span className="border-b border-dotted border-black px-2">
          {formData.etablissement_ms === 'Texte libre' ? formData.etablissement_ms_libre : formData.etablissement_ms}
        </span>
        <span className="ml-6">Préavis : du </span>
        <span className="border-b border-dotted border-black px-2">{formatDate(formData.preavis_date_debut)}</span>
        <span> à </span>
        <span className="border-b border-dotted border-black px-2">{formData.preavis_heure_debut}</span>
        <span> au </span>
        <span className="border-b border-dotted border-black px-2">{formatDate(formData.preavis_date_fin)}</span>
        <span> à </span>
        <span className="border-b border-dotted border-black px-2">{formData.preavis_heure_fin}</span>
      </div>
      
      {/* Cadre réservé à l'agent */}
      <div className="text-xs italic mb-2">Cadre réservé à l'agent</div>
      
      {/* Cadre 1 */}
      <div className={`mb-4 ${!cadre1Actif ? 'opacity-40' : ''}`}>
        <div className="flex items-start gap-2 mb-2">
          <span className="inline-flex items-center justify-center w-5 h-5 border border-black rounded-full text-xs font-bold">1</span>
          <span>NOM de L'AGENT : </span>
          <span className="border-b border-dotted border-black px-2 min-w-[150px]">{cadre1Actif ? formData.nom_1 : ''}</span>
          <span className="ml-4">PRENOM : </span>
          <span className="border-b border-dotted border-black px-2 min-w-[100px]">{cadre1Actif ? formData.prenom_1 : ''}</span>
          <span className="ml-4">CP : </span>
          <span className="border-b border-dotted border-black px-2 min-w-[60px]">{cadre1Actif ? formData.cp_1 : ''}</span>
        </div>
        
        <div className="mb-2">
          <span>ETABLISSEMENT/ ENTITE : </span>
          <span className="border-b border-dotted border-black px-2 min-w-[300px]">
            {cadre1Actif ? (formData.etablissement_1 === 'Texte libre' ? formData.etablissement_1_libre : formData.etablissement_1) : ''}
          </span>
        </div>
        
        <div className="mb-2">
          <span>Déclare avoir l'intention de participer à la grève, à compter du </span>
          <span className="border-b border-dotted border-black px-2">{cadre1Actif ? formatDate(formData.date_greve) : ''}</span>
          <span> à </span>
          <span className="border-b border-dotted border-black px-2">{cadre1Actif ? formData.heure_greve : ''}</span>
          <sup>(1)</sup>
        </div>
        
        <div className="flex justify-between items-end mt-3">
          <div>
            <span>A </span>
            <span className="border-b border-dotted border-black px-2 min-w-[100px]">
              {cadre1Actif ? (formData.lieu_1 === 'Texte libre' ? formData.lieu_1_libre : formData.lieu_1) : ''}
            </span>
          </div>
          <div>
            <span>Date : </span>
            <span className="border-b border-dotted border-black px-2">{cadre1Actif ? formatDate(formData.date_sign_1) : ''}</span>
          </div>
          <div className="flex items-end gap-2">
            <span>Signature : </span>
            {cadre1Actif && agent?.signature_url ? (
              <img src={agent.signature_url} alt="Signature" className="h-8 max-w-[100px]" />
            ) : (
              <span className="border-b border-dotted border-black w-[100px] h-6"></span>
            )}
          </div>
        </div>
      </div>
      
      {/* Trait pointillé ciseaux */}
      <div className="border-t border-dashed border-gray-400 my-3 relative">
        <span className="absolute -top-3 left-2 bg-white px-1">✂</span>
      </div>
      
      {/* Cadre 2 */}
      <div className={`mb-4 ${!cadre2Actif ? 'opacity-40' : ''}`}>
        <div className="flex items-start gap-2 mb-2">
          <span className="inline-flex items-center justify-center w-5 h-5 border border-black rounded-full text-xs font-bold">2</span>
          <span>NOM de L'AGENT : </span>
          <span className="border-b border-dotted border-black px-2 min-w-[150px]">{cadre2Actif ? formData.nom_2 : ''}</span>
          <span className="ml-4">PRENOM : </span>
          <span className="border-b border-dotted border-black px-2 min-w-[100px]">{cadre2Actif ? formData.prenom_2 : ''}</span>
          <span className="ml-4">CP : </span>
          <span className="border-b border-dotted border-black px-2 min-w-[60px]">{cadre2Actif ? formData.cp_2 : ''}</span>
        </div>
        
        <div className="mb-2">
          <span>Déclare, suite à la DII n°</span>
          <span className="border-b border-dotted border-black px-2 mx-1">{cadre2Actif ? formData.num_dii : ''}</span>
          <sup>(2)</sup>
          
          <div className="border border-black inline-block p-2 ml-4">
            <div>
              <span className={formData.choix_renonciation === 'reprendre' ? 'line-through' : ''}>
                renoncer à participer à la grève
              </span>
              <sup>(3)</sup>
            </div>
            <div>
              <span className={formData.choix_renonciation === 'renoncer' ? 'line-through' : ''}>
                reprendre le travail
              </span>
              {/* Date/heure affichées UNIQUEMENT si "reprendre" est sélectionné */}
              {formData.choix_renonciation === 'reprendre' ? (
                <>
                  <span>, à compter du </span>
                  <span className="border-b border-dotted border-black px-2 mx-1">
                    {cadre2Actif ? formatDate(formData.date_reprise) : ''}
                  </span>
                  <span> à </span>
                  <span className="border-b border-dotted border-black px-2 mx-1">
                    {cadre2Actif ? formData.heure_reprise : ''}
                  </span>
                </>
              ) : (
                <span className={formData.choix_renonciation === 'renoncer' ? 'line-through' : ''}>
                  , à compter du _______ à _______
                </span>
              )}
              <sup>(4)</sup>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-end mt-3">
          <div>
            <span>A </span>
            <span className="border-b border-dotted border-black px-2 min-w-[100px]">
              {cadre2Actif ? (formData.lieu_2 === 'Texte libre' ? formData.lieu_2_libre : formData.lieu_2) : ''}
            </span>
          </div>
          <div>
            <span>Date : </span>
            <span className="border-b border-dotted border-black px-2">{cadre2Actif ? formatDate(formData.date_sign_2) : ''}</span>
          </div>
          <div className="flex items-end gap-2">
            <span>Signature : </span>
            {cadre2Actif && agent?.signature_url ? (
              <img src={agent.signature_url} alt="Signature" className="h-8 max-w-[100px]" />
            ) : (
              <span className="border-b border-dotted border-black w-[100px] h-6"></span>
            )}
          </div>
        </div>
      </div>
      
      {/* Notes */}
      <div className="text-[8px] mt-4 pl-4">
        <p className="mb-1" style={{ textIndent: '-15px' }}>
          (1) Est passible d'une sanction disciplinaire le salarié qui n'a pas informé son employeur de son intention de participer à la grève au plus tard 48 heures avant la participation à la grève
        </p>
        <p className="mb-1" style={{ textIndent: '-15px' }}>(2) Rayer les mentions inutiles</p>
        <p className="mb-1" style={{ textIndent: '-15px' }}>
          (3) Est passible d'une sanction disciplinaire le salarié qui n'a pas informé son employeur de son intention de renoncer à participer à la grève au plus tard 24 heures avant l'heure de participation prévue, sauf lorsque la grève n'a pas lieu ou lorsque la prise du service est consécutive à la fin de la grève
        </p>
        <p style={{ textIndent: '-15px' }}>
          (4) Est passible d'une sanction disciplinaire le salarié qui n'a pas informé son employeur de son intention de reprendre le travail après avoir participé à la grève au plus tard 24 heures avant l'heure de reprise souhaitée, sauf lorsque la reprise du service est consécutive à la fin de la grève
        </p>
      </div>
      
      {/* Footer */}
      <div className="text-center mt-6 pt-3 border-t border-black">
        <span className="border border-black px-4 py-1 font-bold text-xs">INTERNE SNCF RESEAU</span>
        <p className="text-[8px] mt-1">EIC PN RH00008- Version 01 du 26-10-2017</p>
      </div>
    </div>
  );

  // Modal d'aperçu
  if (showPreview) {
    return (
      <div className="fixed inset-0 bg-black/90 flex flex-col z-[70]" id="d2i-preview-modal">
        {/* Header aperçu - masqué à l'impression */}
        <div className="bg-gray-900 p-4 flex items-center justify-between border-b border-gray-700 print:hidden">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Aperçu du document D2I
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg"
            >
              <Printer className="w-4 h-4" />
              Imprimer / PDF
            </button>
            <button
              onClick={() => setShowPreview(false)}
              className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Contenu aperçu */}
        <div className="flex-1 overflow-auto p-4 bg-gray-600 print:p-0 print:bg-white print:overflow-visible">
          <div className="shadow-2xl print:shadow-none">
            <D2IPreview />
          </div>
        </div>
        
        {/* Style impression */}
        <style>{`
          @media print {
            /* Masquer tout sauf le contenu à imprimer */
            body > *:not(#root) { display: none !important; }
            
            #d2i-preview-modal {
              position: absolute !important;
              inset: 0 !important;
              background: white !important;
              display: block !important;
            }
            
            #d2i-preview-modal > *:not(:last-child):not(:nth-child(2)) {
              display: none !important;
            }
            
            #d2i-print-content {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              padding: 10mm !important;
              background: white !important;
              color: black !important;
              font-size: 11px !important;
            }
            
            #d2i-print-content * {
              color: black !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            .print\\:hidden { display: none !important; }
          }
        `}</style>
      </div>
    );
  }

  // Modal principale du formulaire
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
      <div className="bg-gray-900 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-700">
        {/* Header avec croix de fermeture */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <FileText className="w-6 h-6 text-cyan-400" />
            Déclaration Individuelle d'Intention (D2I)
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Info */}
          <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-200/80">
                Formulaire pour déclarer votre participation à un mouvement social.
                Remplissez le mouvement social, puis cochez le(s) cadre(s) à compléter.
              </p>
            </div>
          </div>

          {/* Section Mouvement Social - Toujours active */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Building className="w-5 h-5 text-cyan-400" />
              Mouvement social
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* N° DII */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  N° DII {cadre2Actif && <span className="text-red-400">*</span>}
                </label>
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={formData.num_dii}
                    onChange={(e) => handleChange('num_dii', e.target.value)}
                    placeholder="Numéro (si connu)"
                    className={`
                      flex-1 px-3 py-2 bg-gray-800 border rounded-lg text-white
                      ${errors.num_dii ? 'border-red-500' : 'border-gray-600 focus:border-cyan-500'}
                    `}
                  />
                </div>
                {errors.num_dii && <p className="text-red-400 text-xs mt-1">{errors.num_dii}</p>}
              </div>
              
              {/* Établissement */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Établissement <span className="text-red-400">*</span>
                </label>
                <SelectWithFreeText
                  value={formData.etablissement_ms}
                  freeTextValue={formData.etablissement_ms_libre}
                  onChange={(v) => handleChange('etablissement_ms', v)}
                  onFreeTextChange={(v) => handleChange('etablissement_ms_libre', v)}
                  options={['EIC Paris Nord']}
                  disabled={false}
                  error={errors.etablissement_ms}
                  freeTextError={errors.etablissement_ms_libre}
                />
              </div>
              
              {/* Préavis début */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Préavis du <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                    <input
                      type="date"
                      value={formData.preavis_date_debut}
                      onChange={(e) => handleChange('preavis_date_debut', e.target.value)}
                      className={`
                        flex-1 px-3 py-2 bg-gray-800 border rounded-lg text-white
                        ${errors.preavis_date_debut ? 'border-red-500' : 'border-gray-600 focus:border-cyan-500'}
                      `}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500 shrink-0" />
                    <input
                      type="time"
                      value={formData.preavis_heure_debut}
                      onChange={(e) => handleChange('preavis_heure_debut', e.target.value)}
                      className={`
                        w-24 px-3 py-2 bg-gray-800 border rounded-lg text-white
                        ${errors.preavis_heure_debut ? 'border-red-500' : 'border-gray-600 focus:border-cyan-500'}
                      `}
                    />
                  </div>
                </div>
              </div>
              
              {/* Préavis fin */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Au <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                    <input
                      type="date"
                      value={formData.preavis_date_fin}
                      onChange={(e) => handleChange('preavis_date_fin', e.target.value)}
                      min={formData.preavis_date_debut}
                      className={`
                        flex-1 px-3 py-2 bg-gray-800 border rounded-lg text-white
                        ${errors.preavis_date_fin ? 'border-red-500' : 'border-gray-600 focus:border-cyan-500'}
                      `}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500 shrink-0" />
                    <input
                      type="time"
                      value={formData.preavis_heure_fin}
                      onChange={(e) => handleChange('preavis_heure_fin', e.target.value)}
                      className={`
                        w-24 px-3 py-2 bg-gray-800 border rounded-lg text-white
                        ${errors.preavis_heure_fin ? 'border-red-500' : 'border-gray-600 focus:border-cyan-500'}
                      `}
                    />
                  </div>
                </div>
                {errors.preavis_date_fin && <p className="text-red-400 text-xs mt-1">{errors.preavis_date_fin}</p>}
              </div>
            </div>
          </div>

          {/* Cadre 1 - Participation */}
          <div className={`
            rounded-lg p-4 border transition-all
            ${cadre1Actif 
              ? 'bg-green-500/10 border-green-500/50' 
              : 'bg-gray-800/30 border-gray-700 opacity-60'}
          `}>
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setCadre1Actif(!cadre1Actif)}
                className="flex items-center gap-2"
              >
                {cadre1Actif ? (
                  <CheckSquare className="w-6 h-6 text-green-400" />
                ) : (
                  <Square className="w-6 h-6 text-gray-500" />
                )}
              </button>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-sm font-bold text-green-400">1</span>
                <h3 className="text-lg font-semibold text-white">Participation à la grève</h3>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* NOM */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">NOM</label>
                <input
                  type="text"
                  value={formData.nom_1}
                  onChange={(e) => handleChange('nom_1', e.target.value)}
                  disabled={!cadre1Actif}
                  className={`
                    w-full px-3 py-2 rounded-lg border transition-colors
                    ${!cadre1Actif 
                      ? 'bg-gray-700/50 border-gray-600 text-gray-500 cursor-not-allowed' 
                      : 'bg-gray-800 border-gray-600 text-white focus:border-cyan-500'}
                  `}
                />
              </div>
              
              {/* PRÉNOM */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">PRÉNOM</label>
                <input
                  type="text"
                  value={formData.prenom_1}
                  onChange={(e) => handleChange('prenom_1', e.target.value)}
                  disabled={!cadre1Actif}
                  className={`
                    w-full px-3 py-2 rounded-lg border transition-colors
                    ${!cadre1Actif 
                      ? 'bg-gray-700/50 border-gray-600 text-gray-500 cursor-not-allowed' 
                      : 'bg-gray-800 border-gray-600 text-white focus:border-cyan-500'}
                  `}
                />
              </div>
              
              {/* CP */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">CP</label>
                <input
                  type="text"
                  value={formData.cp_1}
                  onChange={(e) => handleChange('cp_1', e.target.value)}
                  disabled={!cadre1Actif}
                  placeholder="Code Personnel"
                  className={`
                    w-full px-3 py-2 rounded-lg border transition-colors
                    ${!cadre1Actif 
                      ? 'bg-gray-700/50 border-gray-600 text-gray-500 cursor-not-allowed' 
                      : 'bg-gray-800 border-gray-600 text-white focus:border-cyan-500'}
                  `}
                />
              </div>
              
              {/* Établissement */}
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-300 mb-1">ÉTABLISSEMENT</label>
                <SelectWithFreeText
                  value={formData.etablissement_1}
                  freeTextValue={formData.etablissement_1_libre}
                  onChange={(v) => handleChange('etablissement_1', v)}
                  onFreeTextChange={(v) => handleChange('etablissement_1_libre', v)}
                  options={['EIC Paris Nord']}
                  disabled={!cadre1Actif}
                />
              </div>
              
              {/* Date grève */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Date participation</label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                  <input
                    type="date"
                    value={formData.date_greve}
                    onChange={(e) => handleChange('date_greve', e.target.value)}
                    disabled={!cadre1Actif}
                    className={`
                      flex-1 px-3 py-2 rounded-lg border transition-colors
                      ${!cadre1Actif 
                        ? 'bg-gray-700/50 border-gray-600 text-gray-500 cursor-not-allowed' 
                        : 'bg-gray-800 border-gray-600 text-white focus:border-cyan-500'}
                      ${errors.date_greve ? 'border-red-500' : ''}
                    `}
                  />
                </div>
              </div>
              
              {/* Heure */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Heure</label>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500 shrink-0" />
                  <input
                    type="time"
                    value={formData.heure_greve}
                    onChange={(e) => handleChange('heure_greve', e.target.value)}
                    disabled={!cadre1Actif}
                    className={`
                      flex-1 px-3 py-2 rounded-lg border transition-colors
                      ${!cadre1Actif 
                        ? 'bg-gray-700/50 border-gray-600 text-gray-500 cursor-not-allowed' 
                        : 'bg-gray-800 border-gray-600 text-white focus:border-cyan-500'}
                      ${errors.heure_greve ? 'border-red-500' : ''}
                    `}
                  />
                </div>
              </div>
              
              {/* Lieu */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Lieu</label>
                <SelectWithFreeText
                  value={formData.lieu_1}
                  freeTextValue={formData.lieu_1_libre}
                  onChange={(v) => handleChange('lieu_1', v)}
                  onFreeTextChange={(v) => handleChange('lieu_1_libre', v)}
                  options={['Paris']}
                  disabled={!cadre1Actif}
                />
              </div>
              
              {/* Date signature */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Date signature</label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                  <input
                    type="date"
                    value={formData.date_sign_1}
                    onChange={(e) => handleChange('date_sign_1', e.target.value)}
                    disabled={!cadre1Actif}
                    className={`
                      flex-1 px-3 py-2 rounded-lg border transition-colors
                      ${!cadre1Actif 
                        ? 'bg-gray-700/50 border-gray-600 text-gray-500 cursor-not-allowed' 
                        : 'bg-gray-800 border-gray-600 text-white focus:border-cyan-500'}
                    `}
                  />
                </div>
              </div>
              
              {/* Signature */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">Signature</label>
                {agent?.signature_url ? (
                  <div className="flex items-center gap-3 p-2 bg-gray-800 rounded-lg border border-gray-600">
                    <img src={agent.signature_url} alt="Votre signature" className="h-10 max-w-[150px]" />
                    <span className="text-green-400 text-sm">✓ Signature chargée</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-2 bg-yellow-500/20 rounded-lg border border-yellow-500/50">
                    <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0" />
                    <span className="text-yellow-300 text-sm">
                      Pas de signature enregistrée. Ajoutez-la dans "Mon compte".
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cadre 2 - Renonciation/Reprise */}
          <div className={`
            rounded-lg p-4 border transition-all
            ${cadre2Actif 
              ? 'bg-orange-500/10 border-orange-500/50' 
              : 'bg-gray-800/30 border-gray-700 opacity-60'}
          `}>
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setCadre2Actif(!cadre2Actif)}
                className="flex items-center gap-2"
              >
                {cadre2Actif ? (
                  <CheckSquare className="w-6 h-6 text-orange-400" />
                ) : (
                  <Square className="w-6 h-6 text-gray-500" />
                )}
              </button>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-sm font-bold text-orange-400">2</span>
                <h3 className="text-lg font-semibold text-white">Renonciation / Reprise du travail</h3>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* NOM */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">NOM</label>
                <input
                  type="text"
                  value={formData.nom_2}
                  disabled={true}
                  className="w-full px-3 py-2 rounded-lg border bg-gray-700/50 border-gray-600 text-gray-400 cursor-not-allowed"
                />
              </div>
              
              {/* PRÉNOM */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">PRÉNOM</label>
                <input
                  type="text"
                  value={formData.prenom_2}
                  disabled={true}
                  className="w-full px-3 py-2 rounded-lg border bg-gray-700/50 border-gray-600 text-gray-400 cursor-not-allowed"
                />
              </div>
              
              {/* CP */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">CP</label>
                <input
                  type="text"
                  value={formData.cp_2}
                  disabled={true}
                  className="w-full px-3 py-2 rounded-lg border bg-gray-700/50 border-gray-600 text-gray-400 cursor-not-allowed"
                />
              </div>
              
              {/* Choix Renoncer / Reprendre */}
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Je déclare <span className="text-red-400">*</span>
                </label>
                <div className="flex flex-wrap gap-4">
                  <label className={`
                    flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                    ${!cadre2Actif ? 'opacity-50 cursor-not-allowed' : ''}
                    ${formData.choix_renonciation === 'renoncer' 
                      ? 'bg-orange-500/20 border-orange-500' 
                      : 'bg-gray-800 border-gray-600 hover:border-gray-500'}
                  `}>
                    <input
                      type="radio"
                      name="choix_renonciation"
                      value="renoncer"
                      checked={formData.choix_renonciation === 'renoncer'}
                      onChange={(e) => handleChange('choix_renonciation', e.target.value)}
                      disabled={!cadre2Actif}
                      className="w-4 h-4 text-orange-500"
                    />
                    <span className="text-white">Renoncer à participer à la grève</span>
                  </label>
                  
                  <label className={`
                    flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                    ${!cadre2Actif ? 'opacity-50 cursor-not-allowed' : ''}
                    ${formData.choix_renonciation === 'reprendre' 
                      ? 'bg-orange-500/20 border-orange-500' 
                      : 'bg-gray-800 border-gray-600 hover:border-gray-500'}
                  `}>
                    <input
                      type="radio"
                      name="choix_renonciation"
                      value="reprendre"
                      checked={formData.choix_renonciation === 'reprendre'}
                      onChange={(e) => handleChange('choix_renonciation', e.target.value)}
                      disabled={!cadre2Actif}
                      className="w-4 h-4 text-orange-500"
                    />
                    <span className="text-white">Reprendre le travail</span>
                  </label>
                </div>
                {errors.choix_renonciation && <p className="text-red-400 text-xs mt-1">{errors.choix_renonciation}</p>}
              </div>
              
              {/* Date reprise - Visible uniquement si "reprendre" sélectionné */}
              <div className={formData.choix_renonciation !== 'reprendre' ? 'opacity-40' : ''}>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  À compter du {formData.choix_renonciation === 'reprendre' && <span className="text-red-400">*</span>}
                </label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                  <input
                    type="date"
                    value={formData.date_reprise}
                    onChange={(e) => handleChange('date_reprise', e.target.value)}
                    disabled={!cadre2Actif || formData.choix_renonciation !== 'reprendre'}
                    className={`
                      flex-1 px-3 py-2 rounded-lg border transition-colors
                      ${!cadre2Actif || formData.choix_renonciation !== 'reprendre'
                        ? 'bg-gray-700/50 border-gray-600 text-gray-500 cursor-not-allowed' 
                        : 'bg-gray-800 border-gray-600 text-white focus:border-cyan-500'}
                      ${errors.date_reprise ? 'border-red-500' : ''}
                    `}
                  />
                </div>
                {errors.date_reprise && <p className="text-red-400 text-xs mt-1">{errors.date_reprise}</p>}
              </div>
              
              {/* Heure reprise - Visible uniquement si "reprendre" sélectionné */}
              <div className={formData.choix_renonciation !== 'reprendre' ? 'opacity-40' : ''}>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Heure {formData.choix_renonciation === 'reprendre' && <span className="text-red-400">*</span>}
                </label>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500 shrink-0" />
                  <input
                    type="time"
                    value={formData.heure_reprise}
                    onChange={(e) => handleChange('heure_reprise', e.target.value)}
                    disabled={!cadre2Actif || formData.choix_renonciation !== 'reprendre'}
                    className={`
                      flex-1 px-3 py-2 rounded-lg border transition-colors
                      ${!cadre2Actif || formData.choix_renonciation !== 'reprendre'
                        ? 'bg-gray-700/50 border-gray-600 text-gray-500 cursor-not-allowed' 
                        : 'bg-gray-800 border-gray-600 text-white focus:border-cyan-500'}
                      ${errors.heure_reprise ? 'border-red-500' : ''}
                    `}
                  />
                </div>
                {errors.heure_reprise && <p className="text-red-400 text-xs mt-1">{errors.heure_reprise}</p>}
              </div>
              
              {/* Lieu */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Lieu</label>
                <SelectWithFreeText
                  value={formData.lieu_2}
                  freeTextValue={formData.lieu_2_libre}
                  onChange={(v) => handleChange('lieu_2', v)}
                  onFreeTextChange={(v) => handleChange('lieu_2_libre', v)}
                  options={['Paris']}
                  disabled={!cadre2Actif}
                />
              </div>
              
              {/* Date signature */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Date signature</label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                  <input
                    type="date"
                    value={formData.date_sign_2}
                    onChange={(e) => handleChange('date_sign_2', e.target.value)}
                    disabled={!cadre2Actif}
                    className={`
                      flex-1 px-3 py-2 rounded-lg border transition-colors
                      ${!cadre2Actif 
                        ? 'bg-gray-700/50 border-gray-600 text-gray-500 cursor-not-allowed' 
                        : 'bg-gray-800 border-gray-600 text-white focus:border-cyan-500'}
                    `}
                  />
                </div>
              </div>
              
              {/* Signature */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">Signature</label>
                {agent?.signature_url ? (
                  <div className="flex items-center gap-3 p-2 bg-gray-800 rounded-lg border border-gray-600">
                    <img src={agent.signature_url} alt="Votre signature" className="h-10 max-w-[150px]" />
                    <span className="text-green-400 text-sm">✓ Signature chargée</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-2 bg-yellow-500/20 rounded-lg border border-yellow-500/50">
                    <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0" />
                    <span className="text-yellow-300 text-sm">
                      Pas de signature enregistrée.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer avec boutons - toujours visible */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-700 shrink-0 bg-gray-900">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleGenerate}
            className="flex items-center gap-2 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
            Aperçu & Impression
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormulaireD2I;
