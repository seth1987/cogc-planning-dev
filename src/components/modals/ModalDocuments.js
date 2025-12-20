import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, FileText, Download, FolderOpen, Search, AlertTriangle, 
  Clock, Euro, Flag, Upload, Trash2, Plus, Loader2, CheckCircle,
  AlertCircle, FolderPlus, FileSignature, User, Library, PenTool,
  RefreshCw, Edit3, ExternalLink, Calendar
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import FormulaireD2I from './FormulaireD2I';
import MesDocuments from './MesDocuments';

/**
 * ModalDocuments - Centre de documents RH/Admin avec Supabase Storage
 * 
 * Fonctionnalités :
 * - Onglet Bibliothèque : Documents par catégorie, upload, recherche
 * - Onglet Générer : Formulaires pré-remplis (D2I, etc.) + modèles de la bibliothèque
 * - Onglet Mon compte : Gestion signature personnelle + mes documents
 * 
 * @param {boolean} isOpen - État d'ouverture du modal
 * @param {function} onClose - Callback de fermeture
 */
const ModalDocuments = ({ isOpen, onClose }) => {
  // États principaux
  const [activeTab, setActiveTab] = useState('library'); // 'library', 'generate', 'myaccount'
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [notification, setNotification] = useState(null);
  
  // État agent connecté
  const [currentAgent, setCurrentAgent] = useState(null);
  const [loadingAgent, setLoadingAgent] = useState(true);
  
  // État formulaire D2I
  const [showD2IForm, setShowD2IForm] = useState(false);
  
  // États pour la bibliothèque de modèles
  const [bibliothequeModeles, setBibliothequeModeles] = useState([]);
  const [loadingBiblio, setLoadingBiblio] = useState(true);
  
  // État pour l'éditeur de modèle
  const [editingModele, setEditingModele] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  
  // Upload form state
  const [uploadData, setUploadData] = useState({
    name: '',
    description: '',
    category: 'accidents',
    file: null
  });
  
  const fileInputRef = useRef(null);

  // Configuration des onglets - Bibliothèque en premier
  const tabs = [
    { id: 'library', name: 'Bibliothèque', icon: Library },
    { id: 'generate', name: 'Générer', icon: FileSignature },
    { id: 'myaccount', name: 'Mon compte', icon: User }
  ];

  // Configuration des catégories
  const categories = [
    {
      id: 'accidents',
      name: 'Accidents du travail',
      icon: AlertTriangle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      description: 'Déclarations et formulaires AT/MP'
    },
    {
      id: 'cet',
      name: 'Compte Épargne Temps',
      icon: Clock,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      description: 'Formulaires CET et monétisation'
    },
    {
      id: 'greve',
      name: 'Mouvements sociaux',
      icon: Flag,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      description: 'Déclarations individuelles d\'intention'
    },
    {
      id: 'remuneration',
      name: 'Rémunération',
      icon: Euro,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      description: 'Demandes de paiement'
    },
    {
      id: 'autre',
      name: 'Autres documents',
      icon: FolderPlus,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      description: 'Documents divers'
    }
  ];

  // Documents disponibles à la génération
  const generableDocuments = [
    {
      id: 'd2i',
      name: 'D2I - Déclaration Individuelle d\'Intention',
      description: 'Créer un nouveau formulaire de grève (participation, renonciation, reprise)',
      icon: Flag,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20'
    }
    // Futurs documents à ajouter ici
  ];

  // Afficher une notification temporaire
  const showNotification = useCallback((type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // Charger l'agent connecté
  const loadCurrentAgent = useCallback(async () => {
    try {
      setLoadingAgent(true);
      
      // Récupérer l'utilisateur connecté
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.warn('Utilisateur non connecté');
        return;
      }

      // Chercher l'agent correspondant par email
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('email', user.email)
        .single();

      if (agentError) {
        // Peut-être que l'email ne correspond pas, essayer par user_id
        const { data: agentById, error: agentByIdError } = await supabase
          .from('agents')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (!agentByIdError && agentById) {
          setCurrentAgent(agentById);
        }
      } else {
        setCurrentAgent(agent);
      }
    } catch (error) {
      console.error('Erreur chargement agent:', error);
    } finally {
      setLoadingAgent(false);
    }
  }, []);

  // Charger les documents depuis Supabase
  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Erreur chargement documents:', error);
      showNotification('error', 'Erreur lors du chargement des documents');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  // Charger les modèles de la bibliothèque
  const loadBibliothequeModeles = useCallback(async () => {
    try {
      setLoadingBiblio(true);
      const { data, error } = await supabase.storage
        .from('bibliotheque')
        .list('', {
          sortBy: { column: 'created_at', order: 'desc' }
        });
      
      if (error) throw error;
      
      // Ajouter les URLs publiques et filtrer les fichiers HTML
      const modeles = (data || []).map(file => ({
        ...file,
        url: supabase.storage.from('bibliotheque').getPublicUrl(file.name).data.publicUrl,
        path: file.name,
        isHtml: file.name.endsWith('.html')
      }));
      
      setBibliothequeModeles(modeles);
    } catch (error) {
      console.error('Erreur chargement bibliothèque:', error);
    } finally {
      setLoadingBiblio(false);
    }
  }, []);

  // Charger au montage
  useEffect(() => {
    if (isOpen) {
      loadDocuments();
      loadCurrentAgent();
      loadBibliothequeModeles();
    }
  }, [isOpen, loadDocuments, loadCurrentAgent, loadBibliothequeModeles]);

  // Callback mise à jour agent (après upload signature)
  const handleAgentUpdate = (updatedAgent) => {
    setCurrentAgent(updatedAgent);
    showNotification('success', 'Profil mis à jour');
  };

  // Formater la taille du fichier
  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
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

  // Handler d'upload
  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!uploadData.file || !uploadData.name) {
      showNotification('error', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress('Préparation...');

      const file = uploadData.file;
      const fileExt = file.name.split('.').pop().toLowerCase();
      
      // Vérifier le type de fichier
      if (!['pdf', 'docx'].includes(fileExt)) {
        throw new Error('Seuls les fichiers PDF et DOCX sont autorisés');
      }

      // Générer un nom unique pour le fichier
      const timestamp = Date.now();
      const sanitizedName = uploadData.name.replace(/[^a-zA-Z0-9]/g, '_');
      const storagePath = `${uploadData.category}/${timestamp}_${sanitizedName}.${fileExt}`;

      setUploadProgress('Upload en cours...');

      // Upload vers Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      setUploadProgress('Enregistrement...');

      // Récupérer l'utilisateur connecté
      const { data: { user } } = await supabase.auth.getUser();

      // Insérer les métadonnées dans la table
      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          name: uploadData.name,
          description: uploadData.description || null,
          category: uploadData.category,
          file_path: storagePath,
          file_name: file.name,
          file_type: fileExt,
          file_size: file.size,
          uploaded_by: user?.id || null
        });

      if (insertError) throw insertError;

      // Réinitialiser et rafraîchir
      setUploadData({ name: '', description: '', category: 'accidents', file: null });
      setShowUploadForm(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      await loadDocuments();
      showNotification('success', 'Document uploadé avec succès !');

    } catch (error) {
      console.error('Erreur upload:', error);
      showNotification('error', error.message || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  // Handler de téléchargement
  const handleDownload = async (doc) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_path, 60); // URL valide 60 secondes

      if (error) throw error;
      
      // Ouvrir dans un nouvel onglet
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      showNotification('error', 'Erreur lors du téléchargement');
    }
  };

  // Handler de suppression
  const handleDelete = async (doc) => {
    if (!window.confirm(`Supprimer "${doc.name}" ?`)) return;

    try {
      // Supprimer du storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      // Supprimer de la table
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      await loadDocuments();
      showNotification('success', 'Document supprimé');
    } catch (error) {
      console.error('Erreur suppression:', error);
      showNotification('error', 'Erreur lors de la suppression');
    }
  };

  // Supprimer un modèle de la bibliothèque
  const handleDeleteModele = async (modele) => {
    if (!window.confirm(`Supprimer le modèle "${modele.name}" ?`)) return;
    
    try {
      const { error } = await supabase.storage
        .from('bibliotheque')
        .remove([modele.path]);
      
      if (error) throw error;
      
      showNotification('success', 'Modèle supprimé');
      loadBibliothequeModeles();
    } catch (error) {
      console.error('Erreur suppression modèle:', error);
      showNotification('error', 'Erreur lors de la suppression');
    }
  };

  // Ouvrir l'éditeur pour un modèle de la bibliothèque
  const handleEditModele = async (modele) => {
    try {
      const response = await fetch(modele.url);
      const content = await response.text();
      setEditContent(content);
      setEditingModele(modele);
    } catch (error) {
      console.error('Erreur chargement modèle:', error);
      showNotification('error', 'Erreur lors du chargement');
    }
  };

  // Sauvegarder les modifications d'un modèle
  const handleSaveModele = async () => {
    if (!editingModele) return;
    
    try {
      setSavingEdit(true);
      
      const htmlBlob = new Blob([editContent], { type: 'text/html' });
      
      const { error } = await supabase.storage
        .from('bibliotheque')
        .upload(editingModele.path, htmlBlob, {
          contentType: 'text/html',
          upsert: true
        });
      
      if (error) throw error;
      
      showNotification('success', 'Modèle modifié avec succès');
      setEditingModele(null);
      setEditContent('');
      loadBibliothequeModeles();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      showNotification('error', 'Erreur lors de la sauvegarde');
    } finally {
      setSavingEdit(false);
    }
  };

  // Ouvrir un modèle en lecture
  const handleViewModele = (url) => {
    window.open(url, '_blank');
  };

  // Filtrer les documents par catégorie et recherche
  const getFilteredDocuments = () => {
    return documents.filter(doc => {
      const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
      const matchesSearch = searchTerm === '' || 
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  };

  // Grouper par catégorie pour l'affichage
  const getGroupedDocuments = () => {
    const filtered = getFilteredDocuments();
    const grouped = {};
    
    categories.forEach(cat => {
      const catDocs = filtered.filter(doc => doc.category === cat.id);
      if (catDocs.length > 0) {
        grouped[cat.id] = {
          ...cat,
          documents: catDocs
        };
      }
    });
    
    return grouped;
  };

  // Handler ouverture formulaire D2I
  const handleOpenD2I = () => {
    if (!currentAgent) {
      showNotification('error', 'Vous devez être connecté pour générer un document');
      return;
    }
    setShowD2IForm(true);
  };

  if (!isOpen) return null;

  // Si le formulaire D2I est ouvert, l'afficher en plein écran
  if (showD2IForm) {
    return (
      <FormulaireD2I 
        agent={currentAgent}
        onClose={() => setShowD2IForm(false)}
      />
    );
  }

  // Si l'éditeur de modèle est ouvert
  if (editingModele) {
    return (
      <div className="fixed inset-0 bg-black/90 flex flex-col z-[80]">
        {/* Header éditeur */}
        <div className="bg-gray-900 p-4 flex items-center justify-between border-b border-gray-700">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-orange-400" />
            Modifier : {editingModele.name}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveModele}
              disabled={savingEdit}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg"
            >
              {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Enregistrer
            </button>
            <button
              onClick={() => { setEditingModele(null); setEditContent(''); }}
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

  const groupedDocs = getGroupedDocuments();
  const totalDocs = documents.length;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-cyan-500/30"
        style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.98) 100%)'
        }}
      >
        {/* Notification */}
        {notification && (
          <div className={`
            absolute top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2
            ${notification.type === 'success' ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}
          `}>
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-cyan-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Documents COGC</h2>
              <p className="text-sm text-gray-400">
                {activeTab === 'library' && `${totalDocs} document${totalDocs !== 1 ? 's' : ''} • Formulaires et procédures`}
                {activeTab === 'generate' && 'Générer un document pré-rempli'}
                {activeTab === 'myaccount' && 'Gérer votre signature et documents'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="flex border-b border-gray-700/50">
          {tabs.map(tab => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium transition-colors
                  ${activeTab === tab.id 
                    ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/10' 
                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/30'}
                `}
              >
                <IconComponent className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* ==================== ONGLET BIBLIOTHÈQUE ==================== */}
        {activeTab === 'library' && (
          <>
            {/* Bouton Ajouter */}
            <div className="p-3 border-b border-gray-700/50 flex justify-end">
              <button 
                onClick={() => setShowUploadForm(!showUploadForm)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
                  ${showUploadForm 
                    ? 'bg-gray-700 text-gray-300' 
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white'}
                `}
              >
                {showUploadForm ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {showUploadForm ? 'Annuler' : 'Ajouter'}
              </button>
            </div>

            {/* Upload Form */}
            {showUploadForm && (
              <div className="p-4 bg-cyan-500/10 border-b border-cyan-500/30">
                <form onSubmit={handleUpload} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Nom du document *
                      </label>
                      <input
                        type="text"
                        value={uploadData.name}
                        onChange={(e) => setUploadData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: Formulaire absence"
                        className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Catégorie *
                      </label>
                      <select
                        value={uploadData.category}
                        onChange={(e) => setUploadData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                      >
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Description (optionnel)
                    </label>
                    <input
                      type="text"
                      value={uploadData.description}
                      onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brève description du document"
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Fichier (PDF ou DOCX) *
                      </label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={(e) => setUploadData(prev => ({ ...prev, file: e.target.files[0] }))}
                        className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white file:mr-4 file:py-1 file:px-4 file:rounded file:border-0 file:bg-cyan-600 file:text-white file:cursor-pointer"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={uploading}
                      className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors mt-6"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {uploadProgress}
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Uploader
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Search & Filter */}
            <div className="p-4 border-b border-gray-700/50 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Rechercher un document..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500/50"
              >
                <option value="all">Toutes les catégories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Documents Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-380px)] p-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                  <span className="ml-3 text-gray-400">Chargement...</span>
                </div>
              ) : Object.keys(groupedDocs).length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun document trouvé</p>
                  {totalDocs === 0 && (
                    <button 
                      onClick={() => setShowUploadForm(true)}
                      className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
                    >
                      Ajouter le premier document
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.values(groupedDocs).map((category) => {
                    const IconComponent = category.icon;
                    return (
                      <div 
                        key={category.id} 
                        className="bg-gray-800/30 rounded-lg overflow-hidden border border-gray-700/50"
                      >
                        {/* Category Header */}
                        <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/30 px-4 py-3 border-b border-gray-700/50">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${category.bgColor}`}>
                              <IconComponent className={`w-4 h-4 ${category.color}`} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-white">{category.name}</h3>
                              <p className="text-xs text-gray-400">{category.description}</p>
                            </div>
                            <span className="ml-auto text-xs bg-gray-700/50 text-gray-400 px-2 py-1 rounded">
                              {category.documents.length} doc{category.documents.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        {/* Documents List */}
                        <div className="divide-y divide-gray-700/30">
                          {category.documents.map((doc) => (
                            <div 
                              key={doc.id}
                              className="p-4 hover:bg-gray-700/20 transition-colors group"
                            >
                              <div className="flex items-center gap-4">
                                {/* Icon */}
                                <div className={`
                                  w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer
                                  ${doc.file_type === 'pdf' ? 'bg-red-500/20' : 'bg-blue-500/20'}
                                `}
                                  onClick={() => handleDownload(doc)}
                                >
                                  <FileText className={`w-5 h-5 ${doc.file_type === 'pdf' ? 'text-red-400' : 'text-blue-400'}`} />
                                </div>

                                {/* Info */}
                                <div 
                                  className="flex-1 min-w-0 cursor-pointer"
                                  onClick={() => handleDownload(doc)}
                                >
                                  <h4 className="font-medium text-white group-hover:text-cyan-300 transition-colors truncate">
                                    {doc.name}
                                  </h4>
                                  {doc.description && (
                                    <p className="text-sm text-gray-400 truncate">{doc.description}</p>
                                  )}
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className={`
                                      text-xs px-2 py-0.5 rounded font-medium uppercase
                                      ${doc.file_type === 'pdf' ? 'bg-red-500/30 text-red-300' : 'bg-blue-500/30 text-blue-300'}
                                    `}>
                                      {doc.file_type}
                                    </span>
                                    <span className="text-xs text-gray-500">{formatFileSize(doc.file_size)}</span>
                                    <span className="text-xs text-gray-600">
                                      {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                                    </span>
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => handleDownload(doc)}
                                    className="p-2 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-lg transition-colors"
                                    title="Télécharger"
                                  >
                                    <Download className="w-4 h-4 text-cyan-400" />
                                  </button>
                                  <button 
                                    onClick={() => handleDelete(doc)}
                                    className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-400" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ==================== ONGLET GÉNÉRER ==================== */}
        {activeTab === 'generate' && (
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-2">Générer un document pré-rempli</h3>
              <p className="text-gray-400 text-sm">
                Sélectionnez un formulaire ci-dessous. Vos informations personnelles seront automatiquement intégrées.
              </p>
            </div>

            {loadingAgent ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                <span className="ml-3 text-gray-400">Chargement du profil...</span>
              </div>
            ) : !currentAgent ? (
              <div className="text-center py-10 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-yellow-400" />
                <p className="text-yellow-300 font-medium">Profil agent non trouvé</p>
                <p className="text-gray-400 text-sm mt-1">
                  Votre email ne correspond à aucun agent enregistré.<br />
                  Contactez l'administrateur.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Info agent */}
                <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                  <div className="flex items-center gap-3 text-sm">
                    <User className="w-5 h-5 text-cyan-400" />
                    <span className="text-gray-400">Connecté en tant que :</span>
                    <span className="text-white font-medium">
                      {currentAgent.prenom} {currentAgent.nom}
                    </span>
                    {currentAgent.signature_url ? (
                      <span className="ml-auto flex items-center gap-1 text-green-400 text-xs">
                        <CheckCircle className="w-4 h-4" />
                        Signature OK
                      </span>
                    ) : (
                      <span className="ml-auto flex items-center gap-1 text-yellow-400 text-xs">
                        <AlertCircle className="w-4 h-4" />
                        Pas de signature
                      </span>
                    )}
                  </div>
                </div>

                {/* Section : Créer un nouveau document */}
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Créer un nouveau document
                  </h4>
                  <div className="grid gap-4">
                    {generableDocuments.map(doc => {
                      const IconComponent = doc.icon;
                      return (
                        <button
                          key={doc.id}
                          onClick={handleOpenD2I}
                          className="w-full text-left p-5 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg border border-gray-700/50 hover:border-cyan-500/50 transition-all group"
                        >
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-lg ${doc.bgColor} group-hover:scale-110 transition-transform`}>
                              <IconComponent className={`w-6 h-6 ${doc.color}`} />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-white group-hover:text-cyan-300 transition-colors">
                                {doc.name}
                              </h4>
                              <p className="text-sm text-gray-400 mt-1">{doc.description}</p>
                            </div>
                            <div className="text-cyan-400 group-hover:translate-x-1 transition-transform">
                              →
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section : Modèles de la bibliothèque */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                      <Library className="w-4 h-4" />
                      Modèles enregistrés ({bibliothequeModeles.length})
                    </h4>
                    <button
                      onClick={loadBibliothequeModeles}
                      className="p-1 hover:bg-gray-700 rounded transition-colors"
                      title="Actualiser"
                    >
                      <RefreshCw className={`w-4 h-4 text-gray-500 ${loadingBiblio ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {loadingBiblio ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                    </div>
                  ) : bibliothequeModeles.length === 0 ? (
                    <div className="text-center py-8 bg-gray-800/30 rounded-lg border border-gray-700/50">
                      <Library className="w-10 h-10 mx-auto mb-2 text-gray-600" />
                      <p className="text-gray-500 text-sm">Aucun modèle enregistré</p>
                      <p className="text-gray-600 text-xs mt-1">
                        Générez un D2I et sauvegardez-le dans la Bibliothèque
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {bibliothequeModeles.map((modele) => (
                        <div 
                          key={modele.name}
                          className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:border-orange-500/30 transition-colors group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-2 rounded-lg ${modele.isHtml ? 'bg-orange-500/20' : 'bg-red-500/20'}`}>
                              <FileText className={`w-5 h-5 ${modele.isHtml ? 'text-orange-400' : 'text-red-400'}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-white font-medium truncate">{modele.name}</p>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(modele.created_at)}
                                </span>
                                <span>{formatFileSize(modele.metadata?.size)}</span>
                                {modele.isHtml && (
                                  <span className="text-orange-400">Modifiable</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleViewModele(modele.url)}
                              className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                              title="Voir"
                            >
                              <ExternalLink className="w-4 h-4 text-gray-400" />
                            </button>
                            {modele.isHtml && (
                              <button
                                onClick={() => handleEditModele(modele)}
                                className="p-2 hover:bg-orange-500/20 rounded-lg transition-colors"
                                title="Modifier"
                              >
                                <Edit3 className="w-4 h-4 text-orange-400" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteModele(modele)}
                              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Info supplémentaire */}
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <PenTool className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-blue-300 font-medium">Astuce</p>
                      <p className="text-blue-200/80 mt-1">
                        Importez votre signature dans l'onglet "Mon compte" pour qu'elle soit automatiquement ajoutée à vos documents.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== ONGLET MON COMPTE ==================== */}
        {activeTab === 'myaccount' && (
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {loadingAgent ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                <span className="ml-3 text-gray-400">Chargement du profil...</span>
              </div>
            ) : !currentAgent ? (
              <div className="text-center py-10 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-yellow-400" />
                <p className="text-yellow-300 font-medium">Profil agent non trouvé</p>
                <p className="text-gray-400 text-sm mt-1">
                  Votre email ne correspond à aucun agent enregistré.<br />
                  Contactez l'administrateur.
                </p>
              </div>
            ) : (
              <MesDocuments 
                agent={currentAgent}
                onAgentUpdate={handleAgentUpdate}
              />
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-gray-700/50 flex justify-between items-center">
          <p className="text-xs text-gray-500">
            Documents SNCF Réseau • COGC Paris Nord • Stockage Supabase
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalDocuments;
