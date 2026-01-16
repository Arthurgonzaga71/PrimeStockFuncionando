// CORRIGIDO COMPLETAMENTE - solicitacaoRoutes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { sequelize } = require('../config/database');

// 🆕 POST /api/solicitacoes - Criar nova solicitação
router.post('/', auth, async (req, res) => {
    console.log('📝 Criando nova solicitação...');
    
    try {
        const allowedProfiles = ['admin', 'admin_estoque', 'tecnico', 'analista', 'coordenador', 'gerente', 'tecnico_manutencao'];
        if (!allowedProfiles.includes(req.user?.perfil)) {
            return res.status(403).json({
                success: false,
                error: 'Permissão negada. Perfil não autorizado'
            });
        }

        const {
            titulo,
            descricao = '',
            prioridade = 'media',
            tipo = 'equipamento',
            tipo_solicitacao = 'retirada_estoque',
            orcamento_estimado = null,
            fornecedor_sugerido = '',
            link_referencia = '',
            urgencia_compra = 'media',
            data_devolucao_prevista = null,
            itens = []
        } = req.body;

        console.log('📋 Dados recebidos:', { 
            titulo, 
            itens_count: itens?.length || 0, 
            user: req.user.id,
            user_perfil: req.user.perfil 
        });

        if (!titulo || !titulo.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Título é obrigatório'
            });
        }

        const ano = new Date().getFullYear();
        
        // Gerar código
        const [ultimaSolicitacao] = await sequelize.query(
            `SELECT id, codigo_solicitacao FROM solicitacoes 
             WHERE codigo_solicitacao LIKE ?
             ORDER BY id DESC LIMIT 1`,
            {
                replacements: [`SOL-${ano}-%`],
                type: sequelize.QueryTypes.SELECT
            }
        );
        
        let sequencia = 1;
        if (ultimaSolicitacao?.codigo_solicitacao) {
            const match = ultimaSolicitacao.codigo_solicitacao.match(/SOL-\d+-(\d+)/);
            if (match && match[1]) {
                sequencia = parseInt(match[1]) + 1;
            }
        }
        
        const codigo_solicitacao = `SOL-${ano}-${sequencia.toString().padStart(3, '0')}`;
        console.log('🔧 Código gerado:', codigo_solicitacao);
        
        // Inserir solicitação
        const [result] = await sequelize.query(
            `INSERT INTO solicitacoes (
                codigo_solicitacao,
                usuario_solicitante_id,
                titulo,
                descricao,
                prioridade,
                tipo,
                tipo_solicitacao,
                orcamento_estimado,
                fornecedor_sugerido,
                link_referencia,
                urgencia_compra,
                data_devolucao_prevista,
                status,
                nivel_aprovacao_atual,
                data_solicitacao
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            {
                replacements: [
                    codigo_solicitacao,
                    req.user.id,
                    titulo.trim(),
                    descricao.trim(),
                    prioridade,
                    tipo,
                    tipo_solicitacao,
                    orcamento_estimado || null,
                    fornecedor_sugerido || '',
                    link_referencia || '',
                    urgencia_compra,
                    data_devolucao_prevista || null,
                    'rascunho',
                    1
                ],
                type: sequelize.QueryTypes.INSERT
            }
        );

        const solicitacaoId = result;
        
        // Inserir itens
        if (itens && itens.length > 0) {
            for (const item of itens) {
                await sequelize.query(
                    `INSERT INTO solicitacao_itens (
                        solicitacao_id, 
                        nome_item, 
                        quantidade_solicitada, 
                        tipo_item,
                        motivo_uso,
                        valor_unitario_estimado,
                        fornecedor,
                        link_produto,
                        urgencia,
                        especificacoes_tecnicas,
                        especificacoes,
                        status_item
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    {
                        replacements: [
                            solicitacaoId,
                            item.nome_item || 'Item sem nome',
                            item.quantidade_solicitada || 1,
                            item.tipo_item || 'estoque',
                            item.motivo_uso || '',
                            item.valor_unitario_estimado || null,
                            item.fornecedor || '',
                            item.link_produto || '',
                            item.urgencia || 'normal',
                            JSON.stringify(item.especificacoes_tecnicas || {}),
                            JSON.stringify(item.especificacoes || {}),
                            'pendente'
                        ],
                        type: sequelize.QueryTypes.INSERT
                    }
                );
            }
            console.log('✅ Itens inseridos:', itens.length);
        }

        // Registrar histórico
        await sequelize.query(
            `INSERT INTO historico_solicitacoes (
                solicitacao_id, 
                usuario_id, 
                acao, 
                descricao,
                dados_alterados
            ) VALUES (?, ?, 'criacao', ?, ?)`,
            {
                replacements: [
                    solicitacaoId,
                    req.user.id,
                    `Solicitação "${titulo}" criada com ${itens?.length || 0} item(ns)`,
                    JSON.stringify({
                        titulo,
                        prioridade,
                        tipo,
                        tipo_solicitacao,
                        status: 'rascunho',
                        codigo: codigo_solicitacao
                    })
                ],
                type: sequelize.QueryTypes.INSERT
            }
        );

        console.log('🎉 Solicitação criada com SUCESSO! ID:', solicitacaoId);

        res.status(201).json({
            success: true,
            data: {
                id: solicitacaoId,
                codigo_solicitacao: codigo_solicitacao,
                titulo: titulo.trim(),
                status: 'rascunho',
                itens_count: itens?.length || 0,
                message: 'Solicitação criada com sucesso!'
            }
        });

    } catch (error) {
        console.error('❌ ERRO ao criar solicitação:', error.message);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor ao criar solicitação',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 📝 PUT /api/solicitacoes/:id - Atualizar solicitação
router.put('/:id', auth, async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const {
            titulo,
            descricao,
            prioridade,
            tipo,
            tipo_solicitacao,
            orcamento_estimado,
            fornecedor_sugerido,
            link_referencia,
            urgencia_compra,
            data_devolucao_prevista,
            itens = []
        } = req.body;

        console.log('✏️ Atualizando solicitação:', id);

        const [solicitacao] = await sequelize.query(
            `SELECT * FROM solicitacoes 
             WHERE id = ?`,
            {
               replacements: [id],
        // ⚠️ REMOVER transaction daqui - usar a transaction separadamente
        type: sequelize.QueryTypes.SELECT,
        transaction: transaction  // ✅ CORRETO: passar transaction como opção separada
               
            }
        );

        if (!solicitacao) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                error: 'Solicitação não encontrada'
            });
        }

        // Verificar se pode editar - APENAS rascunho
        if (solicitacao.status !== 'rascunho') {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                error: `Solicitação não pode ser editada no status: ${solicitacao.status}`
            });
        }

        if (solicitacao.usuario_solicitante_id !== req.user.id) {
            await transaction.rollback();
            return res.status(403).json({
                success: false,
                error: 'Você não tem permissão para editar esta solicitação'
            });
        }

        await sequelize.query(
            `UPDATE solicitacoes SET
                titulo = COALESCE(?, titulo),
                descricao = COALESCE(?, descricao),
                prioridade = COALESCE(?, prioridade),
                tipo = COALESCE(?, tipo),
                tipo_solicitacao = COALESCE(?, tipo_solicitacao),
                orcamento_estimado = COALESCE(?, orcamento_estimado),
                fornecedor_sugerido = COALESCE(?, fornecedor_sugerido),
                link_referencia = COALESCE(?, link_referencia),
                urgencia_compra = COALESCE(?, urgencia_compra),
                data_devolucao_prevista = COALESCE(?, data_devolucao_prevista),
                atualizado_em = NOW()
            WHERE id = ?`,
            {
                replacements: [
                    titulo,
                    descricao,
                    prioridade,
                    tipo,
                    tipo_solicitacao,
                    orcamento_estimado,
                    fornecedor_sugerido,
                    link_referencia,
                    urgencia_compra,
                    data_devolucao_prevista,
                    id
                ],
                transaction,
                type: sequelize.QueryTypes.UPDATE
            }
        );

        if (Array.isArray(itens)) {
            await sequelize.query(
                `DELETE FROM solicitacao_itens WHERE solicitacao_id = ?`,
                {
                    replacements: [id],
                    transaction,
                    type: sequelize.QueryTypes.DELETE
                }
            );

            for (const item of itens) {
                await sequelize.query(
                    `INSERT INTO solicitacao_itens (
                        solicitacao_id, 
                        item_id,
                        modelo_equipamento_id,
                        nome_item, 
                        quantidade_solicitada, 
                        tipo_item, 
                        valor_unitario_estimado, 
                        fornecedor, 
                        link_produto, 
                        motivo_uso, 
                        urgencia,
                        especificacoes_tecnicas,
                        especificacoes,
                        status_item
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente')`,
                    {
                        replacements: [
                            id,
                            item.item_id || null,
                            item.modelo_equipamento_id || null,
                            item.nome_item || 'Item sem nome',
                            item.quantidade_solicitada || 1,
                            item.tipo_item || 'estoque',
                            item.valor_unitario_estimado || null,
                            item.fornecedor || '',
                            item.link_produto || '',
                            item.motivo_uso || '',
                            item.urgencia || 'normal',
                            JSON.stringify(item.especificacoes_tecnicas || {}),
                            JSON.stringify(item.especificacoes || {})
                        ],
                        transaction,
                        type: sequelize.QueryTypes.INSERT
                    }
                );
            }
        }

        await sequelize.query(
            `INSERT INTO historico_solicitacoes (
                solicitacao_id, 
                usuario_id, 
                acao, 
                descricao,
                dados_alterados
            ) VALUES (?, ?, 'edicao', ?, ?)`,
            {
                replacements: [
                    id,
                    req.user.id,
                    `Solicitação atualizada`,
                    JSON.stringify({
                        titulo_anterior: solicitacao.titulo,
                        titulo_novo: titulo || solicitacao.titulo,
                        status: 'rascunho',
                        itens_count: itens?.length || 0
                    })
                ],
                transaction,
                type: sequelize.QueryTypes.INSERT
            }
        );

        await transaction.commit();

        console.log('✅ Solicitação atualizada:', id);

        res.json({
            success: true,
            data: {
                id: parseInt(id),
                message: 'Solicitação atualizada com sucesso'
            }
        });

    } catch (error) {
        await transaction.rollback();
        console.error('❌ Erro ao atualizar solicitação:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor ao atualizar solicitação'
        });
    }
});

