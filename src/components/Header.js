import React from 'react';
import { Calendar, Users, Upload, ArrowLeft, Home } from 'lucide-react';

/**
 * Header - En-tête de l'application Planning
 * 
 * Props:
 * - user: Utilisateur connecté
 * - connectionStatus: Statut de connexion Supabase
 * - onOpenGestionAgents: Ouvrir modal gestion agents
 * - onOpenUploadPDF: Ouvrir modal upload PDF
 * - onSignOut: Déconnexion
 * - onBackToLanding: Retour page d'accueil (nouveau)
 * - showBackButton: Afficher le bouton retour (nouveau)
 */
const Header = ({ 
  user, 
  connectionStatus, 
  onOpenGestionAgents, 
  onOpenUploadPDF, 
  onSignOut,
  onBackToLanding,
  showBackButton = false
}) => (
  <div className="bg-white border-b px-4 py-3 shadow-sm">
    <div className="flex justify-between items-center">
      {/* Partie gauche - Logo, titre et bouton retour */}
      <div className="flex items-center space-x-4">
        {/* Bouton retour vers l'accueil */}
        {showBackButton && onBackToLanding && (
          <button
            onClick={onBackToLanding}
            className="flex items-center space-x-1 px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors border border-gray-200"
            title="Retour à l'accueil"
          >
            <ArrowLeft className="w-4 h-4" />
            <Home className="w-4 h-4" />
          </button>
        )}
        
        {/* Logo et titre */}
        <div className="flex items-center space-x-2">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">Planning COGC Paris Nord</h1>
        </div>
        
        {/* Statut de connexion */}
        <div className="text-sm text-gray-600 hidden md:block">{connectionStatus}</div>
      </div>
      
      {/* Partie droite - Actions et utilisateur */}
      <div className="flex items-center space-x-2">
        {/* Email utilisateur - masqué sur mobile */}
        <span className="text-sm text-gray-600 mr-4 hidden lg:block">{user?.email}</span>
        
        {/* Bouton Gestion Agents */}
        <button
          onClick={onOpenGestionAgents}
          className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          title="Gérer les agents"
        >
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">Gestion Agents</span>
        </button>
        
        {/* Bouton Upload PDF */}
        <button 
          onClick={onOpenUploadPDF}
          className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
          title="Importer un bulletin PDF"
        >
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">Upload PDF</span>
        </button>
        
        {/* Bouton Déconnexion */}
        <button 
          onClick={onSignOut}
          className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
          title="Se déconnecter"
        >
          <span className="hidden sm:inline">Déconnexion</span>
          <span className="sm:hidden">×</span>
        </button>
      </div>
    </div>
  </div>
);

export default Header;
