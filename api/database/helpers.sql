-- Funciones helper compartidas para RLS y triggers
-- Ejecutar antes que cualquier archivo de tablas

-- Helper: obtener ID del usuario actual desde variable de sesión
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS INT AS $$
    SELECT current_setting('app.user_id', true)::INT;
$$ LANGUAGE SQL STABLE;

-- Helper: obtener rol del usuario actual desde variable de sesión
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
    SELECT current_setting('app.user_role', true);
$$ LANGUAGE SQL STABLE;

-- Trigger genérico para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
