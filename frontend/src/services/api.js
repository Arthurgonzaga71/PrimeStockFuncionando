// 📁 frontend/src/services/api.js - VERSÃO COMPLETAMENTE CORRIGIDA
import axios from 'axios';

// ⚡ URL fixa do backend
const API_BASE_URL = "http://localhost:4000";  // ⚡ Remove o /api daqui


console.log('🎯 [API] Inicializando conexão com:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true
});

// 🎯 INTERCEPTOR DE REQUISIÇÃO - CORREÇÃO CRÍTICA
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken') || 
                  localStorage.getItem('token') || 
                  localStorage.getItem('userToken');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // 🛠️ CORREÇÃO: Verificar se a URL já começa com /api/
    let requestUrl = config.url || '';
    
    // Se a URL NÃO começar com /api/ e NÃO for um caminho absoluto (http://)
    if (!requestUrl.startsWith('/api/') && !requestUrl.startsWith('http')) {
      // Lista de endpoints que DEVEM ter /api/ adicionado
      const endpointsNeedingApi = [
        '/auth', '/usuarios', '/categorias', '/itens', '/movimentacoes',
        '/manutencoes', '/dashboard', '/test', '/qrcode', '/export',
        '/backup', '/solicitacoes', '/modelos-equipamentos', '/alerts',
        '/export/', '/categorias/', '/itens/', '/solicitacoes/'
      ];
      
      const needsApiPrefix = endpointsNeedingApi.some(endpoint => 
        requestUrl.startsWith(endpoint)
      );
      
      if (needsApiPrefix) {
        config.url = `/api${requestUrl}`;
        console.log(`🔄 [API FIX] Corrigindo rota: ${requestUrl} -> /api${requestUrl}`);
      }
    }
    
    console.log(`🚀 [API REQUEST] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    
    // Log detalhado para debug
    if (config.url?.includes('/solicitacoes')) {
      console.log(`📦 Solicitação Data:`, config.data ? JSON.stringify(config.data).substring(0, 200) : '{}');
    }
    
    return config;
  },
  (error) => {
    console.error('❌ [API] Erro na requisição:', error);
    return Promise.reject(error);
  }
);

// 🎯 INTERCEPTOR DE RESPOSTA
api.interceptors.response.use(
  (response) => {
    console.log(`✅ [API RESPONSE] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || 'URL desconhecida';
    const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
    
    console.error(`❌ [API ERROR] ${method} ${url} - Status: ${status || 'NO_RESPONSE'}`);
    
    if (error.response?.data) {
      console.error(`📦 Error Data:`, JSON.stringify(error.response.data).substring(0, 200));
    }
    
    if (status === 401) {
      console.warn('🔐 Sessão expirada ou não autorizada. Redirecionando para login...');
      
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      localStorage.removeItem('userToken');
      localStorage.removeItem('user');
      
      if (!window.location.pathname.includes('/login')) {
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      }
    }
    
    if (status === 404) {
      console.error(`🔍 Rota não encontrada: ${method} ${url}`);
      console.log(`💡 Dica: Verifique se a rota está começando com /api/`);
    }
    
    if (status === 500) {
      console.error('💥 Erro interno do servidor');
    }
    
    return Promise.reject(error);
  }
);

// 👤 AUTENTICAÇÃO
export const authService = {
  login: (credentials) => api.post('/api/auth/login', credentials),
  getProfile: () => api.get('/api/auth/me'),
  alterarSenha: (data) => api.put('/api/auth/alterar-senha', data),
  logout: () => api.post('/api/auth/logout'),
  refreshToken: () => api.post('/api/auth/refresh')
};

// 🗂️ CATEGORIAS - VERSÃO CORRIGIDA
export const categoriasService = {
  getAll: (params = {}) => api.get('/categorias', { params }),
  getById: (id) => api.get(`/categorias/${id}`),
  create: (data) => api.post('/categorias', data),
  update: (id, data) => api.put(`/categorias/${id}`, data),
  delete: (id) => api.delete(`/categorias/${id}`),
  getComItens: () => api.get('/categorias/com-itens'),
  estatisticas: () => api.get('/categorias/estatisticas')
};

