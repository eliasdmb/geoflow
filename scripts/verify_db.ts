
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkRecentProjects() {
    console.log('Checking recent projects (Admin Bypass)...');
    const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching projects:', error);
        return;
    }

    console.log('Recent Projects found in DB:', projects?.length);
    projects?.forEach(p => {
        console.log(`- [${p.id}] ${p.title} (User: ${p.user_id}) Created: ${p.created_at}`);
    });

    // Check RLS policies if possible via pg_policies view (requires permissions)
    // or just check one project's steps
    if (projects && projects.length > 0) {
        const p = projects[0];
        const { data: steps, error: sError } = await supabase
            .from('project_steps')
            .select('*')
            .eq('project_id', p.id);

        console.log(`Steps for project ${p.id}:`, steps?.length);
        if (sError) console.error('Error fetching steps:', sError);
    }
}

checkRecentProjects();
