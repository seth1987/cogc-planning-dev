/**
 * Composant DocumentSearchCard
 * Affiche les résultats de recherche documentaire dans le chat
 */

import React, { useState } from 'react';
import { FolderOpen, Download, FileText, AlertTriangle, Clock, Flag, Euro, FolderPlus, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const categoryConfig = {
  accidents: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Accidents du travail' },
  cet: { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Compte Épargne Temps' },
  greve: { icon: Flag, color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Mouvements sociaux' },
  remuneration: { icon: Euro, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Rémunération' },
  autre: { icon: FolderPlus, color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Autres documents' },
};

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function DocumentSearchCard({ documents, summary }) {
  const [downloading, setDownloading] = useState(null);

  const handleDownload = async (doc) => {
    setDownloading(doc.id);
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_path, 60);

      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (err) {
      console.error('Erreur téléchargement:', err);
    } finally {
      setDownloading(null);
    }
  };

  if (!documents || documents.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
        <FolderOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500 dark:text-gray-400">
          Aucun document trouvé pour cette recherche.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <FolderOpen className="w-5 h-5" />
          <span className="font-semibold text-sm">Documents trouvés</span>
        </div>
        <span className="bg-white/20 text-white text-xs font-medium px-2 py-1 rounded-full">
          {documents.length} résultat{documents.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Liste des documents */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {documents.map((doc) => {
          const cat = categoryConfig[doc.category] || categoryConfig.autre;
          const CatIcon = cat.icon;

          return (
            <div
              key={doc.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              {/* Icône catégorie */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${cat.bg} flex items-center justify-center`}>
                <CatIcon className={`w-4 h-4 ${cat.color}`} />
              </div>

              {/* Infos document */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {doc.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{cat.label}</span>
                  {doc.file_type && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-600 rounded text-xs text-gray-600 dark:text-gray-300 uppercase">
                      <FileText className="w-3 h-3" />
                      {doc.file_type}
                    </span>
                  )}
                  {doc.file_size > 0 && (
                    <span className="text-xs text-gray-400">{formatFileSize(doc.file_size)}</span>
                  )}
                </div>
              </div>

              {/* Bouton télécharger */}
              <button
                onClick={() => handleDownload(doc)}
                disabled={downloading === doc.id}
                className="flex-shrink-0 p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors disabled:opacity-50"
                title="Télécharger"
              >
                {downloading === doc.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
