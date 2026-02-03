-- Migration: Create pending_imports table for chat assistant
-- Date: 2026-01-29
-- Mission: chat-assistant-mistral

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: pending_imports
-- Stocke les imports PDF en attente de validation via le chat assistant
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pending_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Lien vers l'agent
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,

  -- Identification de la conversation
  conversation_id TEXT UNIQUE,

  -- Informations sur le fichier source
  pdf_filename TEXT,
  pdf_size_bytes INTEGER,

  -- Données extraites par l'IA
  extraction_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Structure attendue:
  -- {
  --   "metadata": {
  --     "agent_name": "DUPONT Jean",
  --     "numero_cp": "1234567A",
  --     "periode_debut": "2025-04-21",
  --     "periode_fin": "2025-04-30"
  --   },
  --   "services": [
  --     {
  --       "date": "2025-04-22",
  --       "code": "CCU003",
  --       "service_code": "X",
  --       "poste_code": "CCU",
  --       "horaires": "22:00-06:00",
  --       "confidence": "high",
  --       "raw_text": "..."
  --     }
  --   ],
  --   "stats": {
  --     "total": 10,
  --     "high_confidence": 8,
  --     "medium_confidence": 1,
  --     "low_confidence": 1
  --   }
  -- }

  -- Historique de la conversation
  conversation_history JSONB DEFAULT '[]'::jsonb,
  -- Structure:
  -- [
  --   {"role": "user", "content": "...", "timestamp": "..."},
  --   {"role": "assistant", "content": "...", "timestamp": "..."}
  -- ]

  -- Modifications utilisateur (corrections via le chat)
  user_corrections JSONB DEFAULT '{}'::jsonb,
  -- Structure:
  -- {
  --   "2": {"code": "D", "reason": "Correction utilisateur: c'est DISPO pas NU"}
  -- }

  -- Statut du workflow
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'ready_to_import', 'imported', 'cancelled', 'error')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  imported_at TIMESTAMPTZ,

  -- Informations d'erreur
  error_message TEXT,

  -- Nombre de services importés (après import)
  services_imported INTEGER DEFAULT 0
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEX
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_pending_imports_agent ON pending_imports(agent_id);
CREATE INDEX IF NOT EXISTS idx_pending_imports_status ON pending_imports(status);
CREATE INDEX IF NOT EXISTS idx_pending_imports_conversation ON pending_imports(conversation_id);
CREATE INDEX IF NOT EXISTS idx_pending_imports_created ON pending_imports(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TRIGGER: Mise à jour automatique de updated_at
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_pending_imports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pending_imports_updated_at ON pending_imports;
CREATE TRIGGER trigger_pending_imports_updated_at
  BEFORE UPDATE ON pending_imports
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_imports_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS (Row Level Security)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE pending_imports ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs ne voient que leurs propres imports
CREATE POLICY "Users can view own pending imports"
  ON pending_imports
  FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM agents
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Policy: Les utilisateurs peuvent créer leurs propres imports
CREATE POLICY "Users can create own pending imports"
  ON pending_imports
  FOR INSERT
  WITH CHECK (
    agent_id IN (
      SELECT id FROM agents
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Policy: Les utilisateurs peuvent modifier leurs propres imports
CREATE POLICY "Users can update own pending imports"
  ON pending_imports
  FOR UPDATE
  USING (
    agent_id IN (
      SELECT id FROM agents
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Policy: Les utilisateurs peuvent supprimer leurs propres imports
CREATE POLICY "Users can delete own pending imports"
  ON pending_imports
  FOR DELETE
  USING (
    agent_id IN (
      SELECT id FROM agents
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- COMMENTAIRES
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE pending_imports IS 'Imports PDF en attente de validation via le chat assistant Mistral';
COMMENT ON COLUMN pending_imports.conversation_id IS 'Identifiant unique de la conversation pour reprendre le dialogue';
COMMENT ON COLUMN pending_imports.extraction_data IS 'Données extraites par Mistral OCR + Small au format JSON';
COMMENT ON COLUMN pending_imports.user_corrections IS 'Corrections apportées par l utilisateur via le dialogue';
COMMENT ON COLUMN pending_imports.status IS 'in_progress: en cours, ready_to_import: prêt, imported: terminé, cancelled: annulé, error: erreur';
