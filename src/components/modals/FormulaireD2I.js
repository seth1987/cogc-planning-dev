import React, { useState, useEffect } from 'react';
import { 
  FileText, Calendar, Clock, MapPin, User, Building, Hash,
  CheckSquare, Square, AlertCircle, Printer, Download, Eye, X,
  Upload, FolderOpen, Library, Check, Loader2
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import html2pdf from 'html2pdf.js';

/**
 * FormulaireD2I - Formulaire de Déclaration Individuelle d'Intention
 * 
 * Génère le formulaire D2I pour les mouvements sociaux (grèves)
 * avec pré-remplissage automatique des infos agent
 * 
 * @param {object} agent - Infos de l'agent connecté {id, nom, prenom, cp, signature_url}
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

  // États pour la validation et l'UI
  const [errors, setErrors] = useState({});
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(null);

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

  // Générer le nom du fichier
  const generateFileName = () => {
    if (!formData.preavis_date_debut) return 'preavis_document';
    const date = new Date(formData.preavis_date_debut);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `preavis_${day}-${month}-${year}`;
  };

  // Formater la date en français
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR');
  };

  // Générer le HTML complet du document
  const generateFullHTML = () => {
    const etablissementMS = formData.etablissement_ms === 'Texte libre' ? formData.etablissement_ms_libre : formData.etablissement_ms;
    const etablissement1 = formData.etablissement_1 === 'Texte libre' ? formData.etablissement_1_libre : formData.etablissement_1;
    const lieu1 = formData.lieu_1 === 'Texte libre' ? formData.lieu_1_libre : formData.lieu_1;
    const lieu2 = formData.lieu_2 === 'Texte libre' ? formData.lieu_2_libre : formData.lieu_2;
    
    const cadre2DateHeure = formData.choix_renonciation === 'reprendre' 
      ? `, à compter du <span class="underline-field">${formatDate(formData.date_reprise)}</span> à <span class="underline-field">${formData.heure_reprise}</span>`
      : '<span class="strike">, à compter du _______ à _______</span>';

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>D2I - ${formData.nom_1 || 'Document'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4 portrait; margin: 10mm; }
    body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      padding: 15px 25px;
      max-width: 210mm;
      margin: 0 auto;
      background: white;
      color: black;
    }
    .header-service { font-size: 9px; font-style: italic; margin-bottom: 15px; }
    .title { text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 5px; }
    .subtitle { text-align: center; font-size: 9px; margin-bottom: 3px; }
    .box { border: 1px solid black; padding: 8px; margin: 10px 0; }
    .box-title { font-weight: bold; text-decoration: underline; margin-right: 15px; }
    .section-title { font-size: 9px; font-style: italic; margin: 15px 0 8px 0; }
    .field-row { margin: 8px 0; }
    .underline-field {
      border-bottom: 1px dotted #333;
      padding: 0 8px;
      min-width: 60px;
      display: inline-block;
    }
    .numero-cercle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border: 1px solid black;
      border-radius: 50%;
      font-size: 10px;
      font-weight: bold;
      margin-right: 5px;
    }
    .scissors {
      text-align: center;
      margin: 10px 0;
      border-top: 1px dashed #999;
      position: relative;
    }
    .scissors::before {
      content: "✂";
      position: absolute;
      top: -10px;
      left: 10px;
      background: white;
      padding: 0 5px;
    }
    .signature-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin: 10px 0;
    }
    .signature-block { display: flex; align-items: center; gap: 5px; }
    .signature-line { width: 100px; height: 25px; border-bottom: 1px dotted #333; }
    .signature-img { height: 30px; max-width: 100px; }
    .notes { font-size: 8px; margin: 15px 0; padding-left: 15px; }
    .notes p { margin: 3px 0; text-indent: -15px; }
    .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid black; }
    .footer-badge { border: 1px solid black; padding: 3px 15px; display: inline-block; font-weight: bold; font-size: 10px; }
    .version { font-size: 8px; margin-top: 5px; }
    .encadre-options { border: 1px solid black; padding: 5px 10px; margin: 5px 0; display: inline-block; }
    .opacity-40 { opacity: 0.4; }
    .strike { text-decoration: line-through; }
    sup { font-size: 8px; }
  </style>
</head>
<body>
  <div class="header-service">Continuité de service à l'EIC Paris Nord</div>
  
  <div class="title">DECLARATION INDIVIDUELLE D'INTENTION N°${formData.num_dii || '______'}</div>
  <div class="subtitle">Lois du 21 août 2007 et du 19 mars 2012</div>
  <div class="subtitle">Informations à réceptionner par le service concerné</div>
  
  <div class="box">
    <span class="box-title">Mouvement social :</span>
    <span>Etablissement : </span>
    <span class="underline-field">${etablissementMS}</span>
    <span style="margin-left: 20px;">Préavis : du </span>
    <span class="underline-field">${formatDate(formData.preavis_date_debut)}</span>
    <span> à </span>
    <span class="underline-field">${formData.preavis_heure_debut}</span>
    <span> au </span>
    <span class="underline-field">${formatDate(formData.preavis_date_fin)}</span>
    <span> à </span>
    <span class="underline-field">${formData.preavis_heure_fin}</span>
  </div>
  
  <div class="section-title">Cadre réservé à l'agent</div>
  
  <div class="${!cadre1Actif ? 'opacity-40' : ''}">
    <div class="field-row">
      <span class="numero-cercle">1</span>
      <span>NOM de L'AGENT : </span>
      <span class="underline-field" style="min-width: 120px;">${cadre1Actif ? formData.nom_1 : ''}</span>
      <span style="margin-left: 15px;">PRENOM : </span>
      <span class="underline-field" style="min-width: 100px;">${cadre1Actif ? formData.prenom_1 : ''}</span>
      <span style="margin-left: 15px;">CP : </span>
      <span class="underline-field" style="min-width: 50px;">${cadre1Actif ? formData.cp_1 : ''}</span>
    </div>
    
    <div class="field-row">
      <span>ETABLISSEMENT/ ENTITE : </span>
      <span class="underline-field" style="min-width: 250px;">${cadre1Actif ? etablissement1 : ''}</span>
    </div>
    
    <div class="field-row">
      <span>Déclare avoir l'intention de participer à la grève, à compter du </span>
      <span class="underline-field">${cadre1Actif ? formatDate(formData.date_greve) : ''}</span>
      <span> à </span>
      <span class="underline-field">${cadre1Actif ? formData.heure_greve : ''}</span>
      <sup>(1)</sup>
    </div>
    
    <div class="signature-row">
      <div class="signature-block">
        <span>A </span>
        <span class="underline-field">${cadre1Actif ? lieu1 : ''}</span>
      </div>
      <div class="signature-block">
        <span>Date : </span>
        <span class="underline-field">${cadre1Actif ? formatDate(formData.date_sign_1) : ''}</span>
      </div>
      <div class="signature-block">
        <span>Signature : </span>
        ${cadre1Actif && agent?.signature_url 
          ? `<img src="${agent.signature_url}" class="signature-img" alt="Signature" />`
          : '<span class="signature-line"></span>'}
      </div>
    </div>
  </div>
  
  <div class="scissors"></div>
  
  <div class="${!cadre2Actif ? 'opacity-40' : ''}">
    <div class="field-row">
      <span class="numero-cercle">2</span>
      <span>NOM de L'AGENT : </span>
      <span class="underline-field" style="min-width: 120px;">${cadre2Actif ? formData.nom_2 : ''}</span>
      <span style="margin-left: 15px;">PRENOM : </span>
      <span class="underline-field" style="min-width: 100px;">${cadre2Actif ? formData.prenom_2 : ''}</span>
      <span style="margin-left: 15px;">CP : </span>
      <span class="underline-field" style="min-width: 50px;">${cadre2Actif ? formData.cp_2 : ''}</span>
    </div>
    
    <div class="field-row">
      <span>Déclare, suite à la DII n°</span>
      <span class="underline-field">${cadre2Actif ? formData.num_dii : ''}</span>
      <sup>(2)</sup>
      
      <div class="encadre-options" style="margin-left: 15px;">
        <div>
          <span class="${formData.choix_renonciation === 'reprendre' ? 'strike' : ''}">renoncer à participer à la grève</span>
          <sup>(3)</sup>
        </div>
        <div>
          <span class="${formData.choix_renonciation === 'renoncer' ? 'strike' : ''}">reprendre le travail</span>
          ${cadre2Actif ? cadre2DateHeure : ''}
          <sup>(4)</sup>
        </div>
      </div>
    </div>
    
    <div class="signature-row">
      <div class="signature-block">
        <span>A </span>
        <span class="underline-field">${cadre2Actif ? lieu2 : ''}</span>
      </div>
      <div class="signature-block">
        <span>Date : </span>
        <span class="underline-field">${cadre2Actif ? formatDate(formData.date_sign_2) : ''}</span>
      </div>
      <div class="signature-block">
        <span>Signature : </span>
        ${cadre2Actif && agent?.signature_url 
          ? `<img src="${agent.signature_url}" class="signature-img" alt="Signature" />`
          : '<span class="signature-line"></span>'}
      </div>
    </div>
  </div>
  
  <div class="notes">
    <p>(1) Est passible d'une sanction disciplinaire le salarié qui n'a pas informé son employeur de son intention de participer à la grève au plus tard 48 heures avant la participation à la grève</p>
    <p>(2) Rayer les mentions inutiles</p>
    <p>(3) Est passible d'une sanction disciplinaire le salarié qui n'a pas informé son employeur de son intention de renoncer à participer à la grève au plus tard 24 heures avant l'heure de participation prévue, sauf lorsque la grève n'a pas lieu ou lorsque la prise du service est consécutive à la fin de la grève</p>
    <p>(4) Est passible d'une sanction disciplinaire le salarié qui n'a pas informé son employeur de son intention de reprendre le travail après avoir participé à la grève au plus tard 24 heures avant l'heure de reprise souhaitée, sauf lorsque la reprise du service est consécutive à la fin de la grève</p>
  </div>
  
  <div class="footer">
    <span class="footer-badge">INTERNE SNCF RESEAU</span>
    <div class="version">EIC PN RH00008- Version 01 du 26-10-2017</div>
  </div>
</body>
</html>`;
  };

  // Télécharger en PDF
  const handleDownloadPDF = async () => {
    setSaving(true);
    try {
      const htmlContent = generateFullHTML();
      const container = document.createElement('div');
      container.innerHTML = htmlContent;
      document.body.appendChild(container);
      
      const opt = {
        margin: 10,
        filename: `${generateFileName()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      await html2pdf().set(opt).from(container).save();
      document.body.removeChild(container);
      setSaveSuccess('download');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (error) {
      console.error('Erreur téléchargement PDF:', error);
      alert('Erreur lors du téléchargement');
    }
    setSaving(false);
  };

  // Uploader dans "Mes documents" (PDF)
  const handleUploadMesDocuments = async () => {
    if (!agent?.id) {
      alert('Erreur: agent non identifié');
      return;
    }
    
    setSaving(true);
    try {
      const htmlContent = generateFullHTML();
      const container = document.createElement('div');
      container.innerHTML = htmlContent;
      document.body.appendChild(container);
      
      const opt = {
        margin: 10,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      // Générer le blob PDF
      const pdfBlob = await html2pdf().set(opt).from(container).outputPdf('blob');
      document.body.removeChild(container);
      
      const fileName = `${generateFileName()}.pdf`;
      const filePath = `${agent.id}/${fileName}`;
      
      // Upload vers Supabase Storage
      const { error } = await supabase.storage
        .from('documents')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });
      
      if (error) throw error;
      
      setSaveSuccess('mes-documents');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (error) {
      console.error('Erreur upload mes documents:', error);
      alert('Erreur lors de l\'enregistrement: ' + error.message);
    }
    setSaving(false);
  };

  // Uploader dans "Bibliothèque" (HTML modifiable)
  const handleUploadBibliotheque = async () => {
    setSaving(true);
    try {
      const htmlContent = generateFullHTML();
      const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
      
      const fileName = `${generateFileName()}.html`;
      
      // Upload vers Supabase Storage
      const { error } = await supabase.storage
        .from('bibliotheque')
        .upload(fileName, htmlBlob, {
          contentType: 'text/html',
          upsert: true
        });
      
      if (error) throw error;
      
      setSaveSuccess('bibliotheque');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (error) {
      console.error('Erreur upload bibliothèque:', error);
      alert('Erreur lors de l\'enregistrement: ' + error.message);
    }
    setSaving(false);
  };

  // Ouvrir dans une nouvelle fenêtre pour impression
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(generateFullHTML());
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  // Générer le PDF (aperçu puis impression)
  const handleGenerate = () => {
    if (validateForm()) {
      setShowPreview(true);
    }
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

  // Composant aperçu du formulaire (affichage interne)
  const D2IPreview = () => {
    const etablissementMS = formData.etablissement_ms === 'Texte libre' ? formData.etablissement_ms_libre : formData.etablissement_ms;
    const etablissement1 = formData.etablissement_1 === 'Texte libre' ? formData.etablissement_1_libre : formData.etablissement_1;
    const lieu1 = formData.lieu_1 === 'Texte libre' ? formData.lieu_1_libre : formData.lieu_1;
    const lieu2 = formData.lieu_2 === 'Texte libre' ? formData.lieu_2_libre : formData.lieu_2;

    return (
      <div 
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
          <span className="border-b border-dotted border-black px-2">{etablissementMS}</span>
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
          <div className="flex items-start gap-2 mb-2 flex-wrap">
            <span className="inline-flex items-center justify-center w-5 h-5 border border-black rounded-full text-xs font-bold shrink-0">1</span>
            <span>NOM de L'AGENT : </span>
            <span className="border-b border-dotted border-black px-2 min-w-[120px]">{cadre1Actif ? formData.nom_1 : ''}</span>
            <span className="ml-4">PRENOM : </span>
            <span className="border-b border-dotted border-black px-2 min-w-[100px]">{cadre1Actif ? formData.prenom_1 : ''}</span>
            <span className="ml-4">CP : </span>
            <span className="border-b border-dotted border-black px-2 min-w-[60px]">{cadre1Actif ? formData.cp_1 : ''}</span>
          </div>
          
          <div className="mb-2">
            <span>ETABLISSEMENT/ ENTITE : </span>
            <span className="border-b border-dotted border-black px-2 min-w-[250px]">
              {cadre1Actif ? etablissement1 : ''}
            </span>
          </div>
          
          <div className="mb-2">
            <span>Déclare avoir l'intention de participer à la grève, à compter du </span>
            <span className="border-b border-dotted border-black px-2">{cadre1Actif ? formatDate(formData.date_greve) : ''}</span>
            <span> à </span>
            <span className="border-b border-dotted border-black px-2">{cadre1Actif ? formData.heure_greve : ''}</span>
            <sup className="text-[8px]">(1)</sup>
          </div>
          
          <div className="flex justify-between items-end mt-3 flex-wrap gap-2">
            <div>
              <span>A </span>
              <span className="border-b border-dotted border-black px-2 min-w-[80px]">{cadre1Actif ? lieu1 : ''}</span>
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
                <span className="border-b border-dotted border-black w-[100px] h-6 inline-block"></span>
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
          <div className="flex items-start gap-2 mb-2 flex-wrap">
            <span className="inline-flex items-center justify-center w-5 h-5 border border-black rounded-full text-xs font-bold shrink-0">2</span>
            <span>NOM de L'AGENT : </span>
            <span className="border-b border-dotted border-black px-2 min-w-[120px]">{cadre2Actif ? formData.nom_2 : ''}</span>
            <span className="ml-4">PRENOM : </span>
            <span className="border-b border-dotted border-black px-2 min-w-[100px]">{cadre2Actif ? formData.prenom_2 : ''}</span>
            <span className="ml-4">CP : </span>
            <span className="border-b border-dotted border-black px-2 min-w-[60px]">{cadre2Actif ? formData.cp_2 : ''}</span>
          </div>
          
          <div className="mb-2">
            <span>Déclare, suite à la DII n°</span>
            <span className="border-b border-dotted border-black px-2 mx-1">{cadre2Actif ? formData.num_dii : ''}</span>
            <sup className="text-[8px]">(2)</sup>
            
            <div className="border border-black inline-block p-2 ml-4">
              <div>
                <span className={formData.choix_renonciation === 'reprendre' ? 'line-through' : ''}>
                  renoncer à participer à la grève
                </span>
                <sup className="text-[8px]">(3)</sup>
              </div>
              <div>
                <span className={formData.choix_renonciation === 'renoncer' ? 'line-through' : ''}>
                  reprendre le travail
                </span>
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
                <sup className="text-[8px]">(4)</sup>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-end mt-3 flex-wrap gap-2">
            <div>
              <span>A </span>
              <span className="border-b border-dotted border-black px-2 min-w-[80px]">{cadre2Actif ? lieu2 : ''}</span>
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
                <span className="border-b border-dotted border-black w-[100px] h-6 inline-block"></span>
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
  };

  // Modal d'aperçu avec options d'enregistrement
  if (showPreview) {
    return (
      <div className="fixed inset-0 bg-black/90 flex flex-col z-[70]">
        {/* Header aperçu */}
        <div className="bg-gray-900 p-4 flex items-center justify-between border-b border-gray-700 flex-wrap gap-3">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Aperçu du document D2I
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Bouton Télécharger */}
            <button
              onClick={handleDownloadPDF}
              disabled={saving}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                saveSuccess === 'download' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 
               saveSuccess === 'download' ? <Check className="w-4 h-4" /> : 
               <Download className="w-4 h-4" />}
              <span className="hidden sm:inline">Télécharger PDF</span>
            </button>
            
            {/* Bouton Mes documents */}
            <button
              onClick={handleUploadMesDocuments}
              disabled={saving}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                saveSuccess === 'mes-documents' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-purple-600 hover:bg-purple-500 text-white'
              }`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 
               saveSuccess === 'mes-documents' ? <Check className="w-4 h-4" /> : 
               <FolderOpen className="w-4 h-4" />}
              <span className="hidden sm:inline">Mes documents</span>
            </button>
            
            {/* Bouton Bibliothèque */}
            <button
              onClick={handleUploadBibliotheque}
              disabled={saving}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                saveSuccess === 'bibliotheque' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-orange-600 hover:bg-orange-500 text-white'
              }`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 
               saveSuccess === 'bibliotheque' ? <Check className="w-4 h-4" /> : 
               <Library className="w-4 h-4" />}
              <span className="hidden sm:inline">Bibliothèque</span>
            </button>
            
            {/* Bouton Imprimer */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimer</span>
            </button>
            
            {/* Fermer */}
            <button
              onClick={() => setShowPreview(false)}
              className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Message de succès */}
        {saveSuccess && (
          <div className="bg-green-600 text-white px-4 py-2 text-center text-sm">
            {saveSuccess === 'download' && '✓ PDF téléchargé avec succès'}
            {saveSuccess === 'mes-documents' && '✓ Document enregistré dans "Mes documents"'}
            {saveSuccess === 'bibliotheque' && '✓ Document ajouté à la bibliothèque (modifiable par tous)'}
          </div>
        )}
        
        {/* Contenu aperçu */}
        <div className="flex-1 overflow-auto p-4 bg-gray-600">
          <div className="shadow-2xl">
            <D2IPreview />
          </div>
        </div>
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
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">NOM</label>
                <input
                  type="text"
                  value={formData.nom_1}
                  onChange={(e) => handleChange('nom_1', e.target.value)}
                  disabled={!cadre1Actif}
                  className={`w-full px-3 py-2 rounded-lg border transition-colors ${!cadre1Actif ? 'bg-gray-700/50 border-gray-600 text-gray-500 cursor-not-allowed' : 'bg-gray-800 border-gray-600 text-white focus:border-cyan-500'}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">PRÉNOM</label>
                <input
                  type="text"
                  value={formData.prenom_1}
                  onChange={(e) => handleChange('prenom_1', e.target.value)}
                  disabled={!cadre1Actif}
                  className={`w-full px-3 py-2 rounded-lg border transition-colors ${!cadre1Actif ? 'bg-gray-700/50 border-gray-600 text-gray-500 cursor-not-allowed' : 'bg-gray-800 border-gray-600 text-white focus:border-cyan-500'}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">CP</label>
                <input
                  type="text"
                  value={formData.cp_1}
                  onChange={(e) => handleChange('cp_1', e.target.value)}
                  disabled={!cadre1Actif}
                  placeholder="Code Personnel"
                  className={`w-full px-3 py-2 rounded-lg border transition-colors ${!cadre1Actif ? 'bg-gray-700/50 border-gray-600 text-gray-500 cursor-not-allowed' : 'bg-gray-800 border-gray-600 text-white focus:border-cyan-500'}`}
                />
              </div>
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
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Date participation</label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                  <input
                    type="date"
                    value={formData.date_greve}
                    onChange={(e) => handleChange('date_greve', e.target.value)}
                    disabled={!cadre1Actif}
                    className={`flex-1 px-3 py-2 rounded-lg border transition-colors ${!cadre1Actif ? 'bg-gray-700/50 border-gray-600 text-gray-500 cursor-not-allowed' : 'bg-gray-800 border-gray-600 text-white focus:border-cyan-500'} ${errors.date_greve ? 'border-red-500' : ''}`}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Heure</label>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500 shrink-0" />
                  <input
                    type="time"
                    value={formData.heure_greve}
                    onChange={(e) => handleChange('heure_greve', e.target.value)}
                    disabled={!cadre1Actif}
                    className={`flex-1 px-3 py-2 rounded-lg border transition-colors ${!cadre1Actif ? 'bg-gray-700/50 border-gray-600 text-gray-500 cursor-not-allowed' : 'bg-gray-800 border-gray-600 text-white focus:border-cyan-500'} ${errors.heure_greve ? 'border-red-500' : ''}`}
                  />
                </div>
              </div>
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
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Date signature</label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                  <input
                    type="date"
                    value={formData.date_sign_1}
                    onChange={(e) => handleChange('date_sign_1', e.target.value)}
                    disabled={!cadre1Actif}
                    className={`flex-1 px-3 py-2 rounded-lg border transition-colors ${!cadre1Actif ? 'bg-gray-700/50 border-gray-600 text-gray-500 cursor-not-allowed' : 'bg-gray-800 border-gray-600 text-white focus:border-cyan-500'}`}
                  />
                </div>
              </div>
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
                    <span className="text-yellow-300 text-sm">Pas de signature enregistrée. Ajoutez-la dans "Mon compte".</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cadre 2 - Renonciation/Reprise */}
          <div className={`rounded-lg p-4 border transition-all ${cadre2Actif ? 'bg-orange-500/10 border-orange-500/50' : 'bg-gray-800/30 border-gray-700 opacity-60'}`}>
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setCadre2Actif(!cadre2Actif)} className="flex items-center gap-2">
                {cadre2Actif ? <CheckSquare className="w-6 h-6 text-orange-400" /> : <Square className="w-6 h-6 text-gray-500" />}
              </button>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-sm font-bold text-orange-400">2</span>
                <h3 className="text-lg font-semibold text-white">Renonciation / Reprise du travail</h3>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">NOM</label>
                <input type="text" value={formData.nom_2} disabled={true} className="w-full px-3 py-2 rounded-lg border bg-gray-700/50 border-gray-600 text-gray-400 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">PRÉNOM</label>
                <input type="text" value={formData.prenom_2} disabled={true} className="w-full px-3 py-2 rounded-lg border bg-gray-700/50 border-gray-600 text-gray-400 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">CP</label>
                <input type="text" value={formData.cp_2} disabled={true} className="w-full px-3 py-2 rounded-lg border bg-gray-700/50 border-gray-600 text-gray-400 cursor-not-allowed" />
              </div>
              
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-300 mb-2">Je déclare <span className="text-red-400">*</span></label>
                <div className="flex flex-wrap gap-4">
                  <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${!cadre2Actif ? 'opacity-50 cursor-not-allowed' : ''} ${formData.choix_renonciation === 'renoncer' ? 'bg-orange-500/20 border-orange-500' : 'bg-gray-800 border-gray-600 hover:border-gray-500'}`}>
                    <input type="radio" name="choix_renonciation" value="renoncer" checked={formData.choix_renonciation === 'renoncer'} onChange={(e) => handleChange('choix_renonciation', e.target.value)} disabled={!cadre2Actif} className="w-4 h-4 text-orange-500" />
                    <span className="text-white">Renoncer à participer à la grève</span>
                  </label>
                  <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${!cadre2Actif ? 'opacity-50 cursor-not-allowed' : ''} ${formData.choix_renonciation === 'reprendre' ? 'bg-orange-500/20 border-orange-500' : 'bg-gray-800 border-gray-600 hover:border-gray-500'}`}>
                    <input type="radio" name="choix_renonciation" value="reprendre" checked={formData.choix_renonciation === 'reprendre'} onChange={(e) => handleChange('choix_renonciation', e.target.value)} disabled={!cadre2Actif} className="w-4 h-4 text-orange-500" />
                    <span className="text-white">Reprendre le travail</span>
                  </label>
                </div>
                {errors.choix_renonciation && <p className="text-red-400 text-xs mt-1">{errors.choix_renonciation}</p>}
              </div>
              
              <div className={formData.choix_renonciation !== 'reprendre' ? 'opacity-40' : ''}>
                <label className="block text-sm font-medium text-gray-300 mb-1">À compter du {formData.choix_renonciation === 'reprendre' && <span className="text-red-400">*</span>}</label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                  <input type="date" value={formData.date_reprise} onChange={(e) => handleChange('date_reprise', e.target.value)} disabled={!cadre2Actif || formData.choix_renonciation !== 'reprendre'} className={`flex-1 px-3 py-2 rounded-lg border transition-colors ${!cadre2Actif || formData.choix_renonciation !== 'reprendre' ? 'bg-gray-700/50 border-gray-600 text-gray-500 cursor-not-allowed' : 'bg-gray-800 border-gray-600 text-white focus:border-cyan-500'} ${errors.date_reprise ? 'border-red-500' : ''}`} />
                </div>
                {errors.date_reprise && <p className="text-red-400 text-xs mt-1">{errors.date_reprise}</p>}
              </div>
              
              <div className={formData.choix_renonciation !== 'reprendre' ? 'opacity-40' : ''}>
                <label className="block text-sm font-medium text-gray-300 mb-1">Heure {formData.choix_renonciation === 'reprendre' && <span className="text-red-400">*</span>}</label>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500 shrink-0" />
                  <input type="time" value={formData.heure_reprise} onChange={(e) => handleChange('heure_reprise', e.target.value)} disabled={!cadre2Actif || formData.choix_renonciation !== 'reprendre'} className={`flex-1 px-3 py-2 rounded-lg border transition-colors ${!cadre2Actif || formData.choix_renonciation !== 'reprendre' ? 'bg-gray-700/50 border-gray-600 text-gray-500 cursor-not-allowed' : 'bg-gray-800 border-gray-600 text-white focus:border-cyan-500'} ${errors.heure_reprise ? 'border-red-500' : ''}`} />
                </div>
                {errors.heure_reprise && <p className="text-red-400 text-xs mt-1">{errors.heure_reprise}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Lieu</label>
                <SelectWithFreeText value={formData.lieu_2} freeTextValue={formData.lieu_2_libre} onChange={(v) => handleChange('lieu_2', v)} onFreeTextChange={(v) => handleChange('lieu_2_libre', v)} options={['Paris']} disabled={!cadre2Actif} />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Date signature</label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                  <input type="date" value={formData.date_sign_2} onChange={(e) => handleChange('date_sign_2', e.target.value)} disabled={!cadre2Actif} className={`flex-1 px-3 py-2 rounded-lg border transition-colors ${!cadre2Actif ? 'bg-gray-700/50 border-gray-600 text-gray-500 cursor-not-allowed' : 'bg-gray-800 border-gray-600 text-white focus:border-cyan-500'}`} />
                </div>
              </div>
              
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
                    <span className="text-yellow-300 text-sm">Pas de signature enregistrée.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer avec boutons */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-700 shrink-0 bg-gray-900">
          <button onClick={onClose} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">Annuler</button>
          <button onClick={handleGenerate} className="flex items-center gap-2 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors">
            <Eye className="w-4 h-4" />
            Aperçu & Options
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormulaireD2I;
