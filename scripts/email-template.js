/**
 * Email HTML template for daily shortage report.
 * @param {Object} data
 * @param {string} data.hospitalName
 * @param {string} data.date - Formatted date string
 * @param {Array} data.newShortages - Medications newly in shortage
 * @param {Array} data.continuingShortages - Medications still in shortage
 * @param {Array} data.resolvedShortages - Medications no longer in shortage
 * @returns {string} HTML email content
 */
function buildEmailHTML({ hospitalName, date, newShortages, continuingShortages, resolvedShortages }) {

    // --- Helpers ---
    function formatDateStr(timestamp) {
        if (!timestamp) return '';
        const d = new Date(Number(timestamp));
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function formatEndDate(ffin) {
        if (!ffin) return 'Sin fecha estimada';
        const d = new Date(Number(ffin));
        if (isNaN(d.getTime())) return 'Sin fecha estimada';
        if (d.getFullYear() > 2040) return 'Sin fecha estimada';
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function isCritical(item) {
        if (!item.activo && item.activo !== undefined) return false;
        const obs = item.observ ? item.observ.toLowerCase().replace(/\s+/g, ' ') : '';
        const alleviationTriggers = [
            'existe/n otro/s', 'existen otros', 'existe otro',
            'tratamientos alternativos', 'el médico',
            'tratamientos comercializados', 'principio activo',
            'principios activos', 'misma vía de administración',
            'de administracion', 'de administración'
        ];
        if (alleviationTriggers.some(t => obs.includes(t))) return false;
        const criticalTriggers = ['medicamento extranjero', 'distribución controlada', 'suministro controlado'];
        if (criticalTriggers.some(t => obs.includes(t))) return true;
        return true;
    }

    // --- Full detail card for new/continuing shortages ---
    function formatDetailedMedication(item) {
        const cn = item.cn || item.nregistro || 'N/A';
        const name = item.nombre || 'Sin nombre';
        const dateStart = formatDateStr(item.fini);
        const dateEnd = formatEndDate(item.ffin);
        const obs = item.observ || '';
        const critical = isCritical(item);
        const criticalBadge = critical
            ? '<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:#fef2f2;color:#ef4444;border:1px solid #fee2e2;">⚠ CRÍTICO</span>'
            : '<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:#ecfdf5;color:#10b981;border:1px solid #d1fae5;">Alternativa disponible</span>';

        return `
            <div style="background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid ${critical ? '#ef4444' : '#0d9488'};border-radius:8px;padding:16px;margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
                    <span style="font-family:'Consolas',monospace;font-size:12px;background:#f1f5f9;padding:2px 8px;border-radius:4px;color:#64748b;border:1px solid #e2e8f0;">CN: ${cn}</span>
                    ${criticalBadge}
                </div>
                <h3 style="margin:0 0 10px;font-size:15px;font-weight:700;color:#0f172a;line-height:1.4;">${name}</h3>
                <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#64748b;margin-bottom:10px;">
                    <span>📅 ${dateStart}</span>
                    <span>→</span>
                    <span>${dateEnd}</span>
                </div>
                ${obs ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px;font-size:13px;color:#475569;line-height:1.5;">
                    <strong style="color:#0d9488;">ℹ Observaciones AEMPS:</strong><br>${obs}
                </div>` : ''}
            </div>`;
    }

    // --- Simple row for resolved medications (only name + CN) ---
    function formatResolvedMedication(item) {
        const cn = item.cn || item.nregistro || 'N/A';
        const name = item.nombre || 'Sin nombre';
        return `
            <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-family:'Consolas',monospace;font-size:13px;color:#64748b;white-space:nowrap;">${cn}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0f172a;">${name}</td>
            </tr>`;
    }

    // --- Section builders ---
    function buildDetailedSection(title, icon, bgColor, borderColor, textColor, items) {
        if (items.length === 0) {
            return `
                <div style="margin-bottom:24px;padding:16px;background:${bgColor};border-left:4px solid ${borderColor};border-radius:8px;">
                    <h2 style="margin:0;font-size:16px;color:${textColor};">${icon} ${title}</h2>
                    <p style="margin:8px 0 0;color:#64748b;font-style:italic;">Ninguno</p>
                </div>`;
        }
        return `
            <div style="margin-bottom:24px;">
                <div style="padding:12px 16px;background:${bgColor};border-left:4px solid ${borderColor};border-radius:8px;margin-bottom:12px;">
                    <h2 style="margin:0;font-size:16px;color:${textColor};">${icon} ${title} (${items.length})</h2>
                </div>
                ${items.map(formatDetailedMedication).join('')}
            </div>`;
    }

    function buildResolvedSection(items) {
        if (items.length === 0) {
            return `
                <div style="margin-bottom:24px;padding:16px;background:#ecfdf5;border-left:4px solid #10b981;border-radius:8px;">
                    <h2 style="margin:0;font-size:16px;color:#059669;">✅ Restablecidos</h2>
                    <p style="margin:8px 0 0;color:#64748b;font-style:italic;">Ninguno</p>
                </div>`;
        }
        return `
            <div style="margin-bottom:24px;">
                <div style="padding:12px 16px;background:#ecfdf5;border-left:4px solid #10b981;border-radius:8px 8px 0 0;">
                    <h2 style="margin:0;font-size:16px;color:#059669;">✅ Restablecidos (${items.length})</h2>
                </div>
                <table style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
                    <thead>
                        <tr style="background:#f8fafc;">
                            <th style="padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;">CN</th>
                            <th style="padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;">Medicamento</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(formatResolvedMedication).join('')}
                    </tbody>
                </table>
            </div>`;
    }

    // --- Main template ---
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <div style="max-width:800px;margin:0 auto;padding:24px;">
        
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#0d9488,#0f766e);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;">💊 CIMA Watch</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Informe Diario de Desabastecimientos</p>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">${hospitalName} — ${date}</p>
        </div>

        <!-- Summary counters -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
                <td width="33%" style="padding:0 6px 0 0;">
                    <div style="background:#fef2f2;border-radius:8px;padding:16px;text-align:center;">
                        <div style="font-size:28px;font-weight:800;color:#ef4444;">${newShortages.length}</div>
                        <div style="font-size:12px;color:#64748b;text-transform:uppercase;">Nuevos</div>
                    </div>
                </td>
                <td width="33%" style="padding:0 3px;">
                    <div style="background:#fff7ed;border-radius:8px;padding:16px;text-align:center;">
                        <div style="font-size:28px;font-weight:800;color:#f59e0b;">${continuingShortages.length}</div>
                        <div style="font-size:12px;color:#64748b;text-transform:uppercase;">Continúan</div>
                    </div>
                </td>
                <td width="33%" style="padding:0 0 0 6px;">
                    <div style="background:#ecfdf5;border-radius:8px;padding:16px;text-align:center;">
                        <div style="font-size:28px;font-weight:800;color:#10b981;">${resolvedShortages.length}</div>
                        <div style="font-size:12px;color:#64748b;text-transform:uppercase;">Resueltos</div>
                    </div>
                </td>
            </tr>
        </table>

        <!-- New shortages (full detail) -->
        ${buildDetailedSection('Nuevos Desabastecimientos', '🆕', '#fef2f2', '#ef4444', '#dc2626', newShortages)}

        <!-- Continuing shortages (full detail) -->
        ${buildDetailedSection('Continúan en Desabastecimiento', '⚠️', '#fff7ed', '#f59e0b', '#d97706', continuingShortages)}

        <!-- Resolved (only name + CN) -->
        ${buildResolvedSection(resolvedShortages)}

        <!-- Footer -->
        <div style="text-align:center;padding:16px;color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;margin-top:24px;">
            <p style="margin:0;">Generado automáticamente por CIMA Watch</p>
            <p style="margin:4px 0 0;">Datos de la API de CIMA — AEMPS (Agencia Española de Medicamentos y Productos Sanitarios)</p>
        </div>
    </div>
</body>
</html>`;
}

module.exports = { buildEmailHTML };
