import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  try {
    const { record } = await req.json()

    // Setup the email content
    const emailBody = `
      <h2>New Feedback Received!</h2>
      <p><strong>From User ID:</strong> ${record.user_id || 'Anonymous'}</p>
      <p><strong>Content:</strong></p>
      <blockquote style="background: #f4f4f4; padding: 15px; border-left: 5px solid #FF4B4B;">
        ${record.content}
      </blockquote>
      <p><strong>Received at:</strong> ${new Date(record.created_at).toLocaleString()}</p>
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
        subject: '🆕 New User Feedback!',
        html: emailBody,
      }),
    })

    const result = await response.json()
    return new Response(JSON.stringify(result), { 
      headers: { "Content-Type": "application/json" },
      status: response.status 
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { "Content-Type": "application/json" },
      status: 500 
    })
  }
})