// 📤 PUT /api/solicitacoes/:id/enviar - Enviar para aprovação (FLUXO SIMPLIFICADO)
// 📤 PUT /api/solicitacoes/:id/enviar - Enviar para aprovação (FLUXO SIMPLIFICADO)
// 📤 PUT /api/solicitacoes/:id/enviar - Enviar para aprovação (CORRIGIDO)
router.put('/:id/enviar', auth, async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        
        console.log('📤 [ENVIAR] Enviando solicitação ID:', id);
        console.log('👤 Usuário:', {
            id: req.user.id,
            nome: req.user.nome,
            perfil: req.user.perfil
        });

        // 1. Buscar a solicitação - VERIFIQUE A ESTRUTURA DA TABELA
        const [solicitacao] = await sequelize.query(
            `SELECT 
                id,
                codigo_solicitacao,
                titulo,
                descricao,
                status,
                usuario_solicitante_id,
                usuario_aprovador_id,
                data_solicitacao,
                atualizado_em
             FROM solicitacoes WHERE id = ?`,
            {
                replacements: [id],
                transaction,
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (!solicitacao) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                error: 'Solicitação não encontrada'
            });
        }

        // 2. Verificar status - APENAS rascunho pode ser enviado
        const statusAtual = solicitacao.status || '';
        const statusNormalizado = statusAtual.trim().toLowerCase();
        
        // ✅ ACEITAR status vazio como rascunho
        const isRascunho = statusNormalizado === 'rascunho' || statusNormalizado === '';
        
        if (!isRascunho) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                error: `Solicitação não pode ser enviada. Status atual: "${solicitacao.status || 'vazio'}"`,
                status_atual: solicitacao.status,
                esperado: 'rascunho'
            });
        }

        // 3. Verificar se é o solicitante
        if (solicitacao.usuario_solicitante_id !== req.user.id) {
            await transaction.rollback();
            return res.status(403).json({
                success: false,
                error: 'Apenas o solicitante pode enviar para aprovação'
            });
        }

        // 4. Verificar se tem itens
        const [itensResult] = await sequelize.query(
            `SELECT COUNT(*) as count FROM solicitacao_itens WHERE solicitacao_id = ?`,
            {
                replacements: [id],
                transaction,
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (itensResult.count === 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                error: 'Solicitação precisa ter pelo menos um item para enviar'
            });
        }

        // 5. Encontrar coordenador ou gerente para aprovação
        let aprovadorId = null;
        
        // Buscar coordenador
        const [coordenador] = await sequelize.query(
            `SELECT id FROM usuarios 
             WHERE perfil = 'coordenador' 
             AND ativo = TRUE 
             LIMIT 1`,
            {
                transaction,
                type: sequelize.QueryTypes.SELECT
            }
        );
        
        if (coordenador) {
            aprovadorId = coordenador.id;
        } else {
            // Se não tiver coordenador, buscar gerente
            const [gerente] = await sequelize.query(
                `SELECT id FROM usuarios 
                 WHERE perfil = 'gerente' 
                 AND ativo = TRUE 
                 LIMIT 1`,
                {
                    transaction,
                    type: sequelize.QueryTypes.SELECT
                }
            );
            
            if (gerente) {
                aprovadorId = gerente.id;
            }
        }

        console.log('👑 Aprovador encontrado:', aprovadorId);

        // 6. Atualizar para 'pendente' - CORRIGIDO
        await sequelize.query(
            `UPDATE solicitacoes SET 
                status = 'pendente',
                usuario_aprovador_id = ?,
                data_solicitacao = NOW(),
                atualizado_em = NOW()
             WHERE id = ?`,
            {
                replacements: [aprovadorId, id],
                transaction,
                type: sequelize.QueryTypes.UPDATE
            }
        );

        console.log('✅ Status atualizado: rascunho → pendente');

        // 7. Registrar histórico
        await sequelize.query(
            `INSERT INTO historico_solicitacoes (
                solicitacao_id, 
                usuario_id, 
                acao, 
                descricao,
                dados_alterados
            ) VALUES (?, ?, 'envio_aprovacao', ?, ?)`,
            {
                replacements: [
                    id,
                    req.user.id,
                    `Solicitação enviada para aprovação`,
                    JSON.stringify({ 
                        status_anterior: solicitacao.status || 'rascunho',
                        status_novo: 'pendente',
                        aprovador_id: aprovadorId,
                        observacoes: 'Enviada pelo solicitante'
                    })
                ],
                transaction,
                type: sequelize.QueryTypes.INSERT
            }
        );

        await transaction.commit();

        console.log('🎉 Solicitação ENVIADA com sucesso! ID:', id);

        res.json({
            success: true,
            data: {
                id: parseInt(id),
                status: 'pendente',
                message: 'Solicitação enviada para aprovação com sucesso!',
                fluxo: 'Técnico → Coordenador/Gerente (aprovador) → Estoque (entrega)'
            }
        });

    } catch (error) {
        await transaction.rollback();
        console.error('❌ ERRO CRÍTICO ao enviar:', error.message);
        console.error('Stack trace completo:', error.stack);
        
        res.status(500).json({
            success: false,
            error: 'Erro interno ao enviar solicitação',
            detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ✅ PUT /api/solicitacoes/:id/aprovar - Aprovar solicitação (FLUXO SIMPLIFICADO)
router.put('/:id/aprovar', auth, async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const { observacoes = '' } = req.body;
        
        console.log('✅ [APROVAR] Aprovando solicitação ID:', id);

        // 1. Verificar permissões
        const userProfile = req.user.perfil;
        const allowedProfiles = ['coordenador', 'gerente', 'admin', 'admin_estoque'];
        
        if (!allowedProfiles.includes(userProfile)) {
            await transaction.rollback();
            return res.status(403).json({
                success: false,
                error: 'Apenas coordenadores, gerentes ou administradores podem aprovar'
            });
        }

        // 2. Buscar solicitação COM STATUS 'pendente'
        const [solicitacao] = await sequelize.query(
            `SELECT * FROM solicitacoes 
             WHERE id = ? AND status = 'pendente'`,
            {
                replacements: [id],
                transaction,
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (!solicitacao) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                error: 'Solicitação não encontrada ou não está pendente de aprovação'
            });
        }

        // 3. Verificar se não é a própria solicitação
        if (solicitacao.usuario_solicitante_id === req.user.id) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                error: 'Você não pode aprovar sua própria solicitação'
            });
        }

        // 4. Atualizar para 'aprovada' (FLUXO SIMPLIFICADO: pendente → aprovada)
        await sequelize.query(
            `UPDATE solicitacoes SET 
                status = 'aprovada',
                usuario_aprovador_id = ?,
                data_aprovacao = NOW(),
                nivel_aprovacao_atual = nivel_aprovacao_atual + 1,
                atualizado_em = NOW()
             WHERE id = ?`,
            {
                replacements: [req.user.id, id],
                transaction,
                type: sequelize.QueryTypes.UPDATE
            }
        );

        // 5. Atualizar status dos itens para 'aprovado'
        await sequelize.query(
            `UPDATE solicitacao_itens SET 
                status_item = 'aprovado',
                quantidade_aprovada = quantidade_solicitada,
                observacao_aprovador = ?
             WHERE solicitacao_id = ?`,
            {
                replacements: [observacoes || 'Aprovado pelo coordenador/gerente', id],
                transaction,
                type: sequelize.QueryTypes.UPDATE
            }
        );

        // 6. Registrar histórico
        await sequelize.query(
            `INSERT INTO historico_solicitacoes (
                solicitacao_id, 
                usuario_id, 
                acao, 
                descricao,
                dados_alterados
            ) VALUES (?, ?, 'aprovacao', ?, ?)`,
            {
                replacements: [
                    id,
                    req.user.id,
                    `Solicitação aprovada por ${req.user.nome} (${userProfile})`,
                    JSON.stringify({ 
                        status_anterior: 'pendente',
                        status_novo: 'aprovada',
                        aprovador: req.user.nome,
                        perfil: userProfile,
                        observacoes: observacoes
                    })
                ],
                transaction,
                type: sequelize.QueryTypes.INSERT
            }
        );

        await transaction.commit();

        console.log('✅ Solicitação APROVADA:', {
            id,
            aprovador: req.user.nome,
            status_anterior: 'pendente',
            status_novo: 'aprovada'
        });

        res.json({
            success: true,
            data: {
                id: parseInt(id),
                status: 'aprovada',
                message: 'Solicitação aprovada com sucesso!',
                observacoes: 'Aguardando processamento no estoque',
                aprovador: {
                    id: req.user.id,
                    nome: req.user.nome,
                    perfil: userProfile
                }
            }
        });

    } catch (error) {
        await transaction.rollback();
        console.error('❌ Erro ao aprovar:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno ao aprovar solicitação'
        });
    }
});

