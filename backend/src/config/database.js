const { Sequelize } = require('sequelize');

// 🔥 DETECÇÃO AUTOMÁTICA DE AMBIENTE
const isDocker = process.env.DB_HOST === 'mysql';

// Configuração do banco
const sequelize = new Sequelize(
  process.env.DB_NAME || 'controle_estoque_ti',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || (isDocker ? 'mysql' : '127.0.0.1'),
    dialect: 'mysql',
    logging: false,
    port: process.env.DB_PORT || 3306,
    timezone: '-03:00'
  }
);

// Testar conexão
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ CONEXÃO COM BANCO DE DADOS ESTABELECIDA!');
    console.log('📊 Banco:', process.env.DB_NAME || 'controle_estoque_ti');
    console.log('🎯 Host:', sequelize.config.host);
    console.log('👤 Usuário:', sequelize.config.username);
    return true;
  } catch (error) {
    console.error('❌ ERRO AO CONECTAR NO BANCO:', error.message);
    console.log('🔧 Dica: Verifique se o MySQL está rodando em:', sequelize.config.host);
    return false;
  }
};

// Sincronizar modelos
const syncModels = async () => {
  try {
    await sequelize.sync({ force: false });
    console.log('✅ MODELOS SINCRONIZADOS COM O BANCO!');
    return true;
  } catch (error) {
    console.error('❌ ERRO AO SINCRONIZAR MODELOS:', error.message);
    return false;
  }
};

module.exports = { 
  sequelize, 
  testConnection, 
  syncModels 
};