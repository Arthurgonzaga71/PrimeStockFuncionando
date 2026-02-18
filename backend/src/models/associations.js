// models/associations.js - CORRIGIDO COM ALIAS ÚNICOS
const Usuario = require('./Usuario');
const Categoria = require('./Categoria');
const Item = require('./Item');
const ModeloEquipamento = require('./ModeloEquipamento');
const Movimentacao = require('./Movimentacao');
const Manutencao = require('./Manutencao');
const AlertasEstoque = require('./AlertasEstoque');
const Notification = require('./Notification');
const AlertConfig = require('./AlertConfig');

// =============================================
// 1. USUÁRIOS
// =============================================
Usuario.belongsTo(Usuario, { 
  foreignKey: 'usuario_superior_id',
  as: 'Superior'
});
Usuario.hasMany(Usuario, {
  foreignKey: 'usuario_superior_id',
  as: 'Subordinados'
});

// =============================================
// 2. CATEGORIAS
// =============================================
Categoria.hasMany(Item, { 
  foreignKey: 'categoria_id',
  as: 'itens'
});
Categoria.hasMany(ModeloEquipamento, {
  foreignKey: 'categoria_id',
  as: 'modelosEquipamentos'  // Alias diferente
});

// =============================================
// 3. ITENS
// =============================================
Item.belongsTo(Categoria, { 
  foreignKey: 'categoria_id',
  as: 'categoria'  // Item usa 'categoria'
});
Item.belongsTo(Usuario, { 
  foreignKey: 'criado_por',
  as: 'criador'
});
Item.hasMany(Movimentacao, { 
  foreignKey: 'item_id',
  as: 'movimentacoes'
});
Item.hasMany(Manutencao, { 
  foreignKey: 'item_id',
  as: 'manutencoes'
});
Item.hasMany(AlertasEstoque, {
  foreignKey: 'item_id',
  as: 'alertas'
});

// =============================================
// 4. MODELOS DE EQUIPAMENTOS
// =============================================
ModeloEquipamento.belongsTo(Categoria, {
  foreignKey: 'categoria_id',
  as: 'categoriaModelo'  // ModeloEquipamento usa 'categoriaModelo' (alias diferente)
});

// =============================================
// 5. MOVIMENTAÇÕES
// =============================================
Movimentacao.belongsTo(Item, { 
  foreignKey: 'item_id',
  as: 'item'
});
Movimentacao.belongsTo(Usuario, { 
  foreignKey: 'usuario_id',
  as: 'usuario'
});
Usuario.hasMany(Movimentacao, { 
  foreignKey: 'usuario_id',
  as: 'movimentacoes'
});

// =============================================
// 6. MANUTENÇÕES
// =============================================
Manutencao.belongsTo(Item, { 
  foreignKey: 'item_id',
  as: 'item'
});
Manutencao.belongsTo(Usuario, { 
   foreignKey: 'usuario_id',
   as: 'tecnico' 
});
Usuario.hasMany(Manutencao, { 
  foreignKey: 'usuario_id',
  as: 'manutencoes'
});

// =============================================
// 7. ALERTAS DE ESTOQUE
// =============================================
AlertasEstoque.belongsTo(Item, {
  foreignKey: 'item_id',
  as: 'item'
});

// =============================================
// 8. NOTIFICAÇÕES
// =============================================
Notification.belongsTo(Usuario, {
  foreignKey: 'usuario_id',
  as: 'usuario'
});
Usuario.hasMany(Notification, {
  foreignKey: 'usuario_id',
  as: 'notifications'
});

// =============================================
// 9. CONFIGURAÇÕES DE ALERTAS
// =============================================
AlertConfig.belongsTo(Usuario, {
  foreignKey: 'usuario_id',
  as: 'usuario'
});
Usuario.hasMany(AlertConfig, {
  foreignKey: 'usuario_id',
  as: 'alert_configs'
});

// =============================================
// EXPORTAÇÃO COMPLETA
// =============================================
module.exports = {
  Usuario,
  Categoria,
  Item,
  ModeloEquipamento,
  Movimentacao,
  Manutencao,
  AlertasEstoque,
  Notification,
  AlertConfig
};