// ❌ PUT /api/solicitacoes/:id/rejeitar - Rejeitar solicitação (FLUXO SIMPLIFICADO)
router.put('/:id/rejeitar', auth, async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const { motivo_rejeicao = '' } = req.body;
        
        console.log('❌ [REJEITAR] Rejeitando solicitação ID:', id);

        if (!motivo_rejeicao.trim()) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                error: 'Motivo da rejeição é obrigatório'
            });
        }

        const userProfile = req.user.perfil;
        const allowedProfiles = ['coordenador', 'gerente', 'admin', 'admin_estoque'];
        
        if (!allowedProfiles.includes(userProfile)) {
            await transaction.rollback();
            return res.status(403).json({
                success: false,
                error: 'Apenas coordenadores, gerentes ou administradores podem rejeitar'
            });
        }

        // Buscar solicitação COM STATUS 'pendente'
        const [solicitacao] = await sequelize.query(
            `SELECT * FROM solicitacoes 
             WHERE id = ? AND status = 'pendente'`,
            {
                replacements: [id],
                transaction,
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (!solicitacao) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                error: 'Solicitação não encontrada ou não está pendente de aprovação'
            });
        }

        // Não pode rejeitar própria solicitação
        if (solicitacao.usuario_solicitante_id === req.user.id) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                error: 'Você não pode rejeitar sua própria solicitação'
            });
        }

        // Atualizar status: 'pendente' → 'rejeitada'
        await sequelize.query(
            `UPDATE solicitacoes SET 
                status = 'rejeitada',
                usuario_aprovador_id = ?,
                motivo_rejeicao = ?,
                data_aprovacao = NOW(),
                atualizado_em = NOW()
             WHERE id = ?`,
            {
                replacements: [req.user.id, motivo_rejeicao, id],
                transaction,
                type: sequelize.QueryTypes.UPDATE
            }
        );

        // Atualizar status dos itens para 'rejeitado'
        await sequelize.query(
            `UPDATE solicitacao_itens SET 
                status_item = 'rejeitado',
                observacao_aprovador = ?
             WHERE solicitacao_id = ?`,
            {
                replacements: [`Rejeitado: ${motivo_rejeicao}`, id],
                transaction,
                type: sequelize.QueryTypes.UPDATE
            }
        );

        // Registrar histórico
        await sequelize.query(
            `INSERT INTO historico_solicitacoes (
                solicitacao_id, 
                usuario_id, 
                acao, 
                descricao,
                dados_alterados
            ) VALUES (?, ?, 'rejeicao', ?, ?)`,
            {
                replacements: [
                    id,
                    req.user.id,
                    `Solicitação rejeitada por ${req.user.nome} (${userProfile})`,
                    JSON.stringify({ 
                        status_anterior: 'pendente',
                        status_novo: 'rejeitada',
                        rejeitador: req.user.nome,
                        perfil: userProfile,
                        motivo_rejeicao: motivo_rejeicao
                    })
                ],
                transaction,
                type: sequelize.QueryTypes.INSERT
            }
        );

        await transaction.commit();

        console.log('✅ REJEITADA COM SUCESSO!', {
            id,
            rejeitador: req.user.nome,
            motivo: motivo_rejeicao
        });

        res.json({
            success: true,
            data: {
                id: parseInt(id),
                status: 'rejeitada',
                message: 'Solicitação rejeitada com sucesso',
                rejeitador: {
                    id: req.user.id,
                    nome: req.user.nome,
                    perfil: userProfile
                },
                motivo_rejeicao: motivo_rejeicao
            }
        });

    } catch (error) {
        await transaction.rollback();
        console.error('❌ Erro ao rejeitar:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno ao rejeitar solicitação'
        });
    }
});

