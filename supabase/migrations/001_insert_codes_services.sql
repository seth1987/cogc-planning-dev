-- Migration: Insert SNCF service codes into codes_services table
-- Date: 2026-01-29
-- Mission: chat-assistant-mistral

-- Vérifier que la table existe (sinon la créer)
CREATE TABLE IF NOT EXISTS codes_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  poste_code TEXT,
  service_code TEXT NOT NULL,
  description TEXT,
  horaires_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insérer les 69 codes SNCF
-- Utilise ON CONFLICT pour éviter les doublons

INSERT INTO codes_services (code, poste_code, service_code, description, horaires_type) VALUES

-- ═══════════════════════════════════════════════════════════════════════════════
-- POSTES OPÉRATIONNELS
-- ═══════════════════════════════════════════════════════════════════════════════

-- CRC - Coordonnateur Régional Circulation
('CRC001', 'CRC', '-', 'Coordonnateur Régional matin', 'matin'),
('CRC002', 'CRC', 'O', 'Coordonnateur Régional soir', 'soir'),
('CRC003', 'CRC', 'X', 'Coordonnateur Régional nuit', 'nuit'),

-- ACR - Aide Coordonnateur Régional
('ACR001', 'ACR', '-', 'Aide Coordonnateur matin', 'matin'),
('ACR002', 'ACR', 'O', 'Aide Coordonnateur soir', 'soir'),
('ACR003', 'ACR', 'X', 'Aide Coordonnateur nuit', 'nuit'),

-- CCU - Centre Commande Unique (Denfert)
('CCU001', 'CCU', '-', 'CCU Denfert matin', 'matin'),
('CCU002', 'CCU', 'O', 'CCU Denfert soir', 'soir'),
('CCU003', 'CCU', 'X', 'CCU Denfert nuit', 'nuit'),
('CCU004', 'RE', '-', 'Régulateur Parc matin', 'matin'),
('CCU005', 'RE', 'O', 'Régulateur Parc soir', 'soir'),
('CCU006', 'RE', 'X', 'Régulateur Parc nuit', 'nuit'),

-- CAC - Cadre Appui Circulation
('CAC001', 'CAC', '-', 'Cadre Appui Circulation matin', 'matin'),
('CAC002', 'CAC', 'O', 'Cadre Appui Circulation soir', 'soir'),
('CAC003', 'CAC', 'X', 'Cadre Appui Circulation nuit', 'nuit'),

-- RC - Régulateur Centre
('RC001', 'RC', '-', 'Régulateur Centre matin', 'matin'),
('RC002', 'RC', 'O', 'Régulateur Centre soir', 'soir'),
('RC003', 'RC', 'X', 'Régulateur Centre nuit', 'nuit'),

-- RE - Régulateur Est
('RE001', 'RE', '-', 'Régulateur Est matin', 'matin'),
('RE002', 'RE', 'O', 'Régulateur Est soir', 'soir'),
('RE003', 'RE', 'X', 'Régulateur Est nuit', 'nuit'),

-- RO - Régulateur Ouest
('RO001', 'RO', '-', 'Régulateur Ouest matin', 'matin'),
('RO002', 'RO', 'O', 'Régulateur Ouest soir', 'soir'),
('RO003', 'RO', 'X', 'Régulateur Ouest nuit', 'nuit'),

-- REO - Régulateur Est/Ouest (variantes)
('REO001', 'RE', '-', 'Régulateur Est/Ouest matin', 'matin'),
('REO002', 'RE', 'O', 'Régulateur Est/Ouest soir', 'soir'),
('REO003', 'RE', 'X', 'Régulateur Est/Ouest nuit', 'nuit'),
('REO004', 'RE', '-', 'Régulateur Est/Ouest matin spécial', 'matin'),
('REO005', 'RE', 'O', 'Régulateur Est/Ouest soir spécial', 'soir'),
('REO006', 'RE', 'O', 'Régulateur Est/Ouest soir tardif', 'soir'),
('REO007', 'RO', '-', 'Régulateur Ouest matin', 'matin'),
('REO008', 'RO', 'O', 'Régulateur Ouest soir', 'soir'),

-- CENT - Centre / Souffleur
('CENT001', 'RC', '-', 'Centre Souffleur matin', 'matin'),
('CENT002', 'RC', 'O', 'Régulateur Centre soir', 'soir'),
('CENT003', 'RC', 'X', 'Régulateur Centre nuit', 'nuit'),

