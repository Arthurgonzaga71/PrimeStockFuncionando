-- =============================================
-- CORREÇÕES COMPLETAS DO BANCO DE DADOS
-- =============================================

-- 🗃️ RECRIAR O BANCO DE FORMA LIMPA E CORRETA
DROP DATABASE IF EXISTS controle_estoque_ti;
CREATE DATABASE controle_estoque_ti;
USE controle_estoque_ti;

-- =============================================
-- TABELAS PRINCIPAIS COM CORREÇÕES
-- =============================================

-- 👥 TABELA DE USUÁRIOS - CORRIGIDA
CREATE TABLE usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    
    -- PERFIS REAIS DA EMPRESA - CORRIGIDO SEM 'admin_estoque'
    perfil ENUM('admin', 'tecnico_manutencao', 'coordenador', 'gerente', 'tecnico', 'analista', 'estagiario', 'aprendiz') DEFAULT 'tecnico',
    departamento VARCHAR(50),
    usuario_superior_id INT NULL,
    
    -- PERMISSÕES PRINCIPAIS - VALORES PADRÃO CORRETOS
    pode_consultar BOOLEAN DEFAULT TRUE,
    pode_solicitar BOOLEAN DEFAULT FALSE,
    pode_cadastrar BOOLEAN DEFAULT FALSE,
    pode_editar BOOLEAN DEFAULT FALSE,
    
    -- PERMISSÕES ESPECÍFICAS
    permissao_criar_solicitacao BOOLEAN DEFAULT FALSE,
    permissao_editar_propria BOOLEAN DEFAULT TRUE,
    permissao_aprovar_solicitacoes BOOLEAN DEFAULT FALSE,
    permissao_gerenciar_usuarios BOOLEAN DEFAULT FALSE,
    permissao_acesso_dashboard BOOLEAN DEFAULT FALSE,
    permissao_relatorios_completos BOOLEAN DEFAULT FALSE,
    permissao_liberar_equipe BOOLEAN DEFAULT FALSE,
    
    -- CONTROLES DE ESTOQUE
    responsavel_estoque BOOLEAN DEFAULT FALSE,
    acesso_historico_completo BOOLEAN DEFAULT FALSE,
    receber_alertas_estoque BOOLEAN DEFAULT FALSE,
    
    -- LIMITES OPERACIONAIS
    max_itens_solicitacao INT DEFAULT 5,
    valor_max_solicitacao DECIMAL(10,2) DEFAULT 1000.00,
    prazo_max_devolucao INT DEFAULT 30,
    
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (usuario_superior_id) REFERENCES usuarios(id)
);

-- 📦 CATEGORIAS DE EQUIPAMENTOS
CREATE TABLE categorias (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(50) NOT NULL UNIQUE,
    descricao TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 🔧 MODELOS DE EQUIPAMENTOS
CREATE TABLE modelos_equipamentos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome_modelo VARCHAR(100) NOT NULL,
    fabricante VARCHAR(100),
    categoria_id INT,
    especificacoes_padrao JSON,
    codigos_conhecidos JSON,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

-- 🔧 TABELA PRINCIPAL DE ITENS/EQUIPAMENTOS
CREATE TABLE itens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    numero_serie VARCHAR(100) UNIQUE,
    patrimonio VARCHAR(50) UNIQUE,
    codigo_barras VARCHAR(100) UNIQUE,
    
    categoria_id INT NOT NULL,
    localizacao VARCHAR(100),
    
    -- Status do item
    status ENUM('disponivel', 'em_uso', 'manutencao', 'descarte', 'reservado') DEFAULT 'disponivel',
    estado ENUM('novo', 'usado', 'danificado', 'irrecuperavel') DEFAULT 'novo',
    
    -- Informações de aquisição
    data_aquisicao DATE,
    valor_compra DECIMAL(10,2),
    fornecedor VARCHAR(100),
    nota_fiscal VARCHAR(100),
    
    -- Campos técnicos
    especificacoes JSON,
    qr_code VARCHAR(255),
    foto VARCHAR(255),
    
    -- Controles
    quantidade INT DEFAULT 1,
    estoque_minimo INT DEFAULT 0,
    
    criado_por INT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (categoria_id) REFERENCES categorias(id),
    FOREIGN KEY (criado_por) REFERENCES usuarios(id)
);

