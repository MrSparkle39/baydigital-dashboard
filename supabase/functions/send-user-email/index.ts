import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendEmailRequest {
  aliasId: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  threadId?: string; // If replying to existing thread
  replyToEmailId?: string; // If replying to specific email
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const body: SendEmailRequest = await req.json();
    const { aliasId, to, cc, bcc, subject, body: emailBody, bodyHtml, threadId, replyToEmailId } = body;

    if (!aliasId || !to || to.length === 0 || !subject || !emailBody) {
      throw new Error('Missing required fields: aliasId, to, subject, body');
    }

    // Get the alias to verify ownership and get email address
    const { data: alias, error: aliasError } = await supabaseClient
      .from('email_aliases')
      .select('*')
      .eq('id', aliasId)
      .eq('user_id', user.id)
      .single();

    if (aliasError || !alias) {
      throw new Error('Alias not found or access denied');
    }

    const fromEmail = `${alias.alias}@${alias.domain}`;
    const fromDisplay = alias.display_name || alias.alias;

    console.log('Sending email from:', fromEmail);

    // Build email headers for threading
    let headers: Record<string, string> = {};
    let messageId = `${Date.now()}.${Math.random().toString(36).substr(2, 9)}@${alias.domain}`;
    let inReplyTo: string | undefined;
    let emailReferences: string[] = [];

    // If replying to an existing email, get threading info
    if (replyToEmailId) {
      const { data: replyToEmail } = await supabaseClient
        .from('emails')
        .select('message_id, email_references, subject')
        .eq('id', replyToEmailId)
        .single();

      if (replyToEmail) {
        inReplyTo = replyToEmail.message_id;
        emailReferences = replyToEmail.email_references || [];
        if (inReplyTo && !emailReferences.includes(inReplyTo)) {
          emailReferences.push(inReplyTo);
        }
        
        headers['In-Reply-To'] = `<${inReplyTo}>`;
        headers['References'] = emailReferences.map(r => `<${r}>`).join(' ');
      }
    }

    // Generate HTML if not provided
    const htmlBody = bodyHtml || `
      <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6;">
        ${emailBody.replace(/\n/g, '<br>')}
      </div>
    `;

    // Send via Resend
    const resendPayload: any = {
      from: `${fromDisplay} <${fromEmail}>`,
      to: to,
      subject: subject,
      text: emailBody,
      html: htmlBody,
      headers: {
        'Message-ID': `<${messageId}>`,
        ...headers
      }
    };

    if (cc && cc.length > 0) {
      resendPayload.cc = cc;
    }
    if (bcc && bcc.length > 0) {
      resendPayload.bcc = bcc;
    }

    console.log('Sending to Resend:', JSON.stringify(resendPayload, null, 2));

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendPayload),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendData);
      // Map technical errors to user-friendly messages
      let userMessage = 'Failed to send email. Please try again.';
      if (resendData.message?.includes('domain is not verified')) {
        userMessage = 'Email sending is temporarily unavailable. Please contact support.';
      } else if (resendData.message?.includes('rate limit')) {
        userMessage = 'Too many emails sent. Please wait a moment and try again.';
      } else if (resendData.message?.includes('invalid')) {
        userMessage = 'Invalid email address. Please check the recipient.';
      }
      throw new Error(userMessage);
    }

    console.log('Email sent via Resend:', resendData);

    // Determine or create thread
    let finalThreadId = threadId;

    if (!finalThreadId) {
      // Create new thread for outbound email
      const { data: newThread, error: threadError } = await supabaseAdmin
        .from('email_threads')
        .insert({
          user_id: user.id,
          alias_id: aliasId,
          subject: subject,
          is_read: true, // Outbound emails are "read"
          message_count: 0 // Will be incremented by trigger
        })
        .select()
        .single();

      if (threadError) {
        console.error('Error creating thread:', threadError);
      } else {
        finalThreadId = newThread.id;
      }
    }

    // Save email to database
    const { data: savedEmail, error: saveError } = await supabaseAdmin
      .from('emails')
      .insert({
        user_id: user.id,
        thread_id: finalThreadId,
        alias_id: aliasId,
        from_address: fromEmail,
        from_name: fromDisplay,
        to_addresses: to,
        cc_addresses: cc || null,
        bcc_addresses: bcc || null,
        subject: subject,
        body_text: emailBody,
        body_html: htmlBody,
        message_id: messageId,
        in_reply_to: inReplyTo,
        email_references: emailReferences.length > 0 ? emailReferences : null,
        direction: 'outbound',
        status: 'sent',
        is_read: true,
        sent_at: new Date().toISOString(),
        resend_id: resendData.id
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving email:', saveError);
      // Don't throw - email was sent successfully
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailId: savedEmail?.id,
        threadId: finalThreadId,
        resendId: resendData.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