// 📦 ITENS - VERSÃO CORRIGIDA
export const itensService = {
  getAll: (params = {}) => api.get('/itens', { params }),
  getById: (id) => api.get(`/itens/${id}`),
  create: (data) => api.post('/itens', data),
  update: (id, data) => api.put(`/itens/${id}`, data),
  delete: (id) => api.delete(`/itens/${id}`),
  estoqueBaixo: () => api.get('/itens/alerta/estoque-baixo'),
  estoqueBaixoDetailed: (nivel = 'todos') => api.get(`/itens/alerta/estoque-baixo-detailed`, { params: { nivel } }),
  disponiveis: () => api.get('/itens/disponiveis'),
  porCategoria: (id) => api.get(`/itens/categoria/${id}`),
  estatisticas: () => api.get('/itens/estatisticas'),
  search: (term) => api.get('/itens/search', { params: { term } }),
  getComEstoque: () => api.get('/itens/com-estoque'),
  getPatrimonios: () => api.get('/itens/patrimonios'),
  getComMovimentacao: () => api.get('/itens/com-movimentacao'),
  updateQuantidade: (id, quantidade) => api.put(`/itens/${id}/quantidade`, { quantidade }),
  updateStatus: (id, status) => api.put(`/itens/${id}/status`, { status })
};

// 🔄 MOVIMENTAÇÕES - VERSÃO CORRIGIDA
export const movimentacoesService = {
  getAll: (params = {}) => api.get('/movimentacoes', { params }),
  getById: (id) => api.get(`/movimentacoes/${id}`),
  create: (data) => api.post('/movimentacoes', data),
  createSaida: (data) => api.post('/movimentacoes/saida', data),
  registrarSaida: (data) => api.post('/movimentacoes/saida', data),
  update: (id, data) => api.put(`/movimentacoes/${id}`, data),
  delete: (id) => api.delete(`/movimentacoes/${id}`),
  registrarDevolucao: (id, data = {}) => api.post(`/movimentacoes/devolucao/${id}`, data),
  devolver: (id, data = {}) => api.post(`/movimentacoes/devolucao/${id}`, data),
  devolverItemDireto: (itemId, data = {}) => api.post(`/movimentacoes/devolucao-item/${itemId}`, data),
  getRecentes: () => api.get('/movimentacoes/dashboard/recentes'),
  getEstatisticas: () => api.get('/movimentacoes/dashboard/estatisticas'),
  getSaidas: (params = {}) => api.get('/movimentacoes/tipo/saida', { params }),
  getEntradas: (params = {}) => api.get('/movimentacoes/tipo/entrada', { params }),
  getHistoricoItem: (itemId) => api.get(`/movimentacoes/item/${itemId}`),
  getPorUsuario: (usuarioId) => api.get(`/movimentacoes/usuario/${usuarioId}`),
  getPorPeriodo: (inicio, fim) => api.get('/movimentacoes/periodo', { params: { inicio, fim } }),
  registrarSaidaCompleta: (itemId, usuarioId, quantidade, motivo, observacoes) => 
    api.post('/movimentacoes/saida', {
      itemId,
      usuarioId,
      quantidade,
      motivo,
      observacoes,
      tipo: 'saida'
    })
};

// 🛠️ MANUTENÇÕES - VERSÃO CORRIGIDA
export const manutencoesService = {
  getAll: (params = {}) => api.get('/manutencoes', { params }),
  getById: (id) => api.get(`/manutencoes/${id}`),
  create: (data) => api.post('/manutencoes', data),
  update: (id, data) => api.put(`/manutencoes/${id}`, data),
  delete: (id) => api.delete(`/manutencoes/${id}`),
  getAbertas: () => api.get('/manutencoes/abertas'),
  getRecentes: () => api.get('/manutencoes/recentes'),
  getEstatisticas: () => api.get('/manutencoes/estatisticas'),
  getPorItem: (itemId) => api.get(`/manutencoes/item/${itemId}`),
  finalizar: (id, data) => api.put(`/manutencoes/${id}/finalizar`, data),
  cancelar: (id, motivo) => api.put(`/manutencoes/${id}/cancelar`, { motivo }),
  getPorTecnico: (tecnicoId) => api.get(`/manutencoes/tecnico/${tecnicoId}`),
  getPorStatus: (status) => api.get('/manutencoes/status', { params: { status } })
};