// 📦 PUT /api/solicitacoes/:id/processar-estoque - Processar no estoque (APROVADA → ENTREGUE)
router.put('/:id/processar-estoque', auth, async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const { 
            observacoes_entrega = '',
            quantidade_entregue = null
        } = req.body;
        
        console.log('📦 [ESTOQUE] Processando solicitação ID:', id);

        // Verificar permissão
        if (!['admin', 'admin_estoque'].includes(req.user.perfil)) {
            await transaction.rollback();
            return res.status(403).json({
                success: false,
                error: 'Apenas administradores ou responsáveis pelo estoque podem processar solicitações'
            });
        }

        // Buscar solicitação COM STATUS 'aprovada'
        const [solicitacao] = await sequelize.query(
            `SELECT 
                s.*,
                u.nome as solicitante_nome,
                u_aprov.nome as aprovador_nome
             FROM solicitacoes s
             JOIN usuarios u ON s.usuario_solicitante_id = u.id
             LEFT JOIN usuarios u_aprov ON s.usuario_aprovador_id = u_aprov.id
             WHERE s.id = ? AND s.status = 'aprovada'`,
            {
                replacements: [id],
                transaction,
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (!solicitacao) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                error: 'Solicitação não encontrada ou não está aprovada para processamento no estoque'
            });
        }

        // Atualizar para 'entregue' (FLUXO: aprovada → entregue)
        await sequelize.query(
            `UPDATE solicitacoes SET 
                status = 'entregue',
                data_entrega = NOW(),
                observacoes_entrega = ?,
                atualizado_em = NOW()
             WHERE id = ?`,
            {
                replacements: [observacoes_entrega || 'Entregue pelo estoque', id],
                transaction,
                type: sequelize.QueryTypes.UPDATE
            }
        );

        // Atualizar quantidade entregue nos itens (opcional)
        if (quantidade_entregue && quantidade_entregue > 0) {
            await sequelize.query(
                `UPDATE solicitacao_itens 
                 SET quantidade_entregue = ?,
                     status_item = 'entregue'
                 WHERE solicitacao_id = ?`,
                {
                    replacements: [quantidade_entregue, id],
                    transaction,
                    type: sequelize.QueryTypes.UPDATE
                }
            );
        } else {
            // Se não especificar quantidade, usar a quantidade aprovada
            await sequelize.query(
                `UPDATE solicitacao_itens 
                 SET quantidade_entregue = quantidade_aprovada,
                     status_item = 'entregue'
                 WHERE solicitacao_id = ?`,
                {
                    replacements: [id],
                    transaction,
                    type: sequelize.QueryTypes.UPDATE
                }
            );
        }

        // Registrar histórico
        await sequelize.query(
            `INSERT INTO historico_solicitacoes (
                solicitacao_id, 
                usuario_id, 
                acao, 
                descricao,
                dados_alterados
            ) VALUES (?, ?, 'entrega', ?, ?)`,
            {
                replacements: [
                    id,
                    req.user.id,
                    `Solicitação entregue pelo estoque (${quantidade_entregue || 'todos'} itens)`,
                    JSON.stringify({ 
                        status_anterior: 'aprovada',
                        status_novo: 'entregue',
                        entregador: req.user.nome,
                        quantidade_entregue: quantidade_entregue || 'total',
                        observacoes: observacoes_entrega
                    })
                ],
                transaction,
                type: sequelize.QueryTypes.INSERT
            }
        );

        await transaction.commit();

        console.log('✅ [ESTOQUE] Solicitação entregue:', {
            id,
            status: 'aprovada → entregue',
            quantidade: quantidade_entregue || 'todos'
        });

        res.json({
            success: true,
            data: {
                id: parseInt(id),
                status: 'entregue',
                message: 'Solicitação entregue com sucesso!',
                entregador: {
                    id: req.user.id,
                    nome: req.user.nome,
                    perfil: req.user.perfil
                },
                quantidade_entregue: quantidade_entregue || 'todos os itens'
            }
        });

    } catch (error) {
        await transaction.rollback();
        console.error('❌ ERRO no estoque:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno ao processar no estoque'
        });
    }
});

