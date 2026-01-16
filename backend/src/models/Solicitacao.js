const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Solicitacao = sequelize.define('Solicitacao', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  codigo_solicitacao: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  usuario_solicitante_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  usuario_aprovador_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  titulo: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  descricao: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  prioridade: {
    type: DataTypes.ENUM('baixa', 'media', 'alta', 'urgente'),
    defaultValue: 'media'
  },
  tipo: {
    type: DataTypes.ENUM('equipamento', 'material', 'software', 'manutencao'),
    defaultValue: 'equipamento'
  },
  tipo_solicitacao: {
    type: DataTypes.ENUM('retirada_estoque', 'compra_novo'),
    defaultValue: 'retirada_estoque'
  },
  orcamento_estimado: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  fornecedor_sugerido: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  link_referencia: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  urgencia_compra: {
    type: DataTypes.ENUM('baixa', 'media', 'alta', 'imediata'),
    defaultValue: 'media'
  },
  status: {
    type: DataTypes.ENUM(
      'rascunho', 
      'pendente', 
      'em_analise', 
      'aprovada', 
      'rejeitada', 
      'entregue', 
      'devolvida', 
      'cancelada'
    ),
    defaultValue: 'rascunho'
  },
  nivel_aprovacao_atual: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  fluxo_aprovacao: {
    type: DataTypes.JSON,
    allowNull: true
  },
  motivo_rejeicao: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  observacoes_entrega: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  data_solicitacao: {  // 🔥 ADICIONADO - campo do banco
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  atualizado_em: {  // 🔥 ADICIONADO - campo do banco (mapeamento manual)
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  data_aprovacao: {
    type: DataTypes.DATE,
    allowNull: true
  },
  data_entrega: {
    type: DataTypes.DATE,
    allowNull: true
  },
  data_devolucao_prevista: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  data_devolucao_efetiva: {
    type: DataTypes.DATE,
    allowNull: true
  },
  valor_total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  quantidade_total_itens: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  }
}, {
  tableName: 'solicitacoes',
  timestamps: false,  // 🔥 DESATIVAR timestamps automáticos (usamos mapeamento manual)
  hooks: {
    beforeValidate: async (solicitacao, options) => {
      console.log('🔧 Hook beforeValidate executando...');
      
      if (!solicitacao.codigo_solicitacao || solicitacao.codigo_solicitacao.trim() === '') {
        const ano = new Date().getFullYear();
        
        try {
          const [result] = await sequelize.query(
            `SELECT COALESCE(MAX(CAST(SUBSTRING(codigo_solicitacao, 9) AS UNSIGNED)), 0) + 1 AS nova_sequencia
             FROM solicitacoes 
             WHERE codigo_solicitacao LIKE CONCAT('SOL-', ?, '-%')`,
            {
              replacements: [ano],
              type: sequelize.QueryTypes.SELECT
            }
          );
          
          const sequencia = result.nova_sequencia || 1;
          solicitacao.codigo_solicitacao = `SOL-${ano}-${sequencia.toString().padStart(3, '0')}`;
          console.log(`✅ Código gerado: ${solicitacao.codigo_solicitacao}`);
          
        } catch (error) {
          console.error('❌ Erro ao gerar código:', error.message);
          const random = Math.floor(Math.random() * 900) + 100;
          solicitacao.codigo_solicitacao = `SOL-${ano}-${random}`;
          console.log(`✅ Código fallback: ${solicitacao.codigo_solicitacao}`);
        }
      } else {
        console.log(`✅ Código já definido: ${solicitacao.codigo_solicitacao}`);
      }
    },
    
    beforeCreate: (solicitacao, options) => {
      // 🔥 GARANTIR data_solicitacao
      if (!solicitacao.data_solicitacao) {
        solicitacao.data_solicitacao = new Date();
      }
      // 🔥 GARANTIR atualizado_em
      if (!solicitacao.atualizado_em) {
        solicitacao.atualizado_em = new Date();
      }
    },
    
    beforeUpdate: (solicitacao, options) => {
      // 🔥 ATUALIZAR atualizado_em manualmente
      solicitacao.atualizado_em = new Date();
    },
    
    afterCreate: async (solicitacao, options) => {
      console.log(`✅ Solicitação criada: ${solicitacao.codigo_solicitacao}`);
    },
    
    afterUpdate: async (solicitacao, options) => {
      console.log(`🔄 Solicitação atualizada: ${solicitacao.codigo_solicitacao}, Status: ${solicitacao.status}`);
    }
  }
});

