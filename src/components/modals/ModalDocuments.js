import React, { useState } from 'react';
import { X, FileText, Download, FolderOpen, ExternalLink, Search, AlertTriangle, Briefcase, Clock, Euro, Flag } from 'lucide-react';

/**
 * ModalDocuments - Centre de téléchargement des documents RH/Admin
 * 
 * Affiche les documents officiels organisés par catégorie
 * avec possibilité de téléchargement direct.
 * 
 * @param {boolean} isOpen - État d'ouverture du modal
 * @param {function} onClose - Callback de fermeture
 */
const ModalDocuments = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Configuration des catégories et documents
  const documentCategories = [
    {
      id: 'accident',
      name: 'Accidents du travail',
      icon: AlertTriangle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      description: 'Déclarations et formulaires AT/MP',
      documents: [
        {
          id: 'guide_at',
          name: 'Guide - Accident du travail',
          description: 'Procédure complète de déclaration AT/trajet (CPR)',
          filename: 'PDF_accident_de_travail.pdf',
          type: 'PDF',
          size: '156 Ko'
        },
        {
          id: 'cerfa',
          name: 'Impression CERFA',
          description: 'Tutoriel remplissage automatique CERFA 14463*03',
          filename: 'Impression_CERFA.pdf',
          type: 'PDF',
          size: '245 Ko'
        },
        {
          id: 'premiere_personne',
          name: 'Déclaration 1ère personne avisée',
          description: 'Formulaire CPR VGR 3278',
          filename: 'Declaration_premiere_personne_avisee.pdf',
          type: 'PDF',
          size: '89 Ko'
        },
        {
          id: 'temoin',
          name: 'Déclaration de témoin',
          description: 'Formulaire CPR VGR 3066',
          filename: 'Declaration_de_temoin.pdf',
          type: 'PDF',
          size: '92 Ko'
        },
        {
          id: 'maladie_pro',
          name: 'Déclaration maladie professionnelle',
          description: 'Formulaire CPR ATOG/VGV 2761',
          filename: 'Declaration_maladie_professionnelle.pdf',
          type: 'PDF',
          size: '134 Ko'
        }
      ]
    },
    {
      id: 'cet',
      name: 'Compte Épargne Temps',
      icon: Clock,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      description: 'Formulaires CET et monétisation',
      documents: [
        {
          id: 'cet_conge',
          name: 'RH0930 - Épargne congés annuels',
          description: 'Intention d\'épargne de congés annuels sur CET',
          filename: 'CET_EPARGNE_CONGE.pdf',
          type: 'PDF',
          size: '78 Ko'
        },
        {
          id: 'cet_rq_rn',
          name: 'RH0930 - Épargne hors congés',
          description: 'Épargne RQ, RS, RN, TC, TY, RG, RCF, Médaille',
          filename: 'CET_EPARGNE_RQ_RN_ETC_HORS_CONGE.pdf',
          type: 'PDF',
          size: '82 Ko'
        },
        {
          id: 'cet_monetisation',
          name: 'RH0930 - Monétisation CET',
          description: 'Demande de monétisation des jours CET',
          filename: 'CET_MONETISATION.pdf',
          type: 'PDF',
          size: '75 Ko'
        },
        {
          id: 'cet_utilisation',
          name: 'Utilisation sous-compte courant',
          description: 'Demande d\'utilisation en temps des jours CET',
          filename: '00012023_demande_d_utilisation_en_temps_des_jours_du_sous_compte_courant.docx',
          type: 'DOCX',
          size: '45 Ko'
        }
      ]
    },
    {
      id: 'greve',
      name: 'Mouvements sociaux',
      icon: Flag,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      description: 'Déclarations individuelles d\'intention',
      documents: [
        {
          id: 'd2i',
          name: 'Imprimé D2I',
          description: 'Déclaration Individuelle d\'Intention (participation grève)',
          filename: 'Imprime_D2I.pdf',
          type: 'PDF',
          size: '68 Ko'
        }
      ]
    },
    {
      id: 'remuneration',
      name: 'Rémunération',
      icon: Euro,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      description: 'Demandes de paiement',
      documents: [
        {
          id: 'paiement_ferie',
          name: 'Paiement jours fériés',
          description: 'Demande de paiement des fêtes sur solde',
          filename: 'PAIEMENT_FERIE.pdf',
          type: 'PDF',
          size: '52 Ko'
        }
      ]
    }
  ];

  // Filtrer les documents
  const filteredCategories = documentCategories
    .filter(cat => selectedCategory === 'all' || cat.id === selectedCategory)
    .map(cat => ({
      ...cat,
      documents: cat.documents.filter(doc => {
        const searchLower = searchTerm.toLowerCase();
        return (
          doc.name.toLowerCase().includes(searchLower) ||
          doc.description.toLowerCase().includes(searchLower)
        );
      })
    }))
    .filter(cat => cat.documents.length > 0);

  // Compter le total de documents
  const totalDocs = documentCategories.reduce((acc, cat) => acc + cat.documents.length, 0);

  // Handler de téléchargement
  const handleDownload = (filename) => {
    // Ouvre le fichier dans un nouvel onglet depuis le dossier public/documents
    window.open(`${process.env.PUBLIC_URL}/documents/${filename}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-cyan-500/30"
        style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.98) 100%)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-cyan-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Documents COGC</h2>
              <p className="text-sm text-gray-400">
                {totalDocs} documents • Formulaires et procédures
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

        {/* Info bandeau */}
        <div className="px-5 py-2 bg-cyan-500/10 border-b border-cyan-500/20 text-sm text-cyan-300">
          📄 Cliquez sur un document pour le télécharger ou l'ouvrir dans un nouvel onglet
        </div>

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
            {documentCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-280px)] p-4">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucun document trouvé</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredCategories.map((category) => {
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
                          className="p-4 hover:bg-gray-700/20 transition-colors cursor-pointer group"
                          onClick={() => handleDownload(doc.filename)}
                        >
                          <div className="flex items-center gap-4">
                            {/* Icon */}
                            <div className={`
                              w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                              ${doc.type === 'PDF' ? 'bg-red-500/20' : 'bg-blue-500/20'}
                            `}>
                              <FileText className={`w-5 h-5 ${doc.type === 'PDF' ? 'text-red-400' : 'text-blue-400'}`} />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-white group-hover:text-cyan-300 transition-colors truncate">
                                {doc.name}
                              </h4>
                              <p className="text-sm text-gray-400 truncate">{doc.description}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className={`
                                  text-xs px-2 py-0.5 rounded font-medium
                                  ${doc.type === 'PDF' ? 'bg-red-500/30 text-red-300' : 'bg-blue-500/30 text-blue-300'}
                                `}>
                                  {doc.type}
                                </span>
                                <span className="text-xs text-gray-500">{doc.size}</span>
                              </div>
                            </div>

                            {/* Download button */}
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                className="p-2 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-lg transition-colors"
                                title="Télécharger"
                              >
                                <Download className="w-4 h-4 text-cyan-400" />
                              </button>
                              <button 
                                className="p-2 bg-gray-500/20 hover:bg-gray-500/30 rounded-lg transition-colors"
                                title="Ouvrir dans un nouvel onglet"
                              >
                                <ExternalLink className="w-4 h-4 text-gray-400" />
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

        {/* Footer */}
        <div className="p-4 border-t border-gray-700/50 flex justify-between items-center">
          <p className="text-xs text-gray-500">
            Documents officiels SNCF Réseau • COGC Paris Nord
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
