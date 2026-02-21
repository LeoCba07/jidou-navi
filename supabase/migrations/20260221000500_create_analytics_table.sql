-- Drop table if exists for a clean slate
DROP TABLE IF EXISTS public.analytics_events;

-- Create analytics_events table referencing profiles
CREATE TABLE public.analytics_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_name TEXT NOT NULL,
    properties JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Policies
-- Allow authenticated users to insert their own events
CREATE POLICY "Users can insert their own analytics events"
    ON public.analytics_events
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);