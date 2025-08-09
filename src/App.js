import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    // Vérifier la session au chargement
    checkUser();

    // Écouter les changements d'auth
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'utilisateur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('Vérifiez votre email pour confirmer votre inscription!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      alert(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="App flex items-center justify-center min-h-screen">
        <div className="card p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold text-center mb-8">
            Planning COGC Paris Nord
          </h1>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
            >
              {isSignUp ? 'S\'inscrire' : 'Se connecter'}
            </button>
          </form>
          <p className="text-center mt-4">
            {isSignUp ? 'Déjà un compte?' : 'Pas encore de compte?'}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-purple-600 ml-2 hover:underline"
            >
              {isSignUp ? 'Se connecter' : 'S\'inscrire'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="App min-h-screen">
      <header className="App-header p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-purple-700">
            Planning COGC Paris Nord
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">Bienvenue, {user.email}</span>
            <button
              onClick={handleSignOut}
              className="btn-secondary text-sm"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card p-6 fade-in">
            <h2 className="text-xl font-semibold mb-4">📅 Planning du mois</h2>
            <p className="text-gray-600">
              Consultez et gérez le planning des gardes pour le mois en cours.
            </p>
            <button className="btn-primary mt-4">Voir le planning</button>
          </div>

          <div className="card p-6 fade-in" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-xl font-semibold mb-4">🔔 Mes gardes</h2>
            <p className="text-gray-600">
              Visualisez vos gardes programmées et vos disponibilités.
            </p>
            <button className="btn-primary mt-4">Mes gardes</button>
          </div>

          <div className="card p-6 fade-in" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-xl font-semibold mb-4">🏖 Congés & Absences</h2>
            <p className="text-gray-600">
              Déclarez vos absences et gérez vos demandes de congés.
            </p>
            <button className="btn-primary mt-4">Gérer</button>
          </div>

          <div className="card p-6 fade-in" style={{ animationDelay: '0.3s' }}>
            <h2 className="text-xl font-semibold mb-4">📊 Statistiques</h2>
            <p className="text-gray-600">
              Consultez les statistiques et rapports d'activité.
            </p>
            <button className="btn-primary mt-4">Voir stats</button>
          </div>

          <div className="card p-6 fade-in" style={{ animationDelay: '0.4s' }}>
            <h2 className="text-xl font-semibold mb-4">👥 Équipe</h2>
            <p className="text-gray-600">
              Liste des médecins et contacts de l'équipe.
            </p>
            <button className="btn-primary mt-4">Voir l'équipe</button>
          </div>

          <div className="card p-6 fade-in" style={{ animationDelay: '0.5s' }}>
            <h2 className="text-xl font-semibold mb-4">⚙️ Paramètres</h2>
            <p className="text-gray-600">
              Gérez vos préférences et paramètres de compte.
            </p>
            <button className="btn-primary mt-4">Paramètres</button>
          </div>
        </div>

        <div className="mt-8 card p-6">
          <h2 className="text-xl font-semibold mb-4">📈 Aperçu rapide</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">12</div>
              <div className="text-gray-600">Gardes ce mois</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">3</div>
              <div className="text-gray-600">Prochaines gardes</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">8</div>
              <div className="text-gray-600">Médecins actifs</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">2</div>
              <div className="text-gray-600">Demandes en attente</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;