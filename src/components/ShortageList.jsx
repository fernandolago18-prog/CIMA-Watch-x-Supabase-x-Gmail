
import React from 'react';
import ShortageCard from './ShortageCard';

const ShortageList = ({ shortages, loading, progress, managedCNs, onToggleManaged, notes, onUpdateNote }) => {
    // Debug logging
    console.log('ShortageList render:', {
        loading,
        shortagesLength: shortages?.length,
        progress
    });

    if (loading && (!shortages || shortages.length === 0)) {
        return (
            <div className="loading-state">
                <Spinner />
                <p>Cargando datos de CIMA...</p>
                {progress && progress.total > 0 && (
                    <div style={{ padding: '0 1rem' }}>
                        <div className="progress-bar-container">
                            <div
                                className="progress-bar-fill"
                                style={{ width: `${Math.min((progress.current / progress.total) * 100, 100)}%` }}
                            />
                        </div>
                        <span className="progress-text">
                            Cargando página {progress.current} de {progress.total}
                        </span>
                    </div>
                )}
            </div>
        );
    }

    if (!loading && (!shortages || shortages.length === 0)) {
        return (
            <div className="empty-state">
                <p>No se encontraron resultados para su búsqueda.</p>
            </div>
        );
    }

    return (
        <div className="shortage-grid">
            {shortages.map((shortage) => {
                const id = shortage.cn || shortage.nregistro;
                return (
                    <ShortageCard
                        key={id}
                        shortage={shortage}
                        isManaged={managedCNs ? managedCNs.has(id) : false}
                        onToggleManaged={onToggleManaged}
                        note={notes ? notes[id] : ''}
                        onUpdateNote={onUpdateNote}
                    />
                );
            })}
        </div>
    );
};

// Simple Spinner component for loading state
const Spinner = () => (
    <div className="spinner" style={{
        width: '40px',
        height: '40px',
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #0d9488',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 1rem'
    }}></div>
);

export default ShortageList;