// 👤 USUÁRIOS - VERSÃO CORRIGIDA
export const usuariosService = {
  getAll: (params = {}) => api.get('/usuarios', { params }),
  getById: (id) => api.get(`/usuarios/${id}`),
  getMe: () => api.get('/usuarios/me'),
  create: (data) => api.post('/usuarios', data),
  update: (id, data) => api.put(`/usuarios/${id}`, data),
  delete: (id) => api.delete(`/usuarios/${id}`),
  getEquipe: () => api.get('/usuarios/equipe'),
  getDisponiveis: () => api.get('/usuarios/disponiveis'),
  getEstatisticas: () => api.get('/usuarios/estatisticas'),
  updatePerfil: (data) => api.put('/usuarios/perfil', data),
  updateSenha: (data) => api.put('/usuarios/senha', data),
  getPorDepartamento: (departamento) => api.get('/usuarios/departamento', { params: { departamento } }),
  getAprovadores: () => api.get('/usuarios/aprovadores'),
  getTecnicos: () => api.get('/usuarios/tecnicos')
};

// 📋 SOLICITAÇÕES - VERSÃO COMPLETA CORRIGIDA
export const solicitacoesService = {
  // Criação
  create: (data) => api.post('/solicitacoes', data),
  
  // Leitura
  getAll: (params = {}) => api.get('/solicitacoes', { params }),
  getById: (id) => api.get(`/solicitacoes/${id}`),
  getMinhas: (params = {}) => api.get('/solicitacoes/minhas', { params }),
  getPendentes: (params = {}) => api.get('/solicitacoes/pendentes', { params }),
  getParaEstoque: (params = {}) => api.get('/solicitacoes/para-estoque', { params }),
  getHistorico: (params = {}) => api.get('/solicitacoes/historico', { params }),
  
  // Atualização
  enviarParaAprovacao: (id) => api.put(`/solicitacoes/${id}/enviar`),
  aprovar: (id, data = {}) => api.put(`/solicitacoes/${id}/aprovar`, data),
  rejeitar: (id, data = {}) => api.put(`/solicitacoes/${id}/rejeitar`, data),
  processarEstoque: (id) => api.put(`/solicitacoes/${id}/processar-estoque`),
  retornarParaCorrecao: (id, motivo) => api.put(`/solicitacoes/${id}/retornar`, { motivo }),
  atualizarItens: (id, itens) => api.put(`/solicitacoes/${id}/itens`, { itens }),
  
  // Deleção/Cancelamento
  cancelar: (id, motivo = '') => api.delete(`/solicitacoes/${id}`, { data: { motivo } }),
  
  // Detalhes
  getItens: (solicitacaoId) => api.get(`/solicitacoes/${solicitacaoId}/itens`),
  getHistoricoDetalhado: (solicitacaoId) => api.get(`/solicitacoes/${solicitacaoId}/historico`),
  getAnexos: (solicitacaoId) => api.get(`/solicitacoes/${solicitacaoId}/anexos`),
  
  // Estatísticas
  getEstatisticas: (params = {}) => api.get('/solicitacoes/estatisticas', { params }),
  getEstatisticasUsuario: () => api.get('/solicitacoes/estatisticas-usuario'),
  getEstatisticasDepartamento: () => api.get('/solicitacoes/estatisticas-departamento'),
  
  // Anexos
  uploadAnexo: (solicitacaoId, formData) => api.post(`/solicitacoes/${solicitacaoId}/anexos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteAnexo: (solicitacaoId, anexoId) => api.delete(`/solicitacoes/${solicitacaoId}/anexos/${anexoId}`),
  
  // Teste
  testConnection: () => api.get('/solicitacoes/test'),
  testEnviar: () => api.put('/solicitacoes/test-enviar'),
  testEnviarPorId: (id) => api.put(`/solicitacoes/${id}/enviar-teste`)
};

// 📊 DASHBOARD - VERSÃO CORRIGIDA
export const dashboardService = {
  getDashboard: () => api.get('/dashboard'),
  getEstatisticas: () => api.get('/dashboard/estatisticas'),
  getAlertas: () => api.get('/dashboard/alertas'),
  getAtividades: () => api.get('/dashboard/atividades'),
  getRelatorioManutencoes: (params = {}) => api.get('/dashboard/relatorios/manutencoes', { params }),
  getRelatorioSolicitacoes: (params = {}) => api.get('/dashboard/relatorios/solicitacoes', { params }),
  getRelatorioEstoque: (params = {}) => api.get('/dashboard/relatorios/itens', { params }),
  getRelatorioMovimentacoes: (params = {}) => api.get('/dashboard/relatorios/movimentacoes', { params }),
  exportRelatorioManutencoes: (params = {}) => api.get('/dashboard/export/relatorio-manutencoes', { 
    params,
    responseType: 'blob'
  }),
  getIndicadores: () => api.get('/dashboard/indicadores'),
  getUltimasAtividades: () => api.get('/dashboard/ultimas-atividades'),
  getGraficos: () => api.get('/dashboard/graficos'),
  getResumo: () => api.get('/dashboard/resumo'),
  getAlertasDashboard: () => api.get('/dashboard/alertas-dashboard')
};

// 🔔 ALERTAS - VERSÃO CORRIGIDA
export const alertasService = {
  getAll: () => api.get('/alerts'),
  marcarComoLido: (id) => api.put(`/alerts/${id}/lido`),
  getNaoLidos: () => api.get('/alerts/contador'),
  verificarAlertas: () => api.post('/alerts/verificar'),
  marcarTodosComoLidos: () => api.put('/alerts/marcar-todos-lidos'),
  getConfiguracoes: () => api.get('/alerts/configuracoes'),
  atualizarConfiguracoes: (data) => api.put('/alerts/configuracoes', data),
  getHistorico: (params = {}) => api.get('/alerts/historico', { params })
};

// 📱 QR CODE - VERSÃO CORRIGIDA
export const qrCodeService = {
  getItemForQR: (itemId) => api.get(`/qrcode/item/${itemId}`),
  generateQRCode: (data) => api.post('/qrcode/generate', data),
  downloadQRCode: (itemId) => api.get(`/qrcode/download/${itemId}`, { responseType: 'blob' }),
  getQRCodeData: (itemId) => api.get(`/qrcode/data/${itemId}`),
  generateMultiple: (data) => api.post('/qrcode/generate-multiple', data),
  printQRCode: (itemId) => api.get(`/qrcode/print/${itemId}`, { responseType: 'blob' })
};

// 🗃️ BACKUP - VERSÃO CORRIGIDA
export const backupService = {
  getBackups: () => api.get('/backup'),
  createBackup: () => api.post('/backup/create'),
  restoreBackup: (filename) => api.post(`/backup/restore/${filename}`),
  downloadBackup: async (filename) => {
    try {
      console.log(`⬇️ [API] Download do backup: ${filename}`);
      
      const response = await api.get(`/backup/download/${filename}`, {
        responseType: 'blob',
        timeout: 60000,
        headers: {
          'Accept': 'application/octet-stream, application/zip, */*'
        }
      });
      
      const contentType = response.headers['content-type'];
      let fileExtension = 'zip';
      
      if (contentType?.includes('zip')) fileExtension = 'zip';
      else if (contentType?.includes('gzip')) fileExtension = 'gz';
      else if (contentType?.includes('sql')) fileExtension = 'sql';
      
      const finalFilename = filename.includes('.') ? filename : `${filename}.${fileExtension}`;
      
      const blob = new Blob([response.data], { 
        type: contentType || 'application/octet-stream' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = finalFilename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      console.log(`✅ Download realizado: ${finalFilename}`);
      
      return {
        success: true,
        filename: finalFilename,
        size: blob.size
      };
      
    } catch (error) {
      console.error('❌ Erro no download do backup:', error);
      throw error;
    }
  },
  deleteBackup: (filename) => api.delete(`/backup/${filename}`),
  getBackupInfo: (filename) => api.get(`/backup/info/${filename}`),
  checkBackupHealth: () => api.get('/backup/health'),
  testBackup: () => api.get('/backup/test'),
  listBackupDir: () => api.get('/backup/list'),
  autoBackup: () => api.post('/backup/auto')
};

// 📤 EXPORTAÇÃO - VERSÃO CORRIGIDA
export const exportService = {
  // Exportar dados
  exportData: (tipo, params = {}) => api.get(`/export/data/${tipo}`, { 
    params,
    responseType: 'blob'
  }),
  
  // Exportar para Excel
  exportItens: (params = {}) => api.post('/export/excel', { tipo: 'itens', filtros: params }, { responseType: 'blob' }),
  exportManutencoes: (params = {}) => api.post('/export/excel', { tipo: 'manutencoes', filtros: params }, { responseType: 'blob' }),
  exportMovimentacoes: (params = {}) => api.post('/export/excel', { tipo: 'movimentacoes', filtros: params }, { responseType: 'blob' }),
  exportSolicitacoes: (params = {}) => api.post('/export/excel', { tipo: 'solicitacoes', filtros: params }, { responseType: 'blob' }),
  
  // Exportar para PDF
  exportToPDF: (params = {}) => api.post('/export/pdf', { 
    tipo: params.type || 'manutencoes', 
    filtros: params 
  }, { responseType: 'blob' }),
  
  // Exportar para CSV
  exportToCSV: (params = {}) => api.post('/export/csv', { 
    tipo: params.type || 'manutencoes', 
    filtros: params 
  }, { responseType: 'blob' }),
  
  // Exportação genérica
  exportToExcel: (params = {}) => api.post('/export/excel', { 
    tipo: params.type || 'manutencoes', 
    filtros: params 
  }, { responseType: 'blob' }),
  
  // Exportar Dashboard
  exportDashboard: (params = {}) => api.post('/export/excel', { 
    tipo: 'dashboard', 
    filtros: params 
  }, { responseType: 'blob' }),
  
  // Exportar Relatórios
  exportRelatorio: (tipo, formato, params = {}) => api.get(`/export/${formato}/${tipo}`, {
    params,
    responseType: 'blob'
  })
};

// 🧪 TESTE
export const testService = {
  testConnection: () => api.get('/test'),
  testEmail: () => api.post('/test/email'),
  testDatabase: () => api.get('/test/database'),
  testAuth: () => api.get('/test/auth'),
  testAll: () => api.get('/test/all'),
  testRoutes: () => api.get('/test/routes'),
  testUpload: (formData) => api.post('/test/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

// 🏥 HEALTH CHECK
export const healthService = {
  check: () => api.get('/health'),
  checkDatabase: () => api.get('/health/database'),
  checkEmail: () => api.get('/health/email'),
  checkFull: () => api.get('/health/full'),
  checkStorage: () => api.get('/health/storage'),
  checkServices: () => api.get('/health/services')
};

// 📋 MODELOS DE EQUIPAMENTOS
export const modeloEquipamentoService = {
  getAll: (params = {}) => api.get('/modelos-equipamentos', { params }),
  getById: (id) => api.get(`/modelos-equipamentos/${id}`),
  create: (data) => api.post('/modelos-equipamentos', data),
  update: (id, data) => api.put(`/modelos-equipamentos/${id}`, data),
  delete: (id) => api.delete(`/modelos-equipamentos/${id}`),
  getPorFabricante: (fabricante) => api.get(`/modelos-equipamentos/fabricante/${fabricante}`),
  getEstatisticas: () => api.get('/modelos-equipamentos/estatisticas'),
  search: (term) => api.get('/modelos-equipamentos/search', { params: { term } })
};

// 🎯 EXPORTAÇÃO PRINCIPAL
export default api;

// 🎯 FUNÇÕES AUXILIARES
export const testApiConnection = async () => {
  try {
    const response = await api.get('/test');
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      status: error.response?.status
    };
  }
};

export const checkAuth = () => {
  const token = localStorage.getItem('authToken') || 
                localStorage.getItem('token') || 
                localStorage.getItem('userToken');
  return !!token;
};

export const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken') || 
                localStorage.getItem('token') || 
                localStorage.getItem('userToken');
  
  return token ? { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  } : {};
};

// 🎯 FUNÇÃO PARA DOWNLOAD DE BLOB
export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 100);
};

// 🎯 FUNÇÃO AUXILIAR PARA FORMATAR BYTES
export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// 🎯 FUNÇÃO PARA TESTAR ROTA DE SOLICITAÇÕES
export const testSolicitacoesRoute = async () => {
  try {
    console.log('🧪 Testando rota de solicitações...');
    
    // Testar várias rotas
    const tests = [
      { name: 'GET /solicitacoes', func: () => solicitacoesService.getAll() },
      { name: 'GET /solicitacoes/pendentes', func: () => solicitacoesService.getPendentes() },
      { name: 'PUT /solicitacoes/test-enviar', func: () => solicitacoesService.testEnviar() }
    ];
    
    const results = [];
    
    for (const test of tests) {
      try {
        const result = await test.func();
        console.log(`✅ ${test.name}:`, result.status);
        results.push({ name: test.name, success: true, status: result.status });
      } catch (error) {
        console.error(`❌ ${test.name}:`, error.response?.status || error.message);
        results.push({ 
          name: test.name, 
          success: false, 
          error: error.message,
          status: error.response?.status 
        });
      }
    }
    
    return {
      success: results.every(r => r.success),
      results: results
    };
    
  } catch (error) {
    console.error('❌ Erro ao testar rotas de solicitações:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 🎯 FUNÇÃO PARA VERIFICAR CONEXÃO COMPLETA
export const checkFullConnection = async () => {
  try {
    console.log('🔍 Verificando conexão completa...');
    
    // Testar backend
    const health = await healthService.check();
    console.log('✅ Backend health:', health.status);
    
    // Testar rotas principais
    const routes = [
      '/categorias',
      '/itens',
      '/solicitacoes/pendentes',
      '/dashboard',
      '/alerts'
    ];
    
    const routeResults = [];
    
    for (const route of routes) {
      try {
        const response = await api.get(route);
        routeResults.push({ route, success: true, status: response.status });
        console.log(`✅ ${route}: ${response.status}`);
      } catch (error) {
        routeResults.push({ 
          route, 
          success: false, 
          status: error.response?.status,
          error: error.message 
        });
        console.error(`❌ ${route}:`, error.response?.status || error.message);
      }
    }
    
    return {
      success: routeResults.every(r => r.success),
      backend: health.data,
      routes: routeResults,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Erro na verificação completa:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 🎯 FUNÇÃO PARA CORRIGIR AUTOMATICAMENTE AS ROTAS
export const fixApiRoutes = () => {
  console.log('🛠️ Ativando correção automática de rotas...');
  
  // Sobrescrever o interceptor para corrigir rotas automaticamente
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('authToken') || 
                    localStorage.getItem('token') || 
                    localStorage.getItem('userToken');
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // CORREÇÃO AUTOMÁTICA DE ROTAS
      const originalUrl = config.url || '';
      
      if (!originalUrl.startsWith('http') && !originalUrl.startsWith('/api/')) {
        // Rotas que precisam de /api/
        const apiRoutes = [
          'auth', 'usuarios', 'categorias', 'itens', 'movimentacoes',
          'manutencoes', 'dashboard', 'test', 'qrcode', 'export',
          'backup', 'solicitacoes', 'modelos-equipamentos', 'alerts',
          'health'
        ];
        
        const isApiRoute = apiRoutes.some(route => 
          originalUrl.startsWith(`/${route}`) || 
          originalUrl.startsWith(`${route}`)
        );
        
        if (isApiRoute) {
          const correctedUrl = originalUrl.startsWith('/') 
            ? `/api${originalUrl}`
            : `/api/${originalUrl}`;
          
          console.log(`🔄 [AUTO-FIX] ${originalUrl} -> ${correctedUrl}`);
          config.url = correctedUrl;
        }
      }
      
      console.log(`🚀 [FIXED API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
      
      return config;
    },
    (error) => {
      console.error('❌ [API FIX] Erro na requisição:', error);
      return Promise.reject(error);
    }
  );
  
  return true;
};

// 🎯 INICIALIZAÇÃO DA API COM CORREÇÃO
export const initializeAPI = () => {
  console.log('🚀 Inicializando API Services com correção automática...');
  
  // Ativar correção automática
  fixApiRoutes();
  
  // Verificar conexão inicial
  setTimeout(async () => {
    try {
      const result = await testApiConnection();
      if (result.success) {
        console.log('✅ Conexão com API estabelecida com sucesso!');
        
        // Testar rotas principais
        const fullCheck = await checkFullConnection();
        console.log('📊 Status das rotas:', fullCheck);
        
      } else {
        console.warn('⚠️ Problema na conexão com API:', result.error);
        console.log('💡 Dica: Verifique se o backend está rodando em http://localhost:3000');
      }
    } catch (error) {
      console.error('❌ Erro na inicialização:', error);
    }
  }, 1000);
  
  return api;
};

// Inicializar automaticamente com correção
initializeAPI();