-- 📋 HISTÓRICO DE MOVIMENTAÇÕES
CREATE TABLE movimentacoes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    item_id INT NOT NULL,
    usuario_id INT NOT NULL,
    
    tipo ENUM('entrada', 'saida', 'devolucao', 'ajuste', 'transferencia') NOT NULL,
    quantidade INT NOT NULL,
    
    -- Para saídas: quem recebeu o item
    destinatario VARCHAR(100),
    departamento_destino VARCHAR(50),
    data_devolucao_prevista DATE,
    
    -- Controles
    data_movimentacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observacao TEXT,
    
    FOREIGN KEY (item_id) REFERENCES itens(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- 🔧 REGISTRO DE MANUTENÇÕES
CREATE TABLE manutencoes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    item_id INT NOT NULL,
    usuario_id INT NOT NULL,
    
    tipo_manutencao ENUM('preventiva', 'corretiva', 'instalacao') NOT NULL,
    descricao_problema TEXT,
    descricao_solucao TEXT,
    
    -- Datas importantes
    data_abertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_conclusao TIMESTAMP NULL,
    
    -- Custos
    custo_manutencao DECIMAL(10,2),
    fornecedor_manutencao VARCHAR(100),
    
    status ENUM('aberta', 'em_andamento', 'concluida', 'cancelada') DEFAULT 'aberta',
    
    FOREIGN KEY (item_id) REFERENCES itens(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- 📝 TABELA DE SOLICITAÇÕES COM FLUXOS AVANÇADOS - CORRIGIDA
CREATE TABLE solicitacoes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    codigo_solicitacao VARCHAR(20) UNIQUE NOT NULL,
    usuario_solicitante_id INT NOT NULL,
    usuario_aprovador_id INT NULL,
    
    -- Dados da Solicitação
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    prioridade ENUM('baixa', 'media', 'alta', 'urgente') DEFAULT 'media',
    tipo ENUM('equipamento', 'material', 'software', 'manutencao') DEFAULT 'equipamento',
    
    -- Tipo de solicitação e orçamento
    tipo_solicitacao ENUM('retirada_estoque', 'compra_novo') DEFAULT 'retirada_estoque',
    orcamento_estimado DECIMAL(10,2) DEFAULT NULL,
    fornecedor_sugerido VARCHAR(100) DEFAULT NULL,
    link_referencia VARCHAR(255) DEFAULT NULL,
    urgencia_compra ENUM('baixa', 'media', 'alta', 'imediata') DEFAULT 'media',
    
    -- Fluxo de Aprovação - CORRIGIDO COM VALORES VÁLIDOS
    status ENUM(
        'rascunho', 
        'pendente', 
        'em_analise', 
        'aprovada', 
        'rejeitada', 
        'entregue', 
        'devolvida', 
        'cancelada'
    ) DEFAULT 'rascunho',
    
    -- Controle de fluxo hierárquico
    nivel_aprovacao_atual INT DEFAULT 1,
    fluxo_aprovacao JSON,
    
    -- Datas do Fluxo
    data_solicitacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_aprovacao TIMESTAMP NULL,
    data_entrega TIMESTAMP NULL,
    data_devolucao_prevista DATE NULL,
    data_devolucao_efetiva TIMESTAMP NULL,
    
    -- Controles
    motivo_rejeicao TEXT,
    observacoes_entrega TEXT,
    
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (usuario_solicitante_id) REFERENCES usuarios(id),
    FOREIGN KEY (usuario_aprovador_id) REFERENCES usuarios(id)
);

-- 📦 TABELA DE ITENS SOLICITADOS COM CONTROLE AVANÇADO - CORRIGIDA
CREATE TABLE solicitacao_itens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    solicitacao_id INT NOT NULL,
    item_id INT NULL,
    modelo_equipamento_id INT NULL,
    
    -- Dados do Item Solicitado
    nome_item VARCHAR(255) NOT NULL,
    quantidade_solicitada INT NOT NULL,
    quantidade_aprovada INT DEFAULT 0,
    quantidade_entregue INT DEFAULT 0,
    
    -- Controle para compras
    tipo_item ENUM('estoque', 'novo') DEFAULT 'estoque',
    valor_unitario_estimado DECIMAL(10,2) DEFAULT NULL,
    fornecedor VARCHAR(100) DEFAULT NULL,
    link_produto VARCHAR(255) DEFAULT NULL,
    especificacoes_tecnicas JSON,
    
    -- Especificações
    especificacoes JSON,
    motivo_uso TEXT,
    urgencia ENUM('normal', 'urgente', 'critico') DEFAULT 'normal',
    
    -- Controles de Aprovação - CORRIGIDO
    status_item ENUM('pendente', 'aprovado', 'rejeitado', 'entregue', 'devolvido') DEFAULT 'pendente',
    observacao_aprovador TEXT,
    
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES itens(id),
    FOREIGN KEY (modelo_equipamento_id) REFERENCES modelos_equipamentos(id)
);

-- 🔄 HISTÓRICO DE SOLICITAÇÕES
CREATE TABLE historico_solicitacoes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    solicitacao_id INT NOT NULL,
    usuario_id INT NOT NULL,
    acao ENUM(
        'criacao', 
        'edicao', 
        'envio_aprovacao', 
        'aprovacao', 
        'rejeicao', 
        'entrega', 
        'devolucao',
        'cancelamento'
    ) NOT NULL,
    descricao TEXT NOT NULL,
    dados_alterados JSON,
    data_acao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- 📝 TABELA DE HISTÓRICO (AUDITORIA)
CREATE TABLE historico_alteracoes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tabela_afetada VARCHAR(50) NOT NULL,
    registro_id INT NOT NULL,
    acao ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    valores_antigos JSON,
    valores_novos JSON,
    usuario_id INT,
    data_alteracao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- 🔔 TABELA DE CONFIGURAÇÕES E ALERTAS
