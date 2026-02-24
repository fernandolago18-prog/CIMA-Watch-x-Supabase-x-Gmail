
/**
 * Determines if a shortage is critical based on its active status and observations.
 * User Rules (2026-02-18):
 * - CRITICAL: "medicamento extranjero", "distribución controlada", or NO info.
 * - NON-CRITICAL: "Existe/n otro/s medicamento/s", "tratamientos alternativos".
 * @param {Object} shortage - The shortage object from the API.
 * @returns {boolean} - True if critical, false otherwise.
 */
export const isCriticalShortage = (shortage) => {
    if (!shortage.activo) return false;

    // Normalize whitespace: replace newlines, tabs, and multiple spaces with a single space
    const obs = shortage.observ ? shortage.observ.toLowerCase().replace(/\s+/g, ' ') : '';

    // 2. Explicit NON-CRITICAL triggers (Alleviation) - Priority highest
    // user: "medicamento sen los que se muestre que se pueden sustituir por otros disponibles... no seran cruiticos"
    // user (2026-02-18): "Existe/n otro/s medicamento/s... no deben ser clasificados como criticos"
    const alleviationTriggers = [
        'existe/n otro/s',
        'existen otros',
        'existe otro',
        'tratamientos alternativos',
        'el médico', // Often "El médico determinará..." implies alternatives exist but need prescription change
        'tratamientos comercializados',
        'principio activo', // Catch-all for "mismo principio activo", "mismos principios activos", etc.
        'principios activos',
        'misma vía de administración',
        'de administracion', // Catch-all for "via de administracion", "vía de administración" ignoring accents
        'de administración'
    ];
    if (alleviationTriggers.some(t => obs.includes(t))) return false;

    // 2. Explicit CRITICAL triggers
    // user: "Aquelllos en los qu eel laboratorio esta controlando el suministro o han de pediarse a extranjeros seran criticos"
    const criticalTriggers = [
        'medicamento extranjero',
        'distribución controlada',
        'suministro controlado'
    ];
    if (criticalTriggers.some(t => obs.includes(t))) return true;

    // 3. Default: If active and no alleviation mentioned, assume Critical
    return true;
};
