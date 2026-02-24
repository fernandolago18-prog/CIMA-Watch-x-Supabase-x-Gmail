
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Only allow GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return res.status(500).json({ error: 'Supabase not configured on server' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const { data, error } = await supabase
            .from('subscriptions')
            .select('emails, hospital_name')
            .limit(1)
            .single();

        if (error || !data) {
            // No subscription yet — return empty defaults
            return res.status(200).json({
                emails: [],
                hospitalName: 'Hospital'
            });
        }

        return res.status(200).json({
            emails: data.emails || [],
            hospitalName: data.hospital_name || 'Hospital'
        });

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}