CREATE TABLE configuracoes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    chave VARCHAR(50) UNIQUE NOT NULL,
    valor TEXT,
    descricao TEXT,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 🔴 TABELA DE ALERTAS DE ESTOQUE BAIXO
CREATE TABLE alertas_estoque (
    id INT PRIMARY KEY AUTO_INCREMENT,
    item_id INT NOT NULL,
    nivel_alerta ENUM('baixo', 'critico', 'zero') NOT NULL,
    quantidade_atual INT NOT NULL,
    estoque_minimo INT NOT NULL,
    mensagem TEXT NOT NULL,
    lido BOOLEAN DEFAULT FALSE,
    data_alerta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_leitura TIMESTAMP NULL,
    
    FOREIGN KEY (item_id) REFERENCES itens(id) ON DELETE CASCADE
);

-- 🎯 TABELA DE FLUXOS DE APROVAÇÃO - CORRIGIDA
CREATE TABLE fluxos_aprovacao (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    condicoes JSON,
    niveis JSON NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- ÍNDICES PARA OTIMIZAÇÃO
-- =============================================

-- Índices para ITENS
CREATE INDEX idx_itens_categoria ON itens(categoria_id);
CREATE INDEX idx_itens_status ON itens(status);
CREATE INDEX idx_itens_estado ON itens(estado);
CREATE INDEX idx_itens_patrimonio ON itens(patrimonio);
CREATE INDEX idx_itens_numero_serie ON itens(numero_serie);
CREATE INDEX idx_itens_localizacao ON itens(localizacao);
CREATE INDEX idx_itens_quantidade ON itens(quantidade);
CREATE INDEX idx_itens_codigo_barras ON itens(codigo_barras);

-- Índices para MOVIMENTACOES
CREATE INDEX idx_movimentacoes_item ON movimentacoes(item_id);
CREATE INDEX idx_movimentacoes_usuario ON movimentacoes(usuario_id);
CREATE INDEX idx_movimentacoes_data ON movimentacoes(data_movimentacao);
CREATE INDEX idx_movimentacoes_tipo ON movimentacoes(tipo);

-- Índices para MANUTENCOES
CREATE INDEX idx_manutencoes_item ON manutencoes(item_id);
CREATE INDEX idx_manutencoes_status ON manutencoes(status);
CREATE INDEX idx_manutencoes_data_abertura ON manutencoes(data_abertura);

-- Índices para USUARIOS
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_perfil ON usuarios(perfil);
CREATE INDEX idx_usuarios_departamento ON usuarios(departamento);
CREATE INDEX idx_usuarios_superior ON usuarios(usuario_superior_id);

-- Índices para SOLICITAÇÕES
CREATE INDEX idx_solicitacao_status ON solicitacoes(status);
CREATE INDEX idx_solicitacao_data ON solicitacoes(data_solicitacao);
CREATE INDEX idx_solicitacao_usuario ON solicitacoes(usuario_solicitante_id);
CREATE INDEX idx_solicitacao_codigo ON solicitacoes(codigo_solicitacao);
CREATE INDEX idx_solicitacao_tipo ON solicitacoes(tipo_solicitacao);

-- Índices para SOLICITACAO_ITENS
CREATE INDEX idx_solicitacao_item ON solicitacao_itens(solicitacao_id);
CREATE INDEX idx_item_status ON solicitacao_itens(status_item);
CREATE INDEX idx_tipo_item ON solicitacao_itens(tipo_item);

-- Índices para ALERTAS
CREATE INDEX idx_alertas_item ON alertas_estoque(item_id);
CREATE INDEX idx_alertas_lido ON alertas_estoque(lido);
CREATE INDEX idx_alertas_data ON alertas_estoque(data_alerta);
CREATE INDEX idx_alertas_nivel ON alertas_estoque(nivel_alerta);

-- =============================================
-- DADOS INICIAIS CORRETOS
-- =============================================

-- 👥 USUÁRIOS PADRÃO CORRETOS (senha: 123456)
INSERT INTO usuarios (nome, email, senha, perfil, departamento, usuario_superior_id, 
    pode_consultar, pode_solicitar, pode_cadastrar, pode_editar,
    permissao_criar_solicitacao, permissao_editar_propria, permissao_aprovar_solicitacoes,
    permissao_gerenciar_usuarios, permissao_acesso_dashboard, permissao_relatorios_completos,
    permissao_liberar_equipe, responsavel_estoque, acesso_historico_completo, receber_alertas_estoque,
    max_itens_solicitacao, valor_max_solicitacao, prazo_max_devolucao) VALUES
    
-- 1. ADMIN GERAL - RESPONSÁVEL PELO ESTOQUE E APROVAÇÕES
('Administrador Sistema', 'admin@empresa.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
 'admin', 'TI', NULL, 
 TRUE, TRUE, TRUE, TRUE, 
 TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, 50, 10000.00, 90),
 
-- 2. TÉCNICO DE MANUTENÇÃO - ACESSO COMPLETO OPERACIONAL
('Técnico Manutenção João', 'joao.manutencao@empresa.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
 'tecnico_manutencao', 'MANUTENÇÃO', 1, 
 TRUE, TRUE, TRUE, TRUE,
 TRUE, TRUE, FALSE, FALSE, TRUE, TRUE, FALSE, FALSE, TRUE, TRUE, 20, 3000.00, 60),
 
-- 3. COORDENADOR TI - PODE APROVAR SOLICITAÇÕES
('Coordenador TI', 'coordenador.ti@empresa.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
 'coordenador', 'TI', 1,
 TRUE, TRUE, TRUE, TRUE,
 TRUE, TRUE, TRUE, FALSE, TRUE, FALSE, TRUE, FALSE, TRUE, TRUE, 20, 2000.00, 60),
 
-- 4. GERENTE TI - PODE APROVAR SOLICITAÇÕES
('Gerente TI', 'gerente.ti@empresa.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
 'gerente', 'TI', 1,
 TRUE, TRUE, FALSE, FALSE,
 TRUE, TRUE, TRUE, FALSE, TRUE, FALSE, TRUE, FALSE, TRUE, TRUE, 20, 2000.00, 60),
 
-- 5. TÉCNICOS - ACESSO OPERACIONAL BÁSICO
('Técnico Pedro Silva', 'pedro.ti@empresa.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
 'tecnico', 'TI', 3,
 TRUE, TRUE, TRUE, TRUE,
 TRUE, TRUE, FALSE, FALSE, TRUE, FALSE, FALSE, FALSE, TRUE, TRUE, 15, 1500.00, 45),
 
('Técnica Maria Santos', 'maria.ti@empresa.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
 'tecnico', 'TI', 4,
 TRUE, TRUE, TRUE, TRUE,
 TRUE, TRUE, FALSE, FALSE, TRUE, FALSE, FALSE, FALSE, TRUE, TRUE, 15, 1500.00, 45),
 
-- 6. ANALISTA - PODE SOLICITAR E CONSULTAR
('Analista Carlos Costa', 'carlos.ti@empresa.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
 'analista', 'TI', 3,
 TRUE, TRUE, FALSE, FALSE,
 TRUE, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, 8, 800.00, 30),
 
-- 7. ESTAGIÁRIO - SÓ CONSULTA
('Estagiário Ana Oliveira', 'ana.estag@empresa.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
 'estagiario', 'TI', 3,
 TRUE, FALSE, FALSE, FALSE,
 TRUE, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, 3, 300.00, 15),
 
-- 8. APRENDIZ - SÓ CONSULTA
('Aprendiz Lucas Rodrigues', 'lucas.aprendiz@empresa.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
 'aprendiz', 'TI', 4,
 TRUE, FALSE, FALSE, FALSE,
 TRUE, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, 3, 200.00, 15);

-- 📦 CATEGORIAS
INSERT INTO categorias (nome, descricao) VALUES
('Notebooks', 'Laptops e notebooks corporativos'),
('Periféricos', 'Teclados, mouses, monitores, impressoras'),
('Rede e Conectividade', 'Roteadores, switches, cabos de rede, access points'),
('Hardware', 'Memórias, HDs, SSDs, processadores, fontes'),
('Software', 'Licenças e aplicativos'),
('Cabos e Adaptadores', 'Cabos diversos e adaptadores'),
('Telefonia', 'Telefones IP e headsets'),
('Segurança', 'NO-breaks, estabilizadores, racks'),
('Componentes', 'Peças e componentes avulsos');

-- 🔧 MODELOS DE EQUIPAMENTOS
INSERT INTO modelos_equipamentos (nome_modelo, fabricante, categoria_id, codigos_conhecidos) VALUES
('MikroTik Router hAP ac3', 'MikroTik', 3, '["3b0602749372", "3b060232a806", "3b0602"]'),
('MikroTik Router RB4011', 'MikroTik', 3, '["3b0603", "3b0604"]'),
('MikroTik Switch CRS326', 'MikroTik', 3, '["3b0605", "3b0606"]'),
('Dell Latitude 5420', 'Dell', 1, '["DL5420", "LAT5420"]'),
('Lenovo ThinkPad T14', 'Lenovo', 1, '["T14", "THINKPADT14"]');

-- 🔧 ITENS DE EXEMPLO
INSERT INTO itens (nome, descricao, categoria_id, numero_serie, patrimonio, codigo_barras, status, estado, quantidade, estoque_minimo, valor_compra, data_aquisicao, fornecedor, criado_por) VALUES
('Notebook Dell Latitude 5420', 'Intel i5 10ª geração, 8GB RAM, 256GB SSD, Tela 14"', 1, 'DL5420XYZ123', 'PAT-IT-001', '7891234567890', 'disponivel', 'novo', 3, 1, 4200.00, '2024-01-15', 'Dell Brasil', 1),
('Mouse Logitech M170 Wireless', 'Mouse wireless preto, 1000DPI, bateria incluída', 2, 'ML170ABC456', 'PAT-IT-002', '7891234567891', 'disponivel', 'novo', 25, 10, 45.90, '2024-02-10', 'Logitech', 1),
('Cabo de Rede CAT6 2m Azul', 'Cabo de rede CAT6 azul 2 metros, blindado', 3, NULL, NULL, '7891234567892', 'disponivel', 'novo', 50, 15, 12.50, '2024-01-20', 'Fornecedor Cabos', 1),
('Licença Windows 10 Pro', 'Licença volume license para 1 máquina', 5, 'WIN10-VL-789', NULL, '7891234567893', 'disponivel', 'novo', 12, 5, 299.00, '2024-01-05', 'Microsoft', 1),
('Monitor Samsung 24" FHD', 'Monitor LED 24 polegadas, Full HD, HDMI/VGA', 2, 'SM24FHD555', 'PAT-IT-005', '7891234567894', 'em_uso', 'usado', 1, 0, 899.00, '2023-11-20', 'Samsung', 1),
('Switch TP-Link 8 Portas', 'Switch Gigabit 8 portas, desktop', 3, 'TPLINK888', 'PAT-IT-006', '7891234567895', 'disponivel', 'novo', 2, 1, 150.00, '2024-02-01', 'TP-Link', 1),
('Notebook Lenovo ThinkPad', 'Intel i7, 16GB RAM, 512GB SSD, em manutenção', 1, 'LEN789THINK', 'PAT-IT-007', '7891234567896', 'manutencao', 'usado', 1, 0, 5800.00, '2023-09-10', 'Lenovo', 1),
('Teclado Microsoft sem fio', 'Teclado wireless, layout ABNT2, bateria incluída', 2, 'MSWIRELESS222', NULL, '7891234567897', 'disponivel', 'novo', 8, 3, 129.90, '2024-02-15', 'Microsoft', 1),
('SSD Kingston 480GB', 'SSD SATA 480GB, 2.5", para upgrades', 4, 'KSSD480333', NULL, '7891234567898', 'disponivel', 'novo', 6, 2, 199.00, '2024-01-25', 'Kingston', 1),
('NO-break SMS 600VA', 'Estabilizador 600VA, 4 tomadas, proteção', 8, 'SMS600VA444', 'PAT-IT-010', '7891234567899', 'disponivel', 'novo', 4, 1, 280.00, '2024-02-05', 'SMS', 1),
('Cabo HDMI 1.8m', 'Cabo HDMI high speed 1.8 metros, dourado', 6, NULL, NULL, '7891234567900', 'disponivel', 'novo', 2, 5, 25.00, '2024-02-10', 'Fornecedor Cabos', 1),
('Adaptador USB-C para HDMI', 'Adaptador USB-C para HDMI 4K', 6, 'USBCHDMI777', NULL, '7891234567901', 'disponivel', 'novo', 1, 3, 89.90, '2024-02-12', 'Fornecedor Acessórios', 1),
('Memória RAM 8GB DDR4', 'Memória RAM 8GB DDR4 2666MHz', 4, 'RAM8GBDDR4888', NULL, '7891234567902', 'disponivel', 'novo', 0, 2, 189.00, '2024-01-30', 'Kingston', 1);

-- 📋 MOVIMENTAÇÕES
INSERT INTO movimentacoes (item_id, usuario_id, tipo, quantidade, destinatario, departamento_destino, observacao) VALUES
(5, 3, 'saida', 1, 'Carlos Silva', 'Financeiro', 'Entrega para novo colaborador'),
(1, 4, 'saida', 1, 'Ana Oliveira', 'Marketing', 'Equipamento para home office'),
(8, 3, 'saida', 2, 'Setor Atendimento', 'Atendimento', 'Reposição de teclados danificados'),
(6, 5, 'saida', 1, 'Roberto Santos', 'TI', 'Instalação na sala de servidores'),
(11, 3, 'saida', 3, 'Departamento Vendas', 'Vendas', 'Cabos para novas estações');

-- 🔧 MANUTENÇÕES
INSERT INTO manutencoes (item_id, usuario_id, tipo_manutencao, descricao_problema, descricao_solucao, status, data_abertura) VALUES
(7, 2, 'corretiva', 'Não liga - possível problema na fonte', 'Troca da fonte de alimentação realizada', 'concluida', '2024-02-18 09:30:00'),
(5, 2, 'preventiva', 'Limpeza interna e atualização de drivers', 'Limpeza completa e drivers atualizados', 'concluida', '2024-02-20 14:15:00'),
(1, 2, 'corretiva', 'Tecla espaço não funciona', 'Aguardando peça para troca do teclado', 'em_andamento', '2024-02-22 10:00:00');

-- 🎯 FLUXOS DE APROVAÇÃO CORRETOS
INSERT INTO fluxos_aprovacao (nome, descricao, condicoes, niveis, ativo) VALUES
('Fluxo Simples', 'Para solicitações até R$ 1.000', '{"valor_maximo": 1000}', 
 '[{"nivel": 1, "perfil": "coordenador", "descricao": "Aprovação do Coordenador"}]', TRUE),
 
('Fluxo Completo', 'Para solicitações acima de R$ 1.000', '{"valor_minimo": 1000.01, "valor_maximo": 5000}',
 '[{"nivel": 1, "perfil": "coordenador", "descricao": "Aprovação do Coordenador"},
   {"nivel": 2, "perfil": "gerente", "descricao": "Aprovação do Gerente"}]', TRUE),
 
('Fluxo Crítico', 'Para solicitações acima de R$ 5.000', '{"valor_minimo": 5000.01}',
 '[{"nivel": 1, "perfil": "coordenador", "descricao": "Aprovação do Coordenador"},
   {"nivel": 2, "perfil": "gerente", "descricao": "Aprovação do Gerente"},
   {"nivel": 3, "perfil": "admin", "descricao": "Aprovação do Administrador"}]', TRUE),
 
('Fluxo Emergencial', 'Para situações críticas', '{"emergencia": true}',
 '[{"nivel": 1, "perfil": "admin", "descricao": "Aprovação Direta do Admin"}]', TRUE);

-- 🔔 CONFIGURAÇÕES
INSERT INTO configuracoes (chave, valor, descricao) VALUES
('EMAIL_NOTIFICACOES', 'true', 'Habilitar notificações por email'),
('ESTOQUE_MINIMO_ALERTA', 'true', 'Alertar quando item atingir estoque mínimo'),
('DIAS_DEVOLUCAO', '15', 'Prazo padrão para devolução de equipamentos'),
('EMPRESA_NOME', 'Sua Empresa LTDA', 'Nome da empresa para relatórios'),
('ALERTA_ESTOQUE_BAIXO', 'true', 'Habilitar alertas quando estoque estiver baixo'),
('NIVEL_ALERTA_BAIXO', '5', 'Quantidade para alerta de estoque baixo'),
('NIVEL_ALERTA_CRITICO', '2', 'Quantidade para alerta de estoque crítico'),
('EMAIL_ALERTAS_ESTOQUE', 'admin@empresa.com', 'Emails para receber alertas de estoque'),
('SOLICITACOES_ATIVAS', 'true', 'Habilitar sistema de solicitações'),
('APROVACAO_OBRIGATORIA', 'true', 'Solicitações exigem aprovação do gestor'),
('PRAZO_APROVACAO', '48', 'Prazo em horas para aprovação de solicitações'),
('EMAIL_SOLICITACOES', 'true', 'Enviar emails para novas solicitações'),
('LIMITE_ITENS_POR_SOLICITACAO', '10', 'Número máximo de itens por solicitação'),
('FLUXO_APROVACAO_ATIVO', 'true', 'Habilitar fluxos de aprovação hierárquicos'),
('VALOR_FLUXO_SIMPLES', '1000', 'Valor máximo para fluxo simples'),
('VALOR_FLUXO_COMPLETO', '5000', 'Valor máximo para fluxo completo');

-- 🔴 ALERTAS
INSERT INTO alertas_estoque (item_id, nivel_alerta, quantidade_atual, estoque_minimo, mensagem) VALUES
(11, 'baixo', 2, 5, 'Cabo HDMI 1.8m está com estoque baixo. Quantidade atual: 2, Mínimo: 5'),
(12, 'critico', 1, 3, 'Adaptador USB-C para HDMI está com estoque crítico. Quantidade atual: 1, Mínimo: 3'),
(13, 'zero', 0, 2, 'Memória RAM 8GB DDR4 está com estoque ZERO. Quantidade atual: 0, Mínimo: 2');

-- =============================================
-- STORED PROCEDURES CORRETAS
-- =============================================

DELIMITER //

-- PROCEDURE PARA GERAR CÓDIGO DE SOLICITAÇÃO
CREATE PROCEDURE GerarCodigoSolicitacao(OUT codigo VARCHAR(20))
BEGIN
    DECLARE ano VARCHAR(4);
    DECLARE sequencia INT;
    
    SET ano = YEAR(CURDATE());
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(codigo_solicitacao, 9) AS UNSIGNED)), 0) + 1 
    INTO sequencia
    FROM solicitacoes 
    WHERE codigo_solicitacao LIKE CONCAT('SOL-', ano, '-%');
    
    SET codigo = CONCAT('SOL-', ano, '-', LPAD(sequencia, 3, '0'));
