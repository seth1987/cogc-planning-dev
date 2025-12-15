import React, { useRef } from 'react';
import { X, Download, Upload, RotateCcw, Palette, Save } from 'lucide-react';
import { SERVICE_LABELS } from '../../constants/defaultColors';
import useColors from '../../hooks/useColors';

const ModalCouleurs = ({ isOpen, onClose }) => {
  const {
    colors,
    updateServiceColor,
    updatePostesSupp,
    updateTexteLibre,
    resetColors,
    exportColors,
    importColors,
  } = useColors();
  
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importColors(file);
      alert('Configuration importee avec succes !');
    } catch (error) {
      alert('Erreur: ' + error.message);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReset = () => {
    if (window.confirm('Reinitialiser toutes les couleurs aux valeurs par defaut ?')) {
      resetColors();
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

  const serviceKeys = Object.keys(SERVICE_LABELS);

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
        zIndex: 9999,
        padding: '20px',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          backgroundColor: '#1a1a2e',
          borderRadius: '12px',
          border: '1px solid rgba(0, 240, 255, 0.3)',
          boxShadow: '0 0 40px rgba(0, 240, 255, 0.2)',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(0, 240, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Palette size={24} color="#00f0ff" />
            <h2 style={{ margin: 0, color: '#ffffff', fontSize: '18px' }}>
              Personnaliser les couleurs
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
          >
            <X size={24} color="#ffffff" />
          </button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          <h3 style={{ color: '#00f0ff', marginTop: 0, marginBottom: '12px', fontSize: '14px', textTransform: 'uppercase' }}>
            Services
          </h3>
          
          <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr 80px 80px',
                padding: '10px 12px',
                backgroundColor: 'rgba(0, 240, 255, 0.1)',
                borderBottom: '1px solid rgba(0, 240, 255, 0.2)',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#00f0ff',
              }}
            >
              <span>Code</span>
              <span>Description</span>
              <span style={{ textAlign: 'center' }}>Fond</span>
              <span style={{ textAlign: 'center' }}>Texte</span>
            </div>

            {serviceKeys.map((code, index) => (
              <div
                key={code}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr 80px 80px',
                  padding: '8px 12px',
                  alignItems: 'center',
                  borderBottom: index < serviceKeys.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                }}
              >
                <span style={{ color: '#ffffff', fontFamily: 'monospace', fontWeight: 'bold' }}>{code}</span>
                <span style={{ color: '#cccccc', fontSize: '13px' }}>{SERVICE_LABELS[code]}</span>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <input
                    type="color"
                    value={colors.services[code]?.bg === 'transparent' ? '#1a1a2e' : colors.services[code]?.bg || '#1a1a2e'}
                    onChange={(e) => updateServiceColor(code, 'bg', e.target.value)}
                    style={colorPickerStyle}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <input
                    type="color"
                    value={colors.services[code]?.text || '#ffffff'}
                    onChange={(e) => updateServiceColor(code, 'text', e.target.value)}
                    style={colorPickerStyle}
                  />
                </div>
              </div>
            ))}
          </div>

          <h3 style={{ color: '#00f0ff', marginBottom: '12px', fontSize: '14px', textTransform: 'uppercase' }}>
            Autres elements
          </h3>

          <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', padding: '10px 12px', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <span style={{ color: '#cccccc', fontSize: '13px' }}>Postes supplementaires (+ACR, +RO...)</span>
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

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(0, 240, 255, 0.2)' }}>
            <button
              onClick={exportColors}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', backgroundColor: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '6px', color: '#00f0ff', cursor: 'pointer', fontSize: '13px' }}
            >
              <Download size={16} /> Exporter
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', backgroundColor: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '6px', color: '#00f0ff', cursor: 'pointer', fontSize: '13px' }}
            >
              <Upload size={16} /> Importer
            </button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
            <button
              onClick={handleReset}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', backgroundColor: 'rgba(255, 100, 100, 0.1)', border: '1px solid rgba(255, 100, 100, 0.3)', borderRadius: '6px', color: '#ff6464', cursor: 'pointer', fontSize: '13px' }}
            >
              <RotateCcw size={16} /> Reinitialiser
            </button>
          </div>
        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(0, 240, 255, 0.2)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 24px', backgroundColor: '#00f0ff', border: 'none', borderRadius: '6px', color: '#1a1a2e', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
          >
            <Save size={16} /> Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalCouleurs;
