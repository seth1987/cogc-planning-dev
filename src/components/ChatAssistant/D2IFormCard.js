/**
 * Composant D2IFormCard
 * Formulaire D2I inline dans le chat avec pré-remplissage
 */

import React, { useState, useMemo } from 'react';
import { Flag, Download, Save, ChevronDown, ChevronUp, Loader2, Check, Pen } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { supabase } from '../../lib/supabaseClient';
import { generateD2IHTML } from './d2iHtmlGenerator';

export default function D2IFormCard({ d2iParams = {}, agent }) {
  const today = new Date().toISOString().split('T')[0];
  const cadreType = d2iParams.cadre_type || 'participation';
  const isReprise = cadreType === 'reprise' || cadreType === 'renonciation';

  const [cadre1Actif, setCadre1Actif] = useState(cadreType === 'participation');
  const [cadre2Actif, setCadre2Actif] = useState(isReprise);
  const [cadre2Open, setCadre2Open] = useState(isReprise);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(null);

  const [formData, setFormData] = useState({
    num_dii: '',
    etablissement_ms: 'EIC Paris Nord',
    preavis_date_debut: d2iParams.preavis_date_debut || '',
    preavis_heure_debut: d2iParams.preavis_heure_debut || '',
    preavis_date_fin: d2iParams.preavis_date_fin || '',
    preavis_heure_fin: d2iParams.preavis_heure_fin || '',
    nom_1: agent?.nom || '',
    prenom_1: agent?.prenom || '',
    cp_1: agent?.cp || '',
    etablissement_1: 'EIC Paris Nord',
    date_greve: d2iParams.date_greve || '',
    heure_greve: d2iParams.heure_greve || '',
    lieu_1: 'Paris',
    date_sign_1: today,
    nom_2: agent?.nom || '',
    prenom_2: agent?.prenom || '',
    cp_2: agent?.cp || '',
    choix_renonciation: cadreType === 'reprise' ? 'reprendre' : cadreType === 'renonciation' ? 'renoncer' : '',
    date_reprise: d2iParams.date_reprise || '',
    heure_reprise: d2iParams.heure_reprise || '',
    lieu_2: 'Paris',
    date_sign_2: today,
  });

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Compter les champs pré-remplis
  const prefilledCount = useMemo(() => {
    let count = 0;
    if (d2iParams.preavis_date_debut) count++;
    if (d2iParams.preavis_heure_debut) count++;
    if (d2iParams.preavis_date_fin) count++;
    if (d2iParams.preavis_heure_fin) count++;
    if (d2iParams.date_greve) count++;
    if (d2iParams.heure_greve) count++;
    return count;
  }, [d2iParams]);

  const handleDownloadPDF = async () => {
    setSaving(true);
    setSaveSuccess(null);
    try {
      const htmlContent = generateD2IHTML(formData, cadre1Actif, cadre2Actif, agent);
      const container = document.createElement('div');
      container.innerHTML = htmlContent;
      document.body.appendChild(container);

      await html2pdf().set({
        margin: 10,
        filename: `D2I_${formData.nom_1 || 'document'}_${formData.preavis_date_debut || today}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(container).save();

      document.body.removeChild(container);
      setSaveSuccess('download');
    } catch (err) {
      console.error('Erreur génération PDF:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBibliotheque = async () => {
    setSaving(true);
    setSaveSuccess(null);
    try {
      const htmlContent = generateD2IHTML(formData, cadre1Actif, cadre2Actif, agent);
      const baseName = `preavis_${formData.preavis_date_debut || new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}`;

      const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
      const jsonData = {
        formData,
        cadre1Actif,
        cadre2Actif,
        agentId: agent?.id,
        createdAt: new Date().toISOString(),
      };
      const jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });

      const { error: htmlError } = await supabase.storage
        .from('bibliotheque')
        .upload(`${baseName}.html`, htmlBlob, { contentType: 'text/html', upsert: true });

      if (htmlError) throw htmlError;

      await supabase.storage
        .from('bibliotheque')
        .upload(`${baseName}.json`, jsonBlob, { contentType: 'application/json', upsert: true });

      setSaveSuccess('saved');
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-2 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-orange-400 focus:border-orange-400 outline-none';
  const labelClass = 'text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <Flag className="w-5 h-5" />
          <span className="font-semibold text-sm">Formulaire D2I</span>
        </div>
        {prefilledCount > 0 && (
          <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
            {prefilledCount} champ{prefilledCount > 1 ? 's' : ''} pré-rempli{prefilledCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Section Mouvement Social */}
        <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
          <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-3 flex items-center gap-1">
            <Pen className="w-3 h-3" /> Mouvement social
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Préavis du</label>
              <input type="date" value={formData.preavis_date_debut} onChange={e => updateField('preavis_date_debut', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Heure début</label>
              <input type="time" value={formData.preavis_heure_debut} onChange={e => updateField('preavis_heure_debut', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Au</label>
              <input type="date" value={formData.preavis_date_fin} onChange={e => updateField('preavis_date_fin', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Heure fin</label>
              <input type="time" value={formData.preavis_heure_fin} onChange={e => updateField('preavis_heure_fin', e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Cadre 1 - Participation */}
        <div className={`border rounded-lg p-3 transition-opacity ${cadre1Actif ? 'border-orange-300 dark:border-orange-600' : 'border-gray-200 dark:border-gray-600 opacity-50'}`}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase flex items-center gap-1">
              <span className="inline-flex items-center justify-center w-4 h-4 border border-gray-500 rounded-full text-[10px] font-bold">1</span>
              Participation à la grève
            </h4>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={cadre1Actif}
                onChange={e => setCadre1Actif(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
              />
              <span className="text-xs text-gray-500">Actif</span>
            </label>
          </div>

          {cadre1Actif && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={labelClass}>Nom</label>
                  <input type="text" value={formData.nom_1} onChange={e => updateField('nom_1', e.target.value)} className={`${inputClass} bg-gray-50 dark:bg-gray-600`} readOnly={!!agent?.nom} />
                </div>
                <div>
                  <label className={labelClass}>Prénom</label>
                  <input type="text" value={formData.prenom_1} onChange={e => updateField('prenom_1', e.target.value)} className={`${inputClass} bg-gray-50 dark:bg-gray-600`} readOnly={!!agent?.prenom} />
                </div>
                <div>
                  <label className={labelClass}>CP</label>
                  <input type="text" value={formData.cp_1} onChange={e => updateField('cp_1', e.target.value)} className={`${inputClass} bg-gray-50 dark:bg-gray-600`} readOnly={!!agent?.cp} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Date de grève</label>
                  <input type="date" value={formData.date_greve} onChange={e => updateField('date_greve', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Heure</label>
                  <input type="time" value={formData.heure_greve} onChange={e => updateField('heure_greve', e.target.value)} className={inputClass} />
                </div>
              </div>

              {/* Signature */}
              {agent?.signature_url && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-gray-500">Signature :</span>
                  <img src={agent.signature_url} alt="Signature" className="h-6 max-w-[80px] object-contain" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cadre 2 - Renonciation/Reprise (collapsible) */}
        <div className={`border rounded-lg overflow-hidden transition-opacity ${cadre2Actif ? 'border-orange-300 dark:border-orange-600' : 'border-gray-200 dark:border-gray-600 opacity-50'}`}>
          <button
            onClick={() => setCadre2Open(!cadre2Open)}
            className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase flex items-center gap-1">
              <span className="inline-flex items-center justify-center w-4 h-4 border border-gray-500 rounded-full text-[10px] font-bold">2</span>
              Renonciation / Reprise
            </h4>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer" onClick={e => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={cadre2Actif}
                  onChange={e => { setCadre2Actif(e.target.checked); if (e.target.checked) setCadre2Open(true); }}
                  className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                />
                <span className="text-xs text-gray-500">Actif</span>
              </label>
              {cadre2Open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </div>
          </button>

          {cadre2Open && cadre2Actif && (
            <div className="px-3 pb-3 space-y-3">
              <div>
                <label className={labelClass}>N° DII de référence</label>
                <input type="text" value={formData.num_dii} onChange={e => updateField('num_dii', e.target.value)} className={inputClass} placeholder="Numéro DII initial" />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="choix_renonciation"
                    value="renoncer"
                    checked={formData.choix_renonciation === 'renoncer'}
                    onChange={e => updateField('choix_renonciation', e.target.value)}
                    className="text-orange-500 focus:ring-orange-400"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Renoncer</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="choix_renonciation"
                    value="reprendre"
                    checked={formData.choix_renonciation === 'reprendre'}
                    onChange={e => updateField('choix_renonciation', e.target.value)}
                    className="text-orange-500 focus:ring-orange-400"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Reprendre le travail</span>
                </label>
              </div>

              {formData.choix_renonciation === 'reprendre' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Date de reprise</label>
                    <input type="date" value={formData.date_reprise} onChange={e => updateField('date_reprise', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Heure</label>
                    <input type="time" value={formData.heure_reprise} onChange={e => updateField('heure_reprise', e.target.value)} className={inputClass} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Barre d'actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleDownloadPDF}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {saving && saveSuccess === null ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saveSuccess === 'download' ? (
              <Check className="w-4 h-4" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {saveSuccess === 'download' ? 'Téléchargé !' : 'Télécharger PDF'}
          </button>
          <button
            onClick={handleSaveBibliotheque}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {saveSuccess === 'saved' ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saveSuccess === 'saved' ? 'Sauvegardé !' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
}