END//

-- PROCEDURE PARA VERIFICAR ALERTAS DE ESTOQUE
CREATE PROCEDURE VerificarAlertasEstoque()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE item_id INT;
    DECLARE item_nome VARCHAR(100);
    DECLARE item_quantidade INT;
    DECLARE item_estoque_minimo INT;
    DECLARE alerta_existente INT;
    
    DECLARE cur_itens CURSOR FOR 
    SELECT i.id, i.nome, i.quantidade, i.estoque_minimo
    FROM itens i
    WHERE i.quantidade <= i.estoque_minimo 
    AND i.quantidade >= 0;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur_itens;
    
    read_loop: LOOP
        FETCH cur_itens INTO item_id, item_nome, item_quantidade, item_estoque_minimo;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        SET @nivel_alerta = CASE
            WHEN item_quantidade = 0 THEN 'zero'
            WHEN item_quantidade <= 2 THEN 'critico'
            ELSE 'baixo'
        END;
        
        SELECT COUNT(*) INTO alerta_existente 
        FROM alertas_estoque 
        WHERE item_id = item_id 
        AND lido = FALSE 
        AND nivel_alerta = @nivel_alerta;
        
        IF alerta_existente = 0 THEN
            INSERT INTO alertas_estoque (item_id, nivel_alerta, quantidade_atual, estoque_minimo, mensagem)
            VALUES (
                item_id, 
                @nivel_alerta, 
                item_quantidade, 
                item_estoque_minimo,
                CONCAT(
                    item_nome, 
                    ' está com estoque ', 
                    CASE @nivel_alerta 
                        WHEN 'zero' THEN 'ZERO' 
                        WHEN 'critico' THEN 'crítico' 
                        ELSE 'baixo' 
                    END,
                    '. Quantidade atual: ', 
                    item_quantidade, 
                    ', Mínimo: ', 
                    item_estoque_minimo
                )
            );
        END IF;
    END LOOP;
    
    CLOSE cur_itens;
