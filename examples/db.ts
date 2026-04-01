import { Sequelize, DataTypes } from 'sequelize';

// Creamos un archivo de BD SQLite local para que el generador logre leer la estructura
export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './examples/mock-db.sqlite',
  logging: false,
});

// Definimos los modelos subyacentes mínimos para que las vistas puedan ser creadas sin error SQL
const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: DataTypes.STRING,
}, { tableName: 'users', timestamps: false });

const Post = sequelize.define('Post', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: DataTypes.INTEGER,
}, { tableName: 'posts', timestamps: false });

// Exponemos una función auto-ejecutable para asegurar que las tablas existan antes de que la CLI
// corra las migraciones creando las Vistas encima de ellas.
(async () => {
    await sequelize.sync();
})();

// IMPORTANTE: Exportamos la instancia para la CLI
export default sequelize;
