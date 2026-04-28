-- Tabela de Notas Devolutivas por projeto
CREATE TABLE IF NOT EXISTS notas_devolutivas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  numero_nota TEXT NOT NULL DEFAULT '',
  protocolo TEXT NOT NULL DEFAULT '',
  vinculo TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notas_devolutivas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notas_devolutivas"
  ON notas_devolutivas FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notas_devolutivas_project ON notas_devolutivas(project_id);
CREATE INDEX IF NOT EXISTS idx_notas_devolutivas_user ON notas_devolutivas(user_id);

-- Tabela de Exigências vinculadas a cada Nota Devolutiva
CREATE TABLE IF NOT EXISTS exigencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nota_id UUID NOT NULL REFERENCES notas_devolutivas(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluida')),
  concluded_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE exigencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own exigencias"
  ON exigencias FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_exigencias_nota ON exigencias(nota_id);
CREATE INDEX IF NOT EXISTS idx_exigencias_user ON exigencias(user_id);
CREATE INDEX IF NOT EXISTS idx_exigencias_status ON exigencias(status);
