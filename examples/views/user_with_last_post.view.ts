import { ViewBuilder } from "../../src/ViewBuilder";

// Mocks simples para evitar romper el ejemplo
class User {
    static getTableName() { return 'users'; }
}
class Post {
    static getTableName() { return 'posts'; }
}
const last_post = new ViewBuilder()
    .from({
        model: Post,
        alias: "sq1",
        select: [
            { column: "id" }
        ]
    })
    .where("user_id=u.id")
    .limit(1)
    .order({ "id": "DESC" })
const view_con_join_sub_query = new ViewBuilder()
    .title('user_with_last_post')
    .from({
        model: User,
        alias: 'u',
        select: [{ column: 'id', alias: 'user_id' }, { column: 'name', alias: 'user_name' }]
    })
    .join({
        model: Post,
        alias: 'p',
        on: { 'u.id': 'p.user_id', "p.id": `(${last_post.toSQLInline().replaceAll("\n", " ")})` },
        select: [{ column: 'p.id', alias: 'post_count' }],
        type: 'LEFT'
    })
    .groupBy(['u.id', 'u.name']);
export default view_con_join_sub_query;
