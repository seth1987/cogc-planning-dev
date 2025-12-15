import React, { useRef, useState, useMemo } from 'react';
import { X, Download, Upload, RotateCcw, Palette, Save, Cloud, CloudOff, Loader, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { COLOR_CATEGORIES, searchCodes, getHorairesForSubCategory } from '../../constants/defaultColors';
import useColors from '../../hooks/useColors';

/**
 * ModalCouleurs - Panneau de personnalisation des couleurs
 * 
 * VERSION 4.0 - Toggle Groupe/Individuel sur TOUTES les catégories
 * 
 * - Toggle Groupe/Individuel pour chaque catégorie
 * - Mode Groupe : 1 couleur pour toute la catégorie
 * - Mode Individuel : personnalisation élément par élément
 * - Modification d'un élément → repasse auto en Individuel
 */
const ModalCouleurs = ({ isOpen, onClose, context = 'general', userEmail = null }) => {
  const {
    colors,
    updateServiceColor,
    updateGroupColor,
    updateSubCategoryColor,
    updateCategoryColor,
    setCategoryMode,
    getCategoryMode,
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
  
  // État initial des accordéons basé sur defaultOpen
  const getInitialExpandedState = () => {
    const state = {};
    Object.entries(COLOR_CATEGORIES).forEach(([key, cat]) => {
      state[key] = cat.defaultOpen === true;
    });
    return state;
  };
  
  const [expandedGroups, setExpandedGroups] = useState(getInitialExpandedState);
  const [searchTerm, setSearchTerm] = useState('');

  // Résultats de recherche
  const searchResults = useMemo(() => {
    if (!searchTerm || searchTerm.trim().length < 1) return [];
    return searchCodes(searchTerm);
  }, [searchTerm]);

  const isSearching = searchTerm.trim().length > 0;

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

  // Rendu des résultats de recherche
  const renderSearchResults = () => {
    if (searchResults.length === 0) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          color: '#888',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '8px'
        }}>
          Aucun code trouvé pour "{searchTerm}"
        </div>
      );
    }

    // Grouper les résultats par catégorie
    const grouped = {};
    searchResults.forEach(result => {
      if (!grouped[result.categoryKey]) {
        grouped[result.categoryKey] = {
          label: result.categoryLabel,
          items: []
        };
      }
      grouped[result.categoryKey].items.push(result);
    });

    return (
      <div style={{ marginBottom: '20px' }}>
        <div style={{ 
          color: '#22c55e', 
          fontSize: '12px', 
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <Search size={14} />
          {searchResults.length} résultat(s) pour "{searchTerm}"
        </div>
        
        {Object.entries(grouped).map(([categoryKey, group]) => (
          <div key={categoryKey} style={{ marginBottom: '12px' }}>
            <div style={{ 
              color: accentColor, 
              fontSize: '11px', 
              fontWeight: 'bold', 
              marginBottom: '6px',
              textTransform: 'uppercase'
            }}>
              {group.label}
            </div>
            <div style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.3)', 
              borderRadius: '8px', 
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              {group.items.map((item, index) => {
                const serviceColor = colors.services?.[item.code] || item.defaultColor;
                return (
                  <div 
                    key={item.code} 
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '100px 1fr 40px 40px',
                      padding: '10px 12px',
                      alignItems: 'center',
                      gap: '8px',
                      borderBottom: index < group.items.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                      backgroundColor: 'rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <span style={{ 
                      color: '#fff', 
                      fontFamily: 'monospace', 
                      fontWeight: 'bold', 
                      fontSize: '12px',
                      backgroundColor: 'rgba(0, 240, 255, 0.1)',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      {item.code}
                    </span>
                    <span style={{ color: '#aaa', fontSize: '12px' }}>{item.label}</span>
                    <input
                      type="color"
                      value={serviceColor?.bg || '#ffffff'}
                      onChange={(e) => updateServiceColor(item.code, 'bg', e.target.value)}
                      style={smallPickerStyle}
                      title="Couleur de fond"
                    />
                    <input
                      type="color"
                      value={serviceColor?.text || '#000000'}
                      onChange={(e) => updateServiceColor(item.code, 'text', e.target.value)}
                      style={smallPickerStyle}
                      title="Couleur du texte"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  /**
   * v4.0: Rendu d'une catégorie normale AVEC toggle Groupe/Individuel
   */
  const renderNormalCategory = (groupKey, category) => {
    const isExpanded = expandedGroups[groupKey];
    const groupColor = getGroupColor(groupKey);
    const mode = getCategoryMode(groupKey);
    const isGroupMode = mode === 'group';
    
    // Filtrer les items (exclure sous-catégories si présentes)
    const items = Object.entries(category.items || {})
      .filter(([_, item]) => !item.isSubCategory && !item.parentSubCategory);
    
    return (
      <div key={groupKey} style={categoryContainerStyle}>
        <div style={categoryHeaderStyle(context, isExpanded)} onClick={() => toggleGroup(groupKey)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isExpanded ? <ChevronUp size={18} color="#888" /> : <ChevronDown size={18} color="#888" />}
            <div>
              <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>{category.label}</div>
              <div style={{ color: '#888', fontSize: '11px', marginTop: '2px' }}>{category.description}</div>
            </div>
          </div>
          
          {/* Toggle + Color pickers dans le header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={(e) => e.stopPropagation()}>
            {/* Toggle Groupe/Individuel */}
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '6px',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '20px', padding: '4px'
            }}>
              <button
                onClick={() => setCategoryMode(groupKey, 'group')}
                style={toggleBtnStyle(isGroupMode, accentColor)}
              >
                Groupe
              </button>
              <button
                onClick={() => setCategoryMode(groupKey, 'individual')}
                style={toggleBtnStyle(!isGroupMode, accentColor)}
              >
                Individuel
              </button>
            </div>
            
            {/* Color pickers pour le groupe */}
            <input
              type="color"
              value={groupColor.bg || '#1a1a2e'}
              onChange={(e) => updateCategoryColor(groupKey, 'bg', e.target.value)}
              style={colorPickerStyle}
              title={isGroupMode ? "Couleur pour toute la catégorie" : "Couleur par défaut"}
            />
            <input
              type="color"
              value={groupColor.text || '#000000'}
              onChange={(e) => updateCategoryColor(groupKey, 'text', e.target.value)}
              style={colorPickerStyle}
              title={isGroupMode ? "Texte pour toute la catégorie" : "Texte par défaut"}
            />
          </div>
        </div>

        {/* Contenu : affiché seulement en mode Individuel ET si expanded */}
        {isExpanded && !isGroupMode && items.length > 0 && (
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            {items.map(([code, item], index) => {
              const serviceColor = colors.services?.[code] || {};
              return (
                <div key={code} style={itemRowStyle(index, items.length)}>
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
        
        {/* Message mode groupe */}
        {isExpanded && isGroupMode && items.length > 0 && (
          <div style={{ 
            padding: '12px', 
            color: '#888', 
            fontSize: '12px', 
            textAlign: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            Mode groupe : tous les éléments utilisent la même couleur
            <div style={{ marginTop: '6px', color: '#666', fontSize: '10px' }}>
              {items.map(([code]) => code).join(' • ')}
            </div>
          </div>
        )}
      </div>
    );
  };

  /**
   * v4.0: Rendu d'une catégorie avec sous-catégories (Poste Réserve, Habilitation/Formation)
   * Chaque sous-catégorie a aussi son toggle Groupe/Individuel
   */
  const renderSubCategoryGroup = (groupKey, category) => {
    const isExpanded = expandedGroups[groupKey];
    const groupColor = getGroupColor(groupKey);
    const categoryMode = getCategoryMode(groupKey);
    const isCategoryGroupMode = categoryMode === 'group';
    
    return (
      <div key={groupKey} style={categoryContainerStyle}>
        <div style={categoryHeaderStyle(context, isExpanded)} onClick={() => toggleGroup(groupKey)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isExpanded ? <ChevronUp size={18} color="#888" /> : <ChevronDown size={18} color="#888" />}
            <div>
              <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>{category.label}</div>
              <div style={{ color: '#888', fontSize: '11px', marginTop: '2px' }}>{category.description}</div>
            </div>
          </div>
          
          {/* Toggle + Color pickers pour la catégorie entière */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '6px',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '20px', padding: '4px'
            }}>
              <button
                onClick={() => setCategoryMode(groupKey, 'group')}
                style={toggleBtnStyle(isCategoryGroupMode, accentColor)}
              >
                Groupe
              </button>
              <button
                onClick={() => setCategoryMode(groupKey, 'individual')}
                style={toggleBtnStyle(!isCategoryGroupMode, accentColor)}
              >
                Individuel
              </button>
            </div>
            
            <input
              type="color"
              value={groupColor.bg || '#e0e7ff'}
              onChange={(e) => updateCategoryColor(groupKey, 'bg', e.target.value)}
              style={colorPickerStyle}
              title={isCategoryGroupMode ? "Couleur pour toute la catégorie" : "Couleur par défaut"}
            />
            <input
              type="color"
              value={groupColor.text || '#3730a3'}
              onChange={(e) => updateCategoryColor(groupKey, 'text', e.target.value)}
              style={colorPickerStyle}
              title={isCategoryGroupMode ? "Texte pour toute la catégorie" : "Texte par défaut"}
            />
          </div>
        </div>

        {/* Mode groupe pour toute la catégorie */}
        {isExpanded && isCategoryGroupMode && (
          <div style={{ 
            padding: '12px', 
            color: '#888', 
            fontSize: '12px', 
            textAlign: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            Mode groupe : tous les postes utilisent la même couleur
            <div style={{ marginTop: '6px', color: '#666', fontSize: '10px' }}>
              {Object.keys(category.subCategories || {}).join(' • ')}
            </div>
          </div>
        )}

        {/* Mode individuel : afficher les sous-catégories */}
        {isExpanded && !isCategoryGroupMode && category.subCategories && (
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            {Object.entries(category.subCategories).map(([subCatCode, subCat]) => {
              const subMode = getSubCategoryMode(subCatCode);
              const isSubGroupMode = subMode === 'group';
              const subCatColor = colors.services?.[subCatCode] || subCat.defaultColor || groupColor;
              
              // Récupérer les horaires spécifiques à cette sous-catégorie
              const horaires = getHorairesForSubCategory(subCatCode);
              
              return (
                <div key={subCatCode} style={{ 
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  padding: '12px',
                  backgroundColor: 'rgba(0, 0, 0, 0.1)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: isSubGroupMode ? 0 : '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '13px' }}>{subCatCode}</span>
                      <span style={{ color: '#888', fontSize: '11px' }}>{subCat.label}</span>
                      {horaires.length === 2 && (
                        <span style={{ 
                          color: '#666', 
                          fontSize: '9px', 
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          Matin/Soir
                        </span>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ 
                        display: 'flex', alignItems: 'center', gap: '6px',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: '20px', padding: '4px'
                      }}>
                        <button
                          onClick={() => setSubCategoryMode(subCatCode, 'group')}
                          style={toggleBtnStyle(isSubGroupMode, accentColor)}
                        >
                          Groupe
                        </button>
                        <button
                          onClick={() => setSubCategoryMode(subCatCode, 'individual')}
                          style={toggleBtnStyle(!isSubGroupMode, accentColor)}
                        >
                          Individuel
                        </button>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="color"
                          value={subCatColor.bg || groupColor.bg || '#e0e7ff'}
                          onChange={(e) => updateSubCategoryColor(subCatCode, 'bg', e.target.value)}
                          style={colorPickerStyle}
                          title={isSubGroupMode ? "Couleur pour tout le groupe" : "Couleur de base"}
                        />
                        <input
                          type="color"
                          value={subCatColor.text || groupColor.text || '#3730a3'}
                          onChange={(e) => updateSubCategoryColor(subCatCode, 'text', e.target.value)}
                          style={colorPickerStyle}
                          title={isSubGroupMode ? "Texte pour tout le groupe" : "Texte de base"}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {!isSubGroupMode && (
                    <div style={{ 
                      marginTop: '10px', paddingTop: '10px',
                      borderTop: '1px dashed rgba(255, 255, 255, 0.1)'
                    }}>
                      {horaires.map(horaire => {
                        const combinedCode = `${subCatCode} ${horaire.code}`;
                        const combinedColor = colors.services?.[combinedCode] || subCatColor;
                        
                        return (
                          <div key={combinedCode} style={{
                            display: 'grid',
                            gridTemplateColumns: '100px 1fr 40px 40px',
                            padding: '6px 0', alignItems: 'center', gap: '8px'
                          }}>
                            <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: '11px', fontWeight: 'bold' }}>
                              {combinedCode}
                            </span>
                            <span style={{ color: '#888', fontSize: '11px' }}>{horaire.label}</span>
                            <input
                              type="color"
                              value={combinedColor.bg || subCatColor.bg || '#e0e7ff'}
                              onChange={(e) => updateServiceColor(combinedCode, 'bg', e.target.value)}
                              style={smallPickerStyle}
                            />
                            <input
                              type="color"
                              value={combinedColor.text || subCatColor.text || '#3730a3'}
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
          
          {/* Barre de recherche */}
          <div style={{
            position: 'relative',
            marginBottom: '16px'
          }}>
            <Search 
              size={18} 
              color="#888" 
              style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)' 
              }} 
            />
            <input
              type="text"
              placeholder="Rechercher un code (ex: FO, CRC, MA...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 40px',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                border: `1px solid ${searchTerm ? accentColor : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={16} color="#888" />
              </button>
            )}
          </div>

          {/* Résultats de recherche OU Catégories */}
          {isSearching ? (
            renderSearchResults()
          ) : (
            <>
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

              {Object.entries(COLOR_CATEGORIES).map(([groupKey, category]) => {
                if (category.hasSubCategories) {
                  return renderSubCategoryGroup(groupKey, category);
                }
                return renderNormalCategory(groupKey, category);
              })}

              {/* Autres éléments - Texte libre (toujours visible) */}
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
            </>
          )}
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

const toggleBtnStyle = (active, accentColor) => ({
  padding: '4px 10px', borderRadius: '16px', border: 'none',
  fontSize: '10px', fontWeight: 'bold', cursor: 'pointer',
  backgroundColor: active ? accentColor : 'transparent',
  color: active ? '#1a1a2e' : '#888',
  transition: 'all 0.2s'
});

const categoryContainerStyle = {
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
  borderRadius: '8px', overflow: 'hidden', marginBottom: '12px',
  border: '1px solid rgba(255, 255, 255, 0.1)'
};

const categoryHeaderStyle = (context, isExpanded) => ({
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '12px',
  backgroundColor: isExpanded 
    ? (context === 'perso' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(0, 240, 255, 0.15)')
    : (context === 'perso' ? 'rgba(168, 85, 247, 0.05)' : 'rgba(0, 240, 255, 0.05)'),
  cursor: 'pointer',
  transition: 'background-color 0.2s'
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
