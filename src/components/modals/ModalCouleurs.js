import React, { useRef, useState } from 'react';
import { X, Download, Upload, RotateCcw, Palette, Save, Cloud, CloudOff, Loader, ChevronDown, ChevronUp } from 'lucide-react';
import { COLOR_CATEGORIES, SERVICE_LABELS } from '../../constants/defaultColors';
import useColors from '../../hooks/useColors';

/**
 * ModalCouleurs - Panneau de personnalisation des couleurs
 * 
 * VERSION 2.0 - Catégories avec accordéons dépliables
 * 
 * - Couleur de groupe modifiable (appliquée à tous les éléments)
 * - Éléments individuels modifiables dans chaque groupe
 * - Logique fallback: élément → groupe → défaut
 * 
 * @param {boolean} isOpen - État d'ouverture du modal
 * @param {function} onClose - Callback de fermeture
 * @param {string} context - 'general' (défaut) ou 'perso' pour Mon Planning
 * @param {string} userEmail - Email de l'utilisateur pour la synchronisation
 */
const ModalCouleurs = ({ isOpen, onClose, context = 'general', userEmail = null }) => {
  const {
    colors,
    updateServiceColor,
    updateGroupColor,
    updatePostesSupp,
    updateTexteLibre,
    resetColors,
    exportColors,
    importColors,
    getGroupColor,
    syncEnabled,
    isSyncing,
    toggleSync,
  } = useColors(context, userEmail);
  
  const fileInputRef = useRef(null);
  
  // État des accordéons (groupes dépliés/repliés)
  const [expandedGroups, setExpandedGroups] = useState({});

  if (!isOpen) return null;

  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importColors(file);
      alert('Configuration importée avec succès !');
    } catch (error) {
      alert('Erreur: ' + error.message);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReset = () => {
    if (window.confirm('Réinitialiser toutes les couleurs aux valeurs par défaut ?\n\nCela désactivera aussi la synchronisation.')) {
      resetColors();
    }
  };

  const handleSyncToggle = async () => {
    if (!userEmail) {
      alert('Vous devez être connecté pour activer la synchronisation.');
      return;
    }
    
    const newState = !syncEnabled;
    if (newState) {
      const confirm = window.confirm(
        '☁️ Activer la synchronisation ?\n\n' +
        'Vos couleurs personnalisées seront sauvegardées dans le cloud et synchronisées sur tous vos appareils.'
      );
      if (confirm) {
        await toggleSync(true);
      }
    } else {
      const confirm = window.confirm(
        '📱 Désactiver la synchronisation ?\n\n' +
        'Vos couleurs resteront uniquement sur cet appareil.\nLes données cloud seront supprimées.'
      );
      if (confirm) {
        await toggleSync(false);
      }
    }
  };

  const colorPickerStyle = {
    width: '40px',
    height: '30px',
    border: '1px solid rgba(0, 240, 255, 0.3)',
    borderRadius: '4px',
    cursor: 'pointer',
    padding: '2px',
  };

  // Titre et accent selon le contexte
  const modalTitle = context === 'perso' 
    ? 'Couleurs - Mon Planning' 
    : 'Couleurs - Planning général';
  const accentColor = context === 'perso' ? '#a855f7' : '#00f0ff';

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10001,
        padding: '20px',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          backgroundColor: '#1a1a2e',
          borderRadius: '12px',
          border: context === 'perso' 
            ? '1px solid rgba(168, 85, 247, 0.4)' 
            : '1px solid rgba(0, 240, 255, 0.3)',
          boxShadow: context === 'perso'
            ? '0 0 40px rgba(168, 85, 247, 0.2)'
            : '0 0 40px rgba(0, 240, 255, 0.2)',
          maxWidth: '700px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: context === 'perso'
              ? '1px solid rgba(168, 85, 247, 0.3)'
              : '1px solid rgba(0, 240, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Palette size={24} color={accentColor} />
            <h2 style={{ margin: 0, color: '#ffffff', fontSize: '18px' }}>
              {modalTitle}
            </h2>
            {isSyncing && (
              <Loader 
                size={16} 
                color={accentColor} 
                style={{ animation: 'spin 1s linear infinite' }}
              />
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
          >
            <X size={24} color="#ffffff" />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          
          {/* ========== SECTION SYNCHRONISATION ========== */}
          <div style={{
            backgroundColor: syncEnabled 
              ? 'rgba(34, 197, 94, 0.1)' 
              : 'rgba(255, 255, 255, 0.05)',
            border: syncEnabled 
              ? '1px solid rgba(34, 197, 94, 0.3)' 
              : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {syncEnabled ? (
                <Cloud size={20} color="#22c55e" />
              ) : (
                <CloudOff size={20} color="#666" />
              )}
              <div>
                <div style={{ 
                  color: syncEnabled ? '#22c55e' : '#999', 
                  fontSize: '13px', 
                  fontWeight: 'bold' 
                }}>
                  {syncEnabled ? 'Synchronisation activée' : 'Stockage local uniquement'}
                </div>
                <div style={{ color: '#666', fontSize: '11px', marginTop: '2px' }}>
                  {syncEnabled 
                    ? 'Vos couleurs sont synchronisées sur tous vos appareils'
                    : 'Activer pour retrouver vos couleurs sur tous vos appareils'}
                </div>
              </div>
            </div>
            
            <button
              onClick={handleSyncToggle}
              disabled={isSyncing || !userEmail}
              style={{
                position: 'relative',
                width: '50px',
                height: '26px',
                borderRadius: '13px',
                border: 'none',
                backgroundColor: syncEnabled ? '#22c55e' : '#444',
                cursor: !userEmail ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                opacity: !userEmail ? 0.5 : 1,
              }}
              title={!userEmail ? 'Connexion requise' : (syncEnabled ? 'Désactiver la sync' : 'Activer la sync')}
            >
              <span style={{
                position: 'absolute',
                top: '3px',
                left: syncEnabled ? '27px' : '3px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: '#fff',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }} />
            </button>
          </div>

          {/* ========== CATÉGORIES AVEC ACCORDÉONS ========== */}
          <h3 style={{ 
            color: accentColor, 
            marginTop: 0, 
            marginBottom: '12px', 
            fontSize: '14px', 
            textTransform: 'uppercase' 
          }}>
            Catégories de services
          </h3>
          
          <p style={{ color: '#888', fontSize: '12px', marginBottom: '16px' }}>
            💡 Modifiez la couleur du groupe pour l'appliquer à tous les éléments, ou dépliez pour personnaliser individuellement.
          </p>

          {Object.entries(COLOR_CATEGORIES).map(([groupKey, category]) => {
            const isExpanded = expandedGroups[groupKey];
            const groupColor = getGroupColor(groupKey);
            
            return (
              <div 
                key={groupKey}
                style={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.3)', 
                  borderRadius: '8px', 
                  overflow: 'hidden', 
                  marginBottom: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                {/* Header du groupe (cliquable) */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 80px 80px 40px',
                    padding: '12px',
                    alignItems: 'center',
                    backgroundColor: context === 'perso' 
                      ? 'rgba(168, 85, 247, 0.1)' 
                      : 'rgba(0, 240, 255, 0.1)',
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleGroup(groupKey)}
                >
                  <div>
                    <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>
                      {category.label}
                    </div>
                    <div style={{ color: '#888', fontSize: '11px', marginTop: '2px' }}>
                      {category.description}
                    </div>
                  </div>
                  
                  {/* Color picker pour le groupe */}
                  <div 
                    style={{ display: 'flex', justifyContent: 'center' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="color"
                      value={groupColor.bg || '#1a1a2e'}
                      onChange={(e) => updateGroupColor(groupKey, 'bg', e.target.value)}
                      style={colorPickerStyle}
                      title="Couleur de fond du groupe"
                    />
                  </div>
                  <div 
                    style={{ display: 'flex', justifyContent: 'center' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="color"
                      value={groupColor.text || '#000000'}
                      onChange={(e) => updateGroupColor(groupKey, 'text', e.target.value)}
                      style={colorPickerStyle}
                      title="Couleur du texte du groupe"
                    />
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {isExpanded ? (
                      <ChevronUp size={20} color="#888" />
                    ) : (
                      <ChevronDown size={20} color="#888" />
                    )}
                  </div>
                </div>

                {/* Éléments individuels (dépliable) */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    {/* Header des colonnes */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '80px 1fr 80px 80px',
                        padding: '8px 12px',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        fontSize: '11px',
                        color: '#666',
                        fontWeight: 'bold',
                      }}
                    >
                      <span>Code</span>
                      <span>Description</span>
                      <span style={{ textAlign: 'center' }}>Fond</span>
                      <span style={{ textAlign: 'center' }}>Texte</span>
                    </div>
                    
                    {Object.entries(category.items).map(([code, item], index, arr) => {
                      const serviceColor = colors.services?.[code] || {};
                      // Utiliser la couleur du groupe si pas de couleur spécifique
                      const bgValue = serviceColor.bg || groupColor.bg || '#1a1a2e';
                      const textValue = serviceColor.text || groupColor.text || '#000000';
                      
                      return (
                        <div
                          key={code}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '80px 1fr 80px 80px',
                            padding: '8px 12px',
                            alignItems: 'center',
                            borderBottom: index < arr.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                          }}
                        >
                          <span style={{ 
                            color: '#ffffff', 
                            fontFamily: 'monospace', 
                            fontWeight: 'bold',
                            fontSize: '12px'
                          }}>
                            {code}
                          </span>
                          <span style={{ color: '#aaa', fontSize: '12px' }}>
                            {item.label}
                          </span>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <input
                              type="color"
                              value={bgValue}
                              onChange={(e) => updateServiceColor(code, 'bg', e.target.value)}
                              style={{ ...colorPickerStyle, width: '35px', height: '25px' }}
                              title={`Fond pour ${code}`}
                            />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <input
                              type="color"
                              value={textValue}
                              onChange={(e) => updateServiceColor(code, 'text', e.target.value)}
                              style={{ ...colorPickerStyle, width: '35px', height: '25px' }}
                              title={`Texte pour ${code}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* ========== SECTION AUTRES ÉLÉMENTS ========== */}
          <h3 style={{ 
            color: accentColor, 
            marginTop: '24px',
            marginBottom: '12px', 
            fontSize: '14px', 
            textTransform: 'uppercase' 
          }}>
            Autres éléments
          </h3>

          <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', padding: '10px 12px', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <span style={{ color: '#cccccc', fontSize: '13px' }}>Postes supplémentaires (+ACR, +RO...)</span>
              <span style={{ textAlign: 'center', color: '#666', fontSize: '11px' }}>-</span>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <input
                  type="color"
                  value={colors.postesSupp?.text || '#8b5cf6'}
                  onChange={(e) => updatePostesSupp(e.target.value)}
                  style={colorPickerStyle}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', padding: '10px 12px', alignItems: 'center' }}>
              <span style={{ color: '#cccccc', fontSize: '13px' }}>Texte libre / Notes</span>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <input
                  type="color"
                  value={colors.texteLibre?.bg || '#fef3c7'}
                  onChange={(e) => updateTexteLibre('bg', e.target.value)}
                  style={colorPickerStyle}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <input
                  type="color"
                  value={colors.texteLibre?.text || '#92400e'}
                  onChange={(e) => updateTexteLibre('text', e.target.value)}
                  style={colorPickerStyle}
                />
              </div>
            </div>
          </div>

          {/* ========== BOUTONS D'ACTION ========== */}
          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            flexWrap: 'wrap', 
            justifyContent: 'center', 
            marginTop: '20px', 
            paddingTop: '20px', 
            borderTop: context === 'perso'
              ? '1px solid rgba(168, 85, 247, 0.2)'
              : '1px solid rgba(0, 240, 255, 0.2)' 
          }}>
            <button
              onClick={exportColors}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                padding: '10px 16px', 
                backgroundColor: context === 'perso' 
                  ? 'rgba(168, 85, 247, 0.1)' 
                  : 'rgba(0, 240, 255, 0.1)', 
                border: context === 'perso'
                  ? '1px solid rgba(168, 85, 247, 0.3)'
                  : '1px solid rgba(0, 240, 255, 0.3)', 
                borderRadius: '6px', 
                color: accentColor, 
                cursor: 'pointer', 
                fontSize: '13px' 
              }}
            >
              <Download size={16} /> Exporter
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                padding: '10px 16px', 
                backgroundColor: context === 'perso' 
                  ? 'rgba(168, 85, 247, 0.1)' 
                  : 'rgba(0, 240, 255, 0.1)', 
                border: context === 'perso'
                  ? '1px solid rgba(168, 85, 247, 0.3)'
                  : '1px solid rgba(0, 240, 255, 0.3)', 
                borderRadius: '6px', 
                color: accentColor, 
                cursor: 'pointer', 
                fontSize: '13px' 
              }}
            >
              <Upload size={16} /> Importer
            </button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
            <button
              onClick={handleReset}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', backgroundColor: 'rgba(255, 100, 100, 0.1)', border: '1px solid rgba(255, 100, 100, 0.3)', borderRadius: '6px', color: '#ff6464', cursor: 'pointer', fontSize: '13px' }}
            >
              <RotateCcw size={16} /> Réinitialiser
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ 
          padding: '16px 20px', 
          borderTop: context === 'perso'
            ? '1px solid rgba(168, 85, 247, 0.2)'
            : '1px solid rgba(0, 240, 255, 0.2)', 
          display: 'flex', 
          justifyContent: 'flex-end' 
        }}>
          <button
            onClick={onClose}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '10px 24px', 
              backgroundColor: accentColor, 
              border: 'none', 
              borderRadius: '6px', 
              color: '#1a1a2e', 
              cursor: 'pointer', 
              fontSize: '14px', 
              fontWeight: 'bold' 
            }}
          >
            <Save size={16} /> Fermer
          </button>
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ModalCouleurs;
