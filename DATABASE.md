# Structure de la base de données

## Tables principales

### 1. profiles
Table des profils utilisateurs (médecins)

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  telephone VARCHAR(20),
  specialite VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. plannings
Table des plannings mensuels

```sql
CREATE TABLE plannings (
  id SERIAL PRIMARY KEY,
  mois INT NOT NULL CHECK (mois >= 1 AND mois <= 12),
  annee INT NOT NULL CHECK (annee >= 2024),
  statut VARCHAR(20) DEFAULT 'draft',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(mois, annee)
);
```

### 3. gardes
Table des gardes assignées

```sql
CREATE TABLE gardes (
  id SERIAL PRIMARY KEY,
  planning_id INT REFERENCES plannings(id) ON DELETE CASCADE,
  medecin_id UUID REFERENCES profiles(id),
  date DATE NOT NULL,
  type_garde VARCHAR(20) NOT NULL, -- 'jour', 'nuit', 'weekend'
  statut VARCHAR(20) DEFAULT 'confirmé',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(date, type_garde)
);
```

### 4. absences
Table des absences et congés

```sql
CREATE TABLE absences (
  id SERIAL PRIMARY KEY,
  medecin_id UUID REFERENCES profiles(id),
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  type_absence VARCHAR(50), -- 'congé', 'formation', 'maladie', etc.
  motif TEXT,
  approuve BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  CHECK (date_fin >= date_debut)
);
```

## Policies RLS (Row Level Security)

Toutes les tables ont des policies RLS activées pour sécuriser l'accès aux données.