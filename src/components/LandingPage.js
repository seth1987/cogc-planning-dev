import React, { useState, useEffect } from 'react';
import { LogOut } from 'lucide-react';
import './LandingPage.css';
import ModalAnnuaire from './modals/ModalAnnuaire';
import ModalDocuments from './modals/ModalDocuments';
import ModalAide from './modals/ModalAide';
import ModalMonPlanning from './modals/ModalMonPlanning';
import ModalStatistiques from './modals/ModalStatistiques';
import ModalInstallApp from './modals/ModalInstallApp';

/**
 * LandingPage - Page d'accueil avec design Nexaverse
 * 
 * Design inspiré du template Nexaverse avec adaptations pour COGC Planning.
 * Affiche un menu moderne avec accès au planning et autres fonctionnalités.
 * 
 * v3.1 - Ajout bouton déconnexion
 */
const LandingPage = ({ onNavigate, user, onSignOut, canInstallPWA, isAppInstalled, onInstallPWA }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showAnnuaire, setShowAnnuaire] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showAide, setShowAide] = useState(false);
  const [showMonPlanning, setShowMonPlanning] = useState(false);
  const [showStatistiques, setShowStatistiques] = useState(false);
  const [showInstallApp, setShowInstallApp] = useState(false);

  // Simulate loading and trigger animations
  useEffect(() => {
    const loadTimer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);

    const menuTimer = setTimeout(() => {
      setMenuVisible(true);
    }, 1500);

    return () => {
      clearTimeout(loadTimer);
      clearTimeout(menuTimer);
    };
  }, []);

  // Menu items configuration - 9 boutons
  const menuItems = [
    {
      id: 'planning-complet',
      badge: '📅',
      title: 'Planning complet',
      subtitle: 'Tous les agents',
      isPlanning: true,
      action: () => onNavigate('planning')
    },
    {
      id: 'mon-planning',
      badge: '📆',
      title: 'Mon Planning',
      subtitle: 'Planning personnel',
      action: () => setShowMonPlanning(true)
    },
    {
      id: 'statistiques',
      badge: '📊',
      title: 'Statistiques',
      subtitle: 'Compteurs & analyses',
      action: () => setShowStatistiques(true)
    },
    {
      id: 'cellule-rh',
      badge: '👔',
      title: 'Cellule RH',
      subtitle: 'Congés & demandes',
      action: () => window.open('https://sncf.sharepoint.com/sites/EICPNCelluleRHUOPNPetPARCCOGCGrpO365/SitePages/crisisCommunicationHome.aspx', '_blank')
    },
    {
      id: 'documents',
      badge: '📄',
      title: 'Documents',
      subtitle: 'Formulaires RH',
      action: () => setShowDocuments(true)
    },
    {
      id: 'durandal',
      badge: '🚨',
      title: 'Durandal',
      subtitle: 'Gestion des incidents',
      action: () => window.open('https://durandal2.sso.reseau.sncf.fr/incidents/index', '_blank')
    },
    {
      id: 'annuaire',
      badge: '📇',
      title: 'Annuaire',
      subtitle: 'Contacts COGC',
      action: () => setShowAnnuaire(true)
    },
    {
      id: 'install-app',
      badge: isAppInstalled ? '✅' : '📲',
      title: isAppInstalled ? 'Installée' : 'Installer',
      subtitle: isAppInstalled ? 'Déjà installée' : 'Application mobile',
      disabled: isAppInstalled,
      action: async () => {
        if (canInstallPWA && onInstallPWA) {
          const success = await onInstallPWA();
          if (!success) setShowInstallApp(true);
        } else {
          setShowInstallApp(true);
        }
      }
    },
    {
      id: 'help',
      badge: '❓',
      title: 'Aide',
      subtitle: 'Documentation',
      action: () => setShowAide(true)
    }
  ];

  // Logo SVG Component
  const LogoSVG = () => (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#00f0ff' }} />
          <stop offset="50%" style={{ stopColor: '#0066b3' }} />
          <stop offset="100%" style={{ stopColor: '#c91932' }} />
        </linearGradient>
      </defs>
      {/* Hexagonal frame */}
      <polygon 
        points="50,5 95,30 95,70 50,95 5,70 5,30" 
        fill="none" 
        stroke="url(#logoGradient)" 
        strokeWidth="2"
      />
      <polygon 
        points="50,20 80,37 80,63 50,80 20,63 20,37" 
        fill="none" 
        stroke="url(#logoGradient)" 
        strokeWidth="1.5" 
        opacity="0.6"
      />
      {/* Train/Rail symbol */}
      <path 
        d="M35 40 L65 40 L65 65 L35 65 Z" 
        fill="none" 
        stroke="url(#logoGradient)" 
        strokeWidth="2"
        rx="4"
      />
      <path d="M40 40 L40 35" stroke="url(#logoGradient)" strokeWidth="2" />
      <path d="M60 40 L60 35" stroke="url(#logoGradient)" strokeWidth="2" />
      <path d="M35 52 L65 52" stroke="url(#logoGradient)" strokeWidth="1.5" opacity="0.6" />
      <circle cx="42" cy="62" r="4" fill="url(#logoGradient)" />
      <circle cx="58" cy="62" r="4" fill="url(#logoGradient)" />
    </svg>
  );

  return (
    <div className="landing-container">
      {/* Loading Screen */}
      <div className={`loading-screen ${!isLoading ? 'hidden' : ''}`}>
        <div className="loader-ring" />
        <div className="loading-text">Chargement COGC Planning...</div>
      </div>

      {/* Ambient Background */}
      <div className="ambient-bg">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      {/* Grid Overlay */}
      <div className="grid-overlay" />

      {/* Main Container */}
      <div className="landing-main">
        {/* Header */}
        <header className="landing-header">
          <div className="landing-logo">
            <LogoSVG />
          </div>
          <h1 className="brand-name">COGC Planning</h1>
          <p className="tagline">Paris Nord • Denfert-Rochereau</p>
          
          {/* SNCF Badge */}
          <div className="sncf-badge">
            <span className="sncf-badge-dot" />
            <span className="sncf-badge-text">SNCF Réseau</span>
          </div>

          {/* User info with logout button */}
          {user && (
            <div style={{ 
              marginTop: '15px', 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              fontSize: '13px', 
              color: 'rgba(255,255,255,0.6)',
              letterSpacing: '1px'
            }}>
              <span>Connecté : {user.email}</span>
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.8)',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    letterSpacing: '0.5px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'rgba(201, 25, 50, 0.3)';
                    e.target.style.borderColor = 'rgba(201, 25, 50, 0.5)';
                    e.target.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                    e.target.style.borderColor = 'rgba(255,255,255,0.2)';
                    e.target.style.color = 'rgba(255,255,255,0.8)';
                  }}
                  title="Se déconnecter"
                >
                  <LogOut size={14} />
                  Déconnexion
                </button>
              )}
            </div>
          )}
        </header>

        {/* Menu Grid - 9 boutons (3x3) */}
        <nav className="menu-grid menu-grid-9">
          {menuItems.map((item, index) => (
            <div
              key={item.id}
              className={`menu-item ${item.isPlanning ? 'planning-btn' : ''} ${item.disabled ? 'disabled' : ''} ${menuVisible ? 'visible' : ''}`}
              onClick={!item.disabled ? item.action : undefined}
              style={{ 
                transitionDelay: menuVisible ? `${index * 80}ms` : '0ms',
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                opacity: item.disabled ? 0.5 : 1
              }}
              role="button"
              tabIndex={item.disabled ? -1 : 0}
              onKeyDown={(e) => e.key === 'Enter' && !item.disabled && item.action()}
            >
              <div className="menu-badge">
                <span className="menu-badge-icon">{item.badge}</span>
              </div>
              <div className="menu-title">{item.title}</div>
              <div className="menu-subtitle">{item.subtitle}</div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <footer className="landing-footer">
          <p>
            © 2025 COGC Planning • 
            {' '}
            <a 
              href="https://github.com/seth1987/cogc-planning-dev" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </p>
        </footer>
      </div>

      {/* Modal Annuaire */}
      <ModalAnnuaire 
        isOpen={showAnnuaire} 
        onClose={() => setShowAnnuaire(false)}
        currentUser={user}
      />

      {/* Modal Documents */}
      <ModalDocuments
        isOpen={showDocuments}
        onClose={() => setShowDocuments(false)}
      />

      {/* Modal Aide */}
      <ModalAide
        isOpen={showAide}
        onClose={() => setShowAide(false)}
      />

      {/* Modal Mon Planning */}
      <ModalMonPlanning
        isOpen={showMonPlanning}
        onClose={() => setShowMonPlanning(false)}
        currentUser={user}
      />

      {/* Modal Statistiques */}
      <ModalStatistiques
        isOpen={showStatistiques}
        onClose={() => setShowStatistiques(false)}
        currentUser={user}
      />

      {/* Modal Installer App */}
      <ModalInstallApp
        isOpen={showInstallApp}
        onClose={() => setShowInstallApp(false)}
      />
    </div>
  );
};

export default LandingPage;
