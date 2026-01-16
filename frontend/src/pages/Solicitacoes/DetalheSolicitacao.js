// ✅ VERSÃO SIMPLIFICADA E FUNCIONAL
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSolicitacoes } from '../../contexts/SolicitacaoContext';
import { useAuth } from '../../contexts/AuthContext';
import HistoricoSolicitacao from '../../components/HistoricoSolicitacao';
import './DetalheSolicitacao.css';

const DetalheSolicitacao = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    fetchSolicitacaoById, 
    enviarParaAprovacao,
    aprovarSolicitacao,
    rejeitarSolicitacao,
    processarEstoque,
    cancelarSolicitacao,
    loading 
  } = useSolicitacoes();
  const { user } = useAuth();
  
  const [solicitacao, setSolicitacao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('detalhes');
  const [processando, setProcessando] = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [modoRejeicao, setModoRejeicao] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  // 🔧 Carregar solicitação
  useEffect(() => {
    const carregarSolicitacao = async () => {
      try {
        setCarregando(true);
        setErro('');
        
        const dados = await fetchSolicitacaoById(id);
        
        if (!dados) {
          throw new Error('Solicitação não encontrada');
        }
        
        // Normalizar status se necessário
        if (!dados.status || dados.status.trim() === '') {
          dados.status = 'rascunho';
        }
        
        console.log('✅ Solicitação carregada:', {
          id: dados.id,
          status: dados.status,
          titulo: dados.titulo,
          solicitante_id: dados.usuario_solicitante_id,
          perfil_usuario: user?.perfil
        });
        
        setSolicitacao(dados);
        
      } catch (error) {
        console.error('❌ Erro ao carregar:', error);
        setErro('Erro ao carregar solicitação: ' + (error.message || 'Erro desconhecido'));
      } finally {
        setCarregando(false);
      }
    };
    
    if (user) {
      carregarSolicitacao();
    }
  }, [id, user]);

  // ✅ FUNÇÃO PARA CALCULAR BOTÕES VISÍVEIS
  const calcularBotoesVisiveis = () => {
    if (!solicitacao || !user) return {};
    
    const status = solicitacao.status?.toLowerCase() || 'rascunho';
    const isSolicitante = solicitacao.usuario_solicitante_id === user.id;
    const isAdminEstoque = ['admin', 'admin_estoque'].includes(user.perfil);
    const isCoordenadorGerente = ['coordenador', 'gerente'].includes(user.perfil);
    
    // 🔥 LOGICA SIMPLIFICADA:
    return {
      // TÉCNICO/ANALISTA: Só vê botão ENVIAR quando é RASCUNHO e é DONO
      mostrarEnviar: status === 'rascunho' && isSolicitante,
      
      // COORDENADOR/GERENTE: Só vê botões APROVAR/REJEITAR quando é PENDENTE e NÃO é dono
      mostrarAprovarRejeitar: status === 'pendente' && 
                               isCoordenadorGerente && 
                               !isSolicitante,
      
      // ADMIN ESTOQUE: Só vê botão ENTREGAR quando é APROVADA
      mostrarEntregar: status === 'aprovada' && isAdminEstoque,
      
      // DONO: Só vê EDITAR quando é RASCUNHO
      mostrarEditar: status === 'rascunho' && isSolicitante,
      
      // DONO ou ADMIN: Só vê CANCELAR quando é RASCUNHO ou PENDENTE
      mostrarCancelar: (status === 'rascunho' && isSolicitante) ||
                       (status === 'pendente' && (isSolicitante || isAdminEstoque)),
      
      // Info
      podeAprovar: status === 'pendente' && isCoordenadorGerente && !isSolicitante,
      podeRejeitar: status === 'pendente' && isCoordenadorGerente && !isSolicitante,
      podeEnviar: status === 'rascunho' && isSolicitante,
      podeEntregar: status === 'aprovada' && isAdminEstoque,
      podeCancelar: (['rascunho', 'pendente'].includes(status) && 
                     (isSolicitante || isAdminEstoque))
    };
  };

  // ✅ ENVIAR PARA APROVAÇÃO (TÉCNICO/ANALISTA)
  const handleEnviarAprovacao = async () => {
    if (!window.confirm('Enviar para aprovação do coordenador/gerente?')) return;
    
    try {
      setProcessando(true);
      const resultado = await enviarParaAprovacao(id);
      
      if (resultado) {
        // Atualizar localmente
        setSolicitacao(prev => ({ ...prev, status: 'pendente' }));
        setMensagemSucesso('✅ Enviada para aprovação!');
        
        // Recarregar
        setTimeout(() => carregarSolicitacao(), 1000);
      }
    } catch (error) {
      alert('❌ Erro ao enviar: ' + (error.response?.data?.error || error.message));
    } finally {
      setProcessando(false);
    }
  };

  // ✅ APROVAR (COORDENADOR/GERENTE)
  const handleAprovar = async () => {
    if (!window.confirm('Aprovar esta solicitação?\n\nSerá enviada para o estoque.')) return;
    
    try {
      setProcessando(true);
      const observacoes = prompt('Observações (opcional):', '');
      
      const resultado = await aprovarSolicitacao(id, observacoes || '');
      
      if (resultado) {
        setSolicitacao(prev => ({ ...prev, status: 'aprovada' }));
        setMensagemSucesso('✅ Aprovada! Agora está no estoque.');
        
        setTimeout(() => carregarSolicitacao(), 1000);
      }
    } catch (error) {
      alert('❌ Erro ao aprovar: ' + (error.response?.data?.error || error.message));
    } finally {
      setProcessando(false);
    }
  };

  // ✅ REJEITAR (COORDENADOR/GERENTE)
  const handleRejeitar = async () => {
    const motivo = prompt('Digite o motivo da rejeição:');
    if (!motivo || !motivo.trim()) {
      alert('❌ Motivo é obrigatório!');
      return;
    }
    
    if (!window.confirm(`Confirmar rejeição?\n\nMotivo: ${motivo}`)) return;
    
    try {
      setProcessando(true);
      const resultado = await rejeitarSolicitacao(id, motivo);
      
      if (resultado) {
        setSolicitacao(prev => ({ ...prev, status: 'rejeitada' }));
        setMensagemSucesso('❌ Rejeitada com sucesso.');
        setModoRejeicao(false);
        
        setTimeout(() => carregarSolicitacao(), 1000);
      }
    } catch (error) {
      alert('❌ Erro ao rejeitar: ' + (error.response?.data?.error || error.message));
    } finally {
      setProcessando(false);
    }
  };

  // ✅ ENTREGAR (ADMIN ESTOQUE)
  const handleEntregar = async () => {
    if (!window.confirm('Marcar como entregue?')) return;
    
    try {
      setProcessando(true);
      const quantidade = prompt('Quantidade entregue:', '1');
      const observacoes = prompt('Observações:', '');
      
      const resultado = await processarEstoque(id, {
        quantidade_entregue: parseInt(quantidade) || 1,
        observacoes_entrega: observacoes || ''
      });
      
      if (resultado) {
        setSolicitacao(prev => ({ ...prev, status: 'entregue' }));
        setMensagemSucesso('📦 Entregue com sucesso!');
        
        setTimeout(() => carregarSolicitacao(), 1000);
      }
    } catch (error) {
      alert('❌ Erro ao entregar: ' + (error.response?.data?.error || error.message));
    } finally {
      setProcessando(false);
    }
  };

  // ✅ CANCELAR
  const handleCancelar = async () => {
    if (!window.confirm('Cancelar esta solicitação?')) return;
    
    try {
      setProcessando(true);
      const motivo = prompt('Motivo do cancelamento (opcional):', '');
      await cancelarSolicitacao(id, motivo || '');
      navigate('/solicitacoes');
    } catch (error) {
      alert('❌ Erro ao cancelar: ' + (error.response?.data?.error || error.message));
    } finally {
      setProcessando(false);
    }
  };

  // ✅ RECARREGAR
  const carregarSolicitacao = async () => {
    try {
      const dados = await fetchSolicitacaoById(id);
      setSolicitacao(dados);
    } catch (error) {
      console.error('Erro ao recarregar:', error);
    }
  };

  // ✅ FUNÇÕES AUXILIARES
  const formatarData = (dataString) => {
    if (!dataString) return '-';
    try {
      const data = new Date(dataString);
      return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  const getStatusClass = (status) => {
    const s = status?.toLowerCase() || 'rascunho';
    const classes = {
      'rascunho': 'status-rascunho',
      'pendente': 'status-pendente',
      'aprovada': 'status-aprovada',
      'rejeitada': 'status-rejeitada',
      'entregue': 'status-entregue',
      'cancelada': 'status-cancelada'
    };
    return classes[s] || 'status-rascunho';
  };

  const getStatusIcon = (status) => {
    const s = status?.toLowerCase() || 'rascunho';
    const icons = {
      'rascunho': '📝',
      'pendente': '⏳',
      'aprovada': '✅',
      'rejeitada': '❌',
      'entregue': '📦',
      'cancelada': '🚫'
    };
    return icons[s] || '❓';
  };

  // ✅ RENDERIZAÇÃO
  if (carregando) {
    return (
      <div className="detalhe-solicitacao-page">
        <div className="loading-state">Carregando...</div>
      </div>
    );
  }

  if (!solicitacao) {
    return (
      <div className="detalhe-solicitacao-page">
        <div className="error-state">
          <p>Solicitação não encontrada</p>
          <Link to="/solicitacoes">← Voltar</Link>
        </div>
      </div>
    );
  }

  const botoes = calcularBotoesVisiveis();
  const status = solicitacao.status?.toLowerCase() || 'rascunho';

  return (
    <div className="detalhe-solicitacao-page">
      {/* MENSAGENS */}
      {mensagemSucesso && (
        <div className="mensagem-sucesso">
          <span>{mensagemSucesso}</span>
          <button onClick={() => setMensagemSucesso('')}>×</button>
        </div>
      )}
      
      {erro && (
        <div className="mensagem-erro">
          <span>{erro}</span>
          <button onClick={() => setErro('')}>×</button>
        </div>
      )}

      {/* CABEÇALHO SIMPLES */}
      <div className="detalhe-header">
        <div className="detalhe-header-top">
          <Link to="/solicitacoes" className="btn-voltar">← Voltar</Link>
          <div className="usuario-info">
            Logado como: <strong>{user?.nome}</strong> ({user?.perfil})
          </div>
        </div>
        
        <div className="detalhe-titulo">
          <h1>{solicitacao.titulo}</h1>
          <div className="detalhe-status">
            <span className={`status-badge ${getStatusClass(status)}`}>
              {getStatusIcon(status)} {status.toUpperCase()}
            </span>
            <span className="detalhe-codigo">
              Código: <strong>{solicitacao.codigo_solicitacao}</strong>
            </span>
          </div>
          <p className="detalhe-descricao">{solicitacao.descricao || 'Sem descrição'}</p>
        </div>

        {/* 🔥 BOTÕES PRINCIPAIS - UM POR AÇÃO */}
        <div className="botoes-principais">
          {/* 1. BOTÃO ENVIAR (TÉCNICO) */}
          {botoes.mostrarEnviar && (
            <button 
              className="btn-enviar"
              onClick={handleEnviarAprovacao}
              disabled={processando}
            >
              📤 {processando ? 'Enviando...' : 'Enviar para Aprovação'}
            </button>
          )}
          
          {/* 2. BOTÕES APROVAR/REJEITAR (COORDENADOR/GERENTE) */}
          {botoes.mostrarAprovarRejeitar && !modoRejeicao && (
            <>
              <button 
                className="btn-aprovar"
                onClick={handleAprovar}
                disabled={processando}
              >
                ✅ {processando ? 'Aprovando...' : 'Aprovar'}
              </button>
              <button 
                className="btn-rejeitar"
                onClick={() => setModoRejeicao(true)}
                disabled={processando}
              >
                ❌ Rejeitar
              </button>
            </>
          )}
          
          {/* 3. MODO REJEIÇÃO */}
          {modoRejeicao && (
            <div className="modo-rejeicao">
              <textarea
                value={motivoRejeicao}
                onChange={(e) => setMotivoRejeicao(e.target.value)}
                placeholder="Motivo da rejeição..."
                rows="2"
              />
              <div className="botoes-rejeicao">
                <button onClick={() => setModoRejeicao(false)}>Cancelar</button>
                <button 
                  className="btn-confirmar-rejeicao"
                  onClick={handleRejeitar}
                  disabled={!motivoRejeicao.trim() || processando}
                >
                  {processando ? 'Rejeitando...' : 'Confirmar Rejeição'}
                </button>
              </div>
            </div>
          )}
          
          {/* 4. BOTÃO ENTREGAR (ADMIN ESTOQUE) */}
          {botoes.mostrarEntregar && (
            <button 
              className="btn-entregar"
              onClick={handleEntregar}
              disabled={processando}
            >
              📦 {processando ? 'Entregando...' : 'Entregar no Estoque'}
            </button>
          )}
          
          {/* 5. BOTÃO EDITAR (DONO DO RASCUNHO) */}
          {botoes.mostrarEditar && (
            <button 
              className="btn-editar"
              onClick={() => navigate(`/solicitacoes/editar/${id}`)}
            >
              ✏️ Editar
            </button>
          )}
          
          {/* 6. BOTÃO CANCELAR */}
          {botoes.mostrarCancelar && (
            <button 
              className="btn-cancelar"
              onClick={handleCancelar}
              disabled={processando}
            >
              ❌ {processando ? 'Cancelando...' : 'Cancelar'}
            </button>
          )}
        </div>
      </div>

      {/* ABA PROCESSAMENTO (SÓ SE TIVER PERMISSÃO) */}
      {(botoes.podeEnviar || botoes.podeAprovar || botoes.podeEntregar) && (
        <div className="aba-processamento">
          <h3>🎯 Ações Disponíveis</h3>
          
          {botoes.podeEnviar && (
            <div className="card-acao">
              <h4>📤 Enviar para Aprovação</h4>
              <p>Enviar para análise do coordenador/gerente</p>
              <button onClick={handleEnviarAprovacao}>Enviar</button>
            </div>
          )}
          
          {botoes.podeAprovar && (
            <div className="card-acao">
              <h4>✅ Aprovar como {user?.perfil?.toUpperCase()}</h4>
              <p>Aprovar e encaminhar para o estoque</p>
              <button onClick={handleAprovar}>Aprovar</button>
            </div>
          )}
          
          {botoes.podeEntregar && (
            <div className="card-acao">
              <h4>📦 Finalizar Entrega</h4>
              <p>Marcar como entregue pelo estoque</p>
              <button onClick={handleEntregar}>Entregar</button>
            </div>
          )}
        </div>
      )}

      {/* ABA DETALHES */}
      <div className="aba-detalhes">
        <h3>📋 Informações</h3>
        <div className="grid-detalhes">
          <div>
            <strong>Solicitante:</strong> {solicitacao.solicitante_nome}
          </div>
          <div>
            <strong>Departamento:</strong> {solicitacao.departamento || '-'}
          </div>
          <div>
            <strong>Criada em:</strong> {formatarData(solicitacao.data_solicitacao)}
          </div>
          {solicitacao.data_aprovacao && (
            <div>
              <strong>Aprovada em:</strong> {formatarData(solicitacao.data_aprovacao)}
            </div>
          )}
          {solicitacao.data_entrega && (
            <div>
              <strong>Entregue em:</strong> {formatarData(solicitacao.data_entrega)}
            </div>
          )}
        </div>
      </div>

      {/* ABA ITENS */}
      <div className="aba-itens">
        <h3>📦 Itens ({solicitacao.itens?.length || 0})</h3>
        {solicitacao.itens?.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantidade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {solicitacao.itens.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.nome_item}</td>
                  <td>{item.quantidade_solicitada}</td>
                  <td>{item.status_item || 'pendente'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Nenhum item nesta solicitação</p>
        )}
      </div>
    </div>
  );
};

export default DetalheSolicitacao;