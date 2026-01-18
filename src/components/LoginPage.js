import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { generateSNCFEmail, DEFAULT_PASSWORD } from '../services/userManagementService';

// Train Icon SVG
const TrainIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="3" width="16" height="14" rx="2" />
    <path d="M4 11h16" />
    <circle cx="8" cy="19" r="2" />
    <circle cx="16" cy="19" r="2" />
    <path d="M8 11V7" />
    <path d="M16 11V7" />
  </svg>
);

// Calendar Icon
const CalendarIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
    <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
  </svg>
);

// Eye icons for password visibility
const EyeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

// Lock Icon
const LockIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

// Refresh Icon
const RefreshIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 4v6h-6M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const LoginPage = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [emailSource, setEmailSource] = useState(''); // 'db' ou 'generated'
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(true);

  // Load agents from Supabase (avec email)
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const { data, error } = await supabase
          .from('agents')
          .select('id, nom, prenom, email')
          .order('nom', { ascending: true });
        
        if (error) throw error;
        setAgents(data || []);
      } catch (err) {
        console.error('Erreur chargement agents:', err);
      } finally {
        setLoadingAgents(false);
      }
    };
    fetchAgents();
  }, []);

  // Generate/load email when agent is selected
  useEffect(() => {
    if (selectedAgent) {
      const agent = agents.find(a => a.id === selectedAgent);
      if (agent) {
        // Priorité : email de la base de données, sinon email généré
        if (agent.email && agent.email.trim() !== '') {
          setGeneratedEmail(agent.email);
          setEmailSource('db');
        } else {
          setGeneratedEmail(generateSNCFEmail(agent.nom, agent.prenom));
          setEmailSource('generated');
        }
      }
    } else {
      setGeneratedEmail('');
      setEmailSource('');
    }
  }, [selectedAgent, agents]);

  // Régénérer l'email automatiquement
  const regenerateEmail = () => {
    const agent = agents.find(a => a.id === selectedAgent);
    if (agent) {
      setGeneratedEmail(generateSNCFEmail(agent.nom, agent.prenom));
      setEmailSource('generated');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (data.user) {
        onLogin(data.user);
      }
    } catch (err) {
      setError(err.message === 'Invalid login credentials' 
        ? 'Email ou mot de passe incorrect' 
        : err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (!selectedAgent) {
      setError('Veuillez sélectionner votre nom');
      return;
    }
    
    if (!generatedEmail) {
      setError('L\'email est requis');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Les nouveaux mots de passe ne correspondent pas');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    if (newPassword === currentPassword) {
      setError('Le nouveau mot de passe doit être différent de l\'actuel');
      return;
    }
    
    setLoading(true);
    
    try {
      // 1. D'abord se connecter avec le mot de passe actuel
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: generatedEmail,
        password: currentPassword,
      });
      
      if (signInError) {
        if (signInError.message === 'Invalid login credentials') {
          throw new Error('Mot de passe actuel incorrect');
        }
        throw signInError;
      }
      
      // 2. Mettre à jour le mot de passe
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (updateError) throw updateError;
      
      // 3. Déconnecter l'utilisateur pour qu'il se reconnecte avec le nouveau mot de passe
      await supabase.auth.signOut();
      
      setSuccess('Mot de passe modifié avec succès ! Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.');
      setSelectedAgent('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Basculer vers l'onglet connexion après 2 secondes
      setTimeout(() => {
        setActiveTab('login');
        setEmail(generatedEmail);
        setSuccess(null);
      }, 3000);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Entrez votre email pour réinitialiser le mot de passe');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSuccess('Un email de réinitialisation a été envoyé');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
        {/* Rail tracks decoration */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-transparent via-gray-600 to-transparent opacity-30" />
        <div className="absolute bottom-4 left-0 right-0 h-2 bg-gradient-to-r from-transparent via-gray-600 to-transparent opacity-20" />
      </div>
      
      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-800 to-blue-900 px-6 py-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <TrainIcon className="w-10 h-10 text-white" />
              <CalendarIcon className="w-8 h-8 text-blue-200" />
            </div>
            <h1 className="text-2xl font-bold text-white">Planning COGC</h1>
            <p className="text-blue-200 text-sm mt-1">Paris Nord • Denfert-Rochereau</p>
            {/* SNCF badge */}
            <div className="mt-4 inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-xs text-white font-medium">SNCF Réseau</span>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => { setActiveTab('login'); setError(null); setSuccess(null); }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'login'
                  ? 'text-blue-800 border-b-2 border-blue-800 bg-blue-50/50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Connexion
            </button>
            <button
              onClick={() => { setActiveTab('password'); setError(null); setSuccess(null); }}
              className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'password'
                  ? 'text-blue-800 border-b-2 border-blue-800 bg-blue-50/50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LockIcon className="w-4 h-4" />
              Modifier mot de passe
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6">
            {/* Messages */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4m0 4h.01" />
                </svg>
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-start gap-2">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {success}
              </div>
            )}
            
            {/* Login Form */}
            {activeTab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email professionnel
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="prenom.nom@reseau.sncf.fr"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Par défaut : 123456"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Mot de passe initial : <span className="font-mono bg-gray-100 px-1 rounded">{DEFAULT_PASSWORD}</span>
                  </p>
                </div>
                
                <div className="flex items-center justify-end">
                  <button 
                    type="button" 
                    onClick={handleForgotPassword}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-700 to-blue-800 text-white font-medium rounded-lg hover:from-blue-800 hover:to-blue-900 disabled:from-gray-400 disabled:to-gray-500 transition-all shadow-lg hover:shadow-xl disabled:shadow-none"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Connexion en cours...
                    </span>
                  ) : (
                    'Se connecter'
                  )}
                </button>
              </form>
            )}
            
            {/* Change Password Form */}
            {activeTab === 'password' && (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                  <p className="text-xs text-amber-700">
                    <strong>💡 Première connexion ?</strong><br/>
                    Votre mot de passe initial est <span className="font-mono bg-amber-100 px-1 rounded">{DEFAULT_PASSWORD}</span>.<br/>
                    Changez-le ici pour sécuriser votre compte.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Sélectionnez votre nom
                  </label>
                  <select
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
                    required
                    disabled={loadingAgents}
                  >
                    <option value="">
                      {loadingAgents ? 'Chargement...' : '-- Choisir un agent --'}
                    </option>
                    {agents.map(agent => (
                      <option key={agent.id} value={agent.id}>
                        {agent.nom} {agent.prenom}
                      </option>
                    ))}
                  </select>
                </div>
                
                {selectedAgent && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-blue-600 font-medium">Votre email :</p>
                      {emailSource === 'db' && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          ✓ Depuis l'annuaire
                        </span>
                      )}
                      {emailSource === 'generated' && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          Généré automatiquement
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="email"
                        value={generatedEmail}
                        onChange={(e) => {
                          setGeneratedEmail(e.target.value);
                          setEmailSource('manual');
                        }}
                        className="flex-1 px-3 py-1.5 bg-white border border-blue-300 rounded text-blue-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="prenom.nom@reseau.sncf.fr"
                      />
                      <button
                        type="button"
                        onClick={regenerateEmail}
                        className="p-1.5 bg-blue-200 hover:bg-blue-300 text-blue-700 rounded transition-colors"
                        title="Régénérer l'email automatiquement"
                      >
                        <RefreshIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-blue-500 mt-2">
                      💡 Vous pouvez modifier cet email si nécessaire, ou le mettre à jour dans l'annuaire.
                    </p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Mot de passe actuel
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Mot de passe actuel (123456 si premier changement)"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 caractères"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow pr-10"
                      required
                      minLength="6"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Confirmer le nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Retapez le nouveau mot de passe"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading || !selectedAgent}
                  className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-green-700 text-white font-medium rounded-lg hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 transition-all shadow-lg hover:shadow-xl disabled:shadow-none"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Modification en cours...
                    </span>
                  ) : (
                    'Modifier le mot de passe'
                  )}
                </button>
                
                <p className="text-xs text-gray-500 text-center mt-4">
                  🔒 Après modification, vous serez redirigé vers la page de connexion.
                </p>
              </form>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          © 2025 COGC Planning • Paris Nord
        </p>
      </div>
    </div>
  );
};

export default LoginPage;