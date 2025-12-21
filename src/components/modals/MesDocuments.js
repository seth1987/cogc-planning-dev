import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Upload, Trash2, Image, CheckCircle, AlertCircle, Loader2,
  PenTool, RefreshCw, FileText, Download, Eye, Library, 
  FolderOpen, Calendar, ExternalLink, Edit3, X, Plus, Printer
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

/**
 * MesDocuments - Gestion des documents personnels de l'agent
 * 
 * Fonctionnalités :
 * - Upload/modification de la signature
 * - Upload de documents personnels
 * - Liste des documents personnels (bucket documents/{agent_id}/)
 * - Liste des documents partagés (bucket bibliotheque/)
 * - Consultation et téléchargement
 * - Édition des documents HTML de la bibliothèque
 * - Aperçu et impression des documents
 * 
 * @param {object} agent - Infos de l'agent connecté
 * @param {function} onAgentUpdate - Callback pour mettre à jour l'agent après modification
 */
const MesDocuments = ({ agent, onAgentUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  
  // États pour les listes de documents
  const [mesDocuments, setMesDocuments] = useState([]);
  const [bibliotheque, setBibliotheque] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [loadingBiblio, setLoadingBiblio] = useState(true);
  
  // État pour l'éditeur HTML
  const [editingDoc, setEditingDoc] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  
  // État pour l'aperçu du document
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewContent, setPreviewContent] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);
  const previewIframeRef = useRef(null);

  // Afficher une notification temporaire
  const showNotification = useCallback((type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // Charger les documents personnels
  const loadMesDocuments = useCallback(async () => {
    if (!agent?.id) return;
    
    try {
      setLoadingDocs(true);
      const { data, error } = await supabase.storage
        .from('documents')
        .list(agent.id, {
          sortBy: { column: 'created_at', order: 'desc' }
        });
      
      if (error) throw error;
      
      // Ajouter les URLs publiques
      const docsWithUrls = (data || []).map(file => ({
        ...file,
        url: supabase.storage.from('documents').getPublicUrl(`${agent.id}/${file.name}`).data.publicUrl,
        path: `${agent.id}/${file.name}`
      }));
      
      setMesDocuments(docsWithUrls);
    } catch (error) {
      console.error('Erreur chargement documents:', error);
    } finally {
      setLoadingDocs(false);
    }
  }, [agent?.id]);

  // Charger la bibliothèque (uniquement les fichiers HTML, pas les JSON)
  const loadBibliotheque = useCallback(async () => {
    try {
      setLoadingBiblio(true);
      const { data, error } = await supabase.storage
        .from('bibliotheque')
        .list('', {
          sortBy: { column: 'created_at', order: 'desc' }
        });
      
      if (error) throw error;
      
      // Filtrer uniquement les fichiers HTML (les JSON sont des données techniques)
      // et ajouter les URLs publiques
      const docsWithUrls = (data || [])
        .filter(file => file.name.endsWith('.html'))
        .map(file => ({
          ...file,
          url: supabase.storage.from('bibliotheque').getPublicUrl(file.name).data.publicUrl,
          path: file.name,
          isHtml: true
        }));
      
      setBibliotheque(docsWithUrls);
    } catch (error) {
      console.error('Erreur chargement bibliothèque:', error);
    } finally {
      setLoadingBiblio(false);
    }
  }, []);

  // Charger les documents au montage
  useEffect(() => {
    loadMesDocuments();
    loadBibliotheque();
  }, [loadMesDocuments, loadBibliotheque]);

  // Upload d'un document personnel
  const handleDocumentUpload = async (file) => {
    if (!file || !agent?.id) return;

    // Vérifier la taille (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showNotification('error', 'Fichier trop volumineux (max 10 Mo)');
      return;
    }

    try {
      setUploadingDoc(true);

      const filePath = `${agent.id}/${file.name}`;

      // Upload vers Supabase Storage
      const { error } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      showNotification('success', `Document "${file.name}" uploadé avec succès !`);
      loadMesDocuments();

    } catch (error) {
      console.error('Erreur upload document:', error);
      showNotification('error', error.message || 'Erreur lors de l\'upload');
    } finally {
      setUploadingDoc(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  // Handler pour le changement de fichier document
  const handleDocFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleDocumentUpload(e.target.files[0]);
    }
  };

  // Supprimer un document personnel
  const handleDeleteDocument = async (path, bucket = 'documents') => {
    if (!window.confirm('Supprimer ce document ?')) return;
    
    try {
      // Si c'est un fichier HTML de la bibliothèque, supprimer aussi le JSON associé
      if (bucket === 'bibliotheque' && path.endsWith('.html')) {
        const jsonPath = path.replace('.html', '.json');
        // Supprimer le JSON (ignorer les erreurs s'il n'existe pas)
        await supabase.storage.from(bucket).remove([jsonPath]);
      }
      
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);
      
      if (error) throw error;
      
      showNotification('success', 'Document supprimé');
      
      if (bucket === 'documents') {
        loadMesDocuments();
      } else {
        loadBibliotheque();
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
      showNotification('error', 'Erreur lors de la suppression');
    }
  };

  // Ouvrir un document pour visualisation (documents non-HTML)
  const handleViewDocument = (url) => {
    window.open(url, '_blank');
  };

  // Ouvrir l'aperçu d'un document HTML
  const handlePreviewDocument = async (doc) => {
    try {
      setLoadingPreview(true);
      setPreviewDoc(doc);
      
      const response = await fetch(doc.url);
      const content = await response.text();
      setPreviewContent(content);
    } catch (error) {
      console.error('Erreur chargement aperçu:', error);
      showNotification('error', 'Erreur lors du chargement de l\'aperçu');
      setPreviewDoc(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Imprimer le document depuis l'aperçu
  const handlePrintPreview = () => {
    if (previewIframeRef.current) {
      previewIframeRef.current.contentWindow.print();
    }
  };

  // Télécharger un document
  const handleDownloadDocument = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      showNotification('error', 'Erreur lors du téléchargement');
    }
  };

  // Ouvrir l'éditeur HTML pour un document de la bibliothèque
  const handleEditBiblioDocument = async (doc) => {
    try {
      const response = await fetch(doc.url);
      const content = await response.text();
      setEditContent(content);
      setEditingDoc(doc);
    } catch (error) {
      console.error('Erreur chargement document:', error);
      showNotification('error', 'Erreur lors du chargement');
    }
  };

  // Sauvegarder les modifications d'un document HTML
  const handleSaveEdit = async () => {
    if (!editingDoc) return;
    
    try {
      setSavingEdit(true);
      
      const htmlBlob = new Blob([editContent], { type: 'text/html' });
      
      const { error } = await supabase.storage
        .from('bibliotheque')
        .upload(editingDoc.path, htmlBlob, {
          contentType: 'text/html',
          upsert: true
        });
      
      if (error) throw error;
      
      showNotification('success', 'Document modifié avec succès');
      setEditingDoc(null);
      setEditContent('');
      loadBibliotheque();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      showNotification('error', 'Erreur lors de la sauvegarde');
    } finally {
      setSavingEdit(false);
    }
  };

  // Formater la date
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Formater la taille
  const formatSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
  };

  // Handler d'upload de signature
  const handleSignatureUpload = async (file) => {
    if (!file) return;

    // Vérifier le type de fichier
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showNotification('error', 'Format non supporté. Utilisez PNG, JPEG ou WebP.');
      return;
    }

    // Vérifier la taille (max 1MB)
    if (file.size > 1024 * 1024) {
      showNotification('error', 'Fichier trop volumineux (max 1 Mo)');
      return;
    }

    try {
      setUploading(true);

      // Supprimer l'ancienne signature si elle existe
      if (agent?.signature_url) {
        const oldPath = `${agent.id}.png`;
        await supabase.storage.from('signatures').remove([oldPath]);
      }

      // Nom du fichier = ID de l'agent
      const filePath = `${agent.id}.png`;

      // Upload vers Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('signatures')
        .getPublicUrl(filePath);

      // Mettre à jour la table agents
      const { error: updateError } = await supabase
        .from('agents')
        .update({ signature_url: publicUrl })
        .eq('id', agent.id);

      if (updateError) throw updateError;

      // Notifier le parent pour mettre à jour l'agent
      if (onAgentUpdate) {
        onAgentUpdate({ ...agent, signature_url: publicUrl });
      }

      showNotification('success', 'Signature enregistrée avec succès !');

    } catch (error) {
      console.error('Erreur upload signature:', error);
      showNotification('error', error.message || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handler de suppression signature
  const handleDeleteSignature = async () => {
    if (!window.confirm('Supprimer votre signature ?')) return;

    try {
      setDeleting(true);

      const filePath = `${agent.id}.png`;
      const { error: storageError } = await supabase.storage
        .from('signatures')
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: updateError } = await supabase
        .from('agents')
        .update({ signature_url: null })
        .eq('id', agent.id);

      if (updateError) throw updateError;

      if (onAgentUpdate) {
        onAgentUpdate({ ...agent, signature_url: null });
      }

      showNotification('success', 'Signature supprimée');

    } catch (error) {
      console.error('Erreur suppression signature:', error);
      showNotification('error', 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  // Handlers drag & drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSignatureUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleSignatureUpload(e.target.files[0]);
    }
  };

  // Modal aperçu document
  if (previewDoc) {
    return (
      <div className="fixed inset-0 bg-black/90 flex flex-col z-[80]">
        {/* Header aperçu */}
        <div className="bg-gray-900 p-4 flex items-center justify-between border-b border-gray-700">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-cyan-400" />
            Aperçu : {previewDoc.name}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintPreview}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg"
            >
              <Printer className="w-4 h-4" />
              Imprimer
            </button>
            <button
              onClick={() => { setPreviewDoc(null); setPreviewContent(''); }}
              className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Contenu aperçu */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
          {loadingPreview ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
              <p className="text-gray-300">Chargement...</p>
            </div>
          ) : (
            <iframe
              ref={previewIframeRef}
              srcDoc={previewContent}
              className="w-full max-w-4xl h-full bg-white rounded-lg shadow-2xl"
              title="Aperçu document"
            />
          )}
        </div>
      </div>
    );
  }

  // Modal éditeur HTML
  if (editingDoc) {
    return (
      <div className="fixed inset-0 bg-black/90 flex flex-col z-[80]">
        {/* Header éditeur */}
        <div className="bg-gray-900 p-4 flex items-center justify-between border-b border-gray-700">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-orange-400" />
            Modifier : {editingDoc.name}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg"
            >
              {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Enregistrer
            </button>
            <button
              onClick={() => { setEditingDoc(null); setEditContent(''); }}
              className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Éditeur */}
        <div className="flex-1 flex">
          {/* Code HTML */}
          <div className="w-1/2 flex flex-col border-r border-gray-700">
            <div className="bg-gray-800 px-4 py-2 text-sm text-gray-400 border-b border-gray-700">
              Code HTML
            </div>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="flex-1 p-4 bg-gray-950 text-gray-200 font-mono text-sm resize-none focus:outline-none"
              spellCheck={false}
            />
          </div>
          
          {/* Aperçu */}
          <div className="w-1/2 flex flex-col">
            <div className="bg-gray-800 px-4 py-2 text-sm text-gray-400 border-b border-gray-700">
              Aperçu
            </div>
            <iframe
              srcDoc={editContent}
              className="flex-1 bg-white"
              title="Aperçu document"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`
          px-4 py-3 rounded-lg flex items-center gap-2
          ${notification.type === 'success' 
            ? 'bg-green-500/20 border border-green-500/50 text-green-300' 
            : 'bg-red-500/20 border border-red-500/50 text-red-300'}
        `}>
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Section Signature */}
      <div className="bg-gray-800/50 rounded-lg p-5 border border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <PenTool className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Ma signature</h3>
            <p className="text-sm text-gray-400">
              Utilisée pour pré-remplir automatiquement vos documents
            </p>
          </div>
        </div>

        {/* Affichage signature actuelle */}
        {agent?.signature_url ? (
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 flex items-center justify-center">
              <img 
                src={agent.signature_url} 
                alt="Votre signature" 
                className="max-h-24 max-w-full"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Modifier
              </button>
              
              <button
                onClick={handleDeleteSignature}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600/80 hover:bg-red-500 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Supprimer
              </button>
            </div>

            <p className="text-xs text-green-400 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Signature enregistrée et prête à l'emploi
            </p>
          </div>
        ) : (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
              ${dragActive 
                ? 'border-cyan-400 bg-cyan-500/10' 
                : 'border-gray-600 hover:border-gray-500 bg-gray-800/30'}
            `}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
                <p className="text-gray-300">Upload en cours...</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-700/50 flex items-center justify-center">
                  <Image className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-300 mb-2">Glissez-déposez votre signature ici</p>
                <p className="text-gray-500 text-sm mb-4">ou cliquez pour sélectionner un fichier</p>
                <div className="flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span className="text-cyan-400 text-sm font-medium">PNG, JPEG ou WebP (max 1 Mo)</span>
                </div>
              </>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Section Mes Documents */}
      <div className="bg-gray-800/50 rounded-lg p-5 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Mes documents</h3>
              <p className="text-sm text-gray-400">Documents personnels</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Bouton + pour ajouter un document */}
            <button
              onClick={() => docInputRef.current?.click()}
              disabled={uploadingDoc}
              className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              title="Ajouter un document"
            >
              {uploadingDoc ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span className="hidden sm:inline text-sm">Ajouter</span>
            </button>
            <button
              onClick={loadMesDocuments}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Actualiser"
            >
              <RefreshCw className={`w-4 h-4 text-gray-400 ${loadingDocs ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Input file caché pour upload de documents */}
        <input
          ref={docInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
          onChange={handleDocFileChange}
          className="hidden"
        />

        {loadingDocs ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        ) : mesDocuments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aucun document</p>
            <p className="text-xs mt-1">Cliquez sur + pour ajouter un document</p>
          </div>
        ) : (
          <div className="space-y-2">
            {mesDocuments.map((doc) => (
              <div 
                key={doc.name}
                className="p-3 bg-gray-800 rounded-lg hover:bg-gray-700/80 transition-colors"
              >
                {/* Ligne 1: Icône + Nom */}
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-5 h-5 text-red-400 shrink-0" />
                  <p className="text-white font-medium truncate text-sm flex-1">{doc.name}</p>
                </div>
                
                {/* Ligne 2: Métadonnées + Boutons */}
                <div className="flex items-center justify-between gap-2">
                  {/* Métadonnées */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 min-w-0">
                    <span className="flex items-center gap-1 shrink-0">
                      <Calendar className="w-3 h-3" />
                      <span className="hidden xs:inline">{formatDate(doc.created_at)}</span>
                      <span className="xs:hidden">{new Date(doc.created_at).toLocaleDateString('fr-FR')}</span>
                    </span>
                    <span className="shrink-0">{formatSize(doc.metadata?.size)}</span>
                  </div>
                  
                  {/* Boutons d'action */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => handleViewDocument(doc.url)}
                      className="p-1.5 hover:bg-gray-600 rounded transition-colors"
                      title="Voir"
                    >
                      <Eye className="w-4 h-4 text-gray-400" />
                    </button>
                    <button
                      onClick={() => handleDownloadDocument(doc.url, doc.name)}
                      className="p-1.5 hover:bg-gray-600 rounded transition-colors"
                      title="Télécharger"
                    >
                      <Download className="w-4 h-4 text-cyan-400" />
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(doc.path, 'documents')}
                      className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section Bibliothèque */}
      <div className="bg-gray-800/50 rounded-lg p-5 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Library className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Bibliothèque</h3>
              <p className="text-sm text-gray-400">Documents partagés modifiables par tous</p>
            </div>
          </div>
          <button
            onClick={loadBibliotheque}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${loadingBiblio ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loadingBiblio ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        ) : bibliotheque.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Library className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Bibliothèque vide</p>
            <p className="text-xs mt-1">Ajoutez des documents depuis le formulaire D2I</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bibliotheque.map((doc) => (
              <div 
                key={doc.name}
                className="p-3 bg-gray-800 rounded-lg hover:bg-gray-700/80 transition-colors"
              >
                {/* Ligne 1: Icône + Nom */}
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-5 h-5 shrink-0 text-orange-400" />
                  <p className="text-white font-medium truncate text-sm flex-1">{doc.name}</p>
                </div>
                
                {/* Ligne 2: Métadonnées */}
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <span className="flex items-center gap-1 shrink-0">
                    <Calendar className="w-3 h-3" />
                    <span className="hidden xs:inline">{formatDate(doc.created_at)}</span>
                    <span className="xs:hidden">{new Date(doc.created_at).toLocaleDateString('fr-FR')}</span>
                  </span>
                  <span className="shrink-0">{formatSize(doc.metadata?.size)}</span>
                  <span className="text-orange-400 font-medium shrink-0">HTML modifiable</span>
                </div>
                
                {/* Ligne 3: Boutons d'action */}
                <div className="flex items-center justify-end gap-0.5">
                  <button
                    onClick={() => handlePreviewDocument(doc)}
                    className="p-1.5 hover:bg-cyan-500/20 rounded transition-colors"
                    title="Aperçu & Imprimer"
                  >
                    <Eye className="w-4 h-4 text-cyan-400" />
                  </button>
                  <button
                    onClick={() => handleEditBiblioDocument(doc)}
                    className="p-1.5 hover:bg-orange-500/20 rounded transition-colors"
                    title="Modifier"
                  >
                    <Edit3 className="w-4 h-4 text-orange-400" />
                  </button>
                  <button
                    onClick={() => handleDownloadDocument(doc.url, doc.name)}
                    className="p-1.5 hover:bg-gray-600 rounded transition-colors"
                    title="Télécharger"
                  >
                    <Download className="w-4 h-4 text-cyan-400" />
                  </button>
                  <button
                    onClick={() => handleDeleteDocument(doc.path, 'bibliotheque')}
                    className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
          <h4 className="text-sm font-medium text-orange-300 mb-1">📚 À propos de la bibliothèque</h4>
          <p className="text-xs text-orange-200/70">
            Les documents HTML de la bibliothèque sont modifiables par tous les agents. 
            Cliquez sur <Eye className="w-3 h-3 inline text-cyan-400" /> pour voir et imprimer, 
            ou sur <Edit3 className="w-3 h-3 inline" /> pour éditer.
          </p>
        </div>
      </div>

      {/* Infos agent - Layout responsive avec email sur ligne complète sur mobile */}
      <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50 overflow-hidden">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Informations pré-remplies</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div className="min-w-0">
            <span className="text-gray-500 block text-xs">Nom</span>
            <span className="text-white font-medium">{agent?.nom || '-'}</span>
          </div>
          <div className="min-w-0">
            <span className="text-gray-500 block text-xs">Prénom</span>
            <span className="text-white font-medium">{agent?.prenom || '-'}</span>
          </div>
          <div className="min-w-0">
            <span className="text-gray-500 block text-xs">CP</span>
            <span className="text-white font-medium">{agent?.cp || <span className="text-yellow-400 text-xs">Non renseigné</span>}</span>
          </div>
          {/* Email sur toute la largeur sur mobile */}
          <div className="min-w-0 col-span-2 sm:col-span-1 overflow-hidden">
            <span className="text-gray-500 block text-xs">Email</span>
            <span 
              className="text-white font-medium text-xs block break-all" 
              title={agent?.email}
            >
              {agent?.email || '-'}
            </span>
          </div>
        </div>
        
        {!agent?.cp && (
          <p className="text-xs text-yellow-400 mt-3 flex items-center gap-1">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Le Code Personnel (CP) n'est pas renseigné. Contactez l'administrateur.</span>
          </p>
        )}
      </div>
    </div>
  );
};

export default MesDocuments;
