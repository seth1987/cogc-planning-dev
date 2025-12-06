import React, { useState, useEffect } from 'react';
import './LandingPage.css';
import ModalAnnuaire from './modals/ModalAnnuaire';

/**
 * LandingPage - Page d'accueil avec design Nexaverse
 * 
 * Design inspiré du template Nexaverse avec adaptations pour COGC Planning.
 * Affiche un menu moderne avec accès au planning et autres fonctionnalités.
 * 
 * v2.6 - Transmission user au ModalAnnuaire pour édition contacts
 */
const LandingPage = ({ onNavigate, user }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showAnnuaire, setShowAnnuaire] = useState(false);

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

  // Menu items configuration
  const menuItems = [
    {
      id: 'planning',
      badge: '📅',
      title: 'Planning',
      subtitle: 'Gestion des services',
      isPlanning: true,
      action: () => onNavigate('planning')
    },
    {
      id: 'annuaire',
      badge: '📇',
      title: 'Annuaire',
      subtitle: 'Contacts COGC',
      action: () => setShowAnnuaire(true)
    },
    {
      id: 'durandal',
      badge: '🚨',
      title: 'Durandal',
      subtitle: 'Gestion des incidents',
      action: () => window.open('https://durandal2.sso.reseau.sncf.fr/incidents/index', '_blank')
    },
    {
      id: 'stats',
      badge: '📊',
      title: 'Statistiques',
      subtitle: 'Analyses',
      action: () => onNavigate('planning', { view: 'stats' })
    },
    {
      id: 'settings',
      badge: '⚙️',
      title: 'Paramètres',
      subtitle: 'Configuration',
      action: () => onNavigate('planning', { openModal: 'settings' })
    },
    {
      id: 'help',
      badge: '❓',
      title: 'Aide',
      subtitle: 'Documentation',
      action: () => window.open('https://github.com/seth1987/cogc-planning-dev#readme', '_blank')
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

          {/* User info if logged in */}
          {user && (
            <div style={{ 
              marginTop: '15px', 
              fontSize: '13px', 
              color: 'rgba(255,255,255,0.6)',
              letterSpacing: '1px'
            }}>
              Connecté : {user.email}
            </div>
          )}
        </header>

        {/* Menu Grid */}
        <nav className="menu-grid">
          {menuItems.map((item, index) => (
            <div
              key={item.id}
              className={`menu-item ${item.isPlanning ? 'planning-btn' : ''} ${menuVisible ? 'visible' : ''}`}
              onClick={item.action}
              style={{ 
                transitionDelay: menuVisible ? `${index * 100}ms` : '0ms' 
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && item.action()}
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

      {/* Modal Annuaire - avec user pour permettre édition des propres coordonnées */}
      <ModalAnnuaire 
        isOpen={showAnnuaire} 
        onClose={() => setShowAnnuaire(false)}
        currentUser={user}
      />
    </div>
  );
};

export default LandingPage;
