import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Link, useNavigate } from 'react-router-dom';
import './PendentesAprovacao.css';

const PendentesAprovacao = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalAprovar, setModalAprovar] = useState(false);
  const [modalRejeitar, setModalRejeitar] = useState(false);
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    console.log('🔐 [INICIO] Usuário no contexto:', user);
    
    // ✅ VERIFICAÇÃO CRÍTICA - Se não tiver permissão, redireciona
    if (!podeAnalisar()) {
      navigate('/solicitacoes/minhas');
      return;
    }
    
    carregarSolicitacoes();
  }, [user]);

  // ✅ FUNÇÃO CORRIGIDA PARA CARREGAR SOLICITAÇÕES
  const carregarSolicitacoes = async () => {
    try {
      setLoading(true);
      setError('');
      setDebugInfo('');
      
      console.log('📡 [API] GET /solicitacoes/pendentes - Usuário:', {
        id: user?.id,
        nome: user?.nome,
        perfil: user?.perfil
      });

      const response = await api.get('/solicitacoes/pendentes');
      console.log('📊 [API] Resposta completa:', response.data);

      if (response.data.success) {
        const dados = response.data.data || [];
        
        // ✅ FILTRAR APENAS AS QUE REALMENTE ESTÃO PENDENTES
        const verdadeiramentePendentes = dados.filter(sol => {
          // Status que indicam "pendente de aprovação"
          const statusPendentes = ['pendente', 'rascunho'];
          const status = (sol.status || '').toLowerCase().trim();
          return statusPendentes.includes(status);
        });
        
        console.log('📊 [FILTRO] Antes:', dados.length, 'Depois:', verdadeiramentePendentes.length);
        
        // ✅ DEBUG: Mostrar todas as solicitações que vieram
        setDebugInfo(`Total recebido: ${dados.length} | Filtradas: ${verdadeiramentePendentes.length}`);
        
        // ✅ DEBUG: Listar cada uma com status
        dados.forEach(sol => {
          console.log(`  - ID: ${sol.id}, Código: ${sol.codigo_solicitacao}, Status: "${sol.status || '(vazio)'}"`);
        });
        
        setSolicitacoes(verdadeiramentePendentes);
        
      } else {
        setError(response.data.error || 'Erro ao carregar dados');
      }
    } catch (err) {
      console.error('❌ [ERRO] Detalhes:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      
      let errorMessage = 'Erro ao carregar solicitações pendentes';
      
      if (err.response?.status === 403) {
        errorMessage = '❌ Acesso negado. Você não tem permissão para aprovar solicitações.';
        // Redirecionar automaticamente se não tiver permissão
        setTimeout(() => navigate('/solicitacoes/minhas'), 2000);
      } else if (err.response?.status === 401) {
        errorMessage = '🔐 Sessão expirada. Faça login novamente.';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message.includes('Network Error')) {
        errorMessage = '🌐 Erro de conexão. Verifique sua internet.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ✅ VERIFICAR SE USUÁRIO PODE ANALISAR - CORRIGIDA
  const podeAnalisar = () => {
    if (!user || !user.perfil) {
      console.warn('⚠️ Usuário ou perfil não definido');
      return false;
    }
    
    const perfisPermitidos = ['admin', 'admin_estoque', 'coordenador', 'gerente'];
    const pode = perfisPermitidos.includes(user.perfil);
    
    console.log(`🔐 podeAnalisar: ${pode} (perfil: ${user.perfil})`);
    return pode;
  };

  // ✅ FUNÇÃO DE FORMATAR VALOR
  const formatarValor = (valor) => {
    if (!valor) return 'R$ 0,00';
    const numero = parseFloat(valor);
    return isNaN(numero) ? 'R$ 0,00' : numero.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  // ✅ FUNÇÃO DE FORMATAR DATA
  const formatarData = (dataString) => {
    if (!dataString) return 'N/A';
    try {
      const data = new Date(dataString);
      return isNaN(data.getTime()) ? 'N/A' : data.toLocaleDateString('pt-BR');
    } catch {
      return 'N/A';
    }
  };

  // ✅ FUNÇÃO DE FORMATAR HORA
  const formatarHora = (dataString) => {
    if (!dataString) return '';
    try {
      const data = new Date(dataString);
      return isNaN(data.getTime()) ? '' : data.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return '';
    }
  };

  // ✅ FORMATAR PERFIL PARA LEGÍVEL
  const formatarPerfil = (perfil) => {
    const perfis = {
      'admin': 'Administrador',
      'admin_estoque': 'Admin Estoque',
      'coordenador': 'Coordenador',
      'gerente': 'Gerente',
      'tecnico': 'Técnico',
      'analista': 'Analista',
      'estagiario': 'Estagiário',
      'aprendiz': 'Aprendiz'
    };
    return perfis[perfil] || perfil;
  };

  // ✅ OBTER COR DA PRIORIDADE
  const getPrioridadeCor = (prioridade) => {
    if (!prioridade) return 'secondary';
    switch (prioridade.toLowerCase()) {
      case 'urgente': return 'danger';
      case 'alta': return 'warning';
      case 'media': return 'primary';
      case 'baixa': return 'success';
      default: return 'secondary';
    }
  };

  // ✅ OBTER ÍCONE DA PRIORIDADE
  const getPrioridadeIcone = (prioridade) => {
    if (!prioridade) return '⚪';
    switch (prioridade.toLowerCase()) {
      case 'urgente': return '🔴';
      case 'alta': return '🟠';
      case 'media': return '🟡';
      case 'baixa': return '🟢';
      default: return '⚪';
    }
  };

  // ✅ FUNÇÃO PARA APROVAR SOLICITAÇÃO - OTIMIZADA
  const aprovarSolicitacao = async (id) => {
    try {
      console.log(`✅ [APROVAR] Iniciando aprovação ID ${id}`);
      
      const confirmar = window.confirm(
        '✅ CONFIRMAR APROVAÇÃO\n\n' +
        'Tem certeza que deseja aprovar esta solicitação?\n\n' +
        'Esta ação não pode ser desfeita.'
      );
      
      if (!confirmar) return;

      const response = await api.put(`/solicitacoes/${id}/aprovar`, {
        observacoes: `Aprovado por ${user.nome} (${formatarPerfil(user.perfil)})`
      });

      if (response.data.success) {
        alert('✅ Solicitação aprovada com sucesso!\n\nAgora está disponível para o estoque processar.');
        carregarSolicitacoes(); // Recarrega a lista
        setModalAprovar(false);
        setSolicitacaoSelecionada(null);
      } else {
        throw new Error(response.data.error || 'Erro ao aprovar');
      }
    } catch (error) {
      console.error('❌ [APROVAR] Erro:', error.response?.data || error.message);
      
      let errorMsg = 'Erro ao aprovar solicitação';
      if (error.response?.status === 403) {
        errorMsg = '❌ Você não tem permissão para aprovar.';
      } else if (error.response?.status === 404) {
        errorMsg = '❌ Solicitação não encontrada ou já foi processada.';
      } else if (error.response?.data?.error) {
        errorMsg = `❌ ${error.response.data.error}`;
      }
      
      alert(errorMsg);
    }
  };

  // ✅ FUNÇÃO PARA REJEITAR SOLICITAÇÃO - OTIMIZADA
  const rejeitarSolicitacao = async (id, motivo) => {
    if (!motivo.trim()) {
      alert('⚠️ Informe o motivo da rejeição.');
      return;
    }

    try {
      const confirmar = window.confirm(`❌ CONFIRMAR REJEIÇÃO\n\nTem certeza que deseja rejeitar esta solicitação?\n\nMotivo: ${motivo}`);
      
      if (!confirmar) return;

      const response = await api.put(`/solicitacoes/${id}/rejeitar`, {
        motivo_rejeicao: motivo
      });

      if (response.data.success) {
        alert('❌ Solicitação rejeitada com sucesso!');
        carregarSolicitacoes();
        setModalRejeitar(false);
        setSolicitacaoSelecionada(null);
        setMotivoRejeicao('');
      } else {
        throw new Error(response.data.error || 'Erro ao rejeitar');
      }
    } catch (error) {
      console.error('❌ [REJEITAR] Erro:', error.response?.data || error.message);
      
      let errorMsg = 'Erro ao rejeitar solicitação';
      if (error.response?.status === 403) {
        errorMsg = '❌ Você não tem permissão para rejeitar.';
      } else if (error.response?.status === 404) {
        errorMsg = '❌ Solicitação não encontrada ou já foi processada.';
      } else if (error.response?.data?.error) {
        errorMsg = `❌ ${error.response.data.error}`;
      }
      
      alert(errorMsg);
    }
  };

  // ✅ ABRIR MODAL DE APROVAÇÃO
  const abrirModalAprovar = (solicitacao) => {
    console.log('📋 Abrindo modal para aprovar:', solicitacao);
    setSolicitacaoSelecionada(solicitacao);
    setModalAprovar(true);
  };

  // ✅ ABRIR MODAL DE REJEIÇÃO
  const abrirModalRejeitar = (solicitacao) => {
    console.log('📋 Abrindo modal para rejeitar:', solicitacao);
    setSolicitacaoSelecionada(solicitacao);
    setModalRejeitar(true);
  };

  // ✅ REDIRECIONAR PARA DETALHES
  const verDetalhes = (id) => {
    navigate(`/solicitacoes/${id}`);
  };

  // ✅ FUNÇÃO PARA CORRIGIR STATUS NO BANCO (ADMIN)
  const corrigirStatusBanco = async () => {
    try {
      const confirmar = window.confirm(
        '🔧 CORRIGIR STATUS NO BANCO\n\n' +
        'Esta ação corrigirá todos os status inválidos no banco de dados.\n' +
        'Apenas administradores podem executar esta ação.\n\n' +
        'Continuar?'
      );
      
      if (!confirmar) return;

      const response = await api.patch('/solicitacoes/corrigir-status');
      
      if (response.data.success) {
        alert(`✅ Status corrigidos com sucesso!\n\nTotal: ${response.data.data.total_corrigido} correções`);
        carregarSolicitacoes();
      }
    } catch (error) {
      alert('❌ Erro ao corrigir status: ' + (error.response?.data?.error || error.message));
    }
  };

  // ✅ BOTÃO PARA TESTAR API MANUALMENTE
  const testarAPIPendentes = async () => {
    try {
      console.log('🧪 Testando API /solicitacoes/pendentes...');
      const response = await api.get('/solicitacoes/pendentes');
      console.log('✅ Resposta do teste:', response.data);
      
      alert(`🧪 TESTE API\n\nStatus: ${response.data.success ? '✅ OK' : '❌ ERRO'}\n` +
            `Mensagem: ${response.data.message || 'Nenhuma mensagem'}\n` +
            `Quantidade: ${response.data.data?.length || 0} solicitações`);
    } catch (error) {
      console.error('❌ Erro no teste:', error);
      alert(`❌ ERRO NO TESTE\n\n${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="text-center">
          <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Carregando...</span>
          </div>
          <h4 className="mt-3">Carregando solicitações pendentes...</h4>
          <p className="text-muted">Verificando permissões e buscando dados</p>
        </div>
      </div>
    );
  }

  if (!podeAnalisar()) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger">
          <h4 className="alert-heading">
            <i className="bi bi-shield-exclamation me-2"></i>
            Acesso Restrito
          </h4>
          <p>
            <strong>Você não tem permissão para acessar esta página.</strong>
          </p>
          <p>
            Apenas coordenadores, gerentes e administradores podem aprovar solicitações.
          </p>
          <hr />
          <div className="d-flex justify-content-between">
            <Link to="/solicitacoes/minhas" className="btn btn-primary">
              <i className="bi bi-list-check me-1"></i> Ver minhas solicitações
            </Link>
            <button onClick={() => navigate(-1)} className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left me-1"></i> Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      {/* MODAL DE APROVAÇÃO */}
      {modalAprovar && solicitacaoSelecionada && (
        <div className="modal-backdrop show">
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header bg-success text-white">
                  <h5 className="modal-title">
                    <i className="bi bi-check-circle me-2"></i>
                    Confirmar Aprovação
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => {
                    setModalAprovar(false);
                    setSolicitacaoSelecionada(null);
                  }}></button>
                </div>
                <div className="modal-body">
                  <div className="alert alert-success">
                    <i className="bi bi-info-circle me-2"></i>
                    Ao aprovar, a solicitação será enviada para o estoque processar.
                  </div>
                  <div className="card">
                    <div className="card-body">
                      <h6 className="card-subtitle mb-2 text-muted">Detalhes da Solicitação</h6>
                      <p className="mb-1"><strong>Código:</strong> {solicitacaoSelecionada.codigo_solicitacao}</p>
                      <p className="mb-1"><strong>Título:</strong> {solicitacaoSelecionada.titulo}</p>
                      <p className="mb-1"><strong>Solicitante:</strong> {solicitacaoSelecionada.solicitante_nome}</p>
                      <p className="mb-1"><strong>Prioridade:</strong> 
                        <span className={`badge bg-${getPrioridadeCor(solicitacaoSelecionada.prioridade)} ms-2`}>
                          {solicitacaoSelecionada.prioridade}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => {
                    setModalAprovar(false);
                    setSolicitacaoSelecionada(null);
                  }}>
                    <i className="bi bi-x-circle me-1"></i> Cancelar
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-success" 
                    onClick={() => aprovarSolicitacao(solicitacaoSelecionada.id)}
                  >
                    <i className="bi bi-check-circle me-1"></i> Confirmar Aprovação
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE REJEIÇÃO */}
      {modalRejeitar && solicitacaoSelecionada && (
        <div className="modal-backdrop show">
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header bg-danger text-white">
                  <h5 className="modal-title">
                    <i className="bi bi-x-circle me-2"></i>
                    Confirmar Rejeição
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => {
                    setModalRejeitar(false);
                    setSolicitacaoSelecionada(null);
                    setMotivoRejeicao('');
                  }}></button>
                </div>
                <div className="modal-body">
                  <div className="alert alert-warning">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    A rejeição será registrada e o solicitante será notificado.
                  </div>
                  <div className="card mb-3">
                    <div className="card-body">
                      <h6 className="card-subtitle mb-2 text-muted">Solicitação a ser rejeitada</h6>
                      <p className="mb-1"><strong>Código:</strong> {solicitacaoSelecionada.codigo_solicitacao}</p>
                      <p className="mb-1"><strong>Título:</strong> {solicitacaoSelecionada.titulo}</p>
                      <p className="mb-1"><strong>Solicitante:</strong> {solicitacaoSelecionada.solicitante_nome}</p>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="motivoRejeicao" className="form-label fw-bold">
                      <i className="bi bi-chat-text me-1"></i>
                      Motivo da rejeição <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id="motivoRejeicao"
                      className="form-control"
                      rows="4"
                      value={motivoRejeicao}
                      onChange={(e) => setMotivoRejeicao(e.target.value)}
                      placeholder="Descreva detalhadamente o motivo da rejeição..."
                      required
                      autoFocus
                    />
                    <div className="form-text">
                      Este motivo será visível para o solicitante.
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => {
                    setModalRejeitar(false);
                    setSolicitacaoSelecionada(null);
                    setMotivoRejeicao('');
                  }}>
                    <i className="bi bi-x-circle me-1"></i> Cancelar
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-danger" 
                    onClick={() => rejeitarSolicitacao(solicitacaoSelecionada.id, motivoRejeicao)}
                    disabled={!motivoRejeicao.trim()}
                  >
                    <i className="bi bi-x-circle me-1"></i> Confirmar Rejeição
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CABEÇALHO PRINCIPAL */}
      <div className="card shadow">
        <div className="card-header bg-primary text-white">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-0">
                <i className="bi bi-clock-history me-2"></i>
                Solicitações Pendentes de Aprovação
              </h1>
              <p className="mb-0 opacity-75">
                <i className="bi bi-person me-1"></i>
                Logado como: <strong>{user?.nome}</strong> ({formatarPerfil(user?.perfil)})
              </p>
            </div>
            <div className="d-flex gap-2">
              {user?.perfil === 'admin' && (
                <button className="btn btn-warning btn-sm" onClick={corrigirStatusBanco} title="Corrigir status no banco">
                  <i className="bi bi-tools me-1"></i> Corrigir BD
                </button>
              )}
              <button className="btn btn-info btn-sm" onClick={testarAPIPendentes} title="Testar API">
                <i className="bi bi-play-circle me-1"></i> Testar API
              </button>
              <button className="btn btn-light btn-sm" onClick={carregarSolicitacoes}>
                <i className="bi bi-arrow-clockwise me-1"></i> Atualizar
              </button>
              <button className="btn btn-outline-light btn-sm" onClick={() => navigate(-1)}>
                <i className="bi bi-arrow-left me-1"></i> Voltar
              </button>
            </div>
          </div>
        </div>
        
        <div className="card-body">
          {/* DEBUG INFO */}
          {debugInfo && (
            <div className="alert alert-info d-flex justify-content-between align-items-center">
              <div>
                <i className="bi bi-bug me-2"></i>
                <strong>Debug:</strong> {debugInfo}
              </div>
              <button 
                className="btn btn-sm btn-outline-info" 
                onClick={() => setDebugInfo('')}
              >
                <i className="bi bi-x"></i>
              </button>
            </div>
          )}

          {/* BANNER DE PERMISSÃO */}
          {podeAnalisar() && (
            <div className="alert alert-success mb-4">
              <div className="d-flex align-items-center">
                <i className="bi bi-shield-check me-3 fs-4"></i>
                <div>
                  <h5 className="alert-heading mb-1">✅ Permissões Ativas</h5>
                  <p className="mb-0">
                    Você está autorizado como <strong>{formatarPerfil(user?.perfil)}</strong> a aprovar e rejeitar solicitações.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* MENSAGEM DE ERRO */}
          {error && (
            <div className="alert alert-danger mb-4">
              <div className="d-flex align-items-center">
                <i className="bi bi-exclamation-triangle me-3 fs-4"></i>
                <div>
                  <h5 className="alert-heading mb-1">Erro ao carregar</h5>
                  <p className="mb-0">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* LISTA DE SOLICITAÇÕES */}
          {solicitacoes.length === 0 ? (
            <div className="text-center py-5">
              <div className="empty-state">
                <i className="bi bi-check-all display-1 text-success mb-3"></i>
                <h3 className="text-success">🎉 Tudo em dia!</h3>
                <p className="text-muted">Não há solicitações pendentes de aprovação.</p>
                <div className="mt-3">
                  <button className="btn btn-primary me-2" onClick={carregarSolicitacoes}>
                    <i className="bi bi-arrow-clockwise me-1"></i> Atualizar
                  </button>
                  <Link to="/solicitacoes/nova" className="btn btn-outline-success">
                    <i className="bi bi-plus-circle me-1"></i> Criar nova solicitação
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th width="120">Código</th>
                      <th>Título</th>
                      <th width="180">Solicitante</th>
                      <th width="100">Prioridade</th>
                      <th width="80">Itens</th>
                      <th width="120">Data</th>
                      <th width="150" className="text-center">Status</th>
                      <th width="250" className="text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {solicitacoes.map((solic) => (
                      <tr key={solic.id} className={solic.prioridade === 'urgente' ? 'table-danger' : ''}>
                        <td>
                          <div className="d-flex align-items-center">
                            <span className={`badge bg-${getPrioridadeCor(solic.prioridade)} me-2`} 
                                  style={{width: '10px', height: '10px', padding: 0}}></span>
                            <strong className="text-primary">{solic.codigo_solicitacao}</strong>
                          </div>
                        </td>
                        <td>
                          <div>
                            <strong className="d-block">{solic.titulo}</strong>
                            {solic.descricao && (
                              <small className="text-muted d-block" style={{fontSize: '0.85em'}}>
                                {solic.descricao.length > 80 
                                  ? `${solic.descricao.substring(0, 80)}...`
                                  : solic.descricao}
                              </small>
                            )}
                          </div>
                        </td>
                        <td>
                          <div>
                            <strong className="d-block">{solic.solicitante_nome}</strong>
                            <small className="text-muted d-block">{solic.departamento || 'N/A'}</small>
                          </div>
                        </td>
                        <td>
                          <span className={`badge bg-${getPrioridadeCor(solic.prioridade)}`}>
                            {getPrioridadeIcone(solic.prioridade)} {solic.prioridade}
                          </span>
                        </td>
                        <td className="text-center">
                          <span className="badge bg-info px-3 py-2 fs-6">
                            {solic.total_itens || 0}
                          </span>
                        </td>
                        <td>
                          <div>
                            <div className="fw-bold">{formatarData(solic.data_solicitacao)}</div>
                            <small className="text-muted">{formatarHora(solic.data_solicitacao)}</small>
                          </div>
                        </td>
                        <td className="text-center">
                          <span className={`badge bg-${solic.status === 'pendente' ? 'warning' : 'secondary'}`}>
                            {solic.status || 'rascunho'}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex flex-wrap gap-2 justify-content-center">
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => abrirModalAprovar(solic)}
                              title="Aprovar esta solicitação"
                            >
                              <i className="bi bi-check-circle me-1"></i> Aprovar
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => abrirModalRejeitar(solic)}
                              title="Rejeitar esta solicitação"
                            >
                              <i className="bi bi-x-circle me-1"></i> Rejeitar
                            </button>
                            <button
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => verDetalhes(solic.id)}
                              title="Ver detalhes completos"
                            >
                              <i className="bi bi-eye me-1"></i> Detalhes
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* RESUMO NO RODAPÉ */}
              <div className="mt-3">
                <div className="alert alert-light border d-flex justify-content-between align-items-center">
                  <div>
                    <i className="bi bi-info-circle me-1 text-primary"></i>
                    <span className="text-muted">
                      Total: <strong>{solicitacoes.length}</strong> solicitações pendentes
                    </span>
                  </div>
                  <div className="text-end">
                    <small className="text-muted">
                      Última atualização: {new Date().toLocaleTimeString('pt-BR')}
                    </small>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PendentesAprovacao;