import React, { useState } from 'react';
import { 
  X, HelpCircle, Calendar, Users, AlertTriangle, Briefcase, 
  FileText, ChevronRight, ChevronDown, Upload, Edit3, Phone,
  Mail, MousePointer, Download, ExternalLink, Shield, Clock,
  CheckCircle, Info
} from 'lucide-react';

/**
 * ModalAide - Documentation et aide à l'utilisation de COGC Planning
 * 
 * Guide complet des fonctionnalités de l'application.
 * 
 * @param {boolean} isOpen - État d'ouverture du modal
 * @param {function} onClose - Callback de fermeture
 */
const ModalAide = ({ isOpen, onClose }) => {
  const [expandedSection, setExpandedSection] = useState('bienvenue');

  const toggleSection = (sectionId) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  // Structure de la documentation
  const sections = [
    {
      id: 'bienvenue',
      icon: <Info className="w-5 h-5" />,
      title: 'Bienvenue sur COGC Planning',
      content: (
        <div className="space-y-4">
          <p>
            <strong>COGC Planning</strong> est l'application de gestion des plannings pour les agents 
            du Centre Opérationnel de Gestion des Circulations (COGC) de <strong>Paris Nord</strong> et <strong>Denfert-Rochereau</strong>.
          </p>
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-cyan-400 mb-2">✨ Fonctionnalités principales</h4>
            <ul className="space-y-1 text-sm">
              <li>• Visualisation du planning mensuel de tous les agents</li>
              <li>• Import automatique des bulletins de commande PDF</li>
              <li>• Modification des services et affectations</li>
              <li>• Annuaire téléphonique du COGC</li>
              <li>• Accès rapide aux outils SNCF (Durandal, Cellule RH)</li>
              <li>• Téléchargement des formulaires RH</li>
            </ul>
          </div>
          <p className="text-sm text-gray-400">
            L'application est accessible depuis n'importe quel navigateur web, sur ordinateur, 
            tablette ou smartphone.
          </p>
        </div>
      )
    },
    {
      id: 'planning',
      icon: <Calendar className="w-5 h-5" />,
      title: 'Planning',
      content: (
        <div className="space-y-4">
          <p>
            Le module <strong>Planning</strong> permet de visualiser et gérer les services 
            de tous les agents du COGC.
          </p>
          
          <div className="space-y-3">
            <h4 className="font-semibold text-cyan-400 flex items-center gap-2">
              <MousePointer className="w-4 h-4" /> Navigation
            </h4>
            <ul className="text-sm space-y-2 ml-6">
              <li>• <strong>Onglets mensuels</strong> : Cliquez sur un mois pour afficher le planning correspondant</li>
              <li>• <strong>Sélecteur d'année</strong> : Changez d'année avec les flèches ou le menu déroulant</li>
              <li>• <strong>Défilement horizontal</strong> : Utilisez la molette ou glissez pour voir tous les jours</li>
              <li>• <strong>Colonnes fixes</strong> : Les noms des agents restent visibles lors du défilement</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-cyan-400 flex items-center gap-2">
              <Edit3 className="w-4 h-4" /> Modifier une cellule
            </h4>
            <ul className="text-sm space-y-2 ml-6">
              <li>• <strong>Clic sur une cellule</strong> : Ouvre le panneau d'édition</li>
              <li>• <strong>Code service</strong> : Sélectionnez parmi les codes standards (CRC, ACR, CCU, etc.)</li>
              <li>• <strong>Poste</strong> : Pour les réserves, précisez le poste occupé</li>
              <li>• <strong>Commentaire</strong> : Ajoutez des informations complémentaires</li>
              <li>• <strong>Enregistrer</strong> : Les modifications sont sauvegardées immédiatement</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-cyan-400 flex items-center gap-2">
              <Upload className="w-4 h-4" /> Import de bulletins PDF
            </h4>
            <ul className="text-sm space-y-2 ml-6">
              <li>• <strong>Bouton "Importer PDF"</strong> : En haut à droite du planning</li>
              <li>• <strong>Sélection du fichier</strong> : Choisissez un bulletin de commande SNCF</li>
              <li>• <strong>Analyse automatique</strong> : L'IA extrait les services du document</li>
              <li>• <strong>Validation</strong> : Vérifiez les données avant import</li>
              <li>• <strong>Import</strong> : Les services sont ajoutés au planning de l'agent</li>
            </ul>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-sm">
              <strong className="text-yellow-400">💡 Astuce :</strong> Vous pouvez importer plusieurs 
              bulletins d'un coup en les sélectionnant tous.
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-cyan-400 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Codes services courants
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm ml-6">
              <div><span className="text-cyan-400">CRC001-003</span> : Coordinateur Régional</div>
              <div><span className="text-cyan-400">ACR001-004</span> : Agent Circulation</div>
              <div><span className="text-cyan-400">CCU001-006</span> : Centre Commandement</div>
              <div><span className="text-cyan-400">RP</span> : Repos périodique</div>
              <div><span className="text-cyan-400">CA</span> : Congé annuel</div>
              <div><span className="text-cyan-400">RTT</span> : Jour RTT</div>
              <div><span className="text-cyan-400">FORM</span> : Formation</div>
              <div><span className="text-cyan-400">DISPO</span> : Disponible</div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'annuaire',
      icon: <Users className="w-5 h-5" />,
      title: 'Annuaire',
      content: (
        <div className="space-y-4">
          <p>
            L'<strong>Annuaire</strong> contient les coordonnées de tous les agents du COGC, 
            organisées par groupe de travail.
          </p>

          <div className="space-y-3">
            <h4 className="font-semibold text-cyan-400 flex items-center gap-2">
              <Phone className="w-4 h-4" /> Contacts des groupes
            </h4>
            <p className="text-sm ml-6">
              Chaque groupe (CRC, ACR, CCU, etc.) dispose d'un numéro de téléphone et d'une 
              adresse email générique affichés dans l'en-tête de section.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-cyan-400 flex items-center gap-2">
              <Mail className="w-4 h-4" /> Contacts individuels
            </h4>
            <ul className="text-sm space-y-2 ml-6">
              <li>• <strong>Téléphone</strong> : Cliquez sur un numéro pour appeler directement</li>
              <li>• <strong>Email</strong> : Cliquez sur une adresse pour ouvrir votre messagerie</li>
              <li>• <strong>Recherche</strong> : Tapez un nom, téléphone ou email pour filtrer</li>
              <li>• <strong>Filtre par groupe</strong> : Sélectionnez un groupe spécifique</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-cyan-400 flex items-center gap-2">
              <Edit3 className="w-4 h-4" /> Modifier les coordonnées
            </h4>
            <ul className="text-sm space-y-2 ml-6">
              <li>• <strong>Bouton crayon</strong> : Cliquez sur ✏️ à côté d'un agent ou d'un groupe</li>
              <li>• <strong>Saisie</strong> : Modifiez le téléphone et/ou l'email</li>
              <li>• <strong>Enregistrer</strong> : Cliquez sur 💾 pour sauvegarder</li>
              <li>• <strong>Annuler</strong> : Cliquez sur ✕ pour abandonner</li>
            </ul>
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm">
              <strong className="text-green-400">✅ Bonne nouvelle :</strong> Tous les agents peuvent 
              modifier les coordonnées de l'annuaire, pas seulement les leurs !
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'durandal',
      icon: <AlertTriangle className="w-5 h-5" />,
      title: 'Durandal',
      content: (
        <div className="space-y-4">
          <p>
            <strong>Durandal</strong> est l'application SNCF de gestion des incidents. 
            Le bouton ouvre directement l'interface dans un nouvel onglet.
          </p>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="font-semibold text-cyan-400 mb-2">🔗 Lien direct</h4>
            <code className="text-xs text-gray-400 break-all">
              https://durandal2.sso.reseau.sncf.fr/incidents/index
            </code>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-cyan-400">Fonctionnalités Durandal</h4>
            <ul className="text-sm space-y-1 ml-6">
              <li>• Déclaration d'incidents</li>
              <li>• Suivi des événements en cours</li>
              <li>• Historique des incidents</li>
              <li>• Statistiques et rapports</li>
            </ul>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm">
            <strong className="text-blue-400">ℹ️ Connexion :</strong> Vous serez automatiquement 
            connecté si vous êtes déjà authentifié sur le SSO SNCF.
          </div>
        </div>
      )
    },
    {
      id: 'cellule-rh',
      icon: <Briefcase className="w-5 h-5" />,
      title: 'Cellule RH',
      content: (
        <div className="space-y-4">
          <p>
            La <strong>Cellule RH</strong> est le portail SharePoint pour les demandes 
            administratives et les congés.
          </p>

          <div className="space-y-3">
            <h4 className="font-semibold text-cyan-400">📋 Services disponibles</h4>
            <ul className="text-sm space-y-2 ml-6">
              <li>• <strong>Demandes de congés</strong> : CA, RTT, CET, etc.</li>
              <li>• <strong>Récupérations</strong> : Demandes de récup</li>
              <li>• <strong>Formations</strong> : Inscriptions et suivi</li>
              <li>• <strong>Documents administratifs</strong> : Attestations, fiches de paie</li>
              <li>• <strong>Actualités RH</strong> : Informations et communications</li>
            </ul>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm">
            <strong className="text-blue-400">ℹ️ Connexion :</strong> Le SharePoint nécessite une 
            authentification Microsoft avec votre compte SNCF. Si vous êtes déjà connecté à 
            Office 365, l'accès sera automatique.
          </div>
        </div>
      )
    },
    {
      id: 'documents',
      icon: <FileText className="w-5 h-5" />,
      title: 'Documents',
      content: (
        <div className="space-y-4">
          <p>
            La section <strong>Documents</strong> permet de télécharger les formulaires RH 
            et documents administratifs courants.
          </p>

          <div className="space-y-3">
            <h4 className="font-semibold text-cyan-400 flex items-center gap-2">
              <Download className="w-4 h-4" /> Catégories de documents
            </h4>
            <ul className="text-sm space-y-2 ml-6">
              <li>• <strong>Accidents</strong> : Déclarations AT, formulaires médicaux</li>
              <li>• <strong>CET</strong> : Compte Épargne Temps, monétisation</li>
              <li>• <strong>Grève</strong> : Déclarations, formulaires préavis</li>
              <li>• <strong>Rémunération</strong> : Demandes d'acompte, primes</li>
              <li>• <strong>Autres</strong> : Documents divers</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-cyan-400">💾 Téléchargement</h4>
            <p className="text-sm ml-6">
              Cliquez sur un document pour le télécharger. Les fichiers sont disponibles 
              au format PDF ou Word selon le type de document.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'securite',
      icon: <Shield className="w-5 h-5" />,
      title: 'Sécurité & Confidentialité',
      content: (
        <div className="space-y-4">
          <p>
            COGC Planning respecte les normes de sécurité et de confidentialité des données.
          </p>

          <div className="space-y-3">
            <h4 className="font-semibold text-cyan-400">🔒 Protection des données</h4>
            <ul className="text-sm space-y-2 ml-6">
              <li>• <strong>Hébergement sécurisé</strong> : Base de données Supabase (PostgreSQL)</li>
              <li>• <strong>Connexion chiffrée</strong> : HTTPS sur toutes les communications</li>
              <li>• <strong>Authentification</strong> : Accès contrôlé par email SNCF</li>
              <li>• <strong>Données personnelles</strong> : Limitées au strict nécessaire professionnel</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-cyan-400">👤 Vos droits</h4>
            <p className="text-sm ml-6">
              Conformément au RGPD, vous pouvez demander l'accès, la rectification ou la 
              suppression de vos données personnelles en contactant l'administrateur.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'contact',
      icon: <HelpCircle className="w-5 h-5" />,
      title: 'Besoin d\'aide ?',
      content: (
        <div className="space-y-4">
          <p>
            Si vous rencontrez un problème ou avez une suggestion, plusieurs options s'offrent à vous :
          </p>

          <div className="space-y-3">
            <h4 className="font-semibold text-cyan-400">📧 Contact</h4>
            <ul className="text-sm space-y-2 ml-6">
              <li>• <strong>Problème technique</strong> : Contactez l'administrateur de l'application</li>
              <li>• <strong>Question planning</strong> : Adressez-vous à votre responsable de groupe</li>
              <li>• <strong>Suggestion</strong> : Vos retours sont les bienvenus pour améliorer l'outil</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-cyan-400 flex items-center gap-2">
              <ExternalLink className="w-4 h-4" /> Ressources
            </h4>
            <ul className="text-sm space-y-2 ml-6">
              <li>
                • <strong>Code source</strong> : 
                <a 
                  href="https://github.com/seth1987/cogc-planning-dev" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 ml-1"
                >
                  GitHub
                </a>
              </li>
              <li>
                • <strong>Signaler un bug</strong> : 
                <a 
                  href="https://github.com/seth1987/cogc-planning-dev/issues" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 ml-1"
                >
                  Issues GitHub
                </a>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-4 mt-4">
            <p className="text-sm text-center">
              <span className="text-cyan-400 font-semibold">COGC Planning</span> est développé 
              pour faciliter le quotidien des agents du COGC.<br/>
              <span className="text-gray-400">Version 2.8 • © 2025</span>
            </p>
          </div>
        </div>
      )
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-cyan-500/30"
        style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.98) 100%)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-cyan-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Aide & Documentation</h2>
              <p className="text-sm text-gray-400">
                Guide d'utilisation de COGC Planning
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

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-4">
          <div className="space-y-2">
            {sections.map((section) => (
              <div 
                key={section.id}
                className="bg-gray-800/30 rounded-lg overflow-hidden border border-gray-700/50"
              >
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-700/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                      {section.icon}
                    </div>
                    <span className="font-semibold text-white">{section.title}</span>
                  </div>
                  {expandedSection === section.id ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {/* Section Content */}
                {expandedSection === section.id && (
                  <div className="px-4 pb-4 text-gray-300 border-t border-gray-700/50 pt-4">
                    {section.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalAide;
