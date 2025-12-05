-- ============================================
-- Migration COGC Planning - Persistance des données
-- Date: 05/12/2025
-- Description: Ajoute les colonnes pour persister les postes supplémentaires
--              et crée une table pour les statuts figé/rapatrié
-- ============================================

-- ============================================
-- 1. MODIFICATION TABLE PLANNING
-- Ajout colonne pour les postes supplémentaires (italiques)
-- ============================================

-- Vérifier si la colonne existe avant de l'ajouter
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'planning' AND column_name = 'postes_supplementaires'
    ) THEN
        ALTER TABLE planning ADD COLUMN postes_supplementaires JSONB DEFAULT '[]'::jsonb;
        COMMENT ON COLUMN planning.postes_supplementaires IS 'Liste des postes supplémentaires affichés en italique (ex: ["+SOUF", "+RC"])';
    END IF;
END $$;

-- ============================================
-- 2. CRÉATION TABLE POSTES_STATUS
-- Pour stocker les états figé/rapatrié par date et créneau
-- ============================================

CREATE TABLE IF NOT EXISTS postes_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    creneau VARCHAR(20) NOT NULL CHECK (creneau IN ('nuitAvant', 'matin', 'soir', 'nuitApres')),
    poste VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('fige', 'rapatrie')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contrainte d'unicité: un seul statut par date/créneau/poste
    UNIQUE(date, creneau, poste)
);

-- Index pour les requêtes par date
CREATE INDEX IF NOT EXISTS idx_postes_status_date ON postes_status(date);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_postes_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_postes_status_updated_at ON postes_status;
CREATE TRIGGER trigger_update_postes_status_updated_at
    BEFORE UPDATE ON postes_status
    FOR EACH ROW
    EXECUTE FUNCTION update_postes_status_updated_at();

-- Commentaires sur la table
COMMENT ON TABLE postes_status IS 'Statuts des postes (figé/rapatrié) par jour et créneau pour le modal Équipes du Jour';
COMMENT ON COLUMN postes_status.creneau IS 'Créneau horaire: nuitAvant, matin, soir, nuitApres';
COMMENT ON COLUMN postes_status.poste IS 'Code du poste: CRC, ACR, RC, RO, CCU, RE, CAC, SOUFF';
COMMENT ON COLUMN postes_status.status IS 'Statut: fige ou rapatrie';

-- ============================================
-- 3. POLITIQUE RLS (Row Level Security)
-- ============================================

-- Activer RLS sur la nouvelle table
ALTER TABLE postes_status ENABLE ROW LEVEL SECURITY;

-- Politique pour lecture (tout le monde peut lire)
CREATE POLICY IF NOT EXISTS "postes_status_select_policy" ON postes_status
    FOR SELECT
    USING (true);

-- Politique pour insertion (tout le monde peut insérer)
CREATE POLICY IF NOT EXISTS "postes_status_insert_policy" ON postes_status
    FOR INSERT
    WITH CHECK (true);

-- Politique pour mise à jour (tout le monde peut mettre à jour)
CREATE POLICY IF NOT EXISTS "postes_status_update_policy" ON postes_status
    FOR UPDATE
    USING (true);

-- Politique pour suppression (tout le monde peut supprimer)
CREATE POLICY IF NOT EXISTS "postes_status_delete_policy" ON postes_status
    FOR DELETE
    USING (true);

-- ============================================
-- 4. VÉRIFICATION
-- ============================================

-- Vérifier que les colonnes ont été créées
SELECT 
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('planning', 'postes_status')
ORDER BY table_name, ordinal_position;
