// routes/manutencoesRoutes.js - VERSÃO CORRIGIDA COMPLETAMENTE
const express = require('express');
const { Manutencao, Item, Usuario } = require('../models/associations');
const { auth } = require('../middleware/auth');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

const router = express.Router();

// 🆕 SISTEMA DE PERMISSÕES POR ROTA
const permissoesRotas = {
  // 🔍 CONSULTAR - Todos podem ver manutenções
  consultar: (req, res, next) => {
    const perfil = req.usuario?.perfil;
    
    if (['admin', 'admin_estoque', 'coordenador', 'gerente', 'tecnico', 'analista', 'estagiario', 'aprendiz'].includes(perfil)) {
      return next();
    }
    
    res.status(403).json({ 
      success: false, 
      message: 'Permissão para consultar manutenções negada' 
    });
  },
  
  // ✏️ CRIAR MANUTENÇÃO
  criar: (req, res, next) => {
    const perfil = req.usuario?.perfil;
    
    if (['admin', 'admin_estoque', 'coordenador', 'gerente', 'tecnico', 'analista'].includes(perfil)) {
      return next();
    }
    
    res.status(403).json({ 
      success: false, 
      message: 'Permissão para criar manutenções negada',
      perfil_atual: perfil
    });
  },
  
  // 🔄 EDITAR
  editar: (req, res, next) => {
    const perfil = req.usuario?.perfil;
    
    if (['admin', 'admin_estoque', 'coordenador', 'gerente', 'tecnico', 'analista'].includes(perfil)) {
      return next();
    }
    
    res.status(403).json({ 
      success: false, 
      message: 'Permissão para editar manutenções negada' 
    });
  },
  
  // 🗑️ DELETAR - Apenas Admin
  deletar: (req, res, next) => {
    if (req.usuario?.perfil === 'admin') {
      return next();
    }
    res.status(403).json({ 
      success: false, 
      message: 'Apenas administradores podem deletar manutenções' 
    });
  },
  
  // 📊 RELATÓRIOS
  relatorios: (req, res, next) => {
    const perfil = req.usuario?.perfil;
    
    if (['admin', 'admin_estoque', 'coordenador', 'gerente'].includes(perfil)) {
      return next();
    }
    
    res.status(403).json({ 
      success: false, 
      message: 'Permissão para relatórios negada' 
    });
  }
};

// =============================================
// 🔍 ROTAS DE CONSULTA
// =============================================

// GET /api/manutencoes - Listar todas as manutenções
router.get('/', 
  auth, 
  permissoesRotas.consultar,
  async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 20, 
        status, 
        tipo_manutencao, 
        item_id, 
        data_inicio, 
        data_fim 
      } = req.query;
      
      const offset = (page - 1) * limit;
      const where = {};
      
      // FILTROS
      if (status) where.status = status;
      if (tipo_manutencao) where.tipo_manutencao = tipo_manutencao;
      if (item_id && !isNaN(parseInt(item_id))) where.item_id = parseInt(item_id);
      
      if (data_inicio && data_fim) {
        where.data_abertura = {
          [Op.between]: [new Date(data_inicio), new Date(data_fim + ' 23:59:59')]
        };
      }
      
      const { count, rows: manutencoes } = await Manutencao.findAndCountAll({
        where,
        include: [
          { 
            model: Item, 
            as: 'item',
            attributes: ['id', 'nome', 'patrimonio', 'numero_serie', 'status']
          },
          { 
            model: Usuario, 
            as: 'tecnico',  // ✅ ALIAS ÚNICO: tecnico
            attributes: ['id', 'nome', 'email', 'perfil']
          }
        ],
        order: [['data_abertura', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: manutencoes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('Erro ao buscar manutenções:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar manutenções'
      });
    }
});

// GET /api/manutencoes/:id - Buscar manutenção por ID
router.get('/:id', 
  auth, 
  permissoesRotas.consultar,
  async (req, res) => {
    try {
      const manutencaoId = parseInt(req.params.id);
      
      if (isNaN(manutencaoId) || manutencaoId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }

      const manutencao = await Manutencao.findByPk(manutencaoId, {
        include: [
          { 
            model: Item, 
            as: 'item',
            attributes: ['id', 'nome', 'patrimonio', 'numero_serie', 'status']
          },
          { 
            model: Usuario, 
            as: 'tecnico',  // ✅ ALIAS ÚNICO: tecnico
            attributes: ['id', 'nome', 'email', 'perfil']
          }
        ]
      });
      
      if (!manutencao) {
        return res.status(404).json({
          success: false,
          message: 'Manutenção não encontrada'
        });
      }

      res.json({
        success: true,
        data: manutencao
      });
    } catch (error) {
      console.error('Erro ao buscar manutenção:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar manutenção'
      });
    }
});

