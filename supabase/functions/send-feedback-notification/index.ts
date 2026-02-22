import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get('RESEND_FEEDBACK_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// 1. Early validation of environment variables
if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables for feedback notification')
}

// Simple HTML escape function to prevent XSS
function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

serve(async (req) => {
  try {
    const payload = await req.json()

    // 2. Validate payload structure
    if (!payload || typeof payload !== 'object' || !('record' in payload)) {
      return new Response(
        JSON.stringify({ error: "Invalid payload: missing 'record' field" }),
        { headers: { "Content-Type": "application/json" }, status: 400 },
      )
    }

    const { record } = payload
    if (!record || typeof record.content !== 'string' || !record.created_at) {
      return new Response(
        JSON.stringify({ error: "Invalid payload: missing record fields" }),
        { headers: { "Content-Type": "application/json" }, status: 400 },
      )
    }

    // 3. Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // 4. Fetch user info if available
    let userInfo = 'Anonymous'
    if (record.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', record.user_id)
        .single()
      
      if (profile) {
        userInfo = `${profile.display_name || profile.username} (@${profile.username})`
      }
    }

    // 5. Sanitize content for HTML email
    const sanitizedContent = escapeHtml(record.content)
    const sanitizedUserInfo = escapeHtml(userInfo)

    // 6. Setup the email content
    const emailBody = `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #FF4B4B; border-bottom: 2px solid #FF4B4B; padding-bottom: 10px;">New Feedback Received!</h2>
        <p><strong>From User:</strong> ${sanitizedUserInfo}</p>
        <p><strong>User ID:</strong> <code style="background: #f0f0f0; padding: 2px 4px;">${record.user_id || 'N/A'}</code></p>
        <p><strong>Content:</strong></p>
        <div style="background: #f9f9f9; padding: 20px; border-left: 5px solid #FF4B4B; font-size: 16px; white-space: pre-wrap; line-height: 1.5;">
          ${sanitizedContent}
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
          Received at: ${new Date(record.created_at).toLocaleString()}<br>
          Sent from JidouNavi Feedback System
        </p>
      </div>
    `

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'JidouNavi Feedback <onboarding@resend.dev>',
        to: ['jidou.navi@gmail.com'],
        subject: `🆕 Feedback from ${sanitizedUserInfo}`,
        html: emailBody,
      }),
    })

    const result = await response.json()
    return new Response(JSON.stringify(result), { 
      headers: { "Content-Type": "application/json" },
      status: response.status 
    })

  } catch (error) {
    console.error("Error in send-feedback-notification function:", error)
    return new Response(JSON.stringify({ error: "Internal server error" }), { 
      headers: { "Content-Type": "application/json" },
      status: 500 
    })
  }
})