// 🔍 GET /api/solicitacoes - Todas as solicitações
router.get('/', auth, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            status,
            prioridade,
            tipo,
            departamento,
            dataInicio,
            dataFim,
            usuario,
            sortBy = 'data_solicitacao',
            sortOrder = 'DESC'
        } = req.query;

        console.log('🔍 Buscando solicitações com filtros:', req.query);

        let whereConditions = ['1=1'];
        const replacements = {};

        if (search) {
            whereConditions.push(`(
                s.codigo_solicitacao LIKE :search OR 
                s.titulo LIKE :search OR 
                s.descricao LIKE :search OR
                u.nome LIKE :search
            )`);
            replacements.search = `%${search}%`;
        }

        if (status) {
            whereConditions.push('s.status = :status');
            replacements.status = status;
        }

        if (prioridade) {
            whereConditions.push('s.prioridade = :prioridade');
            replacements.prioridade = prioridade;
        }

        if (tipo) {
            whereConditions.push('s.tipo = :tipo');
            replacements.tipo = tipo;
        }

        if (departamento) {
            whereConditions.push('u.departamento = :departamento');
            replacements.departamento = departamento;
        }

        if (usuario) {
            whereConditions.push('s.usuario_solicitante_id = :usuario');
            replacements.usuario = usuario;
        }

        if (dataInicio) {
            whereConditions.push('s.data_solicitacao >= :dataInicio');
            replacements.dataInicio = dataInicio;
        }

        if (dataFim) {
            whereConditions.push('s.data_solicitacao <= :dataFim');
            replacements.dataFim = dataFim + ' 23:59:59';
        }

        const whereClause = whereConditions.join(' AND ');
        const offset = (page - 1) * limit;

        const solicitacoes = await sequelize.query(
            `SELECT 
                s.id,
                s.codigo_solicitacao,
                s.titulo,
                s.descricao,
                s.prioridade,
                s.tipo,
                s.status,
                s.data_solicitacao,
                s.tipo_solicitacao,
                s.orcamento_estimado,
                s.fornecedor_sugerido,
                u.nome as solicitante_nome,
                u.departamento,
                u.email as solicitante_email,
                u_aprov.nome as aprovador_nome,
                (SELECT COUNT(*) FROM solicitacao_itens si WHERE si.solicitacao_id = s.id) as total_itens,
                (SELECT SUM(si.quantidade_solicitada * COALESCE(si.valor_unitario_estimado, 0)) 
                 FROM solicitacao_itens si WHERE si.solicitacao_id = s.id) as valor_total_estimado
             FROM solicitacoes s
             JOIN usuarios u ON s.usuario_solicitante_id = u.id
             LEFT JOIN usuarios u_aprov ON s.usuario_aprovador_id = u_aprov.id
             WHERE ${whereClause}
             ORDER BY ${sortBy} ${sortOrder}
             LIMIT :limit OFFSET :offset`,
            {
                replacements: { ...replacements, limit: parseInt(limit), offset: parseInt(offset) },
                type: sequelize.QueryTypes.SELECT
            }
        );

        const [countResult] = await sequelize.query(
            `SELECT COUNT(*) as total
             FROM solicitacoes s
             JOIN usuarios u ON s.usuario_solicitante_id = u.id
             WHERE ${whereClause}`,
            {
                replacements,
                type: sequelize.QueryTypes.SELECT
            }
        );

        const total = countResult?.total || 0;

        console.log('✅ Solicitações encontradas:', solicitacoes?.length || 0);

        res.json({
            success: true,
            data: {
                solicitacoes: solicitacoes || [],
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    itemsPerPage: parseInt(limit)
                },
                filters: req.query
            }
        });

    } catch (error) {
        console.error('❌ Erro ao buscar solicitações:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno ao buscar solicitações'
        });
    }
});

