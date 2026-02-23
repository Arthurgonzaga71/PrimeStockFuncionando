// AuthContext.js - VERSÃO COMPLETAMENTE ATUALIZADA COM BACKEND
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 🔄 CARREGAR USUÁRIO DO LOCALSTORAGE
  useEffect(() => {
    console.log('🔍 [AuthContext] Inicializando...');
    
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      try {
        const userFromStorage = JSON.parse(userData);
        
        // 🔥 NOVO: Aplicar permissões do backend
        const usuarioAtualizado = processarUsuarioBackend(userFromStorage);
        
        setUser(usuarioAtualizado);
        console.log('✅ Usuário carregado (back):', usuarioAtualizado.perfil);
        console.log('📊 Permissões:', usuarioAtualizado.permissoesResumo);
      } catch (error) {
        console.error('❌ Erro ao carregar usuário:', error);
        logout();
      }
    }
    
    setLoading(false);
  }, []);

  // 🎯 PROCESSAR USUÁRIO DO BACKEND (Novo método)
  const processarUsuarioBackend = (usuarioData) => {
    // 🆕 1. PERFIS QUE PODEM APROVAR (do backend)
    const perfisQuePodemAprovar = ['coordenador', 'gerente', 'admin_estoque', 'admin'];
    
    // 🆕 2. PERFIS TÉCNICO/ANALISTA (com novas permissões)
    const perfisTecnicoAnalista = ['tecnico', 'analista'];
    
    // 🆕 3. PERMISSÕES BASEADAS NO BACKEND
    const permissoes = {
      // ✅ DO BANCO: 4 permissões principais
      pode_consultar: !!usuarioData.pode_consultar,
      pode_solicitar: !!usuarioData.pode_solicitar,
      pode_cadastrar: !!usuarioData.pode_cadastrar,
      pode_editar: !!usuarioData.pode_editar,
      
      // ✅ DO BANCO: Permissão de aprovar
      pode_aprovar: !!usuarioData.permissao_aprovar_solicitacoes,
      
      // ✅ DO BANCO: Limites operacionais
      max_itens: usuarioData.max_itens_solicitacao || 15, // 🆕 15 ITENS
      valor_max: usuarioData.valor_max_solicitacao || 2000.00, // 🆕 R$ 2.000
      prazo_devolucao: usuarioData.prazo_max_devolucao || 45, // 🆕 45 DIAS
      
      // ✅ DO BANCO: Outras permissões
      permissao_relatorios_completos: !!usuarioData.permissao_relatorios_completos,
      acesso_historico_completo: !!usuarioData.acesso_historico_completo
    };
    
    // 🆕 4. CALCULAR FLAGS IMPORTANTES
    const ehTecnicoOuAnalista = perfisTecnicoAnalista.includes(usuarioData.perfil);
    const podeAprovar = perfisQuePodemAprovar.includes(usuarioData.perfil);
    
    return {
      ...usuarioData,
      // 🆕 PERMISSÕES CALCULADAS
      permissoes,
      
      // 🆕 FLAGS RÁPIDAS
      eh_admin: usuarioData.perfil === 'admin',
      eh_coordenador: ['coordenador', 'gerente'].includes(usuarioData.perfil),
      eh_estoque: usuarioData.perfil === 'admin_estoque',
      eh_tecnico_analista: ehTecnicoOuAnalista,
      
      // 🆕 RESUMO DE PERMISSÕES (para componentes)
      permissoesResumo: {
        perfil: usuarioData.perfil,
        pode: {
          consultar: permissoes.pode_consultar,
          solicitar: permissoes.pode_solicitar,
          cadastrar: permissoes.pode_cadastrar,
          editar: permissoes.pode_editar,
          aprovar: podeAprovar, // ✅ CORRETO: baseado no perfil
          relatorios: permissoes.permissao_relatorios_completos
        },
        limites: {
          max_itens: permissoes.max_itens,
          valor_max: permissoes.valor_max,
          prazo_devolucao: permissoes.prazo_devolucao
        },
        // 🆕 INFORMAÇÕES EXTRAS
        ehTecnicoOuAnalista,
        podeAprovar,
        temAcessoCompleto: permissoes.acesso_historico_completo
      }
    };
  };

  // 🔐 LOGIN (ATUALIZADO)
  const login = async (email, senha) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔐 Tentando login para:', email);
      const response = await authService.login({ email, senha });
      
      if (!response.data.success) {
        throw new Error(response.data.message);
      }

      const { usuario, token } = response.data.data;
      
      // 🔥 PROCESSAR USUÁRIO DO BACKEND
      const usuarioAtualizado = processarUsuarioBackend(usuario);
      
      // 💾 SALVAR NO LOCALSTORAGE
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(usuarioAtualizado));
      
      // 🎯 LOG IMPORTANTE PARA DEBUG
      console.log('✅ Login bem-sucedido');
      console.log('👤 Perfil:', usuarioAtualizado.perfil);
      console.log('📋 Permissões:', usuarioAtualizado.permissoes);
      console.log('🎯 Resumo:', usuarioAtualizado.permissoesResumo);
          console.log('🔑 TOKEN RECEBIDO DO BACKEND:', token);
      console.log('🔑 TAMANHO DO TOKEN:', token.length);

      setUser(usuarioAtualizado);
      
      return { 
        success: true, 
        data: usuarioAtualizado,
        message: response.data.message
      };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Erro ao fazer login';
      setError(errorMsg);
      console.error('❌ Erro no login:', errorMsg);
      
      return { 
        success: false, 
        error: errorMsg 
      };
    } finally {
      setLoading(false);
    }
  };

  // 🚪 LOGOUT
  const logout = useCallback(() => {
    console.log('🚪 Fazendo logout...');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setUser(null);
    setError(null);
  }, []);

  // 🔥 SISTEMA DE PERMISSÕES SIMPLIFICADO E EFICIENTE

  // 1. VERIFICAR PERMISSÃO DIRETA (do backend)
  const temPermissao = (permissao) => {
    return user?.permissoes?.[permissao] === true;
  };

  // 2. VERIFICAR SE PODE REALIZAR AÇÃO (alinhado com backend)
  const podeRealizar = (acao, recurso, dados = null) => {
    if (!user) return false;
    
    // 🆕 Mapeamento direto com backend
    const mapaPermissoes = {
      'consultar': 'pode_consultar',
      'solicitar': 'pode_solicitar',
      'cadastrar': 'pode_cadastrar',
      'editar': 'pode_editar',
      'aprovar': 'pode_aprovar',
      'relatorios_completos': 'permissao_relatorios_completos'
    };

    // Verificar permissão direta
    const permissaoRequerida = mapaPermissoes[acao];
    if (permissaoRequerida && temPermissao(permissaoRequerida)) {
      return true;
    }

    // 🆕 REGRAS ESPECÍFICAS POR PERFIL
    const perfil = user.perfil;
    
    // ✅ TÉCNICO/ANALISTA - NOVAS PERMISSÕES
    if (['tecnico', 'analista'].includes(perfil)) {
      switch (recurso) {
        case 'solicitacoes':
          switch (acao) {
            case 'criar': return temPermissao('pode_solicitar');
            case 'editar': 
              return temPermissao('pode_editar') && 
                     dados?.usuario_solicitante_id === user.id;
            case 'aprovar': return false; // ❌ NUNCA PODE APROVAR
            default: return false;
          }
          
        case 'itens':
          switch (acao) {
            case 'criar': return temPermissao('pode_cadastrar'); // ✅ PODE CADASTRAR
            case 'editar': return temPermissao('pode_editar'); // ✅ PODE EDITAR
            case 'deletar': return false; // ❌ NÃO PODE DELETAR
            default: return true;
          }
          
        case 'movimentacoes':
          return temPermissao('pode_cadastrar'); // ✅ PODE CRIAR
          
        case 'manutencoes':
          return ['criar', 'editar'].includes(acao) ? 
                 temPermissao('pode_cadastrar') : true;
                 
        default:
          return false;
      }
    }
    
    // ✅ COORDENADOR/GERENTE - PODEM APROVAR
    if (['coordenador', 'gerente'].includes(perfil)) {
      if (acao === 'aprovar' && recurso === 'solicitacoes') {
        return true; // ✅ PODE APROVAR
      }
    }
    
    return false;
  };

  // 🆕 3. VERIFICAR LIMITES DE SOLICITAÇÃO
  const verificarLimiteSolicitacao = (valorTotal, quantidadeItens) => {
    if (!user?.permissoes) {
      return { sucesso: false, motivo: 'Usuário não autenticado' };
    }

    const { max_itens, valor_max } = user.permissoes;
    
    // ✅ VERIFICAR 15 ITENS MÁXIMOS
    if (quantidadeItens > max_itens) {
      return {
        sucesso: false,
        motivo: `Limite de ${max_itens} itens por solicitação excedido (máximo: ${max_itens})`,
        limite: 'itens'
      };
    }
    
    // ✅ VERIFICAR R$ 2.000,00 MÁXIMO
    if (valorTotal > valor_max) {
      return {
        sucesso: false,
        motivo: `Valor máximo de R$ ${valor_max.toFixed(2)} por solicitação excedido`,
        limite: 'valor'
      };
    }
    
    return { 
      sucesso: true,
      limites: {
        max_itens,
        valor_max,
        prazo_devolucao: user.permissoes.prazo_devolucao
      }
    };
  };

  // 🆕 4. OBTER CONFIGURAÇÕES DE PRAZO
  const obterConfiguracoesPrazo = () => {
    const prazoMax = user?.permissoes?.prazo_devolucao || 45;
    
    return {
      prazo_max: prazoMax,
      opcoes_prazo: Array.from({ length: prazoMax }, (_, i) => ({
        value: i + 1,
        label: `${i + 1} dia${i > 0 ? 's' : ''}`
      }))
    };
  };

  // 🆕 5. UTILITÁRIOS PARA COMPONENTES
  const obterPermissoesComponentes = () => {
    const perfil = user?.perfil || '';
    
    return {
      // 🆕 BOTÕES DE APROVAÇÃO
      mostrarBotaoAprovar: ['coordenador', 'gerente', 'admin_estoque', 'admin'].includes(perfil),
      
      // 🆕 CADASTRO DE ITENS
      podeCadastrarItem: podeRealizar('cadastrar', 'itens'),
      podeEditarItem: podeRealizar('editar', 'itens'),
      
      // 🆕 SOLICITAÇÕES
      podeCriarSolicitacao: podeRealizar('solicitar', 'solicitacoes'),
      podeAprovarSolicitacao: podeRealizar('aprovar', 'solicitacoes'),
      
      // 🆕 VISUALIZAÇÃO
      podeVerTudo: user?.permissoesResumo?.temAcessoCompleto || false,
      
      // 🆕 LIMITES ATUAIS
      limites: user?.permissoesResumo?.limites || {
        max_itens: 15,
        valor_max: 2000,
        prazo_devolucao: 45
      }
    };
  };

  const value = {
    // ESTADO
    user,
    isAuthenticated: !!user,
    loading,
    error,
    
    // AÇÕES
    login,
    logout,
    clearError: () => setError(null),

    // 🔥 SISTEMA DE PERMISSÕES ATUALIZADO
    temPermissao,
    podeRealizar,
    verificarLimiteSolicitacao,
    obterConfiguracoesPrazo,
    
    // 🆕 PERMISSÕES PARA COMPONENTES
    permissoes: user?.permissoesResumo || {},
    flags: obterPermissoesComponentes(),

    // INFO DO USUÁRIO (atualizada)
    perfil: user?.perfil,
    nome: user?.nome,
    email: user?.email,
    
    // FLAGS RÁPIDAS (atualizadas)
    isAdmin: user?.eh_admin || false,
    isCoordenador: user?.eh_coordenador || false,
    isEstoque: user?.eh_estoque || false,
    isTecnicoAnalista: user?.eh_tecnico_analista || false,
    
    // 🆕 VERIFICAÇÕES DIRETAS
    podeAprovar: user?.permissoesResumo?.pode?.aprovar || false,
    podeCadastrar: user?.permissoesResumo?.pode?.cadastrar || false,
    podeEditar: user?.permissoesResumo?.pode?.editar || false
  };

  console.log('🎯 AuthContext - Estado atualizado:', { 
    usuario: user?.nome, 
    perfil: user?.perfil,
    permissoes: user?.permissoesResumo,
    flags: obterPermissoesComponentes()
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
