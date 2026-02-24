
import { useState, useEffect, useMemo, useCallback } from 'react';
import './index.css';
import { getAllShortages } from './services/cimaService';
import Header from './components/Header';
import Filters from './components/Filters';
import ShortageList from './components/ShortageList';
import CatalogUpload from './components/CatalogUpload';
import EmailConfig from './components/EmailConfig';
import { isCriticalShortage } from './utils/shortageUtils';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const [shortages, setShortages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Catalog State - Initialize from localStorage if available
  const [catalogCNs, setCatalogCNs] = useState(() => {
    const saved = localStorage.getItem('catalogCNs');
    if (saved) {
      try {
        return new Set(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing saved catalog", e);
        return new Set();
      }
    }
    return new Set();
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const [showCatalogOnly, setShowCatalogOnly] = useState(false);

  // Debounce effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 200);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Auto-enable filter if catalog was loaded from storage
  useEffect(() => {
    if (catalogCNs.size > 0) {
      // Keep filter off by default on load
    }
  }, []);

  /* 
     Load ALL data at once. 
     Pagination is handled internally by the service now. 
     This ensures Search and Catalog Matching work on the full dataset.
  */
  const [loadProgress, setLoadProgress] = useState({ current: 0, total: 0 });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLoadProgress({ current: 0, total: 0 });

    try {
      const data = await getAllShortages((current, total) => {
        setLoadProgress({ current, total });
      });

      if (data && data.resultados) {
        console.log('App: Data loaded', data.resultados.length);
        setShortages(data.resultados);
      } else {
        console.warn('App: No results in data', data);
      }
    } catch {
      setError('Error al cargar los datos de desabastecimiento. Por favor, inténtelo de nuevo más tarde.');
    } finally {
      setLoading(false);
      setLoadProgress({ current: 0, total: 0 });
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCatalogLoaded = (cnSet) => {
    setCatalogCNs(cnSet);
    localStorage.setItem('catalogCNs', JSON.stringify([...cnSet]));

    if (cnSet.size > 0) {
      setShowCatalogOnly(true);
    } else {
      setShowCatalogOnly(false);
    }
  };

  const handleClearCatalog = () => {
    setCatalogCNs(new Set());
    localStorage.removeItem('catalogCNs');
    localStorage.removeItem('catalogFileName');
    setShowCatalogOnly(false);
  };

  // Managed State (Gestionados) - Initialize from localStorage
  const [managedCNs, setManagedCNs] = useState(() => {
    const saved = localStorage.getItem('managedCNs');
    if (saved) {
      try {
        return new Set(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing saved managed items", e);
        return new Set();
      }
    }
    return new Set();
  });

  const toggleManaged = useCallback((cn) => {
    setManagedCNs(prev => {
      const next = new Set(prev);
      if (next.has(cn)) {
        next.delete(cn);
      } else {
        next.add(cn);
      }
      localStorage.setItem('managedCNs', JSON.stringify([...next]));
      return next;
    });
  }, []);

  // Notes State (Notas) - Initialize from localStorage
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem('shortageNotes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing saved notes", e);
        return {};
      }
    }
    return {};
  });

  const updateNote = useCallback((cn, text) => {
    setNotes(prev => {
      const next = { ...prev };
      if (!text || text.trim() === '') {
        delete next[cn];
      } else {
        next[cn] = text;
      }
      localStorage.setItem('shortageNotes', JSON.stringify(next));
      return next;
    });
  }, []);

  // Smart Cleanup Handler (Only removes data for resolved/missing items)
  const handleCleanupData = () => {
    if (window.confirm("¿Limpiar datos de medicamentos RESUELTOS?\n\nEsta acción borrará las notas y marcas de 'Gestionado' SOLO de los medicamentos que ya no están en la lista de desabastecimiento.\n\nLos datos de desabastecimientos activos SE MANTENDRÁN.")) {
      const activeCNs = new Set(shortages.map(s => String(s.cn || s.nregistro)));

      const newManaged = new Set([...managedCNs].filter(cn => activeCNs.has(String(cn))));

      const newNotes = Object.keys(notes).reduce((acc, cn) => {
        if (activeCNs.has(String(cn))) {
          acc[cn] = notes[cn];
        }
        return acc;
      }, {});

      setManagedCNs(newManaged);
      setNotes(newNotes);

      localStorage.setItem('managedCNs', JSON.stringify([...newManaged]));
      localStorage.setItem('shortageNotes', JSON.stringify(newNotes));

      const removedCount = (managedCNs.size - newManaged.size) + (Object.keys(notes).length - Object.keys(newNotes).length);
      if (removedCount > 0) {
        alert(`Se han limpiado ${removedCount} registros antiguos.`);
      } else {
        alert("No había datos antiguos para limpiar.");
      }
    }
  };

  // Derived state for filtered list
  const filteredShortages = useMemo(() => {
    const now = Date.now();
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;

    return shortages.map(item => {
      const rawCN = item.cn || item.nregistro;
      const apiCN = rawCN ? String(rawCN).replace(/\D/g, '') : '';

      return {
        ...item,
        normalizedCN: apiCN,
        inCatalog: catalogCNs.has(apiCN)
      };
    }).filter(item => {
      const startMs = Number(item.fini);
      let hasIndefiniteEnd = false;

      if (!item.ffin) {
        hasIndefiniteEnd = true;
      } else {
        const endYear = new Date(item.ffin).getFullYear();
        if (endYear > 2040) hasIndefiniteEnd = true;
      }

      if (startMs && (now - startMs > oneYearMs) && hasIndefiniteEnd) {
        return false;
      }

      const trimmedQuery = debouncedSearchQuery.trim();
      const lowerQuery = trimmedQuery.toLowerCase();
      const normalizedQuery = trimmedQuery.replace(/\D/g, '');

      const nameMatch = item.nombre && item.nombre.toLowerCase().includes(lowerQuery);

      const cnMatch = (item.nregistro && String(item.nregistro).startsWith(trimmedQuery)) ||
        (item.cn && String(item.cn).startsWith(trimmedQuery));

      const normalizedCnMatch = item.normalizedCN && normalizedQuery && item.normalizedCN.startsWith(normalizedQuery);

      if (!nameMatch && !cnMatch && !normalizedCnMatch) return false;

      if (showCatalogOnly && !item.inCatalog) {
        return false;
      }

      if (showCriticalOnly) {
        return isCriticalShortage(item);
      }

      return true;
    });
  }, [shortages, debouncedSearchQuery, showCriticalOnly, catalogCNs, showCatalogOnly]);

  // Match counter: computed directly on every render for instant sync
  const catalogMatchCount = (catalogCNs.size > 0 && shortages.length > 0)
    ? shortages.filter(item => {
      const rawCN = item.cn || item.nregistro;
      const apiCN = rawCN ? String(rawCN).replace(/\D/g, '') : '';
      return catalogCNs.has(apiCN);
    }).length
    : 0;

  return (
    <ErrorBoundary>
      <div className="container">
        <Header />

        <main className="main-content">
          <CatalogUpload onCatalogLoaded={handleCatalogLoaded} />

          <EmailConfig catalogCNs={catalogCNs} />

          {/* Standalone match counter — shown when catalog is loaded */}
          {catalogCNs.size > 0 && (
            <div className="glass-panel" style={{
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              fontSize: '1rem',
              fontWeight: 600,
              color: catalogMatchCount > 0 ? 'var(--color-accent)' : 'var(--color-primary)',
              marginBottom: '2rem',
              borderLeft: `4px solid ${catalogMatchCount > 0 ? 'var(--color-accent)' : 'var(--color-primary)'}`,
              transition: 'all 0.3s ease'
            }}>
              <span>
                {catalogMatchCount > 0
                  ? `${catalogMatchCount} de tus ${catalogCNs.size} medicamentos están en desabastecimiento`
                  : `Ninguno de tus ${catalogCNs.size} medicamentos está en desabastecimiento`
                }
              </span>
            </div>
          )}

          <div className="controls-row">
            <Filters
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              showCriticalOnly={showCriticalOnly}
              setShowCriticalOnly={setShowCriticalOnly}
            />

            {catalogCNs.size > 0 && (
              <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <label className={`toggle-btn ${showCatalogOnly ? 'active' : ''}`} style={{ border: 'none', background: 'transparent', padding: 0 }}>
                  <input
                    type="checkbox"
                    checked={showCatalogOnly}
                    onChange={(e) => setShowCatalogOnly(e.target.checked)}
                    style={{ marginRight: '0.5rem' }}
                  />
                  <span>Ver solo mis medicamentos afectados</span>
                </label>
                <button
                  onClick={handleClearCatalog}
                  style={{
                    background: 'transparent',
                    border: '1px solid #ef4444',
                    color: '#ef4444',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                  title="Borrar archivo guardado"
                >
                  Borrar Archivo
                </button>
              </div>
            )}

            {
              (managedCNs.size > 0 || Object.keys(notes).length > 0) && (
                <div className="glass-panel" style={{ padding: '0.5rem 1rem' }}>
                  <button
                    onClick={handleCleanupData}
                    style={{
                      background: 'transparent',
                      border: '1px solid #64748b',
                      color: '#64748b',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                    title="Borrar solo datos de problemas ya resueltos"
                  >
                    Limpiar Resueltos
                  </button>
                </div>
              )
            }
          </div >

          {error && (
            <div className="error-banner glass-panel">
              <span>{error}</span>
            </div>
          )}

          <ShortageList
            shortages={filteredShortages}
            loading={loading}
            progress={loadProgress}
            managedCNs={managedCNs}
            onToggleManaged={toggleManaged}
            notes={notes}
            onUpdateNote={updateNote}
          />
        </main >
      </div >
    </ErrorBoundary >
  );
}

export default App;