// 📋 GET /api/solicitacoes/minhas - Minhas solicitações
router.get('/minhas', auth, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            status,
            prioridade,
            dataInicio,
            dataFim
        } = req.query;

        console.log('📦 Buscando minhas solicitações:', req.user.id);

        let whereConditions = ['s.usuario_solicitante_id = :userId'];
        const replacements = { userId: req.user.id };

        if (search) {
            whereConditions.push(`(
                s.codigo_solicitacao LIKE :search OR 
                s.titulo LIKE :search OR 
                s.descricao LIKE :search
            )`);
            replacements.search = `%${search}%`;
        }

        if (status) {
            whereConditions.push('s.status = :status');
            replacements.status = status;
        }

        if (prioridade) {
            whereConditions.push('s.prioridade = :prioridade');
            replacements.prioridade = prioridade;
        }

        if (dataInicio) {
            whereConditions.push('s.data_solicitacao >= :dataInicio');
            replacements.dataInicio = dataInicio;
        }

        if (dataFim) {
            whereConditions.push('s.data_solicitacao <= :dataFim');
            replacements.dataFim = dataFim + ' 23:59:59';
        }

        const whereClause = whereConditions.join(' AND ');
        const offset = (page - 1) * limit;

        const solicitacoes = await sequelize.query(
            `SELECT 
                s.id,
                s.codigo_solicitacao,
                s.titulo,
                s.descricao,
                s.prioridade,
                s.tipo,
                s.status,
                s.data_solicitacao,
                s.tipo_solicitacao,
                s.orcamento_estimado,
                s.fornecedor_sugerido,
                (SELECT COUNT(*) FROM solicitacao_itens si WHERE si.solicitacao_id = s.id) as total_itens,
                (SELECT MAX(data_acao) FROM historico_solicitacoes hs WHERE hs.solicitacao_id = s.id) as ultima_atualizacao
             FROM solicitacoes s
             WHERE ${whereClause}
             ORDER BY s.data_solicitacao DESC
             LIMIT :limit OFFSET :offset`,
            {
                replacements: { ...replacements, limit: parseInt(limit), offset: parseInt(offset) },
                type: sequelize.QueryTypes.SELECT
            }
        );

        const [countResult] = await sequelize.query(
            `SELECT COUNT(*) as total
             FROM solicitacoes s
             WHERE ${whereClause}`,
            {
                replacements,
                type: sequelize.QueryTypes.SELECT
            }
        );

        const total = countResult?.total || 0;

        console.log('✅ Minhas solicitações encontradas:', solicitacoes?.length || 0);

        res.json({
            success: true,
            data: {
                solicitacoes: solicitacoes || [],
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    itemsPerPage: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('❌ Erro ao buscar minhas solicitações:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno ao buscar minhas solicitações'
        });
    }
});

// 📋 GET /api/solicitacoes/pendentes - Solicitações pendentes de aprovação
// 📋 GET /api/solicitacoes/pendentes - Solicitações pendentes de aprovação (MELHORADA)
router.get('/pendentes', auth, async (req, res) => {
  try {
    const userProfile = req.user.perfil;
    const allowedProfiles = ['coordenador', 'gerente', 'admin', 'admin_estoque'];
    
    if (!allowedProfiles.includes(userProfile)) {
      return res.status(403).json({
        success: false,
        error: 'Apenas coordenadores, gerentes ou administradores podem ver pendentes'
      });
    }

    const { search } = req.query;
    const replacements = [];
    
    // BUSCAR APENAS STATUS 'pendente'
    let whereClause = `s.status = 'pendente'`;
    
    // Não mostrar solicitações próprias para aprovação
    whereClause += ` AND s.usuario_solicitante_id != ?`;
    replacements.push(req.user.id);

    if (search) {
      whereClause += ` AND (s.codigo_solicitacao LIKE ? OR s.titulo LIKE ? OR u.nome LIKE ?)`;
      const searchTerm = `%${search}%`;
      replacements.push(searchTerm, searchTerm, searchTerm);
    }

    console.log('🔍 [PENDENTES] Buscando para:', req.user.nome, 'Perfil:', userProfile);

    const solicitacoes = await sequelize.query(
      `SELECT 
          s.id,
          s.codigo_solicitacao,
          s.titulo,
          s.descricao,
          s.prioridade,
          s.tipo,
          s.status,
          s.data_solicitacao,
          u.nome as solicitante_nome,
          u.departamento,
          u.email as solicitante_email,
          u.perfil as solicitante_perfil,
          (SELECT COUNT(*) FROM solicitacao_itens si WHERE si.solicitacao_id = s.id) as total_itens,
          (SELECT SUM(si.quantidade_solicitada) FROM solicitacao_itens si WHERE si.solicitacao_id = s.id) as quantidade_total,
          (SELECT SUM(si.quantidade_solicitada * COALESCE(si.valor_unitario_estimado, 0)) 
           FROM solicitacao_itens si WHERE si.solicitacao_id = s.id) as valor_total_estimado,
          TIMESTAMPDIFF(HOUR, s.data_solicitacao, NOW()) as horas_pendente
       FROM solicitacoes s
       JOIN usuarios u ON s.usuario_solicitante_id = u.id
       WHERE ${whereClause}
       ORDER BY 
          CASE s.prioridade 
            WHEN 'urgente' THEN 1
            WHEN 'alta' THEN 2
            WHEN 'media' THEN 3
            WHEN 'baixa' THEN 4
            ELSE 5
          END,
          s.data_solicitacao ASC`,
      {
        replacements,
        type: sequelize.QueryTypes.SELECT
      }
    );

    console.log('✅ [PENDENTES] Solicitações encontradas:', solicitacoes?.length || 0);

    res.json({
      success: true,
      data: {
        solicitacoes: solicitacoes || [],
        count: solicitacoes?.length || 0,
        usuario: {
          id: req.user.id,
          nome: req.user.nome,
          perfil: userProfile,
          podeAprovar: true
        }
      }
    });

  } catch (error) {
    console.error('❌ [PENDENTES] Erro ao buscar pendentes:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno ao buscar pendentes'
    });
  }
});

