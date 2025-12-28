import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse the webhook payload from Resend
    const payload = await req.json();
    console.log('Received inbound email webhook:', JSON.stringify(payload, null, 2));

    // Resend wraps email data in a 'data' object for webhooks
    const emailData = payload.data || payload;
    
    const {
      from,
      to,
      cc,
      bcc,
      subject,
      text,
      html,
      reply_to,
      headers,
      attachments,
      message_id,
      email_id
    } = emailData;

    // Resend webhook only sends metadata - we need to fetch the full email content
    // using the Receiving API endpoint (different from the regular emails API)
    let emailText = text;
    let emailHtml = html;
    let senderName = null;
    
    // If we have an email_id and no body content, fetch from Resend Receiving API
    if (email_id && !text && !html && RESEND_API_KEY) {
      console.log('Fetching full email content from Resend Receiving API for:', email_id);
      try {
        // IMPORTANT: For inbound/received emails, use /emails/receiving/{id} endpoint
        const emailResponse = await fetch(`https://api.resend.com/emails/receiving/${email_id}`, {
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          }
        });
        
        if (emailResponse.ok) {
          const fullEmail = await emailResponse.json();
          console.log('Full email data from Receiving API:', JSON.stringify(fullEmail, null, 2));
          emailText = fullEmail.text;
          emailHtml = fullEmail.html;
          // Try to get sender name from full email
          if (fullEmail.from && typeof fullEmail.from === 'string' && fullEmail.from.includes('<')) {
            const nameMatch = fullEmail.from.match(/^(.+?)\s*<(.+)>$/);
            if (nameMatch) {
              senderName = nameMatch[1]?.trim();
            }
          }
        } else {
          const errorText = await emailResponse.text();
          console.error('Failed to fetch email from Resend Receiving API:', emailResponse.status, errorText);
        }
      } catch (fetchError) {
        console.error('Error fetching full email:', fetchError);
      }
    } else if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured - cannot fetch email body');
    }

    // Extract Message-ID - Resend provides it as message_id in the data
    const messageId = message_id || headers?.['message-id'] || headers?.['Message-ID'] || `${Date.now()}@inbound`;
    const inReplyTo = headers?.['in-reply-to'] || headers?.['In-Reply-To'];
    const references = headers?.['references'] || headers?.['References'];

    // Parse the 'to' addresses to find which alias this was sent to
    const toAddresses = Array.isArray(to) ? to : [to];
    
    // Find matching alias in database
    let matchedAlias = null;
    let aliasUserId = null;

    for (const toAddr of toAddresses) {
      // Extract email parts (handle "Name <email@domain>" format)
      const emailMatch = toAddr.match(/<(.+)>/) || [null, toAddr];
      const emailAddress = emailMatch[1] || toAddr;
      const [aliasName, domain] = emailAddress.split('@');

      // Look up alias
      const { data: alias, error } = await supabaseAdmin
        .from('email_aliases')
        .select('*, user_id')
        .eq('alias', aliasName.toLowerCase())
        .eq('domain', domain.toLowerCase())
        .single();

      if (alias && !error) {
        matchedAlias = alias;
        aliasUserId = alias.user_id;
        break;
      }
    }

    if (!matchedAlias || !aliasUserId) {
      console.log('No matching alias found for:', toAddresses);
      // Still return 200 to acknowledge receipt
      return new Response(
        JSON.stringify({ success: false, message: 'No matching alias found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Matched alias:', matchedAlias.alias, 'for user:', aliasUserId);

    // Parse sender info - handle both "Name <email>" format and plain email
    let fromName = senderName; // Use name from full email fetch if available
    let fromAddress = from;
    
    if (!fromName && from && from.includes('<')) {
      const fromMatch = from.match(/^(.+?)\s*<(.+)>$/);
      if (fromMatch) {
        fromName = fromMatch[1]?.trim() || null;
        fromAddress = fromMatch[2];
      }
    }

    // Find or create thread
    let threadId = null;

    // Try to find existing thread by In-Reply-To or References
    if (inReplyTo) {
      const { data: existingEmail } = await supabaseAdmin
        .from('emails')
        .select('thread_id')
        .eq('message_id', inReplyTo.replace(/[<>]/g, ''))
        .eq('user_id', aliasUserId)
        .single();

      if (existingEmail?.thread_id) {
        threadId = existingEmail.thread_id;
        console.log('Found existing thread by In-Reply-To:', threadId);
      }
    }

    // If no thread found by In-Reply-To, try subject matching (within last 7 days)
    if (!threadId && subject) {
      // Normalize subject (remove Re:, Fwd:, etc)
      const normalizedSubject = subject.replace(/^(re|fwd|fw):\s*/gi, '').trim();
      
      const { data: existingThread } = await supabaseAdmin
        .from('email_threads')
        .select('id')
        .eq('user_id', aliasUserId)
        .eq('alias_id', matchedAlias.id)
        .ilike('subject', normalizedSubject)
        .gte('last_message_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('last_message_at', { ascending: false })
        .limit(1)
        .single();

      if (existingThread?.id) {
        threadId = existingThread.id;
        console.log('Found existing thread by subject:', threadId);
      }
    }

    // Create new thread if none found
    if (!threadId) {
      const { data: newThread, error: threadError } = await supabaseAdmin
        .from('email_threads')
        .insert({
          user_id: aliasUserId,
          alias_id: matchedAlias.id,
          subject: subject || '(No Subject)',
          is_read: false
        })
        .select()
        .single();

      if (threadError) {
        console.error('Error creating thread:', threadError);
        throw new Error('Failed to create email thread');
      }

      threadId = newThread.id;
      console.log('Created new thread:', threadId);
    }

    // Parse references into array
    const referencesArray = references 
      ? references.split(/\s+/).map((r: string) => r.replace(/[<>]/g, ''))
      : null;

    // Insert the email
    const { data: newEmail, error: emailError } = await supabaseAdmin
      .from('emails')
      .insert({
        user_id: aliasUserId,
        thread_id: threadId,
        alias_id: matchedAlias.id,
        from_address: fromAddress,
        from_name: fromName,
        to_addresses: toAddresses,
        cc_addresses: cc ? (Array.isArray(cc) ? cc : [cc]) : null,
        bcc_addresses: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : null,
        reply_to: reply_to,
        subject: subject,
        body_text: emailText,
        body_html: emailHtml,
        message_id: messageId.replace(/[<>]/g, ''),
        in_reply_to: inReplyTo?.replace(/[<>]/g, ''),
        email_references: referencesArray,
        direction: 'inbound',
        status: 'received',
        is_read: false,
        received_at: new Date().toISOString()
      })
      .select()
      .single();

    if (emailError) {
      console.error('Error inserting email:', emailError);
      throw new Error('Failed to save email');
    }

    console.log('Email saved successfully:', newEmail.id);

    // Handle attachments if any
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        // Save attachment metadata
        await supabaseAdmin
          .from('email_attachments')
          .insert({
            email_id: newEmail.id,
            filename: attachment.filename,
            content_type: attachment.content_type,
            size_bytes: attachment.size
            // Note: For full implementation, you'd upload content to storage
          });
      }
      console.log(`Saved ${attachments.length} attachments`);
    }

    return new Response(
      JSON.stringify({ success: true, emailId: newEmail.id, threadId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing inbound email:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