// 🔥 ADICIONE ESTE MÉTODO PARA SINCRONIZAR
Solicitacao.syncModel = async function() {
  try {
    // Primeiro verifica a estrutura da tabela
    const [columns] = await sequelize.query(
      `SHOW COLUMNS FROM solicitacoes WHERE Field IN ('data_solicitacao', 'atualizado_em')`
    );
    
    console.log('📊 Colunas encontradas na tabela:');
    columns.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    // Forçar sincronização se necessário
    await this.sync({ alter: false }); // alter: false para não modificar estrutura
    
    console.log('✅ Modelo sincronizado com sucesso!');
    return true;
    
  } catch (error) {
    console.error('❌ Erro ao sincronizar modelo:', error.message);
    return false;
  }
};

// 🔥 MÉTODO: Verificar se pode ser editada
Solicitacao.prototype.podeSerEditada = function(usuarioId) {
  const podeEditar = this.status === 'rascunho' && this.usuario_solicitante_id === usuarioId;
  console.log(`🔍 Solicitação ${this.codigo_solicitacao} pode ser editada? ${podeEditar}`, {
    status: this.status,
    solicitante_id: this.usuario_solicitante_id,
    usuario_atual: usuarioId
  });
  return podeEditar;
};

// 🔥 MÉTODO: Verificar se pode ser enviada para aprovação
Solicitacao.prototype.podeSerEnviadaAprovacao = function() {
  const podeEnviar = this.status === 'rascunho' && this.usuario_solicitante_id;
  console.log(`🔍 Solicitação ${this.codigo_solicitacao} pode ser enviada? ${podeEnviar}`);
  return podeEnviar;
};

// 🔥 MÉTODO: Obter status legível para frontend
Solicitacao.prototype.getStatusLegivel = function() {
  const statusMap = {
    'rascunho': '📝 Rascunho',
    'pendente': '⏳ Aguardando Aprovação',
    'em_analise': '🔍 Em Análise',
    'aprovada': '✅ Aprovada - Aguardando Estoque',
    'rejeitada': '❌ Rejeitada',
    'entregue': '🎉 Entregue',
    'devolvida': '📦 Devolvida',
    'cancelada': '🚫 Cancelada'
  };
  return statusMap[this.status] || this.status;
};

// 🔥 MÉTODO: Atualizar valores totais
Solicitacao.prototype.atualizarValores = async function() {
  try {
    const SolicitacaoItem = sequelize.models.SolicitacaoItem || require('./SolicitacaoItem');
    
    const itens = await SolicitacaoItem.findAll({
      where: { solicitacao_id: this.id },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('quantidade_solicitada')), 'total_itens'],
        [sequelize.fn('SUM', sequelize.literal('quantidade_solicitada * COALESCE(valor_unitario_estimado, 0)')), 'valor_total']
      ],
      raw: true
    });
    
    const resultado = itens[0] || {};
    this.quantidade_total_itens = parseInt(resultado.total_itens) || 0;
    this.valor_total = parseFloat(resultado.valor_total) || 0.00;
    
    console.log(`💰 Solicitação ${this.codigo_solicitacao}: ${this.quantidade_total_itens} itens, R$ ${this.valor_total.toFixed(2)}`);
    
    // Atualizar data de atualização manualmente
    this.atualizado_em = new Date();
    await this.save();
    
    return { quantidade_total_itens: this.quantidade_total_itens, valor_total: this.valor_total };
    
  } catch (error) {
    console.error('❌ Erro ao atualizar valores:', error.message);
    return { quantidade_total_itens: 0, valor_total: 0.00 };
  }
};

