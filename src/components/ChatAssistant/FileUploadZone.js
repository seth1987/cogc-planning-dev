/**
 * Composant FileUploadZone
 * Zone de drag & drop pour uploader un PDF
 */

import React, { useRef, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';

export default function FileUploadZone({ onFileSelect, disabled = false }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Formater la taille du fichier
  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
        transition-all duration-200
        ${isDragOver
          ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
          : selectedFile
          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
          : 'border-gray-300 dark:border-gray-600 hover:border-cyan-400 hover:bg-gray-50 dark:hover:bg-gray-800'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {selectedFile ? (
        // Fichier sélectionné
        <div className="flex items-center justify-center gap-3">
          <FileText className="w-8 h-8 text-green-500" />
          <div className="text-left">
            <p className="font-medium text-gray-900 dark:text-white">
              {selectedFile.name}
            </p>
            <p className="text-sm text-gray-500">
              {formatSize(selectedFile.size)}
            </p>
          </div>
          <button
            onClick={handleClear}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      ) : (
        // Zone vide
        <>
          <Upload
            className={`w-10 h-10 mx-auto mb-3 ${
              isDragOver ? 'text-cyan-500' : 'text-gray-400'
            }`}
          />
          <p className="text-gray-600 dark:text-gray-300 mb-1">
            {isDragOver
              ? 'Déposez le fichier ici'
              : 'Glissez votre bulletin PDF ici'}
          </p>
          <p className="text-sm text-gray-400">
            ou cliquez pour sélectionner
          </p>
        </>
      )}
    </div>
  );
}
