import { ViewBuilder } from '../../src/ViewBuilder';

class User {
  static getTableName() { return 'users'; }
}
class Post {
  static getTableName() { return 'posts'; }
}

const view = new ViewBuilder()
  .title('user_post_summary') // Título de la vista
  .from({
    model: User,
    alias: 'u',
    select: [{ column: 'id', alias: 'user_id' }, { column: 'name', alias: 'user_name' }]
  })
  .join({
    model: Post,
    alias: 'p',
    on: { 'u.id': 'p.user_id' },
    select: [{ column: 'COUNT(p.id)', alias: 'post_count' }],
    type: 'LEFT'
  })
  .groupBy(['u.id', 'u.name']);

// Exportamos por defecto el ViewBuilder (la CLI ahora lo detectará al vuelo)
export default view;