// 🔥 MÉTODO: Retornar dados públicos para frontend
Solicitacao.prototype.toJSON = function() {
  const values = { ...this.get() };
  
  values.status_legivel = this.getStatusLegivel();
  values.pode_editar = this.status === 'rascunho';
  values.pode_cancelar = ['rascunho', 'pendente', 'em_analise'].includes(this.status);
  values.pode_aprovar = ['pendente', 'em_analise'].includes(this.status);
  
  return values;
};
// 🔥 ADICIONE ESTES MÉTODOS NO FINAL DO MODELO:

// 🔥 MÉTODO: Verificar se usuário pode aprovar esta solicitação
Solicitacao.prototype.usuarioPodeAprovar = function(usuarioId, usuarioPerfil) {
  const perfisQuePodemAprovar = ['coordenador', 'gerente', 'admin', 'admin_estoque'];
  
  // 1. Verificar se o perfil pode aprovar
  if (!perfisQuePodemAprovar.includes(usuarioPerfil)) {
    return false;
  }
  
  // 2. Não pode aprovar própria solicitação
  if (this.usuario_solicitante_id === usuarioId) {
    return false;
  }
  
  // 3. Só pode aprovar se status for 'pendente'
  if (this.status !== 'pendente') {
    return false;
  }
  
  return true;
};

// 🔥 MÉTODO: Verificar botões que devem aparecer no frontend
Solicitacao.prototype.getBotoesDisponiveis = function(usuarioId, usuarioPerfil) {
  const isSolicitante = this.usuario_solicitante_id === usuarioId;
  const isAdmin = ['admin', 'admin_estoque'].includes(usuarioPerfil);
  const podeAprovar = this.usuarioPodeAprovar(usuarioId, usuarioPerfil);
  
  return {
    // ✅ Botão ENVIAR: aparece para solicitante quando status é rascunho
    podeEnviar: isSolicitante && this.status === 'rascunho',
    
    // ✅ Botão APROVAR: aparece para coordenador/gerente quando status é pendente
    podeAprovar: podeAprovar,
    
    // ✅ Botão REJEITAR: mesmo critério do aprovar
    podeRejeitar: podeAprovar,
    
    // ✅ Botão EDITAR: aparece para solicitante quando status é rascunho
    podeEditar: isSolicitante && this.status === 'rascunho',
    
    // ✅ Botão CANCELAR: aparece para solicitante (rascunho/pendente) ou admin
    podeCancelar: (isSolicitante && ['rascunho', 'pendente'].includes(this.status)) || isAdmin,
    
    // ✅ Botão PROCESSAR ESTOQUE: aparece para admin quando status é aprovada
    podeProcessarEstoque: isAdmin && this.status === 'aprovada',
    
    // ✅ Botão ENTREGAR: aparece para admin quando status é aprovada
    podeEntregar: isAdmin && this.status === 'aprovada'
  };
};
// 🔥 MÉTODO: Determinar próximo aprovador baseado no fluxo (Coordenador/Gerente → Admin)
Solicitacao.prototype.determinarProximoAprovador = async function() {
  try {
    const Usuario = sequelize.models.Usuario || require('./Usuario');
    
    // Nível 1: Coordenador OU Gerente (nivel_aprovacao_atual = 1)
    if (this.nivel_aprovacao_atual === 1) {
      console.log('🔍 Buscando Coordenador ou Gerente para aprovação nível 1...');
      
      // Primeiro tenta encontrar Coordenador ativo
      let aprovador = await Usuario.findOne({
        where: { 
          perfil: 'coordenador',
          ativo: true 
        },
        attributes: ['id', 'nome', 'email', 'perfil']
      });
      
      // Se não encontrar Coordenador, busca Gerente
      if (!aprovador) {
        aprovador = await Usuario.findOne({
          where: { 
            perfil: 'gerente',
            ativo: true 
          },
          attributes: ['id', 'nome', 'email', 'perfil']
        });
        console.log('⚠️ Coordenador não encontrado, usando Gerente como aprovador');
      }
      
      // Fallback: Admin (nunca deve chegar aqui se banco configurado corretamente)
      if (!aprovador) {
        aprovador = await Usuario.findOne({
          where: { 
            perfil: 'admin',
            ativo: true 
          },
          attributes: ['id', 'nome', 'email', 'perfil']
        });
        console.log('⚠️ Usando Admin como fallback para aprovação nível 1');
      }
      
      if (aprovador) {
        console.log(`✅ Aprovador nível 1 encontrado: ${aprovador.nome} (${aprovador.perfil})`);
        return aprovador;
      }
    }
    
    // Nível 2: Admin/Estoque (nivel_aprovacao_atual = 2)
    if (this.nivel_aprovacao_atual === 2) {
      console.log('🔍 Buscando Admin para liberação de estoque (nível 2)...');
      
      // Prioridade: admin_estoque, depois admin
      let aprovador = await Usuario.findOne({
        where: { 
          perfil: 'admin_estoque',
          ativo: true 
        },
        attributes: ['id', 'nome', 'email', 'perfil']
      });
      
      if (!aprovador) {
        aprovador = await Usuario.findOne({
          where: { 
            perfil: 'admin',
            ativo: true 
          },
          attributes: ['id', 'nome', 'email', 'perfil']
        });
      }
      
      if (aprovador) {
        console.log(`✅ Aprovador nível 2 (estoque) encontrado: ${aprovador.nome} (${aprovador.perfil})`);
        return aprovador;
      }
    }
    
    console.error('❌ Nenhum aprovador encontrado para o nível atual:', this.nivel_aprovacao_atual);
    return null;
    
  } catch (error) {
    console.error('❌ Erro ao determinar próximo aprovador:', error.message);
    return null;
  }
};

