'use strict';
const fs = require('fs');
const path = require('path');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const sqlPath = path.resolve(__dirname, '../out-sql/user_insight.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // Dividir por punto y coma, cuidando que no estén dentro de comillas simples (básico)
        const statements = sql.split(/;(?=(?:[^']*'[^']*')*[^']*$)/g)
            .map(s => s.trim())
            .filter(Boolean);
            
        for (const statement of statements) {
            await queryInterface.sequelize.query(statement);
        }
    },

    down: async (queryInterface, Sequelize) => {
        const mat = false ? 'MATERIALIZED ' : '';
        await queryInterface.sequelize.query(`DROP ${mat}VIEW IF EXISTS user_insight;`);
    }
};