// =============================================
// ✏️ ROTAS DE CRIAÇÃO
// =============================================

// POST /api/manutencoes - Criar nova manutenção
router.post('/', 
  auth, 
  permissoesRotas.criar,
  async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const { 
        item_id, 
        tipo_manutencao, 
        descricao_problema, 
        descricao_solucao, 
        custo_manutencao, 
        fornecedor_manutencao,
        status = 'aberta'
      } = req.body;

      // VALIDAÇÕES
      if (!item_id || isNaN(parseInt(item_id))) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Item ID inválido'
        });
      }

      if (!tipo_manutencao || !['preventiva', 'corretiva', 'instalacao'].includes(tipo_manutencao)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Tipo de manutenção inválido'
        });
      }

      if (!descricao_problema || !descricao_problema.trim()) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Descrição do problema é obrigatória'
        });
      }

      // Buscar item
      const itemId = parseInt(item_id);
      const item = await Item.findByPk(itemId, { transaction });
      
      if (!item) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Item não encontrado'
        });
      }

      // Criar manutenção
      const manutencao = await Manutencao.create({
        item_id: itemId,
        usuario_id: req.usuario.id,
        tipo_manutencao,
        descricao_problema: descricao_problema.trim(),
        descricao_solucao: descricao_solucao?.trim() || null,
        custo_manutencao: custo_manutencao ? parseFloat(custo_manutencao) : null,
        fornecedor_manutencao: fornecedor_manutencao?.trim() || null,
        status,
        data_abertura: new Date()
      }, { transaction });

      // Atualizar status do item
      await item.update({ 
        status: 'manutencao'
      }, { transaction });

      await transaction.commit();

      // Buscar completa com todos os relacionamentos
      const manutencaoCompleta = await Manutencao.findByPk(manutencao.id, {
        include: [
          { 
            model: Item, 
            as: 'item',
            attributes: ['id', 'nome', 'patrimonio', 'numero_serie', 'status']
          },
          { 
            model: Usuario, 
            as: 'tecnico',  // ✅ ALIAS ÚNICO: tecnico
            attributes: ['id', 'nome', 'email', 'perfil']
          }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Manutenção registrada com sucesso!',
        data: manutencaoCompleta
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao criar manutenção:', error);
      
      let errorMessage = 'Erro ao registrar manutenção';
      if (error.name === 'SequelizeValidationError') {
        errorMessage = 'Erro de validação nos dados';
      }
      
      res.status(400).json({
        success: false,
        message: errorMessage,
        error: error.message
      });
    }
});

// =============================================
// 🔄 ROTAS DE EDIÇÃO
// =============================================

// PUT /api/manutencoes/:id - Atualizar manutenção
router.put('/:id', 
  auth, 
  permissoesRotas.editar,
  async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const manutencaoId = parseInt(req.params.id);
      
      if (isNaN(manutencaoId) || manutencaoId <= 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }

      const manutencao = await Manutencao.findByPk(manutencaoId, { transaction });
      
      if (!manutencao) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Manutenção não encontrada'
        });
      }
      
      // VERIFICAR SE PODE EDITAR
      if (req.usuario.perfil !== 'admin' && 
          !['coordenador', 'gerente', 'admin_estoque'].includes(req.usuario.perfil) &&
          manutencao.usuario_id !== req.usuario.id) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'Você só pode editar suas próprias manutenções'
        });
      }

      const updateData = {};
      
      // ATUALIZAÇÃO COM VALIDAÇÃO
      if (req.body.tipo_manutencao !== undefined) {
        if (!['preventiva', 'corretiva', 'instalacao'].includes(req.body.tipo_manutencao)) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'Tipo de manutenção inválido'
          });
        }
        updateData.tipo_manutencao = req.body.tipo_manutencao;
      }
      
      if (req.body.descricao_problema !== undefined) {
        updateData.descricao_problema = req.body.descricao_problema.trim();
      }
      
      if (req.body.descricao_solucao !== undefined) {
        updateData.descricao_solucao = req.body.descricao_solucao?.trim() || null;
      }
      
      if (req.body.custo_manutencao !== undefined) {
        const custo = parseFloat(req.body.custo_manutencao);
        if (!isNaN(custo) && custo >= 0) {
          updateData.custo_manutencao = custo;
        }
      }
      
      if (req.body.fornecedor_manutencao !== undefined) {
        updateData.fornecedor_manutencao = req.body.fornecedor_manutencao?.trim() || null;
      }
      
      if (req.body.status !== undefined) {
        if (!['aberta', 'em_andamento', 'concluida', 'cancelada'].includes(req.body.status)) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'Status inválido'
          });
        }
        updateData.status = req.body.status;
      }
      
      if (req.body.data_conclusao !== undefined) {
        updateData.data_conclusao = req.body.data_conclusao ? new Date(req.body.data_conclusao) : null;
      }

      // Se concluída ou cancelada, liberar item
      if ((req.body.status === 'concluida' || req.body.status === 'cancelada') && 
          manutencao.status !== req.body.status) {
        const item = await Item.findByPk(manutencao.item_id, { transaction });
        if (item) {
          await item.update({ status: 'disponivel' }, { transaction });
        }
        
        if (req.body.status === 'concluida' && !updateData.data_conclusao) {
          updateData.data_conclusao = new Date();
        }
      }

      await manutencao.update(updateData, { transaction });
      await transaction.commit();

      const manutencaoAtualizada = await Manutencao.findByPk(manutencao.id, {
        include: [
          { 
            model: Item, 
            as: 'item',
            attributes: ['id', 'nome', 'patrimonio', 'numero_serie', 'status']
          },
          { 
            model: Usuario, 
            as: 'tecnico',  // ✅ ALIAS ÚNICO: tecnico
            attributes: ['id', 'nome', 'email', 'perfil']
          }
        ]
      });

      res.json({
        success: true,
        message: 'Manutenção atualizada com sucesso!',
        data: manutencaoAtualizada
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao atualizar manutenção:', error);
      res.status(400).json({
        success: false,
        message: 'Erro ao atualizar manutenção',
        error: error.message
      });
    }
});