// 📦 GET /api/solicitacoes/para-estoque - Solicitações para o estoque (após aprovação)
router.get('/para-estoque', auth, async (req, res) => {
    try {
        const userProfile = req.user.perfil;
        if (!['admin', 'admin_estoque'].includes(userProfile)) {
            return res.status(403).json({
                success: false,
                error: 'Apenas administradores ou responsáveis pelo estoque podem ver esta lista'
            });
        }

        const { search } = req.query;

        const replacements = [];
        let whereClause = `s.status = 'aprovada'`;

        if (search) {
            whereClause += ` AND (s.codigo_solicitacao LIKE ? OR s.titulo LIKE ? OR u.nome LIKE ?)`;
            const searchTerm = `%${search}%`;
            replacements.push(searchTerm, searchTerm, searchTerm);
        }

        const solicitacoes = await sequelize.query(
            `SELECT 
                s.id,
                s.codigo_solicitacao,
                s.titulo,
                s.prioridade,
                s.tipo,
                s.status,
                s.data_solicitacao,
                s.data_aprovacao,
                u.nome as solicitante_nome,
                u.departamento,
                u_aprov.nome as aprovador_nome,
                (SELECT COUNT(*) FROM solicitacao_itens si WHERE si.solicitacao_id = s.id) as total_itens,
                (SELECT SUM(si.quantidade_solicitada) FROM solicitacao_itens si WHERE si.solicitacao_id = s.id) as quantidade_total
             FROM solicitacoes s
             JOIN usuarios u ON s.usuario_solicitante_id = u.id
             LEFT JOIN usuarios u_aprov ON s.usuario_aprovador_id = u_aprov.id
             WHERE ${whereClause}
             ORDER BY s.data_aprovacao DESC`,
            {
                replacements,
                type: sequelize.QueryTypes.SELECT
            }
        );

        res.json({
            success: true,
            data: solicitacoes || [],
            count: solicitacoes?.length || 0
        });

    } catch (error) {
        console.error('❌ Erro ao buscar solicitações para estoque:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno ao buscar solicitações para estoque'
        });
    }
});

// 🔍 GET /api/solicitacoes/:id - Buscar solicitação detalhada
// 🔍 GET /api/solicitacoes/:id - Buscar solicitação detalhada COM BOTÕES
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('📄 [DETALHE] Buscando detalhes da solicitação ID:', id);

    const [solicitacao] = await sequelize.query(
      `SELECT 
          s.*,
          u_solicitante.nome as solicitante_nome,
          u_solicitante.departamento,
          u_solicitante.perfil as solicitante_perfil,
          u_aprovador.nome as aprovador_nome,
          u_aprovador.perfil as aprovador_perfil
       FROM solicitacoes s
       JOIN usuarios u_solicitante ON s.usuario_solicitante_id = u_solicitante.id
       LEFT JOIN usuarios u_aprovador ON s.usuario_aprovador_id = u_aprovador.id
       WHERE s.id = ?`,
      {
        replacements: [id],
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (!solicitacao) {
      return res.status(404).json({
        success: false,
        error: 'Solicitação não encontrada'
      });
    }

    // Normalizar status se estiver vazio
    if (!solicitacao.status || solicitacao.status.trim() === '') {
      solicitacao.status = 'rascunho';
    }

    // 🔥 CALCULAR BOTÕES DISPONÍVEIS PARA O USUÁRIO ATUAL
    const botoesDisponiveis = {
      podeEnviar: solicitacao.status === 'rascunho' && solicitacao.usuario_solicitante_id === req.user.id,
      podeAprovar: ['pendente'].includes(solicitacao.status) && 
                   ['coordenador', 'gerente', 'admin', 'admin_estoque'].includes(req.user.perfil) &&
                   solicitacao.usuario_solicitante_id !== req.user.id,
      podeRejeitar: ['pendente'].includes(solicitacao.status) && 
                    ['coordenador', 'gerente', 'admin', 'admin_estoque'].includes(req.user.perfil) &&
                    solicitacao.usuario_solicitante_id !== req.user.id,
      podeEditar: solicitacao.status === 'rascunho' && solicitacao.usuario_solicitante_id === req.user.id,
      podeCancelar: (solicitacao.usuario_solicitante_id === req.user.id && 
                     ['rascunho', 'pendente'].includes(solicitacao.status)) ||
                    ['admin', 'admin_estoque'].includes(req.user.perfil),
      podeProcessarEstoque: solicitacao.status === 'aprovada' && 
                           ['admin', 'admin_estoque'].includes(req.user.perfil),
      podeEntregar: solicitacao.status === 'aprovada' && 
                   ['admin', 'admin_estoque'].includes(req.user.perfil)
    };

    console.log('🔘 BOTÕES DISPONÍVEIS:', {
      status: solicitacao.status,
      perfil_usuario: req.user.perfil,
      botoes: botoesDisponiveis
    });

    // Buscar itens
    const itens = await sequelize.query(
      `SELECT 
          si.*,
          i.nome as item_estoque_nome,
          i.localizacao,
          i.quantidade as quantidade_disponivel,
          i.patrimonio,
          i.numero_serie,
          i.codigo_barras,
          c.nome as categoria_nome
       FROM solicitacao_itens si
       LEFT JOIN itens i ON si.item_id = i.id
       LEFT JOIN categorias c ON i.categoria_id = c.id
       WHERE si.solicitacao_id = ?
       ORDER BY si.id`,
      {
        replacements: [id],
        type: sequelize.QueryTypes.SELECT
      }
    );

    // Buscar histórico
    const historico = await sequelize.query(
      `SELECT 
          h.*,
          u.nome as usuario_nome,
          u.perfil as usuario_perfil
       FROM historico_solicitacoes h
       JOIN usuarios u ON h.usuario_id = u.id
       WHERE h.solicitacao_id = ?
       ORDER BY h.data_acao DESC`,
      {
        replacements: [id],
        type: sequelize.QueryTypes.SELECT
      }
    );

    // Calcular estatísticas
    const valorTotal = itens.reduce((total, item) => {
      const valor = parseFloat(item.valor_unitario_estimado) || 0;
      const quantidade = parseInt(item.quantidade_solicitada) || 0;
      return total + (valor * quantidade);
    }, 0);

    console.log('✅ [DETALHE] Detalhes carregados:', {
      id,
      titulo: solicitacao.titulo,
      status: solicitacao.status,
      itens_count: itens.length,
      valor_total: valorTotal,
      botoes: botoesDisponiveis
    });

    res.json({
      success: true,
      data: {
        ...solicitacao,
        itens: itens || [],
        historico: historico || [],
        botoes_disponiveis: botoesDisponiveis, // 🔥 ADICIONADO
        estatisticas: {
          total_itens: itens.length,
          valor_total_estimado: valorTotal,
          status: solicitacao.status,
          prioridade: solicitacao.prioridade,
          tipo_solicitacao: solicitacao.tipo_solicitacao
        }
      }
    });

  } catch (error) {
    console.error('❌ [DETALHE] Erro ao buscar detalhes:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno ao buscar detalhes'
    });
  }
});

