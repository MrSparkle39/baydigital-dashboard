import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  type: 'ticket_confirmation' | 'admin_notification' | 'ticket_update' | 'welcome' | 'ticket_reply' | 'ticket_reply_admin';
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
    dashboardUrl?: string;
    message?: string;
  };
}

// Email Templates
function getWelcomeEmailHTML(userName: string, userEmail: string, dashboardUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Bay Digital - Your Website is Being Built!</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold;">🎉 Welcome to Bay Digital!</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your Professional Website Journey Starts Now</p>
        </div>
        
        <!-- Main Content -->
        <div style="background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Personal Greeting -->
          <p style="font-size: 18px; margin-bottom: 20px; color: #333;">Hi ${userName},</p>
          
          <p style="font-size: 16px; margin-bottom: 25px; line-height: 1.8;">
            Thank you for choosing Bay Digital! We're excited to build your professional website and help grow your business online. Our team is already getting started on your project.
          </p>

          <!-- Dashboard Access Box -->
          <div style="background: #f8f9ff; border-left: 4px solid #667eea; padding: 20px; border-radius: 6px; margin: 30px 0;">
            <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #667eea;">📱 Your Dashboard is Ready</h3>
            <p style="margin: 0 0 15px 0; font-size: 15px; color: #555;">
              Access your dashboard anytime to track progress, submit update requests, and manage your website:
            </p>
            <div style="text-align: center; margin-top: 20px;">
              <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Access Dashboard →
              </a>
            </div>
            <p style="margin: 15px 0 0 0; font-size: 13px; color: #666; text-align: center;">
              Login Email: ${userEmail}
            </p>
          </div>

          <!-- Timeline Section -->
          <h2 style="color: #333; font-size: 24px; margin: 40px 0 20px 0; text-align: center;">What Happens Next?</h2>
          <p style="text-align: center; color: #666; margin-bottom: 30px;">Here's your website journey over the next 48 hours:</p>

          <!-- Step 1 -->
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #667eea;">
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <div style="background: #667eea; color: white; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 12px;">1</div>
              <h3 style="margin: 0; font-size: 18px; color: #333;">We Build Your Website</h3>
            </div>
            <p style="margin: 10px 0 0 44px; font-size: 15px; color: #555; line-height: 1.7;">
              <strong>Next 24-48 Hours</strong><br>
              Our team is already working on:
            </p>
            <ul style="margin: 10px 0 0 44px; padding-left: 20px; color: #555;">
              <li style="margin-bottom: 8px;">Setting up your professional website</li>
              <li style="margin-bottom: 8px;">Writing copy based on your business information</li>
              <li style="margin-bottom: 8px;">Optimizing for mobile devices and search engines</li>
              <li style="margin-bottom: 8px;">Configuring your contact form</li>
            </ul>
          </div>

          <!-- Step 2 -->
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #10b981;">
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <div style="background: #10b981; color: white; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 12px;">2</div>
              <h3 style="margin: 0; font-size: 18px; color: #333;">Preview & Approve</h3>
            </div>
            <p style="margin: 10px 0 0 44px; font-size: 15px; color: #555; line-height: 1.7;">
              <strong>Within 48 Hours</strong><br>
              We'll send you a preview link to review your site:
            </p>
            <ul style="margin: 10px 0 0 44px; padding-left: 20px; color: #555;">
              <li style="margin-bottom: 8px;">Check all the content and information</li>
              <li style="margin-bottom: 8px;">Request any changes you'd like</li>
              <li style="margin-bottom: 8px;">Give us the green light to launch</li>
            </ul>
          </div>

          <!-- Step 3 -->
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <div style="background: #f59e0b; color: white; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 12px;">3</div>
              <h3 style="margin: 0; font-size: 18px; color: #333;">Launch!</h3>
            </div>
            <p style="margin: 10px 0 0 44px; font-size: 15px; color: #555; line-height: 1.7;">
              <strong>Same Day as Approval</strong><br>
              Once you approve, we'll:
            </p>
            <ul style="margin: 10px 0 0 44px; padding-left: 20px; color: #555;">
              <li style="margin-bottom: 8px;">Make your website live</li>
              <li style="margin-bottom: 8px;">Connect your domain (if you have one)</li>
              <li style="margin-bottom: 8px;">Send you all your login details</li>
              <li style="margin-bottom: 8px;">Start bringing in customers!</li>
            </ul>
          </div>

          <!-- What You Can Do Section -->
          <div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); padding: 25px; border-radius: 8px; margin: 30px 0;">
            <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #333;">💡 While You Wait</h3>
            <p style="margin: 0 0 15px 0; font-size: 15px; color: #555;">
              Log into your dashboard to:
            </p>
            <ul style="margin: 0; padding-left: 20px; color: #555;">
              <li style="margin-bottom: 8px;">Track your website build progress</li>
              <li style="margin-bottom: 8px;">Submit update requests or additional information</li>
              <li style="margin-bottom: 8px;">View analytics (once your site is live)</li>
              <li style="margin-bottom: 8px;">Manage your subscription</li>
            </ul>
          </div>

          <!-- Need Help Section -->
          <div style="border-top: 2px solid #f0f0f0; margin-top: 40px; padding-top: 30px;">
            <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #333; text-align: center;">🆘 Need Help?</h3>
            <p style="margin: 0 0 20px 0; font-size: 15px; color: #555; text-align: center;">
              We're here to help! Contact us anytime:
            </p>
            <div style="text-align: center;">
              <p style="margin: 5px 0; font-size: 15px;">
                <strong>Email:</strong> <a href="mailto:hello@bay.digital" style="color: #667eea; text-decoration: none;">hello@bay.digital</a>
              </p>
            </div>
          </div>

          <!-- Important Info Box -->
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 6px; margin: 30px 0;">
            <h4 style="margin: 0 0 10px 0; font-size: 16px; color: #92400e;">📝 Remember Something?</h4>
            <p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.6;">
              Forgot to mention something about your business? No problem! Just reply to this email or use the dashboard to submit any additional information.
            </p>
          </div>

          <!-- Closing -->
          <div style="margin-top: 40px; padding-top: 30px; border-top: 2px solid #f0f0f0;">
            <p style="font-size: 16px; margin-bottom: 5px; color: #333;">
              We're excited to work with you!
            </p>
            <p style="font-size: 16px; margin: 0; color: #333;">
              <strong>The Bay Digital Team</strong>
            </p>
          </div>

        </div>
        
        <!-- Footer -->
        <div style="text-align: center; padding: 30px 20px; color: #999; font-size: 13px;">
          <p style="margin: 0 0 10px 0;">Bay Digital | Professional Website Management</p>
          <p style="margin: 0;">
            <a href="https://bay.digital" style="color: #667eea; text-decoration: none; margin: 0 10px;">Website</a>
            <span style="color: #ddd;">|</span>
            <a href="${dashboardUrl}" style="color: #667eea; text-decoration: none; margin: 0 10px;">Dashboard</a>
            <span style="color: #ddd;">|</span>
            <a href="mailto:hello@bay.digital" style="color: #667eea; text-decoration: none; margin: 0 10px;">Support</a>
          </p>
          <p style="margin: 15px 0 0 0; color: #bbb; font-size: 12px;">
            You're receiving this email because you signed up for Bay Digital services.
          </p>
        </div>
      </body>
    </html>
  `;
}

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
      case 'welcome':
        subject = `Welcome to Bay Digital - Your Website Journey Starts Now!`;
        html = getWelcomeEmailHTML(data.userName!, data.userEmail!, data.dashboardUrl!);
        break;

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

      case 'ticket_reply':
        subject = `New message on your request: ${data.ticketTitle}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">💬 New Message</h1>
            </div>
            <div style="padding: 40px 30px; background: #f9f9f9;">
              <p>Hi there,</p>
              <p>The Bay Digital team has replied to your request: <strong>${data.ticketTitle}</strong></p>
              <div style="background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0;">
                <p style="white-space: pre-wrap;">${data.message!.substring(0, 200)}${data.message!.length > 200 ? '...' : ''}</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://dashboard.bay.digital" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  View & Reply in Dashboard →
                </a>
              </div>
              <p>Best regards,<br><strong>The Bay Digital Team</strong></p>
            </div>
          </div>
        `;
        break;

      case 'ticket_reply_admin':
        subject = `Client replied: ${data.ticketTitle}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1a1a1a; padding: 30px 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">💬 Client Reply</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <div style="background: white; padding: 20px; border-left: 4px solid #667eea; margin-bottom: 20px;">
                <h2 style="margin: 0 0 10px 0;">${data.ticketTitle}</h2>
                <p style="margin: 0; color: #999;">From: ${data.userName}</p>
              </div>
              <div style="background: white; padding: 20px; margin-bottom: 20px;">
                <p style="white-space: pre-wrap;">${data.message}</p>
              </div>
              <div style="text-align: center;">
                <a href="https://dashboard.bay.digital/admin/tickets" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  Reply in Dashboard →
                </a>
              </div>
            </div>
          </div>
        `;
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
