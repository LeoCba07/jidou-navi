-- Reduce feedback rate limit from 5/hour to 1/24hours
-- Resend free tier is 3k emails/month, so this protects against abuse

CREATE OR REPLACE FUNCTION submit_feedback(
    p_content TEXT,
    p_category TEXT DEFAULT 'general'
)
RETURNS JSON AS $$
BEGIN
    -- Check rate limit: 1 feedback submission per 24 hours per user
    IF NOT check_rate_limit('submit_feedback', 1, 1440) THEN
        RETURN json_build_object('success', false, 'error', 'rate_limit_exceeded');
    END IF;

    -- Basic length validation
    IF length(p_content) > 2000 THEN
        RETURN json_build_object('success', false, 'error', 'content_too_long');
    END IF;

    INSERT INTO feedback (user_id, content, category)
    VALUES (auth.uid(), p_content, p_category);

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
