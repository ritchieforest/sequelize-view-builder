import { sequelize } from './db.js';
(async () => {
    await sequelize.sync({ force: true });
    console.log("DB Tables created!");
})();
