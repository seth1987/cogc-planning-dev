import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

// Generate SNCF email from agent name
const generateEmail = (nom, prenom) => {
  if (!nom || !prenom) return '';
  const cleanNom = nom.toLowerCase()
    .replace(/\s+/g, '-')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cleanPrenom = prenom.toLowerCase()
    .replace(/\s+/g, '-')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return `${cleanPrenom}.${cleanNom}@reseau.sncf.fr`;
};

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

const LoginPage = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(true);

  // Load agents from Supabase
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const { data, error } = await supabase
          .from('agents')
          .select('id, nom, prenom')
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

  // Generate email when agent is selected
  useEffect(() => {
    if (selectedAgent) {
      const agent = agents.find(a => a.id === parseInt(selectedAgent));
      if (agent) {
        setGeneratedEmail(generateEmail(agent.nom, agent.prenom));
      }
    } else {
      setGeneratedEmail('');
    }
  }, [selectedAgent, agents]);

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

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    setLoading(true);
    
    try {
      const agent = agents.find(a => a.id === parseInt(selectedAgent));
      
      const { error } = await supabase.auth.signUp({
        email: generatedEmail,
        password,
        options: {
          data: {
            agent_id: agent.id,
            nom: agent.nom,
            prenom: agent.prenom,
          }
        }
      });
      
      if (error) throw error;
      
      setSuccess(`Un email de confirmation a été envoyé à ${generatedEmail}. Vérifiez votre boîte mail SNCF.`);
      setSelectedAgent('');
      setPassword('');
      setConfirmPassword('');
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
              onClick={() => { setActiveTab('signup'); setError(null); setSuccess(null); }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'signup'
                  ? 'text-blue-800 border-b-2 border-blue-800 bg-blue-50/50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Inscription
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
            
            {/* Signup Form */}
            {activeTab === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-4">
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
                
                {generatedEmail && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-600 font-medium mb-1">Email de connexion :</p>
                    <p className="text-sm text-blue-800 font-mono">{generatedEmail}</p>
                    <p className="text-xs text-blue-500 mt-2">
                      📧 Un email de confirmation sera envoyé à cette adresse
                    </p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Créer un mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 caractères"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow pr-10"
                      required
                      minLength="6"
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
                    Confirmer le mot de passe
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading || !selectedAgent}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-700 to-blue-800 text-white font-medium rounded-lg hover:from-blue-800 hover:to-blue-900 disabled:from-gray-400 disabled:to-gray-500 transition-all shadow-lg hover:shadow-xl disabled:shadow-none"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Création en cours...
                    </span>
                  ) : (
                    "S'inscrire"
                  )}
                </button>
                
                <p className="text-xs text-gray-500 text-center mt-4">
                  🔒 Seuls les agents COGC Paris Nord peuvent s'inscrire.<br/>
                  L'accès à votre boîte email SNCF est requis pour valider l'inscription.
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
