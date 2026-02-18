// Navbar.js - VERSÃO CORRIGIDA
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, perfilLabel } = useAuth();
  const [showReportsMenu, setShowReportsMenu] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const reportsTimeoutRef = useRef(null);
  const toolsTimeoutRef = useRef(null);
  const adminTimeoutRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Menu items principais
  const menuItems = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/itens', icon: '📦', label: 'Itens' },
    { path: '/movimentacoes', icon: '🔄', label: 'Movimentações' },
    { path: '/manutencoes', icon: '🛠️', label: 'Manutenções' },
  ];

  // Items de relatórios
  const reportItems = [
    { path: '/relatorios/itens', icon: '📊', label: 'Relatório de Itens' },
    { path: '/relatorios/movimentacoes', icon: '📤', label: 'Relatório de Movimentações' },
    { path: '/relatorios/manutencoes', icon: '🔧', label: 'Relatório de Manutenções' },
  ];

  // Items de ferramentas
  const toolsItems = [
    { path: '/consulta-cadastro-rapido', icon: '🔍', label: 'Consulta Rápida', description: 'Escaneie códigos' },
    { path: '/cadastro-rapido', icon: '⚡', label: 'Cadastro Rápido' },
    { path: '/importar', icon: '📥', label: 'Importar Dados' },
  ];

  // Items de admin - AGORA INCLUI USUÁRIOS
  const adminItems = [
    { path: '/usuarios', icon: '👥', label: 'Usuários', roles: ['admin', 'coordenador', 'gerente'] },
    { path: '/export', icon: '📤', label: 'Exportar Dados', roles: ['admin', 'coordenador', 'gerente'] },
    { path: '/backup', icon: '💾', label: 'Backup', roles: ['admin'] },  
  ];

  const isActive = (path) => location.pathname === path;
  const isAdmin = user?.perfil === 'admin';
  const isCoordinator = ['coordenador', 'gerente'].includes(user?.perfil);
  const isAdminEstoque = user?.perfil === 'admin_estoque';
  const showAdmin = isAdmin || isCoordinator;

  // Filtrar itens de admin por perfil
  const filteredAdminItems = adminItems.filter(item => 
    !item.roles || item.roles.includes(user?.perfil)
  );

  // FUNÇÕES DOS DROPDOWNS
  const handleReportsMouseEnter = () => {
    if (reportsTimeoutRef.current) clearTimeout(reportsTimeoutRef.current);
    setShowReportsMenu(true);
  };

  const handleReportsMouseLeave = () => {
    reportsTimeoutRef.current = setTimeout(() => {
      setShowReportsMenu(false);
    }, 200);
  };

  const handleToolsMouseEnter = () => {
    if (toolsTimeoutRef.current) clearTimeout(toolsTimeoutRef.current);
    setShowToolsMenu(true);
  };

  const handleToolsMouseLeave = () => {
    toolsTimeoutRef.current = setTimeout(() => {
      setShowToolsMenu(false);
    }, 200);
  };

  const handleAdminMouseEnter = () => {
    if (adminTimeoutRef.current) clearTimeout(adminTimeoutRef.current);
    setShowAdminMenu(true);
  };

  const handleAdminMouseLeave = () => {
    adminTimeoutRef.current = setTimeout(() => {
      setShowAdminMenu(false);
    }, 200);
  };

  // Fechar menu mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Limpar timeouts
  useEffect(() => {
    return () => {
      [reportsTimeoutRef, toolsTimeoutRef, adminTimeoutRef].forEach(ref => {
        if (ref.current) clearTimeout(ref.current);
      });
    };
  }, []);

  const handleNavigate = (path) => {
    setShowReportsMenu(false);
    setShowToolsMenu(false);
    setShowAdminMenu(false);
    setMobileMenuOpen(false);
    navigate(path);
  };

  // Menu Admin Estoque
  if (isAdminEstoque) {
    return (
      <nav className="navbar">
        <div className="navbar__brand">
          <div className="navbar__logo" onClick={() => handleNavigate('/dashboard')}>
            <span className="logo-icon">⚡</span>
            <h1 className="logo-text">PrimeStock</h1>
          </div>
        </div>

        <button className={`mobile-menu-btn ${mobileMenuOpen ? 'active' : ''}`} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <span></span><span></span><span></span>
        </button>

        <div className={`navbar__menu ${mobileMenuOpen ? 'active' : ''}`}>
          <button className={`navbar__item ${isActive('/dashboard') ? 'active' : ''}`} onClick={() => handleNavigate('/dashboard')}>
            <span className="navbar__icon">📊</span>
            <span className="navbar__label">Dashboard</span>
          </button>
          <button className={`navbar__item ${isActive('/solicitacoes/para-estoque') ? 'active' : ''}`} onClick={() => handleNavigate('/solicitacoes/para-estoque')}>
            <span className="navbar__icon">📝</span>
            <span className="navbar__label">Solicitações</span>
          </button>
        </div>

        <div className="navbar__user">
          <div className="user__info" onClick={() => handleNavigate('/perfil')}>
            <div className="user__avatar">{user?.nome?.charAt(0)?.toUpperCase() || 'U'}</div>
            <div className="user__details">
              <span className="user__name">{user?.nome || 'Usuário'}</span>
              <span className="user__role">Admin Estoque</span>
            </div>
          </div>
          <button className="navbar__logout" onClick={logout} title="Sair">
            <span className="logout-icon">🚪</span>
          </button>
        </div>
      </nav>
    );
  }

  // Menu Padrão
  return (
    <nav className="navbar">
      {/* Logo */}
      <div className="navbar__brand">
        <div className="navbar__logo" onClick={() => handleNavigate('/dashboard')}>
          <span className="logo-icon">⚡</span>
          <h1 className="logo-text">PrimeStock</h1>
        </div>
      </div>

      {/* Botão Mobile */}
      <button className={`mobile-menu-btn ${mobileMenuOpen ? 'active' : ''}`} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
        <span></span><span></span><span></span>
      </button>

      {/* Menu Principal */}
      <div className={`navbar__menu ${mobileMenuOpen ? 'active' : ''}`}>
        {/* Itens principais */}
        {menuItems.map((item) => (
          <button
            key={item.path}
            className={`navbar__item ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => handleNavigate(item.path)}
            data-label={item.label}
          >
            <span className="navbar__icon">{item.icon}</span>
            <span className="navbar__label">{item.label}</span>
          </button>
        ))}

        {/* Dropdown Ferramentas */}
        <div 
          className={`navbar__item dropdown ${showToolsMenu ? 'active' : ''}`}
          onMouseEnter={handleToolsMouseEnter}
          onMouseLeave={handleToolsMouseLeave}
        >
          <span className="navbar__icon">🚀</span>
          <span className="navbar__label">Ferramentas</span>
          
          {showToolsMenu && (
            <div className="dropdown__menu">
              <div className="dropdown__bridge"></div>
              {toolsItems.map((item) => (
                <button
                  key={item.path}
                  className={`dropdown__item ${item.description ? 'highlight' : ''}`}
                  onClick={() => handleNavigate(item.path)}
                >
                  <span className="dropdown__icon">{item.icon}</span>
                  {item.description ? (
                    <div className="dropdown__item-content">
                      <span className="dropdown__label">{item.label}</span>
                      <span className="dropdown__description">{item.description}</span>
                    </div>
                  ) : (
                    item.label
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dropdown Relatórios */}
        <div 
          className={`navbar__item dropdown ${showReportsMenu ? 'active' : ''}`}
          onMouseEnter={handleReportsMouseEnter}
          onMouseLeave={handleReportsMouseLeave}
        >
          <span className="navbar__icon">📋</span>
          <span className="navbar__label">Relatórios</span>
          
          {showReportsMenu && (
            <div className="dropdown__menu">
              <div className="dropdown__bridge"></div>
              {reportItems.map((item) => (
                <button
                  key={item.path}
                  className="dropdown__item"
                  onClick={() => handleNavigate(item.path)}
                >
                  <span className="dropdown__icon">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dropdown Administrador */}
        {showAdmin && filteredAdminItems.length > 0 && (
          <div 
            className={`navbar__item dropdown ${showAdminMenu ? 'active' : ''}`}
            onMouseEnter={handleAdminMouseEnter}
            onMouseLeave={handleAdminMouseLeave}
          >
            <span className="navbar__icon">⚙️</span>
            <span className="navbar__label">Administrador</span>
            
            {showAdminMenu && (
              <div className="dropdown__menu">
                <div className="dropdown__bridge"></div>
                {filteredAdminItems.map((item) => (
                  <button
                    key={item.path}
                    className="dropdown__item admin-item"
                    onClick={() => handleNavigate(item.path)}
                  >
                    <span className="dropdown__icon">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Área do Usuário */}
      <div className="navbar__user">
        <div className="user__info" onClick={() => handleNavigate('/perfil')}>
          <div className="user__avatar">
            {user?.nome?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="user__details">
            <span className="user__name">{user?.nome || 'Usuário'}</span>
            <span className="user__role">{perfilLabel || 'Perfil'}</span>
          </div>
        </div>
        
        <button className="navbar__logout" onClick={logout} title="Sair">
          <span className="logout-icon">🚪</span>
          <span className="logout-text">Sair</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;