// 🔥 MÉTODO: Processar aprovação seguindo fluxo hierárquico
Solicitacao.prototype.processarAprovacao = async function(usuarioId, acao, motivo = '') {
  try {
    const Usuario = sequelize.models.Usuario || require('./Usuario');
    const HistoricoSolicitacoes = sequelize.models.HistoricoSolicitacao || require('./HistoricoSolicitacoes');
    
    const usuario = await Usuario.findByPk(usuarioId);
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }
    
    console.log(`🔄 Processando ${acao} por ${usuario.nome} (${usuario.perfil})`);
    
    // AÇÃO: APROVAR
    if (acao === 'aprovar') {
      // Verificar se usuário tem permissão para aprovar neste nível
      if (!this.usuarioPodeAprovar(usuarioId, usuario.perfil)) {
        throw new Error(`Usuário ${usuario.perfil} não tem permissão para aprovar neste nível`);
      }
      
      // Nível 1: Coordenador/Gerente aprova
      if (this.nivel_aprovacao_atual === 1) {
        // Verificar se usuário é coordenador ou gerente
        if (!['coordenador', 'gerente'].includes(usuario.perfil)) {
          throw new Error('Somente coordenador ou gerente podem aprovar no nível 1');
        }
        
        this.status = 'aprovada';
        this.usuario_aprovador_id = usuarioId;
        this.data_aprovacao = new Date();
        this.nivel_aprovacao_atual = 2; // Avança para nível 2 (estoque)
        
        console.log(`✅ Nível 1 aprovado por ${usuario.perfil}. Aguardando estoque (nível 2)...`);
        
        // Registrar histórico
        await HistoricoSolicitacoes.create({
          solicitacao_id: this.id,
          usuario_id: usuarioId,
          acao: 'aprovacao_nivel_1',
          descricao: `Aprovação nível 1 por ${usuario.nome} (${usuario.perfil})`
        });
      }
      
      // Nível 2: Admin/Estoque libera
      else if (this.nivel_aprovacao_atual === 2) {
        // Verificar se usuário é admin
        if (!['admin', 'admin_estoque'].includes(usuario.perfil)) {
          throw new Error('Somente admin pode liberar estoque no nível 2');
        }
        
        this.status = 'entregue'; // Muda status para entregue quando estoque libera
        this.data_entrega = new Date();
        
        console.log(`✅ Estoque liberado por ${usuario.perfil}. Solicitação pronta para entrega.`);
        
        // Registrar histórico
        await HistoricoSolicitacoes.create({
          solicitacao_id: this.id,
          usuario_id: usuarioId,
          acao: 'liberacao_estoque',
          descricao: `Liberação de estoque por ${usuario.nome} (${usuario.perfil})`
        });
      }
    }
    
    // AÇÃO: REJEITAR
    else if (acao === 'rejeitar') {
      this.status = 'rejeitada';
      this.motivo_rejeicao = motivo;
      this.usuario_aprovador_id = usuarioId;
      this.data_aprovacao = new Date();
      
      // Registrar histórico
      await HistoricoSolicitacoes.create({
        solicitacao_id: this.id,
        usuario_id: usuarioId,
        acao: 'rejeicao',
        descricao: `Rejeição por ${usuario.nome} (${usuario.perfil}): ${motivo}`
      });
    }
    
    // AÇÃO: CANCELAR
    else if (acao === 'cancelar') {
      this.status = 'cancelada';
      
      // Registrar histórico
      await HistoricoSolicitacoes.create({
        solicitacao_id: this.id,
        usuario_id: usuarioId,
        acao: 'cancelamento',
        descricao: `Cancelamento por ${usuario.nome} (${usuario.perfil}): ${motivo}`
      });
    }
    
    // Salvar alterações
    await this.save();
    
    return {
      success: true,
      message: `Solicitação ${acao} com sucesso`,
      novo_status: this.status,
      nivel_atual: this.nivel_aprovacao_atual
    };
    
  } catch (error) {
    console.error('❌ Erro ao processar aprovação:', error.message);
    return {
      success: false,
      message: error.message
    };
  }
};