END//

-- PROCEDURE PARA DETERMINAR FLUXO DE APROVAÇÃO
CREATE PROCEDURE DeterminarFluxoAprovacao(IN valor_total DECIMAL(10,2), OUT fluxo_id INT)
BEGIN
    IF valor_total <= 1000 THEN
        SELECT id INTO fluxo_id FROM fluxos_aprovacao WHERE nome = 'Fluxo Simples' AND ativo = TRUE LIMIT 1;
    ELSEIF valor_total <= 5000 THEN
        SELECT id INTO fluxo_id FROM fluxos_aprovacao WHERE nome = 'Fluxo Completo' AND ativo = TRUE LIMIT 1;
    ELSE
        SELECT id INTO fluxo_id FROM fluxos_aprovacao WHERE nome = 'Fluxo Crítico' AND ativo = TRUE LIMIT 1;
    END IF;
END//

DELIMITER ;

-- =============================================
-- TRIGGERS CORRETOS
-- =============================================

DELIMITER //

-- TRIGGER PARA CRIAR CÓDIGO DE SOLICITAÇÃO
CREATE TRIGGER before_solicitacao_insert
BEFORE INSERT ON solicitacoes
FOR EACH ROW
BEGIN
    IF NEW.codigo_solicitacao IS NULL THEN
        CALL GerarCodigoSolicitacao(NEW.codigo_solicitacao);
    END IF;
