import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, domain, domainId } = await req.json()

    if (action === 'create') {
      // Create domain in Resend
      if (!domain) {
        throw new Error('Domain is required')
      }

      // Check if domain already exists for this user
      const { data: existingDomain } = await supabaseAdmin
        .from('user_domains')
        .select('*')
        .eq('domain', domain)
        .single()

      if (existingDomain) {
        throw new Error('This domain is already registered')
      }

      console.log('Creating domain in Resend:', domain)

      // Call Resend API to create domain
      const resendResponse = await fetch('https://api.resend.com/domains', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: domain,
        }),
      })

      if (!resendResponse.ok) {
        const errorText = await resendResponse.text()
        console.error('Resend API error:', errorText)
        throw new Error(`Failed to create domain in Resend: ${errorText}`)
      }

      const resendData = await resendResponse.json()
      console.log('Resend domain created:', JSON.stringify(resendData, null, 2))

      // Store domain info in our database
      const { data: domainRecord, error: insertError } = await supabaseAdmin
        .from('user_domains')
        .insert({
          user_id: user.id,
          domain: domain,
          resend_domain_id: resendData.id,
          status: 'dns_required',
          dns_records: resendData.records,
          region: resendData.region || 'us-east-1',
        })
        .select()
        .single()

      if (insertError) {
        console.error('Database insert error:', insertError)
        throw new Error('Failed to save domain record')
      }

      return new Response(
        JSON.stringify({
          success: true,
          domain: domainRecord,
          dnsRecords: resendData.records,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'verify') {
      // Verify domain in Resend
      if (!domainId) {
        throw new Error('Domain ID is required')
      }

      // Get domain record
      const { data: domainRecord, error: fetchError } = await supabaseAdmin
        .from('user_domains')
        .select('*')
        .eq('id', domainId)
        .single()

      if (fetchError || !domainRecord) {
        throw new Error('Domain not found')
      }

      console.log('Verifying domain in Resend:', domainRecord.resend_domain_id)

      // Call Resend API to verify domain
      const resendResponse = await fetch(
        `https://api.resend.com/domains/${domainRecord.resend_domain_id}/verify`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
        }
      )

      // Get domain status after verification attempt
      const statusResponse = await fetch(
        `https://api.resend.com/domains/${domainRecord.resend_domain_id}`,
        {
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
        }
      )

      if (!statusResponse.ok) {
        throw new Error('Failed to get domain status')
      }

      const statusData = await statusResponse.json()
      console.log('Domain status:', JSON.stringify(statusData, null, 2))

      // Determine our status based on Resend's status
      let newStatus = 'dns_required'
      if (statusData.status === 'verified') {
        newStatus = 'verified'
      } else if (statusData.status === 'pending') {
        newStatus = 'verifying'
      } else if (statusData.status === 'failed') {
        newStatus = 'failed'
      }

      // Update domain record
      const { error: updateError } = await supabaseAdmin
        .from('user_domains')
        .update({
          status: newStatus,
          dns_records: statusData.records,
          receiving_enabled: statusData.capabilities?.receiving === 'enabled',
          last_verification_attempt: new Date().toISOString(),
          verified_at: newStatus === 'verified' ? new Date().toISOString() : null,
        })
        .eq('id', domainId)

      if (updateError) {
        console.error('Update error:', updateError)
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: newStatus,
          domain: statusData,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'enable-receiving') {
      // Enable receiving on a verified domain
      if (!domainId) {
        throw new Error('Domain ID is required')
      }

      // Get domain record
      const { data: domainRecord, error: fetchError } = await supabaseAdmin
        .from('user_domains')
        .select('*')
        .eq('id', domainId)
        .single()

      if (fetchError || !domainRecord) {
        throw new Error('Domain not found')
      }

      console.log('Enabling receiving for domain:', domainRecord.resend_domain_id)

      // Call Resend API to update domain (enable receiving)
      const resendResponse = await fetch(
        `https://api.resend.com/domains/${domainRecord.resend_domain_id}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            receiving: true,
          }),
        }
      )

      if (!resendResponse.ok) {
        const errorText = await resendResponse.text()
        console.error('Failed to enable receiving:', errorText)
        throw new Error('Failed to enable receiving')
      }

      const resendData = await resendResponse.json()
      console.log('Receiving enabled:', JSON.stringify(resendData, null, 2))

      // Update our record
      await supabaseAdmin
        .from('user_domains')
        .update({
          receiving_enabled: true,
          dns_records: resendData.records,
        })
        .eq('id', domainId)

      return new Response(
        JSON.stringify({
          success: true,
          domain: resendData,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'list') {
      // List all domains for the current user
      const { data: domains, error } = await supabaseClient
        .from('user_domains')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return new Response(
        JSON.stringify({ success: true, domains }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid action')

  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