// 🔥 MÉTODO: Obter informações do fluxo atual
Solicitacao.prototype.getFluxoAprovacao = function() {
  const fluxos = {
    1: {
      nivel: 1,
      descricao: 'Aprovação Gerencial',
      responsaveis: ['Coordenador', 'Gerente'],
      status_esperado: 'pendente',
      proximo_nivel: 2
    },
    2: {
      nivel: 2,
      descricao: 'Liberação de Estoque',
      responsaveis: ['Admin', 'Admin Estoque'],
      status_esperado: 'aprovada',
      proximo_nivel: null
    }
  };
  
  return fluxos[this.nivel_aprovacao_atual] || fluxos[1];
};

// 🔥 MÉTODO: Enviar para aprovação (mudar de rascunho para pendente)
Solicitacao.prototype.enviarParaAprovacao = async function() {
  if (this.status !== 'rascunho') {
    throw new Error('Só é possível enviar solicitações com status "rascunho"');
  }
  
  // Determinar primeiro aprovador automaticamente
  const primeiroAprovador = await this.determinarProximoAprovador();
  if (!primeiroAprovador) {
    throw new Error('Não foi possível determinar um aprovador. Verifique se há coordenadores/gerentes ativos.');
  }
  
  this.status = 'pendente';
  this.nivel_aprovacao_atual = 1;
  this.data_solicitacao = new Date();
  
  console.log(`📤 Solicitação ${this.codigo_solicitacao} enviada para aprovação.`);
  console.log(`👤 Primeiro aprovador: ${primeiroAprovador.nome} (${primeiroAprovador.perfil})`);
  
  await this.save();
  
  return {
    success: true,
    aprovador: primeiroAprovador,
    mensagem: 'Solicitação enviada para aprovação com sucesso'
  };
};

// 🔥 ATUALIZAR o método toJSON para incluir informações do fluxo
Solicitacao.prototype.toJSON = function() {
  const values = { ...this.get() };
  
  values.status_legivel = this.getStatusLegivel();
  values.pode_editar = this.status === 'rascunho';
  values.pode_cancelar = ['rascunho', 'pendente', 'em_analise'].includes(this.status);
  values.pode_aprovar = ['pendente', 'em_analise'].includes(this.status);
  values.fluxo_atual = this.getFluxoAprovacao();
  values.proximo_aprovador_info = this.nivel_aprovacao_atual === 1 
    ? 'Coordenador ou Gerente' 
    : 'Admin (Estoque)';
  
  return values;
};

// 🔥 EXPORTAR com método de sincronização
module.exports = Solicitacao;