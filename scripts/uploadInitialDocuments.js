/**
 * Script d'upload des documents initiaux vers Supabase Storage
 * 
 * Usage: 
 * 1. Place les fichiers dans le dossier ./documents_to_upload/
 * 2. npm install @supabase/supabase-js
 * 3. node scripts/uploadInitialDocuments.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration Supabase
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Variables REACT_APP_SUPABASE_URL et REACT_APP_SUPABASE_ANON_KEY requises');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Documents à uploader avec leurs métadonnées (noms exacts des fichiers)
const documentsToUpload = [
  // Catégorie: Accidents du travail
  {
    localFile: 'PDF accident de travail.pdf',
    name: 'Guide - Accident du travail',
    description: 'Procédure complète de déclaration AT/trajet (CPR)',
    category: 'accidents'
  },
  {
    localFile: 'Impression CERFA.pdf',
    name: 'Impression CERFA',
    description: 'Tutoriel remplissage automatique CERFA 14463*03',
    category: 'accidents'
  },
  {
    localFile: 'Déclaration première personne avisée.pdf',
    name: 'Déclaration 1ère personne avisée',
    description: 'Formulaire CPR VGR 3278',
    category: 'accidents'
  },
  {
    localFile: 'Déclaration de témoin.pdf',
    name: 'Déclaration de témoin',
    description: 'Formulaire CPR VGR 3066',
    category: 'accidents'
  },
  {
    localFile: 'Déclaration maladie professionnelle.pdf',
    name: 'Déclaration maladie professionnelle',
    description: 'Formulaire CPR ATOG/VGV 2761',
    category: 'accidents'
  },
  
  // Catégorie: CET
  {
    localFile: 'CET EPARGNE CONGE.pdf',
    name: 'RH0930 - Épargne congés annuels',
    description: 'Intention d\'épargne de congés annuels sur CET',
    category: 'cet'
  },
  {
    localFile: 'CET EPARGNE RQ RN ETC HORS CONGE.pdf',
    name: 'RH0930 - Épargne hors congés',
    description: 'Épargne RQ, RS, RN, TC, TY, RG, RCF, Médaille',
    category: 'cet'
  },
  {
    localFile: 'CET MONETISATION.pdf',
    name: 'RH0930 - Monétisation CET',
    description: 'Demande de monétisation des jours CET',
    category: 'cet'
  },
  {
    localFile: '00012023_demande_d_utilisation_en_temps_des_jours_du_sous_compte_courant.docx',
    name: 'Utilisation sous-compte courant',
    description: 'Demande d\'utilisation en temps des jours CET',
    category: 'cet'
  },
  
  // Catégorie: Grève
  {
    localFile: 'Imprimé D2I.pdf',
    name: 'Imprimé D2I',
    description: 'Déclaration Individuelle d\'Intention (participation grève)',
    category: 'greve'
  },
  
  // Catégorie: Rémunération
  {
    localFile: 'PAIEMENT FERIE.pdf',
    name: 'Paiement jours fériés',
    description: 'Demande de paiement des fêtes sur solde',
    category: 'remuneration'
  }
];

// Dossier source des fichiers
const UPLOAD_FOLDER = './documents_to_upload';

async function uploadDocument(doc) {
  const filePath = path.join(UPLOAD_FOLDER, doc.localFile);
  
  // Vérifier que le fichier existe
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Fichier non trouvé: ${doc.localFile}`);
    return false;
  }
  
  const fileBuffer = fs.readFileSync(filePath);
  const fileExt = path.extname(doc.localFile).slice(1).toLowerCase();
  const fileSize = fs.statSync(filePath).size;
  
  // Générer le chemin de stockage
  const timestamp = Date.now();
  const sanitizedName = doc.name.replace(/[^a-zA-Z0-9]/g, '_');
  const storagePath = `${doc.category}/${timestamp}_${sanitizedName}.${fileExt}`;
  
  console.log(`📤 Upload: ${doc.name}...`);
  
  try {
    // Upload vers Storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, fileBuffer, {
        contentType: fileExt === 'pdf' 
          ? 'application/pdf' 
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error(`❌ Erreur upload ${doc.name}:`, uploadError.message);
      return false;
    }
    
    // Insérer les métadonnées
    const { error: insertError } = await supabase
      .from('documents')
      .insert({
        name: doc.name,
        description: doc.description,
        category: doc.category,
        file_path: storagePath,
        file_name: doc.localFile,
        file_type: fileExt,
        file_size: fileSize,
        uploaded_by: null // Pas d'utilisateur pour l'import initial
      });
    
    if (insertError) {
      console.error(`❌ Erreur insertion ${doc.name}:`, insertError.message);
      return false;
    }
    
    console.log(`✅ ${doc.name} uploadé avec succès`);
    return true;
    
  } catch (error) {
    console.error(`❌ Erreur ${doc.name}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Upload des documents COGC vers Supabase\n');
  console.log(`📂 Dossier source: ${path.resolve(UPLOAD_FOLDER)}`);
  console.log(`📊 Documents à uploader: ${documentsToUpload.length}\n`);
  
  // Vérifier que le dossier existe
  if (!fs.existsSync(UPLOAD_FOLDER)) {
    console.error(`❌ Le dossier ${UPLOAD_FOLDER} n'existe pas!`);
    console.log(`\n📝 Créez le dossier et placez-y les fichiers suivants:`);
    documentsToUpload.forEach(doc => console.log(`   - ${doc.localFile}`));
    process.exit(1);
  }
  
  let success = 0;
  let failed = 0;
  
  for (const doc of documentsToUpload) {
    const result = await uploadDocument(doc);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }
  
  console.log(`\n📊 Résultat: ${success} réussis, ${failed} échoués`);
  
  if (failed === 0) {
    console.log('🎉 Tous les documents ont été uploadés avec succès!');
  }
}

main().catch(console.error);
