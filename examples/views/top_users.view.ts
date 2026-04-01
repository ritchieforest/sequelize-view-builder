import { ViewBuilder } from '../../src/ViewBuilder';

const topUsersView = new ViewBuilder()
  .title('top_users')
  .from({
    table: 'user_post_summary', // Nombre de la vista previa
    alias: 'ups',
    select: [
        { column: 'user_id' }, 
        { column: 'user_name' }, 
        { column: 'post_count' }
    ]
  })
  .dependsOn('user_post_summary') // Declarar la dependencia para el orquestador
  .where('post_count > 0')
  .order({ post_count: 'DESC' });

export default topUsersView;
