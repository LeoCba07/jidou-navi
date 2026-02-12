// Supabase Edge Function: send-push-notification
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

serve(async (req) => {
  try {
    const { user_ids, title, body, data } = await req.json();

    if (!user_ids || !Array.isArray(user_ids)) {
      return new Response(JSON.stringify({ error: "user_ids must be an array" }), { status: 400 });
    }

    // Initialize Supabase Client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch tokens for these users
    const { data: tokenRecords, error: tokenError } = await supabaseClient
      .from('push_tokens')
      .select('token')
      .in('user_id', user_ids);

    if (tokenError) throw tokenError;
    if (!tokenRecords || tokenRecords.length === 0) {
      return new Response(JSON.stringify({ message: "No tokens found for these users" }), { status: 200 });
    }

    const tokens = tokenRecords.map(r => r.token);

    // Prepare messages for Expo
    const messages = tokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: data || {},
    }));

    // Send to Expo
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();

    return new Response(JSON.stringify(result), { 
      headers: { "Content-Type": "application/json" },
      status: 200 
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { "Content-Type": "application/json" },
      status: 500 
    });
  }
})
