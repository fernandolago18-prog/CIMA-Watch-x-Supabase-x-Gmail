
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return res.status(500).json({ error: 'Supabase not configured on server' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const { emails, catalogCNs, hospitalName } = req.body;

        if (!emails || !Array.isArray(emails) || emails.length === 0) {
            return res.status(400).json({ error: 'Se requiere al menos un email' });
        }

        if (!catalogCNs || !Array.isArray(catalogCNs) || catalogCNs.length === 0) {
            return res.status(400).json({ error: 'Se requiere un catálogo con códigos nacionales' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const invalidEmails = emails.filter(e => !emailRegex.test(e));
        if (invalidEmails.length > 0) {
            return res.status(400).json({ error: `Emails inválidos: ${invalidEmails.join(', ')}` });
        }

        // Upsert: update if exists, insert if not
        // We use a single-row approach (one subscription per app instance)
        const { data: existing } = await supabase
            .from('subscriptions')
            .select('id')
            .limit(1)
            .single();

        let result;
        if (existing) {
            // Update existing subscription
            result = await supabase
                .from('subscriptions')
                .update({
                    emails,
                    catalog_cns: catalogCNs,
                    hospital_name: hospitalName || 'Hospital',
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select();
        } else {
            // Insert new subscription
            result = await supabase
                .from('subscriptions')
                .insert({
                    emails,
                    catalog_cns: catalogCNs,
                    hospital_name: hospitalName || 'Hospital'
                })
                .select();
        }

        if (result.error) {
            console.error('Supabase error:', result.error);
            return res.status(500).json({ error: 'Error al guardar la configuración' });
        }

        return res.status(200).json({
            success: true,
            message: 'Configuración guardada correctamente',
            data: result.data[0]
        });

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}
