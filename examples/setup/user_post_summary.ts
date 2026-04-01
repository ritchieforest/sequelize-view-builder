import { Model, DataTypes } from 'sequelize';
// Nota para el usuario de la librería: Debes proveer tu propia instancia de sequelize aquí 
// si la generas dinámicamente o ajusta los imports manualmente si fuera necesario.
import { sequelize } from '../../sequelize'; // TODO: Configura --sequelizeImportPath en la CLI para definir tu instancia, o cambia este path dinámico.

export class user_post_summary extends Model {
  public user_id!: number;
  public user_name!: string;
  public post_count!: any;



}

user_post_summary.init({
  user_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
  },
  user_name: {
    type: DataTypes.STRING,
  },
  post_count: {
    type: DataTypes.STRING,
  },
}, {
  sequelize,
  tableName: 'user_post_summary',
  timestamps: false,
});
