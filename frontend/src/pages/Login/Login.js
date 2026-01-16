import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Loading } from '../../components/UI';
import { healthService } from '../../services/api';
import './Login.css';

const Login = () => {
  const { login, loading, error } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    senha: ''
  });
  const [errors, setErrors] = useState({});
  const [apiStatus, setApiStatus] = useState('checking');
  const [connectionTested, setConnectionTested] = useState(false);

  // 🔄 TESTAR CONEXÃO - APENAS UMA VEZ
  useEffect(() => {
    console.log('🔍 Testando conexão com API...');
    
    let isMounted = true;
    
    const testApiConnection = async () => {
      try {
        const response = await healthService.check();
        
        if (isMounted && response.data.status === 'OK') {
          console.log('✅ API conectada com sucesso!');
          setApiStatus('online');
        } else if (isMounted) {
          setApiStatus('offline');
        }
      } catch (error) {
        console.error('❌ Erro ao conectar com API:', error);
        if (isMounted) setApiStatus('offline');
      } finally {
        if (isMounted) setConnectionTested(true);
      }
    };

    // Executar apenas uma vez
    testApiConnection();

    // Cleanup
    return () => {
      isMounted = false;
    };
  }, []); // ✅ Array vazio - executa apenas uma vez

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpar erro do campo específico
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'E-mail inválido';
    }

    if (!formData.senha) {
      newErrors.senha = 'Senha é obrigatória';
    } else if (formData.senha.length < 6) {
      newErrors.senha = 'Senha deve ter pelo menos 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    if (apiStatus === 'offline') {
      setErrors({ 
        global: 'Servidor offline. Verifique se o back-end está rodando.' 
      });
      return;
    }

    const result = await login(formData.email, formData.senha);
    
    if (!result.success) {
      setErrors({ global: result.error });
    }
  };

  // 🔧 RECARREGAR CONEXÃO
  const retryConnection = useCallback(async () => {
    setApiStatus('checking');
    
    try {
      const response = await healthService.check();
      if (response.data.status === 'OK') {
        setApiStatus('online');
      } else {
        setApiStatus('offline');
      }
    } catch (error) {
      setApiStatus('offline');
    }
  }, []);

  // 🧪 CREDENCIAIS DE TESTE
  const fillTestCredentials = (type) => {
    const credentials = {
      admin: { email: 'admin@empresa.com', senha: '123456' },
      coordenador: { email: 'coordenador.ti@empresa.com', senha: '123456' },
      tecnico: { email: 'joao.ti@empresa.com', senha: '123456' }
    };
    
    setFormData(credentials[type]);
    setErrors({});
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* 🔍 STATUS DA API */}
        <div className="api-status">
          {apiStatus === 'checking' && (
            <div className="api-status__item api-status__checking">
              <div className="api-status__dot"></div>
              Verificando conexão com servidor...
            </div>
          )}
          {apiStatus === 'online' && (
            <div className="api-status__item api-status__online">
              <div className="api-status__dot"></div>
              ✅ Servidor online
            </div>
          )}
          {apiStatus === 'offline' && (
            <div className="api-status__item api-status__offline">
              <div className="api-status__dot"></div>
              ❌ Servidor offline
              <button 
                onClick={retryConnection}
                className="api-status__retry"
                type="button"
              >
                Tentar novamente
              </button>
            </div>
          )}
        </div>

        {/* 🎯 CABEÇALHO */}
        <div className="login-header">
          <div className="login-logo">
            <div className="logo-icon">⚡</div>
            <h1 className="logo-text">PrimeStock</h1>
          </div>
          <p className="login-subtitle">Sistema de Controle de Estoque</p>
        </div>

        {/* ❌ ERRO GLOBAL */}
        {(error || errors.global) && (
          <div className="login-error">
            <div className="error-icon">⚠️</div>
            <div className="error-content">
              <strong>Erro ao fazer login:</strong>
              <p>{error || errors.global}</p>
            </div>
          </div>
        )}

        {/* 📝 FORMULÁRIO */}
        <form onSubmit={handleSubmit} className="login-form">
          <Input
            label="E-mail"
            type="email"
            name="email"
            placeholder="seu.email@empresa.com"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            required
            autoFocus
            disabled={loading || apiStatus === 'checking'}
          />

          <Input
            label="Senha"
            type="password"
            name="senha"
            placeholder="Sua senha"
            value={formData.senha}
            onChange={handleChange}
            error={errors.senha}
            required
            disabled={loading || apiStatus === 'checking'}
          />

          <Button
            type="submit"
            variant="primary"
            size="large"
            loading={loading}
            disabled={apiStatus === 'checking' || apiStatus === 'offline'}
            className="login-button"
          >
            {loading ? 'Entrando...' : 'Entrar no Sistema'}
          </Button>
        </form>

       

        {/* 📞 FOOTER */}
        <div className="login-footer">
          <div className="login-version">
            v2.0.0 • Integrado com Back-end
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;