const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Solicitacao = require('./Solicitacao');
const Usuario = require('./Usuario');

const HistoricoSolicitacoes = sequelize.define('HistoricoSolicitacoes', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  solicitacao_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Solicitacao,
      key: 'id'
    }
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Usuario,
      key: 'id'
    }
  },
  acao: {
    type: DataTypes.ENUM(
      'criacao', 
      'edicao', 
      'envio_aprovacao', 
      'aprovacao', 
      'rejeicao', 
      'entrega', 
      'devolucao',
      'cancelamento'
    ),
    allowNull: false
  },
  descricao: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  dados_alterados: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'historico_solicitacoes',
  timestamps: true,
  createdAt: 'data_acao',
  updatedAt: false
});

// Relações
HistoricoSolicitacoes.belongsTo(Solicitacao, {
  foreignKey: 'solicitacao_id'
});

HistoricoSolicitacoes.belongsTo(Usuario, {
  foreignKey: 'usuario_id'
});

module.exports = HistoricoSolicitacoes;