-- Migration: Machine submission rate limit (Issue #271)
-- Description: Implement RPC for machine submission with rate limiting to prevent spam.

CREATE OR REPLACE FUNCTION submit_machine(
    p_name VARCHAR,
    p_description TEXT,
    p_latitude DOUBLE PRECISION,
    p_longitude DOUBLE PRECISION,
    p_directions_hint TEXT DEFAULT NULL
)
RETURNS TABLE (id UUID) AS $$
BEGIN
    -- Security: Ensure user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Rate limit: 3 submissions per 24 hours (1440 minutes)
    -- Bypass for admins/devs to allow seeding
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'developer')
    ) THEN
        PERFORM check_rate_limit('submit_machine', 3, 1440);
    END IF;

    RETURN QUERY
    INSERT INTO machines (
        name,
        description,
        latitude,
        longitude,
        location,
        status,
        contributor_id,
        directions_hint
    )
    VALUES (
        p_name,
        p_description,
        p_latitude,
        p_longitude,
        ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
        'pending',
        auth.uid(),
        p_directions_hint
    )
    RETURNING machines.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC para verificar el límite de envío sin insertar (evita subir fotos huérfanas)
CREATE OR REPLACE FUNCTION check_submission_limit()
RETURNS BOOLEAN AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'developer')
    ) THEN
        PERFORM check_rate_limit('submit_machine', 3, 1440);
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Endurecer seguridad: revocar ejecución de roles anónimos y públicos
-- PostgreSQL por defecto otorga EXECUTE a PUBLIC en funciones nuevas.
REVOKE EXECUTE ON FUNCTION submit_machine(VARCHAR, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION check_submission_limit() FROM anon, public;

-- Solo permitir ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION submit_machine(VARCHAR, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_submission_limit() TO authenticated;
