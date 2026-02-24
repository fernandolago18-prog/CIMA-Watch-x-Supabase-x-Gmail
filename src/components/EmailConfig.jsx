
import React, { useState, useEffect } from 'react';
import { Mail, Plus, X, Save, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const EmailConfig = ({ catalogCNs }) => {
    const [emails, setEmails] = useState(() => {
        const saved = localStorage.getItem('notificationEmails');
        if (saved) {
            try { return JSON.parse(saved); } catch { return []; }
        }
        return [];
    });
    const [hospitalName, setHospitalName] = useState(() => {
        return localStorage.getItem('hospitalName') || '';
    });
    const [newEmail, setNewEmail] = useState('');
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState(null); // { type: 'success'|'error', message: string }
    const [expanded, setExpanded] = useState(false);

    // Load existing config from server (never directly from Supabase)
    useEffect(() => {
        const loadConfig = async () => {
            try {
                const res = await fetch('/api/load-config');
                if (!res.ok) return;
                const data = await res.json();

                if (data.emails && data.emails.length > 0) {
                    setEmails(data.emails);
                    localStorage.setItem('notificationEmails', JSON.stringify(data.emails));
                }
                if (data.hospitalName) {
                    setHospitalName(data.hospitalName);
                    localStorage.setItem('hospitalName', data.hospitalName);
                }
            } catch {
                // No existing config or offline, use localStorage fallback
            }
        };
        loadConfig();
    }, []);

    const addEmail = () => {
        const trimmed = newEmail.trim().toLowerCase();
        if (!trimmed) return;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed)) {
            setStatus({ type: 'error', message: 'Formato de email inválido' });
            return;
        }

        if (emails.includes(trimmed)) {
            setStatus({ type: 'error', message: 'Este email ya está en la lista' });
            return;
        }

        if (emails.length >= 10) {
            setStatus({ type: 'error', message: 'Máximo 10 destinatarios' });
            return;
        }

        const updated = [...emails, trimmed];
        setEmails(updated);
        localStorage.setItem('notificationEmails', JSON.stringify(updated));
        setNewEmail('');
        setStatus(null);
    };

    const removeEmail = (emailToRemove) => {
        const updated = emails.filter(e => e !== emailToRemove);
        setEmails(updated);
        localStorage.setItem('notificationEmails', JSON.stringify(updated));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addEmail();
        }
    };

    const saveConfig = async () => {
        if (emails.length === 0) {
            setStatus({ type: 'error', message: 'Añade al menos un email' });
            return;
        }

        if (catalogCNs.size === 0) {
            setStatus({ type: 'error', message: 'Primero sube un catálogo de medicamentos' });
            return;
        }

        setSaving(true);
        setStatus(null);

        try {
            const response = await fetch('/api/save-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    emails,
                    catalogCNs: [...catalogCNs],
                    hospitalName: hospitalName || 'Hospital'
                })
            });

            const result = await response.json();

            if (response.ok) {
                localStorage.setItem('hospitalName', hospitalName);
                setStatus({ type: 'success', message: '✅ Configuración guardada. Recibirás un email diario a las 8:00 AM.' });
            } else {
                setStatus({ type: 'error', message: result.error || 'Error al guardar' });
            }
        } catch {
            setStatus({ type: 'error', message: 'Error de conexión. Inténtalo de nuevo.' });
        } finally {
            setSaving(false);
        }
    };

    // Component always renders — config is loaded/saved via server API routes

    return (
        <div className="email-config glass-panel">
            <button
                className="email-config-toggle"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="email-config-toggle-left">
                    <Mail size={20} />
                    <span>Alertas por Email</span>
                </div>
                <span className="email-config-toggle-badge">
                    {emails.length > 0 ? `${emails.length} destinatario${emails.length > 1 ? 's' : ''}` : 'Sin configurar'}
                </span>
            </button>

            {expanded && (
                <div className="email-config-body">
                    <p className="email-config-description">
                        Recibe un informe diario a las 8:00 AM con los cambios en desabastecimientos que afectan a tu catálogo.
                    </p>

                    {/* Hospital Name */}
                    <div className="email-config-field">
                        <label className="email-config-label">Nombre del centro</label>
                        <input
                            type="text"
                            className="email-config-input"
                            placeholder="Ej: Hospital Universitario..."
                            value={hospitalName}
                            onChange={(e) => setHospitalName(e.target.value)}
                        />
                    </div>

                    {/* Email list */}
                    <div className="email-config-field">
                        <label className="email-config-label">Destinatarios del informe</label>
                        <div className="email-input-row">
                            <input
                                type="email"
                                className="email-config-input"
                                placeholder="nuevoemail@ejemplo.com"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <button onClick={addEmail} className="email-add-btn" title="Añadir email">
                                <Plus size={18} />
                            </button>
                        </div>

                        {emails.length > 0 && (
                            <div className="email-chips">
                                {emails.map(email => (
                                    <div key={email} className="email-chip">
                                        <span>{email}</span>
                                        <button
                                            onClick={() => removeEmail(email)}
                                            className="email-chip-remove"
                                            title="Quitar"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Status message */}
                    {status && (
                        <div className={`email-config-status ${status.type}`}>
                            {status.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                            <span>{status.message}</span>
                        </div>
                    )}

                    {/* Save button */}
                    <button
                        onClick={saveConfig}
                        disabled={saving || emails.length === 0}
                        className="email-save-btn"
                    >
                        {saving ? (
                            <>
                                <Loader size={16} className="spinning" />
                                <span>Guardando...</span>
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                <span>Guardar y Activar Alertas</span>
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default EmailConfig;
