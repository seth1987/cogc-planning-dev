import React, { useState } from 'react';
import { 
  X, HelpCircle, Calendar, Users, AlertTriangle, Briefcase, 
  FileText, ChevronRight, ChevronDown, Upload, Edit3, Phone,
  Mail, MousePointer, Download, ExternalLink, Shield, Clock,
  CheckCircle, Info, BarChart3, User, StickyNote
} from 'lucide-react';

/**
 * ModalAide - Documentation et aide à l'utilisation de COGC Planning
 * 
 * Guide complet des fonctionnalités de l'application.
 * Version 2.9 - Décembre 2025
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
            <h4 className="font-semibold text-cyan-400 mb-3">🏠 Page d'accueil - 8 boutons</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span><strong>Planning</strong> : Planning complet de tous les agents</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-400" />
                <span><strong>Mon Planning</strong> : Votre calendrier personnel</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span><strong>Statistiques</strong> : Compteurs et postes supp.</span>
              </div>
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-cyan-400" />
                <span><strong>Import PDF</strong> : Importer vos bulletins</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span><strong>Annuaire</strong> : Contacts du COGC</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span><strong>Documents</strong> : Formulaires RH</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-cyan-400" />
                <span><strong>Cellule RH</strong> : Demandes administratives</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-cyan-400" />
                <span><strong>Durandal</strong> : Gestion incidents</span>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-400">
            L'application est accessible depuis n'importe quel navigateur web, sur ordinateur, 
            tablette ou smartphone. Connexion avec votre email @reseau.sncf.fr
          </p>
        </div>
      )
    },
    {
      id: 'planning',
      icon: <Calendar className="w-5 h-5" />,
      title: 'Planning complet',
      content: (
        <div className="space-y-4">
          <p>
            Le module <strong>Planning</strong> affiche le planning mensuel de tous les agents 
            du COGC, organisés par groupe de travail.
          </p>
          
          <div className="space-y-3">
            <h4 className="font-semibold text-cyan-400 flex items-center gap-2">
              <MousePointer className="w-4 h-4" /> Navigation
            </h4>
            <ul className="text-sm space-y-2 ml-6">
              <li>• <strong>Onglets mensuels</strong> : Cliquez sur un mois pour l'afficher</li>
              <li>• <strong>Sélecteur d'année</strong> : Changez d'année avec les flèches</li>
              <li>• <strong>Groupes repliables</strong> : Cliquez sur ▼/▲ pour réduire/déplier un groupe</li>
              <li>• <strong>Défilement horizontal</strong> : Glissez pour voir tous les jours du mois</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-cyan-400 flex items-center gap-2">
              <Edit3 className="w-4 h-4" /> Interactions
            </h4>
            <ul className="text-sm space-y-2 ml-6">
              <li>• <strong>Clic sur une cellule</strong> : Ouvre le panneau d'édition du service</li>
              <li>• <strong>Clic sur un nom d'agent</strong> : Affiche les infos de l'agent</li>
              <li>• <strong>Clic sur l'en-tête d'un jour</strong> : Affiche les équipes du jour par créneau</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-cyan-400 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Légende des codes
            </h4>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-sm mb-2 font-medium">Marqueurs de service (pas de couleur de fond) :</p>
              <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-6 h-5 bg-gray-700 border border-gray-500 rounded text-center text-xs font-bold">-</span>
                  <span>Matin (06h-14h)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-6 h-5 bg-gray-700 border border-gray-500 rounded text-center text-xs font-bold">O</span>
                  <span>Soir (14h-22h)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-6 h-5 bg-gray-700 border border-gray-500 rounded text-center text-xs font-bold">X</span>
                  <span>Nuit (22h-06h)</span>
                </div>
              </div>
              
              <p className="text-sm mb-2 font-medium">Absences et états (avec couleur) :</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-6 h-5 bg-green-200 rounded"></span>
                  <span><strong>RP</strong> = Repos périodique</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-6 h-5 bg-yellow-400 rounded"></span>
                  <span><strong>C</strong> = Congés</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-6 h-5 bg-red-200 rounded"></span>
                  <span><strong>MA</strong> = Maladie</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-6 h-5 bg-blue-200 rounded"></span>
                  <span><strong>D</strong> = Disponible</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-6 h-5 bg-orange-200 rounded"></span>
                  <span><strong>FO/HAB</strong> = Formation</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-6 h-5 bg-gray-300 rounded"></span>
                  <span><strong>NU</strong> = Non utilisé</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-cyan-400 flex items-center gap-2">
              <StickyNote className="w-4 h-4" /> Informations complémentaires
            </h4>
            <ul className="text-sm space-y-2 ml-6">
              <li>• <strong>Poste</strong> : Pour les réserves, le poste occupé (CRC, ACR, CCU...)</li>
              <li>• <strong>Postes supplémentaires</strong> : En italique violet (+ACR, +RO...)</li>
              <li>• <strong>Notes</strong> : Icône 📝 en haut à droite de la cellule</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'mon-planning',
      icon: <User className="w-5 h-5" />,
      title: 'Mon Planning',
      content: (
        <div className="space-y-4">
          <p>
            <strong>Mon Planning</strong> affiche votre calendrier personnel sous forme de grille mensuelle.
            Les couleurs sont identiques au planning complet.
          </p>

          <div className="space-y-3">
            <h4 className="font-semibold text-cyan-400">📅 Calendrier personnel</h4>
            <ul className="text-sm space-y-2 ml-6">
              <li>• <strong>Navigation</strong> : Utilisez ◀ et ▶ pour changer de mois</li>
              <li>• <strong>Vue mensuelle</strong> : Affichage calendrier du lundi au dimanche</li>
              <li>• <strong>Vos informations</strong> : Nom et groupe affichés en en-tête</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-cyan-400">✏️ Modifier un jour</h4>
            <ul className="text-sm space-y-2 ml-6">
              <li>• <strong>Cliquez sur un jour</strong> : Ouvre le popup d'édition</li>
              <li>• <strong>Service</strong> : Sélectionnez -, O, X, RP, C, MA, etc.</li>
              <li>• <strong>Poste</strong> : Si vous êtes réserve, choisissez le poste</li>
              <li>• <strong>Postes supplémentaires</strong> : Sélection multiple possible (+ACR, +RO...)</li>
              <li>• <strong>Note</strong> : Ajoutez un commentaire libre</li>
              <li>• <strong>Sauvegarder</strong> : Enregistre et synchronise avec le planning général</li>
            </ul>
          </div>

          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm">
            <strong className="text-green-400">✅ Synchronisation :</strong> Les modifications faites dans 
            "Mon Planning" sont automatiquement visibles dans le planning complet.
          </div>
        </div>
      )
    },
    {
      id: 'statistiques',
      icon: <BarChart3 className="w-5 h-5" />,
      title: 'Statistiques',
      content: (
        <div className="space-y-4">
          <p>
            Le module <strong>Statistiques</strong> permet de suivre vos services et surtout 
            vos <strong>postes supplémentaires</strong> effectués sur l'année.
          </p>

          <div className="space-y-3">
            <h4 className="font-semibold text-cyan-400">📊 Compteurs de services</h4>
            <div className="bg-gray-800/50 rounded-lg p-3 text-sm">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">-</div>
                  <div className="text-gray-400">Matins</div>
                  <div className="text-xs text-gray-500">06h - 14h</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">O</div>
                  <div className="text-gray-400">Soirs</div>
                  <div className="text-xs text-gray-500">14h - 22h</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">X</div>
                  <div className="text-gray-400">Nuits</div>
                  <div className="text-xs text-gray-500">22h - 06h</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-cyan-400">➕ Suivi des postes supplémentaires</h4>
            <p className="text-sm ml-6">
              Comptabilise le nombre de fois où vous avez effectué un poste supplémentaire :
            </p>
            <div className="grid grid-cols-3 gap-2 text-sm ml-6">
              <div className="bg-purple-500/20 rounded px-2 py-1 text-center font-medium">+ACR</div>
              <div className="bg-purple-500/20 rounded px-2 py-1 text-center font-medium">+RO</div>
              <div className="bg-purple-500/20 rounded px-2 py-1 text-center font-medium">+RE</div>
              <div className="bg-purple-500/20 rounded px-2 py-1 text-center font-medium">+RC</div>
              <div className="bg-purple-500/20 rounded px-2 py-1 text-center font-medium">+CCU</div>
              <div className="bg-purple-500/20 rounded px-2 py-1 text-center font-medium">+OV</div>
            </div>
            <p className="text-sm text-gray-400 ml-6">
              Utile pour suivre et comptabiliser vos suppléments au fil de l'année.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-cyan-400">📋 Compteurs d'absences</h4>
            <ul className="text-sm space-y-1 ml-6">
              <li>• <strong>RP</strong> : Repos périodiques</li>
              <li>• <strong>C</strong> : Jours de congés</li>
              <li>• <strong>MA</strong> : Jours maladie</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-cyan-400">📈 Affichage</h4>
            <ul className="text-sm space-y-1 ml-6">
              <li>• <strong>Tableau mensuel</strong> : Détail mois par mois</li>
              <li>• <strong>Total annuel</strong> : Cumul sur l'année</li>
              <li>• <strong>Graphique</strong> : Répartition visuelle</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'import-pdf',
      icon: <Upload className="w-5 h-5" />,
      title: 'Import PDF',
      content: (
        <div className="space-y-4">
          <p>
            L'<strong>Import PDF</strong> permet d'importer automatiquement vos bulletins de commande 
            SNCF dans le planning.
          </p>

          <div className="space-y-3">
            <h4 className="font-semibold text-cyan-400">📄 Comment importer</h4>
            <ol className="text-sm space-y-2 ml-6 list-decimal">
              <li>Cliquez sur <strong>"Import PDF"</strong> depuis la page d'accueil</li>
              <li>Sélectionnez votre bulletin de commande (fichier PDF)</li>
              <li>L'IA analyse automatiquement le document</li>
              <li>Vérifiez les services détectés dans l'aperçu</li>
              <li>Cliquez sur <strong>"Importer"</strong> pour valider</li>
            </ol>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-cyan-400">🤖 Reconnaissance automatique</h4>
            <ul className="text-sm space-y-2 ml-6">
              <li>• <strong>Agent</strong> : Détecté depuis le nom sur le bulletin</li>
              <li>• <strong>Dates</strong> : Extraites automatiquement</li>
              <li>• <strong>Services</strong> : CRC001, CCU004, ACR002... convertis en marqueurs</li>
              <li>• <strong>Postes supplémentaires</strong> : Détectés (mentions en italique)</li>
            </ul>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-sm">
            <strong className="text-yellow-400">⚠️ Services de nuit :</strong> Les services notés sur 
            le jour J dans le bulletin (ex: CCU003 à 22h) sont automatiquement enregistrés sur J+1, 
            car le service se termine le lendemain matin.
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm">
            <strong className="text-blue-400">💡 Astuce :</strong> Vous pouvez importer plusieurs 
            bulletins successivement. Les doublons sont automatiquement gérés.
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
              <Phone className="w-4 h-4" /> Contacts
            </h4>
            <ul className="text-sm space-y-2 ml-6">
              <li>• <strong>Par groupe</strong> : CRC, ACR, CCU, RE, RC, RO, CAC...</li>
              <li>• <strong>Téléphone</strong> : Cliquez pour appeler directement</li>
              <li>• <strong>Email</strong> : Cliquez pour ouvrir votre messagerie</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-cyan-400">🔍 Recherche et filtres</h4>
            <ul className="text-sm space-y-2 ml-6">
              <li>• <strong>Barre de recherche</strong> : Tapez un nom, téléphone ou email</li>
              <li>• <strong>Filtre par groupe</strong> : Sélectionnez un groupe spécifique</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-cyan-400 flex items-center gap-2">
              <Edit3 className="w-4 h-4" /> Modifier les coordonnées
            </h4>
            <ul className="text-sm space-y-2 ml-6">
              <li>• <strong>Bouton ✏️</strong> : À côté de chaque agent ou groupe</li>
              <li>• <strong>Saisie</strong> : Modifiez téléphone et/ou email</li>
              <li>• <strong>💾 Enregistrer</strong> ou <strong>✕ Annuler</strong></li>
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
              <Download className="w-4 h-4" /> Catégories disponibles
            </h4>
            <ul className="text-sm space-y-2 ml-6">
              <li>• <strong>Accidents</strong> : Déclarations AT, formulaires médicaux</li>
              <li>• <strong>CET</strong> : Compte Épargne Temps, monétisation</li>
              <li>• <strong>Grève</strong> : Déclarations, formulaires préavis</li>
              <li>• <strong>Rémunération</strong> : Demandes d'acompte, primes</li>
              <li>• <strong>Autres</strong> : Documents divers</li>
            </ul>
          </div>

          <p className="text-sm text-gray-400">
            Cliquez sur un document pour le télécharger. Les fichiers sont au format PDF ou Word.
          </p>
        </div>
      )
    },
    {
      id: 'liens-externes',
      icon: <ExternalLink className="w-5 h-5" />,
      title: 'Liens externes',
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-semibold text-cyan-400 flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> Cellule RH
            </h4>
            <p className="text-sm ml-6">
              Accès direct à la Cellule RH pour vos demandes administratives. 
              Connexion avec votre compte Microsoft SNCF.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-cyan-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Durandal
            </h4>
            <p className="text-sm ml-6">
              Application SNCF de gestion des incidents. Déclaration, suivi et historique 
              des événements. Connexion automatique si déjà authentifié sur le SSO SNCF.
            </p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm">
            <strong className="text-blue-400">ℹ️ Note :</strong> Ces liens ouvrent dans un nouvel onglet.
            Vous serez automatiquement connecté si vous êtes déjà authentifié sur le réseau SNCF.
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
            Si vous rencontrez un problème ou avez une suggestion :
          </p>

          <div className="space-y-3">
            <h4 className="font-semibold text-cyan-400">📧 Contact</h4>
            <ul className="text-sm space-y-2 ml-6">
              <li>• <strong>Problème technique</strong> : Contactez l'administrateur de l'application</li>
              <li>• <strong>Question planning</strong> : Adressez-vous à votre responsable de groupe</li>
              <li>• <strong>Suggestion</strong> : Vos retours sont les bienvenus !</li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-4 mt-4">
            <p className="text-sm text-center">
              <span className="text-cyan-400 font-semibold">COGC Planning</span> est développé 
              pour faciliter le quotidien des agents du COGC.<br/>
              <span className="text-gray-400">Version 2.9 • Décembre 2025</span>
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
