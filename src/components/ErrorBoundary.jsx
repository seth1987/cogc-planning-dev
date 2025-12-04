import React, { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * ErrorBoundary - Composant de capture d'erreurs React
 * 
 * Capture les erreurs JavaScript dans l'arbre de composants enfants,
 * log ces erreurs, et affiche une UI de fallback élégante.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Met à jour l'état quand une erreur est attrapée
   */
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  /**
   * Log les informations d'erreur pour le debugging
   */
  componentDidCatch(error, errorInfo) {
    console.error('🔴 ErrorBoundary caught an error:', error);
    console.error('📍 Component Stack:', errorInfo.componentStack);
    
    this.setState({ errorInfo });

    // Optionnel: Envoyer à un service de monitoring
    // if (process.env.NODE_ENV === 'production') {
    //   logErrorToService(error, errorInfo);
    // }
  }

  /**
   * Réinitialise l'état d'erreur et permet de réessayer
   */
  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Recharge la page complètement
   */
  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // UI de fallback personnalisée ou par défaut
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          resetError: this.handleReset,
        });
      }

      // UI de fallback par défaut
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            {/* Icône d'erreur */}
            <div className="mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>

            {/* Titre */}
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Une erreur est survenue
            </h2>

            {/* Description */}
            <p className="text-gray-600 mb-6">
              L'application a rencontré un problème inattendu. 
              Vous pouvez essayer de recharger la page ou contacter le support.
            </p>

            {/* Détails de l'erreur (mode dev uniquement) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 text-left">
                <details className="bg-red-50 border border-red-200 rounded p-3">
                  <summary className="text-red-800 font-medium cursor-pointer">
                    Détails techniques
                  </summary>
                  <pre className="mt-2 text-xs text-red-700 overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Réessayer
              </button>
              
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Recharger la page
              </button>
            </div>

            {/* Lien de contact (optionnel) */}
            <p className="mt-6 text-sm text-gray-500">
              Si le problème persiste, contactez le support technique.
            </p>
          </div>
        </div>
      );
    }

    // Pas d'erreur, rendre les enfants normalement
    return this.props.children;
  }
}

/**
 * HOC pour envelopper un composant avec ErrorBoundary
 * @param {React.Component} WrappedComponent - Composant à protéger
 * @param {Object} options - Options de configuration
 */
export function withErrorBoundary(WrappedComponent, options = {}) {
  const { fallback } = options;
  
  return function WithErrorBoundary(props) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;
