import React, { useRef, useState } from 'react';
import { X, Download, Upload, RotateCcw, Palette, Save, Cloud, CloudOff, Loader, ChevronDown, ChevronUp } from 'lucide-react';
import { COLOR_CATEGORIES, HORAIRES_BASE } from '../../constants/defaultColors';
import useColors from '../../hooks/useColors';

/**
 * ModalCouleurs - Panneau de personnalisation des couleurs
 * 
 * VERSION 3.0 - Sous-catégories avec toggle groupe/individuel
 * 
 * - Catégorie "horaires" masquée
 * - Habilitation/Formation avec sous-catégories (HAB, FO RO, etc.)
 * - Toggle par sous-catégorie : Groupe (couleur unique) / Individuel (par horaire)
 * - Si modification manuelle → repasse en mode Individuel
 */
const ModalCouleurs = ({ isOpen, onClose, context = 'general', userEmail = null }) => {
  const {
    colors,
    updateServiceColor,
    updateGroupColor,
    updateSubCategoryColor,
    setSubCategoryMode,
    getSubCategoryMode,
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
  const [expandedGroups, setExpandedGroups] = useState({});

  if (!isOpen) return null;

  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
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
    if (window.confirm('Réinitialiser toutes les couleurs aux valeurs par défaut ?')) {
      resetColors();
    }
  };

  const handleSyncToggle = async () => {
    if (!userEmail) {
      alert('Vous devez être connecté pour activer la synchronisation.');
      return;
    }
    const newState = !syncEnabled;
    const confirm = window.confirm(
      newState 
        ? '☁️ Activer la synchronisation ?\n\nVos couleurs seront sauvegardées dans le cloud.'
        : '📱 Désactiver la synchronisation ?\n\nLes données cloud seront supprimées.'
    );
    if (confirm) await toggleSync(newState);
  };

  const colorPickerStyle = {
    width: '40px',
    height: '30px',
    border: '1px solid rgba(0, 240, 255, 0.3)',
    borderRadius: '4px',
    cursor: 'pointer',
    padding: '2px',
  };

  const smallPickerStyle = {
    ...colorPickerStyle,
    width: '35px',
    height: '25px',
  };

  const modalTitle = context === 'perso' ? 'Couleurs - Mon Planning' : 'Couleurs - Planning général';
  const accentColor = context === 'perso' ? '#a855f7' : '#00f0ff';

  // Filtrer les catégories visibles (exclure hidden)
  const visibleCategories = Object.entries(COLOR_CATEGORIES)
    .filter(([_, cat]) => !cat.hidden);

  // Rendu d'une catégorie normale (sans sous-catégories)
  const renderNormalCategory = (groupKey, category) => {
    const isExpanded = expandedGroups[groupKey];
    const groupColor = getGroupColor(groupKey);
    
    return (
      <div key={groupKey} style={categoryContainerStyle}>
        {/* Header cliquable */}
        <div style={categoryHeaderStyle(context)} onClick={() => toggleGroup(groupKey)}>
          <div>
            <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>{category.label}</div>
            <div style={{ color: '#888', fontSize: '11px', marginTop: '2px' }}>{category.description}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="color"
                value={groupColor.bg || '#1a1a2e'}
                onChange={(e) => updateGroupColor(groupKey, 'bg', e.target.value)}
                style={colorPickerStyle}
                title="Fond du groupe"
              />
              <input
                type="color"
                value={groupColor.text || '#000000'}
                onChange={(e) => updateGroupColor(groupKey, 'text', e.target.value)}
                style={colorPickerStyle}
                title="Texte du groupe"
              />
            </div>
            {isExpanded ? <ChevronUp size={20} color="#888" /> : <ChevronDown size={20} color="#888" />}
          </div>
        </div>

        {/* Items dépliables */}
        {isExpanded && category.items && (
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            {Object.entries(category.items)
              .filter(([_, item]) => !item.isSubCategory && !item.parentSubCategory)
              .map(([code, item], index, arr) => {
                const serviceColor = colors.services?.[code] || {};
                return (
                  <div key={code} style={itemRowStyle(index, arr.length)}>
                    <span style={codeStyle}>{code}</span>
                    <span style={labelStyle}>{item.label}</span>
                    <input
                      type="color"
                      value={serviceColor.bg || groupColor.bg || '#1a1a2e'}
                      onChange={(e) => updateServiceColor(code, 'bg', e.target.value)}
                      style={smallPickerStyle}
                    />
                    <input
                      type="color"
                      value={serviceColor.text || groupColor.text || '#000000'}
                      onChange={(e) => updateServiceColor(code, 'text', e.target.value)}
                      style={smallPickerStyle}
                    />
                  </div>
                );
              })}
          </div>
        )}
      </div>
    );
  };

  // Rendu de la catégorie Habilitation/Formation avec sous-catégories
  const renderHabilitationCategory = (groupKey, category) => {
    const isExpanded = expandedGroups[groupKey];
    const groupColor = getGroupColor(groupKey);
    
    return (
      <div key={groupKey} style={categoryContainerStyle}>
        {/* Header principal */}
        <div style={categoryHeaderStyle(context)} onClick={() => toggleGroup(groupKey)}>
          <div>
            <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>{category.label}</div>
            <div style={{ color: '#888', fontSize: '11px', marginTop: '2px' }}>{category.description}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="color"
                value={groupColor.bg || '#fed7aa'}
                onChange={(e) => updateGroupColor(groupKey, 'bg', e.target.value)}
                style={colorPickerStyle}
                title="Fond par défaut"
              />
              <input
                type="color"
                value={groupColor.text || '#9a3412'}
                onChange={(e) => updateGroupColor(groupKey, 'text', e.target.value)}
                style={colorPickerStyle}
                title="Texte par défaut"
              />
            </div>
            {isExpanded ? <ChevronUp size={20} color="#888" /> : <ChevronDown size={20} color="#888" />}
          </div>
        </div>

        {/* Sous-catégories */}
        {isExpanded && category.subCategories && (
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            {Object.entries(category.subCategories).map(([subCatCode, subCat]) => {
              const mode = getSubCategoryMode(subCatCode);
              const isGroupMode = mode === 'group';
              const subCatColor = colors.services?.[subCatCode] || subCat.defaultColor || groupColor;
              
              return (
                <div key={subCatCode} style={{ 
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  padding: '12px',
                  backgroundColor: 'rgba(0, 0, 0, 0.1)'
                }}>
                  {/* Header de sous-catégorie */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: isGroupMode ? 0 : '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '13px' }}>{subCatCode}</span>
                      <span style={{ color: '#888', fontSize: '11px' }}>{subCat.label}</span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Toggle Groupe/Individuel */}
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: '20px',
                        padding: '4px'
                      }}>
                        <button
                          onClick={() => setSubCategoryMode(subCatCode, 'group')}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '16px',
                            border: 'none',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            backgroundColor: isGroupMode ? accentColor : 'transparent',
                            color: isGroupMode ? '#1a1a2e' : '#888',
                            transition: 'all 0.2s'
                          }}
                        >
                          Groupe
                        </button>
                        <button
                          onClick={() => setSubCategoryMode(subCatCode, 'individual')}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '16px',
                            border: 'none',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            backgroundColor: !isGroupMode ? accentColor : 'transparent',
                            color: !isGroupMode ? '#1a1a2e' : '#888',
                            transition: 'all 0.2s'
                          }}
                        >
                          Individuel
                        </button>
                      </div>
                      
                      {/* Color pickers pour la sous-catégorie (mode groupe) */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="color"
                          value={subCatColor.bg || groupColor.bg || '#fed7aa'}
                          onChange={(e) => updateSubCategoryColor(subCatCode, 'bg', e.target.value)}
                          style={colorPickerStyle}
                          title={isGroupMode ? "Couleur pour tout le groupe" : "Couleur de base"}
                        />
                        <input
                          type="color"
                          value={subCatColor.text || groupColor.text || '#9a3412'}
                          onChange={(e) => updateSubCategoryColor(subCatCode, 'text', e.target.value)}
                          style={colorPickerStyle}
                          title={isGroupMode ? "Texte pour tout le groupe" : "Texte de base"}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Combinaisons avec horaires (mode individuel uniquement) */}
                  {!isGroupMode && (
                    <div style={{ 
                      marginTop: '10px',
                      paddingTop: '10px',
                      borderTop: '1px dashed rgba(255, 255, 255, 0.1)'
                    }}>
                      {HORAIRES_BASE.map(horaire => {
                        const combinedCode = `${subCatCode} ${horaire.code}`;
                        const combinedColor = colors.services?.[combinedCode] || subCatColor;
                        
                        return (
                          <div key={combinedCode} style={{
                            display: 'grid',
                            gridTemplateColumns: '80px 1fr 40px 40px',
                            padding: '6px 0',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <span style={{ 
                              color: '#fff', 
                              fontFamily: 'monospace', 
                              fontSize: '11px',
                              fontWeight: 'bold'
                            }}>
                              {combinedCode}
                            </span>
                            <span style={{ color: '#888', fontSize: '11px' }}>
                              {horaire.label}
                            </span>
                            <input
                              type="color"
                              value={combinedColor.bg || subCatColor.bg || '#fed7aa'}
                              onChange={(e) => updateServiceColor(combinedCode, 'bg', e.target.value)}
                              style={smallPickerStyle}
                            />
                            <input
                              type="color"
                              value={combinedColor.text || subCatColor.text || '#9a3412'}
                              onChange={(e) => updateServiceColor(combinedCode, 'text', e.target.value)}
                              style={smallPickerStyle}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle(context)}>
        {/* Header */}
        <div style={headerStyle(context)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Palette size={24} color={accentColor} />
            <h2 style={{ margin: 0, color: '#ffffff', fontSize: '18px' }}>{modalTitle}</h2>
            {isSyncing && <Loader size={16} color={accentColor} style={{ animation: 'spin 1s linear infinite' }} />}
          </div>
          <button onClick={onClose} style={closeButtonStyle}>
            <X size={24} color="#ffffff" />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          
          {/* Sync Section */}
          <div style={syncSectionStyle(syncEnabled)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {syncEnabled ? <Cloud size={20} color="#22c55e" /> : <CloudOff size={20} color="#666" />}
              <div>
                <div style={{ color: syncEnabled ? '#22c55e' : '#999', fontSize: '13px', fontWeight: 'bold' }}>
                  {syncEnabled ? 'Synchronisation activée' : 'Stockage local'}
                </div>
                <div style={{ color: '#666', fontSize: '11px' }}>
                  {syncEnabled ? 'Synchronisé sur tous vos appareils' : 'Activer pour synchroniser'}
                </div>
              </div>
            </div>
            <button onClick={handleSyncToggle} disabled={isSyncing || !userEmail} style={toggleButtonStyle(syncEnabled, !userEmail)}>
              <span style={toggleKnobStyle(syncEnabled)} />
            </button>
          </div>

          {/* Categories */}
          <h3 style={{ color: accentColor, marginTop: 0, marginBottom: '12px', fontSize: '14px', textTransform: 'uppercase' }}>
            Catégories de services
          </h3>
          <p style={{ color: '#888', fontSize: '12px', marginBottom: '16px' }}>
            💡 Modifiez la couleur du groupe ou dépliez pour personnaliser individuellement.
          </p>

          {visibleCategories.map(([groupKey, category]) => {
            if (category.hasSubCategories) {
              return renderHabilitationCategory(groupKey, category);
            }
            return renderNormalCategory(groupKey, category);
          })}

          {/* Autres éléments */}
          <h3 style={{ color: accentColor, marginTop: '24px', marginBottom: '12px', fontSize: '14px', textTransform: 'uppercase' }}>
            Autres éléments
          </h3>

          <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', padding: '10px 12px', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <span style={{ color: '#ccc', fontSize: '13px' }}>Postes supplémentaires (+ACR, +RO...)</span>
              <span style={{ textAlign: 'center', color: '#666', fontSize: '11px' }}>-</span>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <input type="color" value={colors.postesSupp?.text || '#8b5cf6'} onChange={(e) => updatePostesSupp(e.target.value)} style={colorPickerStyle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', padding: '10px 12px', alignItems: 'center' }}>
              <span style={{ color: '#ccc', fontSize: '13px' }}>Texte libre / Notes</span>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <input type="color" value={colors.texteLibre?.bg || '#fef3c7'} onChange={(e) => updateTexteLibre('bg', e.target.value)} style={colorPickerStyle} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <input type="color" value={colors.texteLibre?.text || '#92400e'} onChange={(e) => updateTexteLibre('text', e.target.value)} style={colorPickerStyle} />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={actionsStyle(context)}>
            <button onClick={exportColors} style={actionButtonStyle(context, accentColor)}>
              <Download size={16} /> Exporter
            </button>
            <button onClick={() => fileInputRef.current?.click()} style={actionButtonStyle(context, accentColor)}>
              <Upload size={16} /> Importer
            </button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
            <button onClick={handleReset} style={resetButtonStyle}>
              <RotateCcw size={16} /> Réinitialiser
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={footerStyle(context)}>
          <button onClick={onClose} style={saveButtonStyle(accentColor)}>
            <Save size={16} /> Fermer
          </button>
        </div>
      </div>
      
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// ===== STYLES =====

const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 10001, padding: '20px',
};

const modalStyle = (context) => ({
  backgroundColor: '#1a1a2e',
  borderRadius: '12px',
  border: context === 'perso' ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(0, 240, 255, 0.3)',
  boxShadow: context === 'perso' ? '0 0 40px rgba(168, 85, 247, 0.2)' : '0 0 40px rgba(0, 240, 255, 0.2)',
  maxWidth: '750px', width: '100%', maxHeight: '90vh',
  overflow: 'hidden', display: 'flex', flexDirection: 'column',
});

const headerStyle = (context) => ({
  padding: '16px 20px',
  borderBottom: context === 'perso' ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(0, 240, 255, 0.2)',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
});

const closeButtonStyle = { background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' };

const syncSectionStyle = (enabled) => ({
  backgroundColor: enabled ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255, 255, 255, 0.05)',
  border: enabled ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '8px', padding: '12px 16px', marginBottom: '20px',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
});

const toggleButtonStyle = (enabled, disabled) => ({
  position: 'relative', width: '50px', height: '26px', borderRadius: '13px', border: 'none',
  backgroundColor: enabled ? '#22c55e' : '#444',
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'background-color 0.2s', opacity: disabled ? 0.5 : 1,
});

const toggleKnobStyle = (enabled) => ({
  position: 'absolute', top: '3px', left: enabled ? '27px' : '3px',
  width: '20px', height: '20px', borderRadius: '50%',
  backgroundColor: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
});

const categoryContainerStyle = {
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
  borderRadius: '8px', overflow: 'hidden', marginBottom: '12px',
  border: '1px solid rgba(255, 255, 255, 0.1)'
};

const categoryHeaderStyle = (context) => ({
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '12px',
  backgroundColor: context === 'perso' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(0, 240, 255, 0.1)',
  cursor: 'pointer',
});

const itemRowStyle = (index, total) => ({
  display: 'grid', gridTemplateColumns: '80px 1fr 40px 40px',
  padding: '8px 12px', alignItems: 'center', gap: '8px',
  backgroundColor: 'rgba(0, 0, 0, 0.2)',
  borderBottom: index < total - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
});

const codeStyle = { color: '#fff', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '12px' };
const labelStyle = { color: '#aaa', fontSize: '12px' };

const actionsStyle = (context) => ({
  display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center',
  marginTop: '20px', paddingTop: '20px',
  borderTop: context === 'perso' ? '1px solid rgba(168, 85, 247, 0.2)' : '1px solid rgba(0, 240, 255, 0.2)',
});

const actionButtonStyle = (context, accent) => ({
  display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px',
  backgroundColor: context === 'perso' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(0, 240, 255, 0.1)',
  border: context === 'perso' ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(0, 240, 255, 0.3)',
  borderRadius: '6px', color: accent, cursor: 'pointer', fontSize: '13px',
});

const resetButtonStyle = {
  display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px',
  backgroundColor: 'rgba(255, 100, 100, 0.1)', border: '1px solid rgba(255, 100, 100, 0.3)',
  borderRadius: '6px', color: '#ff6464', cursor: 'pointer', fontSize: '13px',
};

const footerStyle = (context) => ({
  padding: '16px 20px',
  borderTop: context === 'perso' ? '1px solid rgba(168, 85, 247, 0.2)' : '1px solid rgba(0, 240, 255, 0.2)',
  display: 'flex', justifyContent: 'flex-end',
});

const saveButtonStyle = (accent) => ({
  display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 24px',
  backgroundColor: accent, border: 'none', borderRadius: '6px',
  color: '#1a1a2e', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold',
});

export default ModalCouleurs;
