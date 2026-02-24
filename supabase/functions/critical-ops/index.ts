import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Get user from auth header
        const authHeader = req.headers.get('Authorization')!
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))

        if (authError || !user) {
            throw new Error('Não autorizado')
        }

        // Check role from profiles
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        const isAdmin = profile?.role === 'admin'

        const { action, table, id, payload } = await req.json()

        if (!isAdmin && (action === 'APPROVE' || action === 'FINANCIAL_UPDATE' || action === 'DELETE')) {
            throw new Error('Permissão negada para esta ação crítica.')
        }

        let result;
        if (action === 'APPROVE') {
            result = await supabaseClient.from('project_steps').update(payload).eq('id', id)
        } else if (action === 'FINANCIAL_UPDATE') {
            result = await supabaseClient.from(table).update(payload).eq('id', id)
        }

        // Auto log audit from edge function
        await supabaseClient.from('audit_logs').insert({
            user_id: user.id,
            action: `EdgeFunction: ${action}`,
            table_name: table,
            record_id: id,
            new_data: payload
        })

        return new Response(JSON.stringify({ success: true, data: result.data }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
