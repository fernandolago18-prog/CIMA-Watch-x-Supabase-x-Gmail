
import React, { useState } from 'react';
import { AlertTriangle, Calendar, Info, CheckCircle, XCircle } from 'lucide-react';
import { isCriticalShortage } from '../utils/shortageUtils';
import { formatDate } from '../utils/dateUtils';

const ShortageCard = React.memo(({ shortage, style, isManaged, onToggleManaged, note, onUpdateNote }) => {
    const [expanded, setExpanded] = useState(false);

    const isActive = shortage.activo;
    const isCritical = isCriticalShortage(shortage);

    const isLongObservation = shortage.observ && shortage.observ.length > 200;
    const observationText = isLongObservation && !expanded
        ? `${shortage.observ.substring(0, 200)}...`
        : shortage.observ;

    // Use nregistro or cn for identification
    const id = shortage.cn || shortage.nregistro;

    return (
        <div
            className={`shortage-card glass-panel ${isCritical ? 'critical-border' : ''} ${shortage.inCatalog ? 'catalog-match' : ''} ${isManaged ? 'managed-item' : ''}`}
            style={style}
        >
            <div className="card-header">
                <span className="cn-badge">Código Nacional: {shortage.cn}</span>
                <div className="status-badges">
                    {/* Managed Toggle Button */}
                    <button
                        onClick={() => onToggleManaged && onToggleManaged(id)}
                        className={`status-pill status-managed-toggle ${isManaged ? 'active' : ''}`}
                        title={isManaged ? "Marcar como pendiente" : "Marcar como gestionado"}
                    >
                        <span className="icon-wrapper-stable">
                            {isManaged ? <CheckCircle size={14} /> : <div className="circle-outline"></div>}
                        </span>
                        <span>{isManaged ? 'Gestionado' : 'Pendiente'}</span>
                    </button>

                    {shortage.inCatalog && (
                        <span className="status-pill status-catalog" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }}>
                            Hospital
                        </span>
                    )}
                    {!isActive && (
                        <span className="status-pill status-resolved"><CheckCircle size={12} /> Resuelto</span>
                    )}
                    {isCritical && (
                        <span className="status-pill status-critical"><AlertTriangle size={12} /> Crítico</span>
                    )}
                </div>
            </div>

            <h3 className="medicine-name">{shortage.nombre}</h3>

            <div className="card-body">
                <div className="date-row">
                    <span className="date-item" title="Fecha Inicio">
                        <Calendar size={14} className="icon-muted" />
                        {formatDate(shortage.fini)}
                    </span>
                    <span className="arrow">→</span>
                    <span className="date-item" title="Fecha Fin Estimada">
                        {shortage.ffin && new Date(shortage.ffin).getFullYear() < 2050
                            ? formatDate(shortage.ffin)
                            : 'Sin fecha estimada'}
                    </span>
                </div>

                {shortage.observ && (
                    <div
                        className={`observations ${expanded ? 'expanded' : ''}`}
                        onClick={() => setExpanded(prev => !prev)}
                    >
                        <p>
                            <Info size={14} className="icon-info" />
                            <span style={{ whiteSpace: 'pre-wrap' }}>{observationText}</span>
                        </p>
                        {isLongObservation && (
                            <button
                                type="button"
                                className="expand-hint"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setExpanded(prev => !prev);
                                }}
                            >
                                {expanded ? 'Ver menos' : 'Ver más'}
                            </button>
                        )}
                    </div>
                )}

                {/* Notes Section */}
                <div className="note-section">
                    <label className="note-label">Mis Notas:</label>
                    <textarea
                        className="note-input"
                        placeholder="Escribe aquí para gestionar (ej: Pedido equivalente...)"
                        defaultValue={note || ''}
                        onBlur={(e) => onUpdateNote && onUpdateNote(id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            </div>
        </div>
    );
});

export default ShortageCard;
