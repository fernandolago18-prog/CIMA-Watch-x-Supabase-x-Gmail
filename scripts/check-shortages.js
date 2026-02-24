/**
 * CIMA Watch — Daily Shortage Check & Email Notification Script
 * 
 * Runs via GitHub Actions cron at 8:00 AM daily.
 * 1. Reads subscription (emails + catalog CNs) from Supabase
 * 2. Fetches current shortages from CIMA API
 * 3. Compares with yesterday's snapshot
 * 4. Classifies into: new, continuing, resolved (only for catalog CNs)
 * 5. Sends email via Gmail SMTP
 * 6. Saves today's snapshot to Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const { buildEmailHTML } = require('./email-template');

// --- Configuration from environment variables ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

const CIMA_API_URL = 'https://cima.aemps.es/cima/rest/psuministro';
const PAGE_SIZE = 200;
const CONCURRENCY_LIMIT = 5;

// --- Helper: Fetch all shortages from CIMA API ---
async function fetchAllShortages() {
    console.log('Fetching shortages from CIMA API...');
    const cacheBuster = `&t=${Date.now()}`;
    let allResults = [];

    // First page to get total
    const firstRes = await fetch(`${CIMA_API_URL}?pagina=1&tamanioPagina=${PAGE_SIZE}${cacheBuster}`);
    if (!firstRes.ok) throw new Error(`CIMA API error: ${firstRes.status}`);
    const firstData = await firstRes.json();

    const totalItems = firstData.totalFilas || 0;
    allResults = firstData.resultados || [];

    if (totalItems === 0) return [];

    const totalPages = Math.ceil(totalItems / PAGE_SIZE);
    console.log(`Total: ${totalItems} items across ${totalPages} pages`);

    // Remaining pages with concurrency control
    if (totalPages > 1) {
        const remainingPages = [];
        for (let i = 2; i <= totalPages; i++) remainingPages.push(i);

        for (let i = 0; i < remainingPages.length; i += CONCURRENCY_LIMIT) {
            const chunk = remainingPages.slice(i, i + CONCURRENCY_LIMIT);
            const results = await Promise.all(
                chunk.map(async (pageNum) => {
                    try {
                        const res = await fetch(`${CIMA_API_URL}?pagina=${pageNum}&tamanioPagina=${PAGE_SIZE}${cacheBuster}`);
                        if (!res.ok) return [];
                        const data = await res.json();
                        return data.resultados || [];
                    } catch (err) {
                        console.warn(`Error fetching page ${pageNum}:`, err.message);
                        return [];
                    }
                })
            );
            results.forEach(r => { allResults = [...allResults, ...r]; });
        }
    }

    console.log(`Fetched ${allResults.length} total shortages`);
    return allResults;
}

// --- Helper: Normalize CN ---
function normalizeCN(rawCN) {
    if (!rawCN) return '';
    return String(rawCN).replace(/\D/g, '');
}

// --- Helper: Format date ---
function formatDate(timestamp) {
    if (!timestamp) return '';
    const d = new Date(Number(timestamp));
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// --- Main ---
async function main() {
    console.log('=== CIMA Watch Daily Check ===');
    console.log(`Date: ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`);

    // Validate env vars
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        console.error('Missing Supabase credentials');
        process.exit(1);
    }
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
        console.error('Missing Gmail credentials');
        process.exit(1);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. Load subscription
    console.log('Loading subscription from Supabase...');
    const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .limit(1)
        .single();

    if (subError || !subscription) {
        console.log('No subscription configured. Skipping.');
        process.exit(0);
    }

    const { emails, catalog_cns: catalogCNs, hospital_name: hospitalName } = subscription;

    if (!emails || emails.length === 0) {
        console.log('No email recipients configured. Skipping.');
        process.exit(0);
    }

    if (!catalogCNs || catalogCNs.length === 0) {
        console.log('No catalog CNs configured. Skipping.');
        process.exit(0);
    }

    console.log(`Subscription: ${hospitalName}, ${emails.length} recipients, ${catalogCNs.length} catalog CNs`);

    const catalogSet = new Set(catalogCNs);

    // 2. Fetch current shortages from CIMA
    const allShortages = await fetchAllShortages();

    // Filter to only catalog medications and normalize
    const currentShortageMap = new Map();
    allShortages.forEach(item => {
        const rawCN = item.cn || item.nregistro;
        const normalized = normalizeCN(rawCN);
        if (normalized && catalogSet.has(normalized)) {
            currentShortageMap.set(normalized, item);
        }
    });

    const currentCNs = new Set(currentShortageMap.keys());
    console.log(`Current shortages matching catalog: ${currentCNs.size}`);

    // 3. Load yesterday's snapshot
    const { data: lastSnapshot } = await supabase
        .from('snapshots')
        .select('shortage_cns, shortage_data')
        .eq('subscription_id', subscription.id)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();

    const previousCNs = new Set(lastSnapshot?.shortage_cns || []);
    const previousData = lastSnapshot?.shortage_data || {};
    console.log(`Previous snapshot had ${previousCNs.size} shortage CNs`);

    // 4. Classify
    const newCNs = [...currentCNs].filter(cn => !previousCNs.has(cn));
    const continuingCNs = [...currentCNs].filter(cn => previousCNs.has(cn));
    const resolvedCNs = [...previousCNs].filter(cn => !currentCNs.has(cn));

    const newShortages = newCNs.map(cn => currentShortageMap.get(cn)).filter(Boolean);
    const continuingShortages = continuingCNs.map(cn => currentShortageMap.get(cn)).filter(Boolean);
    const resolvedShortages = resolvedCNs.map(cn => previousData[cn] || { cn, nombre: `CN: ${cn}` });

    console.log(`New: ${newShortages.length}, Continuing: ${continuingShortages.length}, Resolved: ${resolvedShortages.length}`);

    // 5. Build and send email
    const today = new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Europe/Madrid'
    });

    const htmlContent = buildEmailHTML({
        hospitalName,
        date: today,
        newShortages,
        continuingShortages,
        resolvedShortages
    });

    // Configure transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: GMAIL_USER,
            pass: GMAIL_APP_PASSWORD
        }
    });

    // Determine subject line
    let subject = `📊 CIMA Watch — Informe diario (${new Date().toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' })})`;
    if (newShortages.length > 0) {
        subject = `🚨 CIMA Watch — ${newShortages.length} nuevo${newShortages.length > 1 ? 's' : ''} desabastecimiento${newShortages.length > 1 ? 's' : ''} (${new Date().toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' })})`;
    }
    if (resolvedShortages.length > 0 && newShortages.length === 0) {
        subject = `✅ CIMA Watch — ${resolvedShortages.length} medicamento${resolvedShortages.length > 1 ? 's' : ''} restablecido${resolvedShortages.length > 1 ? 's' : ''} (${new Date().toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' })})`;
    }

    // Send to all recipients
    for (const recipient of emails) {
        try {
            await transporter.sendMail({
                from: `"CIMA Watch" <${GMAIL_USER}>`,
                to: recipient,
                subject,
                html: htmlContent
            });
            console.log(`✅ Email sent to ${recipient}`);
        } catch (err) {
            console.error(`❌ Failed to send to ${recipient}:`, err.message);
        }
    }

    // 6. Save today's snapshot
    // Build a data map for resolved lookups tomorrow
    const snapshotData = {};
    currentShortageMap.forEach((item, cn) => {
        snapshotData[cn] = {
            cn: item.cn || item.nregistro,
            nregistro: item.nregistro,
            nombre: item.nombre,
            observ: item.observ,
            activo: item.activo,
            fini: item.fini,
            ffin: item.ffin
        };
    });

    const { error: snapError } = await supabase
        .from('snapshots')
        .insert({
            subscription_id: subscription.id,
            shortage_cns: [...currentCNs],
            shortage_data: snapshotData,
            snapshot_date: new Date().toISOString().split('T')[0]
        });

    if (snapError) {
        console.error('Error saving snapshot:', snapError.message);
    } else {
        console.log('Snapshot saved successfully');
    }

    // 7. Cleanup old snapshots (keep last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    await supabase
        .from('snapshots')
        .delete()
        .lt('snapshot_date', thirtyDaysAgo.toISOString().split('T')[0]);

    console.log('=== Done ===');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