// 🗑️ DELETE /api/solicitacoes/:id - Cancelar solicitação
router.delete('/:id', auth, async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const { motivo = '' } = req.body;
        
        console.log('🗑️ Cancelando solicitação:', id);

        const [solicitacao] = await sequelize.query(
            `SELECT * FROM solicitacoes 
             WHERE id = ?`,
            {
                replacements: [id],
                transaction,
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (!solicitacao) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                error: 'Solicitação não encontrada'
            });
        }

        const podeCancelar = 
            solicitacao.usuario_solicitante_id === req.user.id || 
            ['admin', 'admin_estoque'].includes(req.user.perfil);

        if (!podeCancelar) {
            await transaction.rollback();
            return res.status(403).json({
                success: false,
                error: 'Você não tem permissão para cancelar esta solicitação'
            });
        }

        // Status permitidos para cancelamento
        const statusPermitidos = ['rascunho', 'pendente'];
        if (!statusPermitidos.includes(solicitacao.status)) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                error: `Solicitação não pode ser cancelada no status "${solicitacao.status}"`
            });
        }

        await sequelize.query(
            `UPDATE solicitacoes SET 
                status = 'cancelada',
                motivo_rejeicao = COALESCE(?, motivo_rejeicao),
                atualizado_em = NOW()
             WHERE id = ?`,
            {
                replacements: [motivo || 'Cancelada pelo usuário', id],
                transaction,
                type: sequelize.QueryTypes.UPDATE
            }
        );

        await sequelize.query(
            `UPDATE solicitacao_itens SET 
                status_item = 'rejeitado'
             WHERE solicitacao_id = ?`,
            {
                replacements: [id],
                transaction,
                type: sequelize.QueryTypes.UPDATE
            }
        );

        await sequelize.query(
            `INSERT INTO historico_solicitacoes (
                solicitacao_id, 
                usuario_id, 
                acao, 
                descricao,
                dados_alterados
            ) VALUES (?, ?, 'cancelamento', ?, ?)`,
            {
                replacements: [
                    id,
                    req.user.id,
                    motivo ? `Solicitação cancelada: ${motivo}` : 'Solicitação cancelada',
                    JSON.stringify({ 
                        status_anterior: solicitacao.status,
                        status_novo: 'cancelada',
                        motivo_cancelamento: motivo
                    })
                ],
                transaction,
                type: sequelize.QueryTypes.INSERT
            }
        );

        await transaction.commit();

        console.log('✅ Solicitação cancelada:', id);

        res.json({
            success: true,
            data: {
                id: parseInt(id),
                status: 'cancelada',
                message: 'Solicitação cancelada com sucesso'
            }
        });

    } catch (error) {
        await transaction.rollback();
        console.error('❌ Erro ao cancelar solicitação:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno ao cancelar solicitação'
        });
    }
});

// 🐛 GET /api/solicitacoes/debug/status - DEBUG do sistema
router.get('/debug/status', auth, async (req, res) => {
    try {
        // Listar TODAS as solicitações com status
        const [solicitacoes] = await sequelize.query(
            `SELECT 
                s.id,
                s.codigo_solicitacao,
                s.titulo,
                s.status,
                s.data_solicitacao,
                u.nome as solicitante_nome,
                u.perfil as solicitante_perfil
             FROM solicitacoes s
             JOIN usuarios u ON s.usuario_solicitante_id = u.id
             ORDER BY s.id`,
            {
                type: sequelize.QueryTypes.SELECT
            }
        );

        // Contar por status
        const contagemStatus = {};
        solicitacoes?.forEach(sol => {
            const status = sol.status || '(NULL/Vazio)';
            contagemStatus[status] = (contagemStatus[status] || 0) + 1;
        });

        res.json({
            success: true,
            data: {
                total_solicitacoes: solicitacoes?.length || 0,
                contagem_status: contagemStatus,
                lista_completa: solicitacoes || []
            }
        });

    } catch (error) {
        console.error('❌ Erro no debug:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno no debug'
        });
    }
});

module.exports = router;