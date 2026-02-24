
import React from 'react';
import { Search, AlertTriangle } from 'lucide-react';

const Filters = ({ searchQuery, setSearchQuery, showCriticalOnly, setShowCriticalOnly }) => {
    return (
        <div className="controls glass-panel">
            <div className="search-bar">
                <Search size={20} className="search-icon" />
                <input
                    type="text"
                    placeholder="Buscar medicamento o código nacional..."
                    className="search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="filter-toggles">
                <label className={`toggle-btn ${showCriticalOnly ? 'active' : ''}`}>
                    <input
                        type="checkbox"
                        checked={showCriticalOnly}
                        onChange={(e) => setShowCriticalOnly(e.target.checked)}
                        style={{ display: 'none' }}
                    />
                    <AlertTriangle size={16} />
                    <span>Solo Críticos (Sin Alternativa)</span>
                </label>
            </div>
        </div>
    );
};

export default Filters;
