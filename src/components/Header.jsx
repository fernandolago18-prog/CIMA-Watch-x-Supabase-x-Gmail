
import React from 'react';
import { Pill } from 'lucide-react';

const Header = () => {
    return (
        <header className="header glass-panel">
            <div className="logo-area">
                <div className="icon-wrapper">
                    <Pill className="text-white" size={32} />
                </div>
                <h1 className="title">CIMA Watch</h1>
            </div>
            <p className="subtitle">Monitor de Desabastecimientos de Medicamentos en España</p>
        </header>
    );
};

export default Header;
