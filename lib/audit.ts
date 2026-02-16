import { supabase } from './supabase';

export const logAudit = async (
    action: string,
    tableName?: string,
    recordId?: string,
    oldData?: any,
    newData?: any
) => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        await supabase.from('audit_logs').insert({
            user_id: session.user.id,
            action,
            table_name: tableName,
            record_id: recordId,
            old_data: oldData,
            new_data: newData
        });
    } catch (error) {
        console.error('Failed to log audit:', error);
    }
};