// =============================================
// 🗑️ ROTAS DE EXCLUSÃO
// =============================================

// DELETE /api/manutencoes/:id - Deletar manutenção
router.delete('/:id', 
  auth, 
  permissoesRotas.deletar,
  async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const manutencaoId = parseInt(req.params.id);
      
      if (isNaN(manutencaoId) || manutencaoId <= 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }

      const manutencao = await Manutencao.findByPk(manutencaoId, { transaction });
      
      if (!manutencao) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Manutenção não encontrada'
        });
      }

      // Liberar item
      const item = await Item.findByPk(manutencao.item_id, { transaction });
      if (item) {
        await item.update({ status: 'disponivel' }, { transaction });
      }

      await manutencao.destroy({ transaction });
      await transaction.commit();
      
      res.json({
        success: true,
        message: 'Manutenção deletada com sucesso!'
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao deletar manutenção:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao deletar manutenção',
        error: error.message
      });
    }
});

// =============================================
// 📊 ROTAS DE RELATÓRIOS E DASHBOARD
// =============================================

// GET /api/manutencoes/relatorio/estatisticas - Relatórios
router.get('/relatorio/estatisticas', 
  auth, 
  permissoesRotas.relatorios,
  async (req, res) => {
    try {
      const { data_inicio, data_fim } = req.query;
      
      const where = {};
      if (data_inicio && data_fim) {
        where.data_abertura = {
          [Op.between]: [new Date(data_inicio), new Date(data_fim + ' 23:59:59')]
        };
      }

      const estatisticas = await Manutencao.findAll({
        where,
        attributes: [
          'tipo_manutencao',
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
          [sequelize.fn('SUM', sequelize.col('custo_manutencao')), 'custo_total']
        ],
        group: ['tipo_manutencao', 'status'],
        raw: true
      });

      res.json({
        success: true,
        data: {
          estatisticas
        }
      });
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao gerar relatório'
      });
    }
});

// GET /api/manutencoes/dashboard/resumo - Dashboard
router.get('/dashboard/resumo', 
  auth, 
  permissoesRotas.consultar,
  async (req, res) => {
    try {
      const hoje = new Date();
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      
      const [
        totalAbertas,
        totalConcluidasMes,
        totalCanceladas,
        custoTotalMes
      ] = await Promise.all([
        Manutencao.count({ where: { status: 'aberta' } }),
        Manutencao.count({ 
          where: { 
            status: 'concluida',
            data_conclusao: {
              [Op.between]: [primeiroDiaMes, hoje]
            }
          } 
        }),
        Manutencao.count({ where: { status: 'cancelada' } }),
        Manutencao.sum('custo_manutencao', {
          where: {
            data_abertura: {
              [Op.between]: [primeiroDiaMes, hoje]
            }
          }
        })
      ]);

      res.json({
        success: true,
        data: {
          abertas: totalAbertas,
          concluidas_mes: totalConcluidasMes,
          canceladas: totalCanceladas,
          custo_total_mes: custoTotalMes || 0
        }
      });
    } catch (error) {
      console.error('Erro no dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Erro no dashboard'
      });
    }
});

module.exports = router;