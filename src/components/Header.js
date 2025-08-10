import React from 'react';
import { Calendar, Users, Upload } from 'lucide-react';

const Header = ({ user, connectionStatus, onOpenGestionAgents, onOpenUploadPDF, onSignOut }) => (
  <div className="bg-white border-b px-4 py-3">
    <div className="flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">Planning COGC Paris Nord</h1>
        </div>
        <div className="text-sm text-gray-600">{connectionStatus}</div>
      </div>
      
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600 mr-4">{user?.email}</span>
        
        <button
          onClick={onOpenGestionAgents}
          className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          <Users className="w-4 h-4" />
          <span>Gestion Agents</span>
        </button>
        
        <button 
          onClick={onOpenUploadPDF}
          className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
        >
          <Upload className="w-4 h-4" />
          <span>Upload PDF</span>
        </button>
        
        <button 
          onClick={onSignOut}
          className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
        >
          Déconnexion
        </button>
      </div>
    </div>
  </div>
);

export default Header;