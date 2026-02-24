
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, X, Check } from 'lucide-react';

const CatalogUpload = ({ onCatalogLoaded }) => {
    const [fileName, setFileName] = useState(() => localStorage.getItem('catalogFileName') || null);
    const [error, setError] = useState(null);
    const [matches, setMatches] = useState(() => {
        const saved = localStorage.getItem('catalogCNs');
        if (saved) {
            try { return JSON.parse(saved).length; } catch { return 0; }
        }
        return 0;
    });

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setFileName(file.name);
        localStorage.setItem('catalogFileName', file.name);
        setError(null);

        const reader = new FileReader();

        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const workbook = XLSX.read(bstr, { type: 'binary' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const data = XLSX.utils.sheet_to_json(worksheet);

                const cnList = new Set();
                let targetColumn = null;

                const headers = Object.keys(data[0] || {});
                targetColumn = headers.find(h => {
                    if (!h) return false;
                    const low = String(h).toLowerCase().trim();
                    return low === 'cn' ||
                        low.includes('codigo') ||
                        low.includes('código') ||
                        low.includes('nregistro') ||
                        low.includes('national');
                });

                if (targetColumn) {
                    data.forEach(row => {
                        const val = row[targetColumn];
                        if (val) {
                            const normalized = String(val).replace(/\D/g, '');
                            if (normalized.length >= 6) {
                                cnList.add(normalized);
                            }
                        }
                    });
                }

                if (!targetColumn) {
                    setError('No pude encontrar una columna de "CN" o "Código". Por favor revisa la cabecera de tu archivo.');
                    onCatalogLoaded(new Set());
                    return;
                }

                if (cnList.size === 0) {
                    setError('Encontré la columna, pero no pude leer códigos válidos. Asegúrate de que sean números.');
                    onCatalogLoaded(new Set());
                    return;
                }

                setMatches(cnList.size);
                onCatalogLoaded(cnList);

            } catch (err) {
                console.error(err);
                setError('Hubo un error al leer el archivo. Asegúrate de que es un Excel (.xlsx) o CSV válido.');
            }
        };

        reader.readAsBinaryString(file);
    };

    const clearFile = () => {
        setFileName(null);
        setMatches(0);
        setError(null);
        localStorage.removeItem('catalogFileName');
        onCatalogLoaded(new Set());
        document.getElementById('file-upload').value = '';
    };

    return (
        <div className="catalog-upload glass-panel">
            {!fileName ? (
                <div className="upload-area">
                    <input
                        id="file-upload"
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                    />
                    <label htmlFor="file-upload" className="upload-label">
                        <Upload size={20} />
                        <span>Subir Catálogo de Hospital (Excel/CSV)</span>
                    </label>
                    <p className="upload-hint">Sube tu listado para ver qué medicamentos te afectan. (Debe tener una columna como 'CN', 'Código', etc.)</p>
                </div>
            ) : (
                <div className="file-status">
                    <div className="file-info">
                        <FileSpreadsheet size={20} className="text-success" />
                        <span className="file-name">{fileName}</span>
                        {matches > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span className="match-badge"><Check size={14} /> {matches} fármacos cargados</span>
                            </div>
                        )}
                    </div>

                    {error ? (
                        <div className="upload-error">{error}</div>
                    ) : (
                        <button onClick={clearFile} className="btn-clear" title="Quitar archivo">
                            <X size={18} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default CatalogUpload;