-- SOUF - Souffleur
('SOUF001', 'S/S', '-', 'Souffleur matin', 'matin'),
('SOUF002', 'S/S', 'O', 'Souffleur soir', 'soir'),
('SOUF003', 'S/S', 'X', 'Souffleur nuit', 'nuit'),

-- ═══════════════════════════════════════════════════════════════════════════════
-- REPOS & ABSENCES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Repos
('RP', NULL, 'RP', 'Repos périodique', NULL),
('RPP', NULL, 'RP', 'Repos périodique prolongé', NULL),
('RQ', NULL, 'RQ', 'Repos qualifié', NULL),

-- Non utilisé / Non commandé
('NU', NULL, 'NU', 'Non Utilisé', NULL),
('NP', NULL, 'NP', 'Non commandé au COGC', NULL),

-- ═══════════════════════════════════════════════════════════════════════════════
-- DISPONIBILITÉ
-- ═══════════════════════════════════════════════════════════════════════════════

('D', NULL, 'D', 'Disponible', NULL),
('DISPO', NULL, 'D', 'Disponible', NULL),
('DN', NULL, 'DN', 'Disponible Paris Nord', NULL),
('DR', NULL, 'DR', 'Disponible Denfert', NULL),

-- ═══════════════════════════════════════════════════════════════════════════════
-- CONGÉS
-- ═══════════════════════════════════════════════════════════════════════════════

('C', NULL, 'C', 'Congé annuel', NULL),
('CA', NULL, 'CA', 'Congés annuels', NULL),
('CONGE', NULL, 'C', 'Congé', NULL),
('RTT', NULL, 'RU', 'RTT', NULL),
('RU', NULL, 'RU', 'Récupération temps de travail', NULL),
('VT', NULL, 'VT', 'Congé temps partiel', NULL),

-- ═══════════════════════════════════════════════════════════════════════════════
-- INACTIVITÉ & FORMATION
-- ═══════════════════════════════════════════════════════════════════════════════

('I', NULL, 'I', 'Inaction', NULL),
('INACT', NULL, 'I', 'Inaction', NULL),
('INACTIN', NULL, 'I', 'Inaction', NULL),
('FO', NULL, 'FO', 'Formation', NULL),
('FORM', NULL, 'FO', 'Formation', NULL),
('HAB', NULL, 'HAB', 'Habilitation', NULL),
('HAB-QF', NULL, 'HAB', 'Formation habilitation QF', NULL),

-- ═══════════════════════════════════════════════════════════════════════════════
-- MÉDICAL
-- ═══════════════════════════════════════════════════════════════════════════════

('MA', NULL, 'MA', 'Maladie', NULL),
('MAL', NULL, 'MA', 'Maladie', NULL),
('VM', NULL, 'VM', 'Visite médicale', NULL),
('VMT', NULL, 'I', 'Visite médicale travail', NULL),
('VISIMED', NULL, 'VM', 'Visite Médicale', NULL),

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUTRES
-- ═══════════════════════════════════════════════════════════════════════════════

('EAC', NULL, 'EAC', 'Service extérieur CCU/RE', NULL),
('EIA', NULL, 'EIA', 'Entretien individuel annuel', NULL),
('F', NULL, 'JF', 'Férié', NULL),
('JF', NULL, 'JF', 'Jour férié', NULL),
('PCD', NULL, 'PCD', 'Poste Circulation Dionysien', NULL),
('VL', NULL, 'VL', 'Visite ligne', NULL),

-- ═══════════════════════════════════════════════════════════════════════════════
-- CODES GÉNÉRIQUES (période seule)
-- ═══════════════════════════════════════════════════════════════════════════════

('-', NULL, '-', 'Service matin (06h-14h)', 'matin'),
('O', NULL, 'O', 'Service soir (14h-22h)', 'soir'),
('X', NULL, 'X', 'Service nuit (22h-06h)', 'nuit')

ON CONFLICT (code) DO UPDATE SET
  poste_code = EXCLUDED.poste_code,
  service_code = EXCLUDED.service_code,
  description = EXCLUDED.description,
  horaires_type = EXCLUDED.horaires_type;

-- Créer un index pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_codes_services_code ON codes_services(code);
CREATE INDEX IF NOT EXISTS idx_codes_services_poste ON codes_services(poste_code);

-- Vérifier le nombre de codes insérés
-- SELECT COUNT(*) as total_codes FROM codes_services;
