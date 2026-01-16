const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PERFIS_VALIDOS = ['admin', 'tecnico_manutencao', 'coordenador', 'gerente', 'tecnico', 'analista', 'estagiario', 'aprendiz', 'admin_estoque'];

const FluxosAprovacao = sequelize.define('FluxosAprovacao', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nome: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  descricao: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  condicoes: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  niveis: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    validate: {
      isValidNiveis(value) {
        if (!Array.isArray(value)) {
          throw new Error('niveis deve ser um array');
        }
        
        // Verificar estrutura mínima de cada nível
        value.forEach((nivel, index) => {
          if (!nivel.nivel || !nivel.perfil || !nivel.descricao) {
            throw new Error(`Nível ${index} está incompleto`);
          }
          
          if (!PERFIS_VALIDOS.includes(nivel.perfil)) {
            throw new Error(`Perfil ${nivel.perfil} no nível ${index} é inválido`);
          }
        });
      }
    }
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'fluxos_aprovacao',
  timestamps: true,
  createdAt: 'criado_em',
  updatedAt: 'atualizado_em'  // ← CORRIGIDO
});

// Método estático para buscar fluxo ativo
FluxosAprovacao.buscarFluxoAtivo = async function() {
  return await this.findOne({
    where: { ativo: true }
  });
};

// Método para buscar fluxo baseado no valor da solicitação
FluxosAprovacao.buscarFluxoPorValor = async function(valorTotal) {
  const fluxos = await this.findAll({
    where: { ativo: true }
  });
  
  for (const fluxo of fluxos) {
    const condicoes = fluxo.condicoes || {};
    
    let atendeCondicoes = true;
    
    if (condicoes.valor_minimo && valorTotal < condicoes.valor_minimo) {
      atendeCondicoes = false;
    }
    
    if (condicoes.valor_maximo && valorTotal > condicoes.valor_maximo) {
      atendeCondicoes = false;
    }
    
    if (condicoes.todas || atendeCondicoes) {
      return fluxo;
    }
  }
  
  return null;
};

// Método para verificar se usuário tem permissão de aprovação
FluxosAprovacao.prototype.usuarioPodeAprovar = function(usuario, nivel) {
  const niveis = this.niveis || [];
  const nivelConfig = niveis.find(n => n.nivel === nivel);
  
  if (!nivelConfig) return false;
  
  // Validar perfil do usuário
  if (!PERFIS_VALIDOS.includes(usuario.perfil)) return false;
  
  if (nivelConfig.perfil === usuario.perfil) return true;
  
  // Verificar perfis alternativos
  if (nivelConfig.perfis_alternativos && 
      Array.isArray(nivelConfig.perfis_alternativos)) {
    return nivelConfig.perfis_alternativos.includes(usuario.perfil);
  }
  
  return false;
};

module.exports = FluxosAprovacao;