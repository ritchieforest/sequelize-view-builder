import { ViewBuilder } from '../../src/ViewBuilder';

const userInsightView = new ViewBuilder()
  .title('user_insight')
  .from({ 
    table: 'user_post_summary', 
    alias: 'ups', 
    select: [{ column: 'user_id' }, { column: 'user_name' }, { column: 'post_count', alias: 'summary_count' }] 
  })
  .join({
      table: 'top_users',
      alias: 'tu',
      on: { 'ups.user_id': 'tu.user_id' },
      select: [{ column: 'post_count', alias: 'top_rank_count' }],
      type: 'LEFT'
  })
  .dependsOn(['user_post_summary', 'top_users']); // Probando el array de dependencias!

export default userInsightView;
