import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  type: 'ticket_confirmation' | 'admin_notification' | 'ticket_update' | 'welcome' | 'ticket_reply' | 'ticket_reply_admin' | 
        'new_user_admin' | 'onboarding_complete_admin' | 'site_ready_review' | 'site_launched' | 
        'onboarding_reminder_24h' | 'onboarding_reminder_72h' | 'payment_failed' | 'subscription_cancelled' | 'subscription_cancelled_user';
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
    businessName?: string;
    plan?: string;
    onboardingDetails?: string;
    previewUrl?: string;
    siteUrl?: string;
    onboardingProgress?: string;
    paymentAmount?: string;
    cardLast4?: string;
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

      case 'new_user_admin':
        subject = `🎉 New Client Signup: ${data.businessName}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #10b981; padding: 30px 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">🎉 New Client Signed Up!</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="margin: 0 0 15px 0; color: #333;">Client Details</h2>
                <p style="margin: 5px 0;"><strong>Name:</strong> ${data.userName}</p>
                <p style="margin: 5px 0;"><strong>Email:</strong> ${data.userEmail}</p>
                <p style="margin: 5px 0;"><strong>Business:</strong> ${data.businessName}</p>
                <p style="margin: 5px 0;"><strong>Plan:</strong> ${data.plan}</p>
              </div>
              <div style="text-align: center;">
                <a href="https://dashboard.bay.digital/admin/users" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  View in Admin Dashboard →
                </a>
              </div>
            </div>
          </div>
        `;
        break;

      case 'onboarding_complete_admin':
        subject = `✅ Onboarding Complete: ${data.businessName}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #667eea; padding: 30px 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">✅ Client Completed Onboarding</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="margin: 0 0 15px 0; color: #333;">${data.businessName}</h2>
                <p style="margin: 5px 0;"><strong>Contact:</strong> ${data.userName} (${data.userEmail})</p>
              </div>
              <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; color: #333;">Onboarding Details</h3>
                <p style="white-space: pre-wrap; font-size: 14px;">${data.onboardingDetails}</p>
              </div>
              <div style="text-align: center;">
                <a href="https://dashboard.bay.digital/admin/users" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  Start Building Site →
                </a>
              </div>
            </div>
          </div>
        `;
        break;

      case 'site_ready_review':
        subject = `🎨 Your Website is Ready for Review!`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">🎨 Your Website is Ready!</h1>
            </div>
            <div style="padding: 40px 30px; background: #f9f9f9;">
              <p>Hi ${data.userName},</p>
              <p>Great news! We've finished building your website for <strong>${data.businessName}</strong> and it's ready for your review.</p>
              <div style="background: white; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #10b981;">
                <h3 style="margin: 0 0 15px 0; color: #333;">Preview Your Site</h3>
                <p style="margin: 0 0 15px 0;">Click below to see your new website in action:</p>
                <div style="text-align: center;">
                  <a href="${data.previewUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    Preview Website →
                  </a>
                </div>
              </div>
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; color: #92400e;">📝 Review Checklist</h4>
                <ul style="margin: 10px 0; padding-left: 20px; color: #92400e;">
                  <li>Check all content and business information</li>
                  <li>Test the contact form</li>
                  <li>Review images and branding</li>
                  <li>Try on mobile and desktop</li>
                </ul>
              </div>
              <p>Once you're happy with everything, just reply to this email or submit any change requests through your dashboard. We'll launch your site as soon as you give us the go-ahead!</p>
              <p>Best regards,<br><strong>The Bay Digital Team</strong></p>
            </div>
          </div>
        `;
        break;

      case 'site_launched':
        subject = `🚀 Your Website is Live!`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 32px;">🚀 You're Live!</h1>
            </div>
            <div style="padding: 40px 30px; background: #f9f9f9;">
              <p style="font-size: 18px;">Hi ${data.userName},</p>
              <p style="font-size: 16px;">Congratulations! Your website for <strong>${data.businessName}</strong> is now live and ready to attract customers!</p>
              <div style="background: white; padding: 30px; border-radius: 8px; margin: 30px 0; text-align: center; border: 2px solid #10b981;">
                <h3 style="margin: 0 0 15px 0; color: #333;">🌐 Your Live Website</h3>
                <p style="font-size: 24px; font-weight: bold; color: #667eea; margin: 10px 0;">${data.siteUrl}</p>
                <div style="margin-top: 20px;">
                  <a href="${data.siteUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    Visit Your Site →
                  </a>
                </div>
              </div>
              <div style="background: #e0f2fe; border-left: 4px solid #0284c7; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <h4 style="margin: 0 0 15px 0; color: #075985;">💡 What's Next?</h4>
                <ul style="margin: 0; padding-left: 20px; color: #075985;">
                  <li style="margin-bottom: 8px;">Share your website on social media</li>
                  <li style="margin-bottom: 8px;">Update your Google Business listing with the URL</li>
                  <li style="margin-bottom: 8px;">Monitor form submissions in your dashboard</li>
                  <li style="margin-bottom: 8px;">Track your analytics to see visitor activity</li>
                </ul>
              </div>
              <p>Need updates or changes? Submit a request anytime through your dashboard. We're here to help your business grow!</p>
              <p style="font-size: 16px; margin-top: 30px;">Best regards,<br><strong>The Bay Digital Team</strong></p>
            </div>
          </div>
        `;
        break;

      case 'onboarding_reminder_24h':
        subject = `⏰ Complete Your Website Setup - Quick 5-Minute Form`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">⏰ Finish Your Setup</h1>
            </div>
            <div style="padding: 40px 30px; background: #f9f9f9;">
              <p>Hi ${data.userName},</p>
              <p>We noticed you haven't finished setting up your website yet. You're almost there!</p>
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; font-size: 16px;"><strong>Your Progress:</strong> ${data.onboardingProgress}</p>
              </div>
              <p>Complete the setup now to get your professional website built within 48 hours!</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://dashboard.bay.digital/onboarding" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Complete Setup (5 min) →
                </a>
              </div>
              <p style="font-size: 14px; color: #666;">Questions? Just reply to this email - we're here to help!</p>
              <p>Best regards,<br><strong>The Bay Digital Team</strong></p>
            </div>
          </div>
        `;
        break;

      case 'onboarding_reminder_72h':
        subject = `🚨 Don't Miss Out - Complete Your Website Setup`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">🚨 Your Website is Waiting</h1>
            </div>
            <div style="padding: 40px 30px; background: #f9f9f9;">
              <p>Hi ${data.userName},</p>
              <p><strong>You're just minutes away from having a professional website!</strong></p>
              <p>Your account is set up, but we can't start building your site until you complete the onboarding form. It only takes 5 minutes.</p>
              <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0; color: #991b1b;"><strong>⚠️ Action Required:</strong> Complete the setup form to activate your website build.</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://dashboard.bay.digital/onboarding" style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 16px 36px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 18px;">
                  Complete Setup Now →
                </a>
              </div>
              <p style="font-size: 14px; color: #666;">Need help or have questions? Reply to this email anytime!</p>
              <p>Best regards,<br><strong>The Bay Digital Team</strong></p>
            </div>
          </div>
        `;
        break;

      case 'payment_failed':
        subject = `⚠️ Payment Failed - Update Your Payment Method`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #ef4444; padding: 30px 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">⚠️ Payment Failed</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <p>Hi ${data.userName},</p>
              <p>We were unable to process your payment of <strong>${data.paymentAmount}</strong> for your Bay Digital subscription.</p>
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
                <p style="margin: 0;"><strong>Card ending in:</strong> ${data.cardLast4}</p>
                <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">Please update your payment method to keep your website active.</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://dashboard.bay.digital/dashboard" style="display: inline-block; background: #ef4444; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  Update Payment Method →
                </a>
              </div>
              <p style="font-size: 14px; color: #666;">If you have any questions, please reply to this email.</p>
              <p>Best regards,<br><strong>The Bay Digital Team</strong></p>
            </div>
          </div>
        `;
        break;

      case 'subscription_cancelled':
        subject = `📋 Subscription Cancelled: ${data.businessName}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #6b7280; padding: 30px 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">📋 Subscription Cancelled</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="margin: 0 0 15px 0; color: #333;">${data.businessName}</h2>
                <p style="margin: 5px 0;"><strong>Client:</strong> ${data.userName} (${data.userEmail})</p>
                <p style="margin: 5px 0;"><strong>Status:</strong> Subscription Cancelled</p>
              </div>
              <div style="text-align: center;">
                <a href="https://dashboard.bay.digital/admin/users" style="display: inline-block; background: #6b7280; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  View in Admin Dashboard →
                </a>
              </div>
            </div>
          </div>
        `;
        break;

      case 'subscription_cancelled_user':
        subject = `Your Bay Digital Subscription Has Been Cancelled`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Subscription Cancelled</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <p>Hi ${data.userName},</p>
              <p>We're sorry to see you go! Your Bay Digital subscription has been cancelled.</p>
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                <h3 style="margin: 0 0 15px 0; color: #333;">What This Means:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #555;">
                  <li style="margin-bottom: 10px;">Your website will remain live until the end of your current billing period</li>
                  <li style="margin-bottom: 10px;">You'll no longer be charged for future billing cycles</li>
                  <li style="margin-bottom: 10px;">You can reactivate anytime by updating your subscription</li>
                </ul>
              </div>
              <div style="background: #e8f4f8; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #0066cc;">
                  💡 <strong>Changed your mind?</strong> You can reactivate your subscription anytime from your dashboard.
                </p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://dashboard.bay.digital/subscription-required" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  Reactivate Subscription →
                </a>
              </div>
              <p style="font-size: 14px; color: #666;">We'd love to hear your feedback. Reply to this email to let us know how we can improve.</p>
              <p>Best regards,<br><strong>The Bay Digital Team</strong></p>
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
