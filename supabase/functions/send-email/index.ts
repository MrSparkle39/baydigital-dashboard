import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  type: 'ticket_confirmation' | 'admin_notification' | 'ticket_update';
  to: string;
  data: {
    ticketTitle?: string;
    ticketId?: string;
    ticketDescription?: string;
    userName?: string;
    userEmail?: string;
    priority?: string;
    status?: string;
    adminNotes?: string;
  };
}

// Email Templates
function getTicketConfirmationHTML(ticketTitle: string, ticketId: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Update Request Received</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">✓ Request Received</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 40px 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hi there,</p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            We've received your update request and our team will review it shortly.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #667eea;">
            <p style="margin: 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Request:</p>
            <h2 style="margin: 10px 0 5px 0; font-size: 18px; color: #333;">${ticketTitle}</h2>
            <p style="margin: 0; font-size: 14px; color: #999;">Ticket #${ticketId.slice(0, 8)}</p>
          </div>
          
          <div style="background: #e8f4f8; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #0066cc;">
              💡 <strong>Tip:</strong> We'll update you via email when there's progress on your request. You can also check your dashboard anytime for updates.
            </p>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            Questions about this request? Just reply to this email.
          </p>
          
          <p style="font-size: 16px; margin-top: 30px;">
            Best regards,<br>
            <strong>The Bay Digital Team</strong>
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>Bay Digital | Professional Website Management</p>
        </div>
      </body>
    </html>
  `;
}

function getAdminTicketNotificationHTML(
  ticketTitle: string, 
  ticketDescription: string, 
  userName: string,
  userEmail: string,
  ticketId: string,
  priority: string
): string {
  const priorityColors: Record<string, string> = {
    urgent: '#ef4444',
    high: '#f59e0b',
    normal: '#3b82f6',
    low: '#6b7280'
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Support Ticket</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #1a1a1a; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🎫 New Support Ticket</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid ${priorityColors[priority] || '#3b82f6'};">
            <div style="margin-bottom: 15px;">
              <h2 style="margin: 0 0 10px 0; font-size: 20px; color: #333;">${ticketTitle}</h2>
              <span style="background: ${priorityColors[priority] || '#3b82f6'}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                ${priority}
              </span>
            </div>
            <p style="margin: 0; font-size: 14px; color: #999;">Ticket #${ticketId.slice(0, 8)}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Description:</h3>
            <p style="margin: 0; font-size: 15px; white-space: pre-wrap;">${ticketDescription}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Client Info:</h3>
            <p style="margin: 0 0 8px 0; font-size: 15px;"><strong>Name:</strong> ${userName}</p>
            <p style="margin: 0; font-size: 15px;"><strong>Email:</strong> <a href="mailto:${userEmail}" style="color: #667eea;">${userEmail}</a></p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://dashboard.bay.digital/admin/tickets" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              View in Dashboard →
            </a>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>Bay Digital Admin Notifications</p>
        </div>
      </body>
    </html>
  `;
}

function getTicketUpdateHTML(ticketTitle: string, status: string, adminNotes: string): string {
  const statusEmojis: Record<string, string> = {
    'in_progress': '🔄',
    'completed': '✅',
    'closed': '🔒'
  };

  const statusTexts: Record<string, string> = {
    'in_progress': 'In Progress',
    'completed': 'Completed',
    'closed': 'Closed'
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Update Request Update</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">${statusEmojis[status] || '📢'} Request Updated</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 40px 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hi there,</p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            We have an update on your request: <strong>${ticketTitle}</strong>
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">New Status:</p>
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: #667eea;">${statusTexts[status] || status}</p>
          </div>
          
          ${adminNotes ? `
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #667eea;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Update from our team:</p>
            <p style="margin: 0; font-size: 15px; white-space: pre-wrap;">${adminNotes}</p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://dashboard.bay.digital" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              View in Dashboard →
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            Questions? Just reply to this email and we'll get back to you.
          </p>
          
          <p style="font-size: 16px; margin-top: 30px;">
            Best regards,<br>
            <strong>The Bay Digital Team</strong>
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>Bay Digital | Professional Website Management</p>
        </div>
      </body>
    </html>
  `;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const emailRequest: EmailRequest = await req.json();
    const { type, to, data } = emailRequest;

    let subject = '';
    let html = '';

    // Generate email based on type
    switch (type) {
      case 'ticket_confirmation':
        subject = `Update Request Received - ${data.ticketTitle}`;
        html = getTicketConfirmationHTML(data.ticketTitle!, data.ticketId!);
        break;

      case 'admin_notification':
        subject = `🎫 New Support Ticket: ${data.ticketTitle}`;
        html = getAdminTicketNotificationHTML(
          data.ticketTitle!,
          data.ticketDescription!,
          data.userName!,
          data.userEmail!,
          data.ticketId!,
          data.priority || 'normal'
        );
        break;

      case 'ticket_update':
        subject = `Update on Your Request: ${data.ticketTitle}`;
        html = getTicketUpdateHTML(
          data.ticketTitle!,
          data.status!,
          data.adminNotes || ''
        );
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid email type' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
    }

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Bay Digital <noreply@bay.digital>',
        to: [to],
        subject,
        html,
      }),
    });

    const resendData = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', resendData);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: resendData }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Email sent successfully:', resendData);
    return new Response(
      JSON.stringify({ success: true, data: resendData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in send-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
