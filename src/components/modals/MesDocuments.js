import React, { useState, useRef, useCallback } from 'react';
import { 
  Upload, Trash2, Image, CheckCircle, AlertCircle, Loader2,
  PenTool, RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

/**
 * MesDocuments - Gestion des documents personnels de l'agent
 * 
 * Fonctionnalités :
 * - Upload/modification de la signature
 * - Affichage de la signature actuelle
 * - Suppression de la signature
 * 
 * @param {object} agent - Infos de l'agent connecté
 * @param {function} onAgentUpdate - Callback pour mettre à jour l'agent après modification
 */
const MesDocuments = ({ agent, onAgentUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef(null);

  // Afficher une notification temporaire
  const showNotification = useCallback((type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  }, []);

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
          upsert: true // Écraser si existe
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

  // Handler de suppression
  const handleDeleteSignature = async () => {
    if (!window.confirm('Supprimer votre signature ?')) return;

    try {
      setDeleting(true);

      // Supprimer du storage
      const filePath = `${agent.id}.png`;
      const { error: storageError } = await supabase.storage
        .from('signatures')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Mettre à jour la table agents
      const { error: updateError } = await supabase
        .from('agents')
        .update({ signature_url: null })
        .eq('id', agent.id);

      if (updateError) throw updateError;

      // Notifier le parent
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
            {/* Aperçu */}
            <div className="bg-white rounded-lg p-4 flex items-center justify-center">
              <img 
                src={agent.signature_url} 
                alt="Votre signature" 
                className="max-h-24 max-w-full"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Modifier
              </button>
              
              <button
                onClick={handleDeleteSignature}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600/80 hover:bg-red-500 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Supprimer
              </button>
            </div>

            <p className="text-xs text-green-400 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Signature enregistrée et prête à l'emploi
            </p>
          </div>
        ) : (
          /* Zone d'upload */
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
                <p className="text-gray-300 mb-2">
                  Glissez-déposez votre signature ici
                </p>
                <p className="text-gray-500 text-sm mb-4">
                  ou cliquez pour sélectionner un fichier
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span className="text-cyan-400 text-sm font-medium">
                    PNG, JPEG ou WebP (max 1 Mo)
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Input file caché */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Conseils */}
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <h4 className="text-sm font-medium text-blue-300 mb-2">💡 Conseils pour une bonne signature</h4>
          <ul className="text-xs text-blue-200/80 space-y-1">
            <li>• Utilisez un fond transparent (PNG) pour un meilleur rendu</li>
            <li>• Signez sur fond blanc puis scannez ou photographiez</li>
            <li>• La signature doit être lisible et de bonne qualité</li>
          </ul>
        </div>
      </div>

      {/* Infos agent */}
      <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Informations pré-remplies</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500 block">Nom</span>
            <span className="text-white font-medium">{agent?.nom || '-'}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Prénom</span>
            <span className="text-white font-medium">{agent?.prenom || '-'}</span>
          </div>
          <div>
            <span className="text-gray-500 block">CP</span>
            <span className="text-white font-medium">{agent?.cp || <span className="text-yellow-400">Non renseigné</span>}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Email</span>
            <span className="text-white font-medium text-xs">{agent?.email || '-'}</span>
          </div>
        </div>
        
        {!agent?.cp && (
          <p className="text-xs text-yellow-400 mt-3 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            Le Code Personnel (CP) n'est pas renseigné. Contactez l'administrateur.
          </p>
        )}
      </div>
    </div>
  );
};

export default MesDocuments;