END//

-- TRIGGER PARA ATUALIZAR ESTOQUE APÓS MOVIMENTAÇÃO
CREATE TRIGGER after_movimentacao_insert
AFTER INSERT ON movimentacoes
FOR EACH ROW
BEGIN
    IF NEW.tipo = 'entrada' THEN
        UPDATE itens SET quantidade = quantidade + NEW.quantidade WHERE id = NEW.item_id;
    ELSEIF NEW.tipo IN ('saida', 'devolucao') THEN
        UPDATE itens SET quantidade = quantidade - NEW.quantidade WHERE id = NEW.item_id;
    END IF;
    
    CALL VerificarAlertasEstoque();
END//

DELIMITER ;

-- =============================================
-- INSERIR SOLICITAÇÕES CORRETAMENTE APÓS OS TRIGGERS
-- =============================================

-- 📝 SOLICITAÇÕES (usando trigger para gerar código)
INSERT INTO solicitacoes (usuario_solicitante_id, titulo, descricao, prioridade, tipo, tipo_solicitacao, orcamento_estimado, status) VALUES
(5, 'Equipamento para novo colaborador', 'Solicito equipamento para novo analista do departamento comercial', 'alta', 'equipamento', 'retirada_estoque', NULL, 'pendente'),
(6, 'Reposição de cabos HDMI', 'Necessário cabos HDMI para as novas telas de apresentação', 'media', 'material', 'compra_novo', 125.00, 'pendente'),
(7, 'Notebook para visita técnica', 'Equipamento para apresentações em visitas a clientes', 'alta', 'equipamento', 'compra_novo', 3500.00, 'rascunho');

