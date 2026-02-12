-- Create push_tokens table for notifications
CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    platform TEXT, -- 'ios', 'android'
    device_name TEXT,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup by user
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);

-- Enable RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own tokens" 
ON push_tokens FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update trigger
CREATE TRIGGER trigger_push_tokens_updated_at
    BEFORE UPDATE ON push_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RPC to upsert push token
CREATE OR REPLACE FUNCTION upsert_push_token(
    p_token TEXT,
    p_platform TEXT DEFAULT NULL,
    p_device_name TEXT DEFAULT NULL
)
RETURNS push_tokens AS $$
DECLARE
    v_token_record push_tokens;
BEGIN
    INSERT INTO push_tokens (user_id, token, platform, device_name, last_used_at)
    VALUES (auth.uid(), p_token, p_platform, p_device_name, NOW())
    ON CONFLICT (token) DO UPDATE
    SET 
        user_id = auth.uid(),
        platform = EXCLUDED.platform,
        device_name = EXCLUDED.device_name,
        last_used_at = NOW(),
        updated_at = NOW()
    RETURNING * INTO v_token_record;

    RETURN v_token_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION upsert_push_token(TEXT, TEXT, TEXT) TO authenticated;
