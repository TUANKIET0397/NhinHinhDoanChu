const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('DrawGame', 'root', 'Baohung305@', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false,
});

async function connect() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection error:', error);
    throw error;
  }
}

module.exports = { sequelize, connect };