-- 📦 ITENS DAS SOLICITAÇÕES
INSERT INTO solicitacao_itens (solicitacao_id, item_id, nome_item, quantidade_solicitada, tipo_item, valor_unitario_estimado, motivo_uso, urgencia) VALUES
(1, 1, 'Notebook Dell Latitude 5420', 1, 'estoque', NULL, 'Para novo colaborador do comercial', 'urgente'),
(1, 8, 'Teclado Microsoft sem fio', 1, 'estoque', NULL, 'Kit teclado/mouse para nova estação', 'normal'),
(2, NULL, 'Cabo HDMI 2m', 5, 'novo', 25.00, 'Para salas de reunião e telas de apresentação', 'normal'),
(3, NULL, 'Notebook para apresentações', 1, 'novo', 3500.00, 'Visitas técnicas e demonstrações', 'urgente');

-- =============================================
-- CONSULTAS DE VERIFICAÇÃO
-- =============================================

-- VERIFICAR USUÁRIOS
SELECT 
    id, nome, email, perfil,
    pode_consultar, pode_solicitar, pode_cadastrar, pode_editar,
    permissao_aprovar_solicitacoes, responsavel_estoque
FROM usuarios 
ORDER BY perfil, nome;

-- VERIFICAR SOLICITAÇÕES
SELECT 
    id, 
    codigo_solicitacao, 
    titulo, 
    status,
    tipo_solicitacao,
    orcamento_estimado
FROM solicitacoes 
ORDER BY data_solicitacao DESC;

