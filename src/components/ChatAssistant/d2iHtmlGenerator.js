/**
 * Générateur HTML pour formulaires D2I
 * Utilitaire partagé entre D2IFormCard (chat) et FormulaireD2I (modal)
 */

/**
 * Formate une date YYYY-MM-DD en DD/MM/YYYY
 */
function formatDateFR(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Génère le HTML complet du formulaire D2I au format A4
 * @param {Object} formData - Données du formulaire
 * @param {boolean} cadre1Actif - Cadre 1 (participation) actif
 * @param {boolean} cadre2Actif - Cadre 2 (renonciation/reprise) actif
 * @param {Object} agent - Profil agent { nom, prenom, cp, signature_url }
 * @returns {string} HTML complet du document
 */
export function generateD2IHTML(formData, cadre1Actif, cadre2Actif, agent) {
  const etablissementMS = formData.etablissement_ms || 'EIC Paris Nord';
  const etablissement1 = formData.etablissement_1 || 'EIC Paris Nord';
  const lieu1 = formData.lieu_1 || 'Paris';
  const lieu2 = formData.lieu_2 || 'Paris';

  const cadre2DateHeure = formData.choix_renonciation === 'reprendre'
    ? `, à compter du <span class="underline-field">${formatDateFR(formData.date_reprise)}</span> à <span class="underline-field">${formData.heure_reprise || ''}</span>`
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
      content: "\\2702";
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
    <span class="underline-field">${formatDateFR(formData.preavis_date_debut)}</span>
    <span> à </span>
    <span class="underline-field">${formData.preavis_heure_debut || ''}</span>
    <span> au </span>
    <span class="underline-field">${formatDateFR(formData.preavis_date_fin)}</span>
    <span> à </span>
    <span class="underline-field">${formData.preavis_heure_fin || ''}</span>
  </div>

  <div class="section-title">Cadre réservé à l'agent</div>

  <div class="${!cadre1Actif ? 'opacity-40' : ''}">
    <div class="field-row">
      <span class="numero-cercle">1</span>
      <span>NOM de L'AGENT : </span>
      <span class="underline-field" style="min-width: 120px;">${cadre1Actif ? (formData.nom_1 || '') : ''}</span>
      <span style="margin-left: 15px;">PRENOM : </span>
      <span class="underline-field" style="min-width: 100px;">${cadre1Actif ? (formData.prenom_1 || '') : ''}</span>
      <span style="margin-left: 15px;">CP : </span>
      <span class="underline-field" style="min-width: 50px;">${cadre1Actif ? (formData.cp_1 || '') : ''}</span>
    </div>

    <div class="field-row">
      <span>ETABLISSEMENT/ ENTITE : </span>
      <span class="underline-field" style="min-width: 250px;">${cadre1Actif ? etablissement1 : ''}</span>
    </div>

    <div class="field-row">
      <span>Déclare avoir l'intention de participer à la grève, à compter du </span>
      <span class="underline-field">${cadre1Actif ? formatDateFR(formData.date_greve) : ''}</span>
      <span> à </span>
      <span class="underline-field">${cadre1Actif ? (formData.heure_greve || '') : ''}</span>
      <sup>(1)</sup>
    </div>

    <div class="signature-row">
      <div class="signature-block">
        <span>A </span>
        <span class="underline-field">${cadre1Actif ? lieu1 : ''}</span>
      </div>
      <div class="signature-block">
        <span>Date : </span>
        <span class="underline-field">${cadre1Actif ? formatDateFR(formData.date_sign_1) : ''}</span>
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
      <span class="underline-field" style="min-width: 120px;">${cadre2Actif ? (formData.nom_2 || '') : ''}</span>
      <span style="margin-left: 15px;">PRENOM : </span>
      <span class="underline-field" style="min-width: 100px;">${cadre2Actif ? (formData.prenom_2 || '') : ''}</span>
      <span style="margin-left: 15px;">CP : </span>
      <span class="underline-field" style="min-width: 50px;">${cadre2Actif ? (formData.cp_2 || '') : ''}</span>
    </div>

    <div class="field-row">
      <span>Déclare, suite à la DII n°</span>
      <span class="underline-field">${cadre2Actif ? (formData.num_dii || '') : ''}</span>
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
        <span class="underline-field">${cadre2Actif ? formatDateFR(formData.date_sign_2) : ''}</span>
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
}
