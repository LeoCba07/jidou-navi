// Supabase Edge Function: send-push-notification
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const MAX_MESSAGES_PER_BATCH = 100;

serve(async (req) => {
  try {
    // 1. Validate Environment Variables (Comment 5)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Simple Authentication (Comment 3)
    // For now, we ensure the request comes from an authorized source
    const authHeader = req.headers.get('Authorization');
    const expectedAuth = `Bearer ${supabaseServiceRoleKey}`;
    if (!authHeader || authHeader !== expectedAuth) {
       // Only allow calls with service role key or implement specific admin check
       return new Response(JSON.stringify({ error: "Unauthorized" }), { 
         status: 401,
         headers: { "Content-Type": "application/json" } 
       });
    }

    const { user_ids, title, body, data } = await req.json();

    if (!user_ids || !Array.isArray(user_ids)) {
      return new Response(JSON.stringify({ error: "user_ids must be an array" }), { status: 400 });
    }

    // Initialize Supabase Client
    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

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

    // 3. Prepare messages and Chunk them (Comment 9)
    const allMessages = tokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: data || {},
    }));

    const results = [];
    let overallSuccess = true;

    for (let i = 0; i < allMessages.length; i += MAX_MESSAGES_PER_BATCH) {
      const batch = allMessages.slice(i, i + MAX_MESSAGES_PER_BATCH);
      
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batch),
      });

      const result = await response.json();
      results.push(result);
      if (!response.ok) overallSuccess = false;
    }

    // 4. Propagate correct status (Comment 4)
    return new Response(JSON.stringify({ results }), { 
      headers: { "Content-Type": "application/json" },
      status: overallSuccess ? 200 : 207 // 207 Multi-Status
    });

  } catch (error) {
    console.error('Push notification error:', error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      headers: { "Content-Type": "application/json" },
      status: 500 
    });
  }
})