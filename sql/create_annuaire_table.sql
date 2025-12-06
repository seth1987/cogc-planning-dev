-- =============================================
-- COGC Planning - Table Annuaire
-- Script de création de la table annuaire
-- =============================================

-- Créer la table annuaire
CREATE TABLE IF NOT EXISTS annuaire (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    groupe VARCHAR(100) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    telephone VARCHAR(20),
    email VARCHAR(100),
    contact_groupe VARCHAR(100),
    telephone_groupe VARCHAR(20),
    email_groupe VARCHAR(100),
    ordre_affichage INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour la recherche
CREATE INDEX IF NOT EXISTS idx_annuaire_groupe ON annuaire(groupe);
CREATE INDEX IF NOT EXISTS idx_annuaire_nom ON annuaire(nom);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_annuaire_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_annuaire_updated_at ON annuaire;
CREATE TRIGGER trigger_annuaire_updated_at
    BEFORE UPDATE ON annuaire
    FOR EACH ROW
    EXECUTE FUNCTION update_annuaire_updated_at();

-- RLS (Row Level Security) - Permettre à tous les utilisateurs authentifiés de lire/modifier
ALTER TABLE annuaire ENABLE ROW LEVEL SECURITY;

-- Policy pour lecture (tous les utilisateurs authentifiés)
DROP POLICY IF EXISTS "Lecture annuaire pour utilisateurs authentifiés" ON annuaire;
CREATE POLICY "Lecture annuaire pour utilisateurs authentifiés" ON annuaire
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy pour modification (tous les utilisateurs authentifiés)
DROP POLICY IF EXISTS "Modification annuaire pour utilisateurs authentifiés" ON annuaire;
CREATE POLICY "Modification annuaire pour utilisateurs authentifiés" ON annuaire
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy pour insertion (tous les utilisateurs authentifiés)
DROP POLICY IF EXISTS "Insertion annuaire pour utilisateurs authentifiés" ON annuaire;
CREATE POLICY "Insertion annuaire pour utilisateurs authentifiés" ON annuaire
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- =============================================
-- Insertion des données initiales
-- =============================================

-- Vider la table si elle existe déjà
TRUNCATE TABLE annuaire;

-- CRC - ROULEMENT CRC COGC
INSERT INTO annuaire (groupe, nom, telephone, email, contact_groupe, telephone_groupe, email_groupe, ordre_affichage) VALUES
('CRC - ROULEMENT CRC COGC', 'BOUCHEMAL Fahim', '', '', 'CRC PARIS NORD', '01 48 78 84 15', 'chef-regul.pc@sncf.fr', 1),
('CRC - ROULEMENT CRC COGC', 'LUCHIER Fabien', '', '', 'CRC PARIS NORD', '01 48 78 84 15', 'chef-regul.pc@sncf.fr', 2),
('CRC - ROULEMENT CRC COGC', 'MANSOURI Djamel', '', '', 'CRC PARIS NORD', '01 48 78 84 15', 'chef-regul.pc@sncf.fr', 3),
('CRC - ROULEMENT CRC COGC', 'BOUCHER Gregory', '06 29 75 05 49', 'gregory.boucher@sncf.fr', 'CRC PARIS NORD', '01 48 78 84 15', 'chef-regul.pc@sncf.fr', 4);

-- ACR - ROULEMENT ACR GOGC
INSERT INTO annuaire (groupe, nom, telephone, email, contact_groupe, telephone_groupe, email_groupe, ordre_affichage) VALUES
('ACR - ROULEMENT ACR GOGC', 'BARROIRE Suzy', '', '', 'ACR', '01 55 31 34 12', 'te.pcpn@sncf.fr', 1),
('ACR - ROULEMENT ACR GOGC', 'AVAKIAN Jason', '', '', 'ACR', '01 55 31 34 12', 'te.pcpn@sncf.fr', 2),
('ACR - ROULEMENT ACR GOGC', 'SIMON Jeremie', '', '', 'ACR', '01 55 31 34 12', 'te.pcpn@sncf.fr', 3),
('ACR - ROULEMENT ACR GOGC', 'VERHELLE Julian', '', '', 'ACR', '01 55 31 34 12', 'te.pcpn@sncf.fr', 4);

-- RC - ROULEMENT REGULATEUR CENTRE
INSERT INTO annuaire (groupe, nom, telephone, email, contact_groupe, telephone_groupe, email_groupe, ordre_affichage) VALUES
('RC - ROULEMENT REGULATEUR CENTRE', 'CHEVALIER Stephane', '06 18 91 21 30', 's.chevalier02@reseau.sncf.fr', 'Régulateur Centre', '', '', 1),
('RC - ROULEMENT REGULATEUR CENTRE', 'LAOURI Bilal', '', '', 'Régulateur Centre', '', '', 2),
('RC - ROULEMENT REGULATEUR CENTRE', 'GALOPIN Sandra', '', '', 'Régulateur Centre', '', '', 3),
('RC - ROULEMENT REGULATEUR CENTRE', 'DELEZAY Julien', '', '', 'Régulateur Centre', '', '', 4),
('RC - ROULEMENT REGULATEUR CENTRE', 'KASMI Youssef', '', '', 'Régulateur Centre', '', '', 5);

-- RO - ROULEMENT REGULATEUR TABLE OUEST
INSERT INTO annuaire (groupe, nom, telephone, email, contact_groupe, telephone_groupe, email_groupe, ordre_affichage) VALUES
('RO - ROULEMENT REGULATEUR TABLE OUEST', 'BLEUBAR Karine', '', '', 'Régulateur Ouest', '', '', 1),
('RO - ROULEMENT REGULATEUR TABLE OUEST', 'COCU Cyril', '', '', 'Régulateur Ouest', '', '', 2);

-- RESERVE REGULATEUR PN
INSERT INTO annuaire (groupe, nom, telephone, email, contact_groupe, telephone_groupe, email_groupe, ordre_affichage) VALUES
('RESERVE REGULATEUR PN', 'ESPARON Gregory', '06 61 47 33 34', 'gregory.esparon@reseau.sncf.fr', '', '', '', 1),
('RESERVE REGULATEUR PN', 'GREVIN Jodie', '06 26 80 82 30', '', '', '', '', 2),
('RESERVE REGULATEUR PN', 'GILLON Thomas', '', '', '', '', '', 3),
('RESERVE REGULATEUR PN', 'LAHOGUE Raphael', '', '', '', '', '', 4),
('RESERVE REGULATEUR PN', 'GALLAI Mathieu', '', '', '', '', '', 5),
('RESERVE REGULATEUR PN', 'MAHENDRAN Nitharsan', '06 52 62 52 00', 'nitharsan.mahendran@reseau.sncf.fr', '', '', '', 6),
('RESERVE REGULATEUR PN', 'CHAVET Romain', '06 64 90 83 92', 'romain.chavet@reseau.sncf.fr', '', '', '', 7),
('RESERVE REGULATEUR PN', 'CRESPIN Ilyas', '06 11 49 05 16', '', '', '', '', 8),
('RESERVE REGULATEUR PN', 'GUYON Vincent', '06 77 33 38 53', 'v.guyon@reseau.sncf.fr', '', '', '', 9);

-- RESERVE REGULATEUR DR
INSERT INTO annuaire (groupe, nom, telephone, email, contact_groupe, telephone_groupe, email_groupe, ordre_affichage) VALUES
('RESERVE REGULATEUR DR', 'MEFTAH Islam', '', '', '', '', '', 1),
('RESERVE REGULATEUR DR', 'BAPTISTE Brice', '', '', '', '', '', 2),
('RESERVE REGULATEUR DR', 'HAMMAMI Zakariya', '', '', '', '', '', 3),
('RESERVE REGULATEUR DR', 'DENELE Charlotte', '', '', '', '', '', 4),
('RESERVE REGULATEUR DR', 'FRANCOIS Armelle', '06 68 47 50 46', 'armelle.francois@reseau.sncf.fr', '', '', '', 5);

-- CCU - ROULEMENT CCU DENFERT
INSERT INTO annuaire (groupe, nom, telephone, email, contact_groupe, telephone_groupe, email_groupe, ordre_affichage) VALUES
('CCU - ROULEMENT CCU DENFERT', 'DECAYEUX Fabien', '', '', 'CRC PARC', '01 55 31 17 46', 'pn-eic.crc-ccu@sncf.fr', 1),
('CCU - ROULEMENT CCU DENFERT', 'DE FONTES Georges', '06 99 91 36 47', '', 'CRC PARC', '01 55 31 17 46', 'pn-eic.crc-ccu@sncf.fr', 2),
('CCU - ROULEMENT CCU DENFERT', 'MIMOUNI Yassine', '', '', 'CRC PARC', '01 55 31 17 46', 'pn-eic.crc-ccu@sncf.fr', 3),
('CCU - ROULEMENT CCU DENFERT', 'LOIAL Jennifer', '', '', 'CRC PARC', '01 55 31 17 46', 'pn-eic.crc-ccu@sncf.fr', 4);

-- RE - ROULEMENT REGULATEUR TABLE EST DENFERT
INSERT INTO annuaire (groupe, nom, telephone, email, contact_groupe, telephone_groupe, email_groupe, ordre_affichage) VALUES
('RE - ROULEMENT REGULATEUR TABLE EST DENFERT', 'MORIN Luka', '', '', 'Régulateur PARC', '01 55 31 87 28', '', 1),
('RE - ROULEMENT REGULATEUR TABLE EST DENFERT', 'OSIRIS Alexandre', '', '', 'Régulateur PARC', '01 55 31 87 28', '', 2),
('RE - ROULEMENT REGULATEUR TABLE EST DENFERT', 'ABDOUL WAHAB Sef', '', '', 'Régulateur PARC', '01 55 31 87 28', '', 3),
('RE - ROULEMENT REGULATEUR TABLE EST DENFERT', 'BOUHAFS Saladin', '', '', 'Régulateur PARC', '01 55 31 87 28', '', 4);

-- CAC - ROULEMENT DENFERT
INSERT INTO annuaire (groupe, nom, telephone, email, contact_groupe, telephone_groupe, email_groupe, ordre_affichage) VALUES
('CAC - ROULEMENT DENFERT', 'KADOUM Aurelie', '', '', '', '', '', 1),
('CAC - ROULEMENT DENFERT', 'WARLOUZEL Remi', '06 61 30 65 88', '', '', '', '', 2);

-- PCD
INSERT INTO annuaire (groupe, nom, telephone, email, contact_groupe, telephone_groupe, email_groupe, ordre_affichage) VALUES
('PCD', 'DECLEMY Jean Marc', '', '', '', '', '', 1),
('PCD', 'LACOUBERIE Nicolas', '', '', '', '', '', 2);

-- EAC
INSERT INTO annuaire (groupe, nom, telephone, email, contact_groupe, telephone_groupe, email_groupe, ordre_affichage) VALUES
('EAC', 'DJEBAR Abderahman', '', '', '', '', '', 1),
('EAC', 'LAFRANCE Cyril', '', '', '', '', '', 2),
('EAC', 'ISAAC Jean-Charles', '', '', '', '', '', 3),
('EAC', 'SACHS Cyril', '', '', '', '', '', 4);

-- Vérification
SELECT groupe, COUNT(*) as nb_agents FROM annuaire GROUP BY groupe ORDER BY groupe;