-- VERIFICAR ITENS
SELECT 
    id, 
    nome, 
    categoria_id,
    status, 
    quantidade, 
    estoque_minimo
FROM itens 
ORDER BY quantidade ASC;

-- VERIFICAR FLUXOS
SELECT 
    id, 
    nome, 
    descricao,
    ativo
FROM fluxos_aprovacao 
ORDER BY id;

-- =============================================
-- RELATÓRIO DE PERMISSÕES
-- =============================================

/*
PERFIL              | CONSULTAR | SOLICITAR | CADASTRAR | EDITAR | APROVAR | GERENCIAR ESTOQUE
-------------------|-----------|-----------|-----------|--------|---------|------------------
admin              |    SIM    |    SIM    |    SIM    |  SIM   |   SIM   |       SIM
tecnico_manutencao |    SIM    |    SIM    |    SIM    |  SIM   |   NÃO   |       NÃO
coordenador        |    SIM    |    SIM    |    SIM    |  SIM   |   SIM   |       NÃO
gerente            |    SIM    |    SIM    |    NÃO    |  NÃO   |   SIM   |       NÃO
tecnico            |    SIM    |    SIM    |    SIM    |  SIM   |   NÃO   |       NÃO
analista           |    SIM    |    SIM    |    NÃO    |  NÃO   |   NÃO   |       NÃO
estagiario         |    SIM    |    NÃO    |    NÃO    |  NÃO   |   NÃO   |       NÃO
aprendiz           |    SIM    |    NÃO    |    NÃO    |  NÃO   |   NÃO   |       NÃO
*/

-- =============================================
-- PROCEDURES ADICIONAIS PARA APOIO
-- =============================================

DELIMITER //

-- PROCEDURE PARA BUSCAR APROVADOR DISPONÍVEL
CREATE PROCEDURE BuscarAprovadorDisponivel(OUT p_aprovador_id INT)
BEGIN
    -- Tenta encontrar coordenador ativo primeiro
    SELECT id INTO p_aprovador_id
    FROM usuarios 
    WHERE perfil = 'coordenador' 
    AND ativo = TRUE
    LIMIT 1;
    
    -- Se não encontrar, busca gerente
    IF p_aprovador_id IS NULL THEN
        SELECT id INTO p_aprovador_id
        FROM usuarios 
        WHERE perfil = 'gerente' 
        AND ativo = TRUE
        LIMIT 1;
    END IF;
    
    -- Se ainda não encontrar, usa admin como fallback
    IF p_aprovador_id IS NULL THEN
        SELECT id INTO p_aprovador_id
        FROM usuarios 
        WHERE perfil = 'admin' 
        AND ativo = TRUE
        LIMIT 1;
    END IF;
END//

-- PROCEDURE PARA ATUALIZAR STATUS DA SOLICITAÇÃO
CREATE PROCEDURE AtualizarStatusSolicitacao(
    IN p_solicitacao_id INT,
    IN p_novo_status VARCHAR(20),
    IN p_usuario_id INT,
    IN p_observacao TEXT
)
BEGIN
    DECLARE old_status VARCHAR(20);
    
    -- Obtém o status atual
    SELECT status INTO old_status
    FROM solicitacoes 
    WHERE id = p_solicitacao_id;
    
    -- Atualiza o status
    UPDATE solicitacoes 
    SET status = p_novo_status,
        atualizado_em = CURRENT_TIMESTAMP,
        usuario_aprovador_id = IF(p_novo_status = 'aprovada', p_usuario_id, usuario_aprovador_id),
        data_aprovacao = IF(p_novo_status = 'aprovada', CURRENT_TIMESTAMP, data_aprovacao)
    WHERE id = p_solicitacao_id;
    
    -- Registra no histórico
    INSERT INTO historico_solicitacoes (solicitacao_id, usuario_id, acao, descricao)
    VALUES (
        p_solicitacao_id, 
        p_usuario_id, 
        CASE p_novo_status 
            WHEN 'aprovada' THEN 'aprovacao'
            WHEN 'rejeitada' THEN 'rejeicao'
            ELSE 'edicao'
        END,
        CONCAT('Status alterado de ', old_status, ' para ', p_novo_status, 
               IF(p_observacao IS NOT NULL, CONCAT('. Observação: ', p_observacao), ''))
    );
END//

DELIMITER ;

-- =============================================
-- TESTES FINAIS
-- =============================================

-- TESTAR TRIGGER DE CÓDIGO DE SOLICITAÇÃO
INSERT INTO solicitacoes (usuario_solicitante_id, titulo, descricao, status) 
VALUES (5, 'Teste Trigger', 'Testando geração automática de código', 'rascunho');

SELECT * FROM solicitacoes WHERE titulo = 'Teste Trigger';

-- TESTAR TRIGGER DE MOVIMENTAÇÃO
INSERT INTO movimentacoes (item_id, usuario_id, tipo, quantidade, observacao)
VALUES (2, 3, 'saida', 5, 'Teste de trigger de estoque');

SELECT id, nome, quantidade FROM itens WHERE id = 2;

-- =============================================
-- FIM DO SCRIPT CORRIGIDO
-- =============================================