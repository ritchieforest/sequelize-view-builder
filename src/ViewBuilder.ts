import { ModelStatic } from 'sequelize';

type SelectField = {
    column: string; // puede ser columna o expresión SQL
    alias?: string;
};

type FromClause = {
    model: ModelStatic<any> | null;
    alias: string;
    select?: SelectField[];
};

type JoinClause = {
    model?: ModelStatic<any>;
    subview?: ViewBuilder | string;
    alias: string;
    type?: 'INNER' | 'LEFT' | 'RIGHT';
    on: Record<string, string>;
    additionalConditions?: string[];
    select?: SelectField[];
};

type Condition = string;
type GroupByClause = string[];

export class ViewBuilder {
    private fromClause?: FromClause;
    private joins: JoinClause[] = [];
    private wheres: Condition[] = [];
    private groupBys: GroupByClause = [];
    private withViews: { alias: string; builder: ViewBuilder; recursive: boolean }[] = [];
    private titleView: string = "";
    private unionParts: ViewBuilder[] = [];
    private unionType: 'ALL' | 'DISTINCT' = 'ALL';
    private limitSql: string = ""
    private orderBy: string = ""

    title(nameView: string): this {
        this.titleView = nameView;
        return this;
    }

    order(obj: Object) {
        const onParts = Object.entries(obj).map(
            ([left, right]) => `${left} ${right},`
        );
        this.orderBy=onParts.join(" ").slice(0,-1)
        return this
    }

    limit(num: number) {
        this.limitSql = " LIMIT " + num
        return this
    }

    getTitle(): string {
        return this.titleView;
    }

    from(clause: FromClause): this {
        this.fromClause = clause;
        return this;
    }

    join(clause: JoinClause): this {
        this.joins.push(clause);
        return this;
    }

    where(condition: Condition): this {
        this.wheres.push(condition);
        return this;
    }

    groupBy(columns: GroupByClause): this {
        this.groupBys = this.groupBys.concat(columns);
        return this;
    }

    with(alias: string, builder: ViewBuilder, recursive = false): this {
        this.withViews.push({ alias, builder, recursive });
        return this;
    }

    unionAll(...builders: ViewBuilder[]): this {
        this.unionParts = builders;
        this.unionType = 'ALL';
        return this;
    }

    private getTableName(model: ModelStatic<any>): string {
        return model.getTableName() as string;
    }

    private generateSelectClause(): string {
        const selectParts: string[] = [];

        if (this.fromClause?.select) {
            const alias = this.fromClause.alias;
            this.fromClause.select.forEach(({ column, alias: colAlias }) => {
                const finalAlias = colAlias || `${column.replace(/[^a-zA-Z0-9_]/g, '')}`;
                selectParts.push(`${column.includes('.') || column.includes('(') ? column : `${alias}.${column}`} AS ${finalAlias}`);
            });
        }

        for (const join of this.joins) {
            if (join.select) {
                const alias = join.alias;
                join.select.forEach(({ column, alias: colAlias }) => {
                    const finalAlias = colAlias || `${column.replace(/[^a-zA-Z0-9_]/g, '')}`;
                    selectParts.push(`${column.includes('.') || column.includes('(') ? column : `${alias}.${column}`} AS ${finalAlias}`);
                });
            }
        }

        return selectParts.join(',\n  ');
    }

    private generateFromClause(): string {
        if (!this.fromClause) throw new Error('FROM clause not defined');
        if (this.fromClause.model === null) {
            return `FROM ${this.fromClause.alias}`;
        }
        const table = this.getTableName(this.fromClause.model);
        return `FROM ${table} AS ${this.fromClause.alias}`;
    }

    private generateJoins(): string {
        return this.joins
            .map((j) => {
                const type = j.type || 'INNER';
                let joinSource: string;

                if (typeof j.subview == "object") {
                    joinSource = `(\n${j.subview.toSQLInline()}\n) AS ${j.alias}`;
                } else if (j.model) {
                    const table = this.getTableName(j.model);
                    joinSource = `${table} AS ${j.alias}`;
                } else {
                    joinSource = j.subview + " " + j.alias;
                }

                const onParts = Object.entries(j.on).map(
                    ([left, right]) => `${left} = ${right}`
                );

                if (j.additionalConditions?.length) {
                    onParts.push(...j.additionalConditions);
                }

                return `${type} JOIN ${joinSource} ON ${onParts.join(' AND ')}`;
            })
            .join('\n');
    }

    private generateWhere(): string {
        return this.wheres.length ? `WHERE ${this.wheres.join(' AND ')}` : '';
    }

    private generateGroupBy(): string {
        return this.groupBys.length ? `GROUP BY ${this.groupBys.join(', ')}` : '';
    }

    private generateWithClause(): string {
        if (!this.withViews.length) return '';

        const recursiveNeeded = this.withViews.some((w) => w.recursive);
        const keyword = recursiveNeeded ? 'WITH RECURSIVE' : 'WITH';

        const definitions = this.withViews.map(
            ({ alias, builder }) => `${alias} AS (\n${builder.toSQLInline()}\n)`
        );

        return `${keyword}\n${definitions.join(',\n')}`;
    }

    toSQLInline(): string {
        if (this.unionParts.length > 0) {
            return this.unionParts.map((v) => v.toSQLInline()).join(`\nUNION ${this.unionType}\n`);
        }

        const select = this.generateSelectClause();
        const from = this.generateFromClause();
        const joins = this.generateJoins();
        const where = this.generateWhere();
        const groupBy = this.generateGroupBy();
        const limit = this.limitSql
        const order = this.orderBy


        return `
SELECT
${select}
${from}
${joins ? '\n' + joins : ''}
${where ? '\n' + where : ''}
${groupBy ? '\n' + groupBy : ''}
${limit ? '\n' + limit : ''}
${order ? '\n' + order : ''}

`.trim();
    }

    toSQL(viewName: string): string {
        const withClause = this.generateWithClause();
        const body = this.toSQLInline();
        const name = this.titleView !== '' ? this.titleView : viewName;

        return `
DROP VIEW if exists ${name} ;
CREATE VIEW ${name} AS
${withClause ? withClause + '\n' : ''}${body};
`.trim();
    }

    toMigration(viewName: string): string {
        const sql = this.toSQL(viewName);

        return `
'use strict';
const path = require('path');
const { cargarSQL } = require(path.join(__dirname, '../database/utils'));
const sql = cargarSQL('${viewName}');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.sequelize.query(sql);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.sequelize.query('DROP VIEW IF EXISTS ${viewName};');
    }
};
`.trim();
    }
}