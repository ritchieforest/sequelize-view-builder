import { ModelStatic, Sequelize } from 'sequelize';

// Alias para evitar importar tipos profundos si no están disponibles
type QueryGenerator = any;

export interface ViewSQLOptions {
    sequelize?: Sequelize;
    sqlFileRelativePath?: string;
}

type SelectField = {
    column: string; // puede ser columna o expresión SQL
    alias?: string;
};

type FromClause = {
    model?: ModelStatic<any> | null;
    table?: string;
    alias: string;
    select?: SelectField[];
};

type JoinClause = {
    model?: ModelStatic<any>;
    table?: string;
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
    private deps: string[] = [];
    private havings: Condition[] = [];
    private _isMaterialized: boolean = false;
    private _associations: { target: string, type: 'belongsTo' | 'hasMany' | 'hasOne' | 'belongsToMany', options: any }[] = [];
    private _indexes: { columns: string[], options: { unique?: boolean, name?: string } }[] = [];

    // FASE 3: Macros (Placeholder para utilidades de dialectos)
    static fn = {
        dateFormat: (column: string, format: string) => `__FORMAT_DATE__(${column}, '${format}')`
    }

    dependsOn(...viewNames: (string | string[])[]): this {
        viewNames.forEach(v => {
            if (Array.isArray(v)) {
                this.deps.push(...v);
            } else {
                this.deps.push(v);
            }
        });
        return this;
    }

    getDependencies(): string[] {
        return this.deps;
    }

    materialized(value: boolean = true): this {
        this._isMaterialized = value;
        return this;
    }

    get isMaterialized(): boolean {
        return this._isMaterialized;
    }

    associate(targetModelName: string, type: 'belongsTo' | 'hasMany' | 'hasOne' | 'belongsToMany', options: any = {}): this {
        this._associations.push({ target: targetModelName, type, options });
        return this;
    }

    get associations() {
        return this._associations;
    }

    index(columns: string[], options: { unique?: boolean, name?: string } = {}): this {
        this._indexes.push({ columns, options });
        return this;
    }

    title(nameView: string): this {
        this.titleView = nameView;
        return this;
    }

    order(obj: any) {
        const onParts = Object.entries(obj).map(
            ([column, direction]) => `${column} ${direction}`
        );
        this.orderBy = " ORDER BY " + onParts.join(", ");
        return this;
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

    whereIn(column: string, subview: ViewBuilder | string): this {
        const sql = typeof subview === 'string' ? subview : subview.toSQLInline();
        this.wheres.push(`${column} IN (\n${sql}\n)`);
        return this;
    }

    whereExists(subview: ViewBuilder | string): this {
        const sql = typeof subview === 'string' ? subview : subview.toSQLInline();
        this.wheres.push(`EXISTS (\n${sql}\n)`);
        return this;
    }

    having(condition: Condition): this {
        this.havings.push(condition);
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

    private getTableName(model: ModelStatic<any>, qg?: QueryGenerator): string {
        const tableName = model.getTableName();
        
        // Si tenemos QueryGenerator de Sequelize, dejamos que él haga el quote seguro tomando en cuenta el esquema
        if (qg) {
            return qg.quoteTable(tableName);
        }

        if (typeof tableName === 'object') {
            return `${(tableName as any).schema}.${(tableName as any).tableName}`;
        }
        return tableName as string;
    }

    private quoteIdent(identifier: string, qg?: QueryGenerator): string {
        if (!qg) return identifier;
        if (identifier.includes('.') || identifier.includes('(') || identifier.includes(' ')) return identifier; // Fallback para raw strings
        return qg.quoteIdentifier(identifier);
    }

    private generateSelectClause(qg?: QueryGenerator): string {
        const selectParts: string[] = [];

        if (this.fromClause?.select) {
            const alias = this.fromClause.alias;
            this.fromClause.select.forEach(({ column, alias: colAlias }) => {
                const finalAlias = colAlias || `${column.replace(/[^a-zA-Z0-9_]/g, '')}`;
                
                const isRaw = column.includes('.') || column.includes('(');
                const colStr = isRaw ? column : `${this.quoteIdent(alias, qg)}.${this.quoteIdent(column, qg)}`;
                selectParts.push(`${colStr} AS ${this.quoteIdent(finalAlias, qg)}`);
            });
        }

        for (const join of this.joins) {
            if (join.select) {
                const alias = join.alias;
                join.select.forEach(({ column, alias: colAlias }) => {
                    const finalAlias = colAlias || `${column.replace(/[^a-zA-Z0-9_]/g, '')}`;
                    
                    const isRaw = column.includes('.') || column.includes('(');
                    const colStr = isRaw ? column : `${this.quoteIdent(alias, qg)}.${this.quoteIdent(column, qg)}`;
                    selectParts.push(`${colStr} AS ${this.quoteIdent(finalAlias, qg)}`);
                });
            }
        }

        return selectParts.join(',\n  ');
    }

    private generateFromClause(qg?: QueryGenerator): string {
        if (!this.fromClause) throw new Error('FROM clause not defined');
        
        let source: string;
        if (this.fromClause.model) {
            source = this.getTableName(this.fromClause.model, qg);
        } else if (this.fromClause.table) {
            source = this.quoteIdent(this.fromClause.table, qg);
        } else {
            // Fallback al alias si no hay nada más
            source = this.quoteIdent(this.fromClause.alias, qg);
        }

        return `FROM ${source} AS ${this.quoteIdent(this.fromClause.alias, qg)}`;
    }

    private generateJoins(qg?: QueryGenerator): string {
        return this.joins
            .map((j) => {
                const type = j.type || 'INNER';
                let joinSource: string;

                if (typeof j.subview == "object") {
                    joinSource = `(\n${j.subview.toSQLInline({ sequelize: qg?.sequelize })}\n) AS ${this.quoteIdent(j.alias, qg)}`;
                } else if (j.model) {
                    const tableSource = this.getTableName(j.model, qg);
                    joinSource = `${tableSource} AS ${this.quoteIdent(j.alias, qg)}`;
                } else if (j.table) {
                    const tableSource = this.quoteIdent(j.table, qg);
                    joinSource = `${tableSource} AS ${this.quoteIdent(j.alias, qg)}`;
                } else {
                    // Fallback para strings crudos o subqueries textuales pasadas en subview
                    joinSource = `${j.subview} AS ${this.quoteIdent(j.alias, qg)}`;
                }

                const onParts = Object.entries(j.on).map(
                    ([left, right]) => `${left} = ${right}` // Dejamos crudo porque el user escribe "u.id = p.user_id", requeriría un AST para separar y quotear. Lo ideal es dejar la expresión intacta o pedir raw.
                );

                if (j.additionalConditions?.length) {
                    onParts.push(...j.additionalConditions);
                }

                return `${type} JOIN ${joinSource} ON ${onParts.join(' AND ')}`;
            })
            .join('\n');
    }

    private generateWhere(): string {
        // Wheres are kept as raw conditions for now to preserve backwards compatibility and complex expressibility
        return this.wheres.length ? `WHERE ${this.wheres.join(' AND ')}` : '';
    }

    private generateGroupBy(): string {
        return this.groupBys.length ? `GROUP BY ${this.groupBys.join(', ')}` : '';
    }

    private generateHaving(): string {
        // Al igual que WHERE, lo mantenemos crudo por si usan COUNT o funciones completas
        return this.havings.length ? `HAVING ${this.havings.join(' AND ')}` : '';
    }

    private generateWithClause(options?: ViewSQLOptions): string {
        if (!this.withViews.length) return '';

        const recursiveNeeded = this.withViews.some((w) => w.recursive);
        const keyword = recursiveNeeded ? 'WITH RECURSIVE' : 'WITH';
        const qg = options?.sequelize?.getQueryInterface().queryGenerator;

        const definitions = this.withViews.map(
            ({ alias, builder }) => `${this.quoteIdent(alias, qg)} AS (\n${builder.toSQLInline(options)}\n)`
        );

        return `${keyword}\n${definitions.join(',\n')}`;
    }

    private applyMacros(sql: string, options?: ViewSQLOptions): string {
        const dialect = options?.sequelize?.getDialect() || 'mysql';
        
        // Transformar __FORMAT_DATE__ según el motor
        // Esto soluciona tu problema de formato de cadena/fecha!
        let result = sql.replace(/__FORMAT_DATE__\(([^,]+),\s*'([^']+)'\)/g, (_, col, format) => {
            if (dialect === 'postgres') {
                return `TO_CHAR(${col}, '${format.replace(/Y/g, 'Y').replace(/M/g, 'M').replace(/D/g, 'D')}')`; // Simple map
            } else if (dialect === 'mssql') {
                return `FORMAT(${col}, '${format}')`; 
            }
            // MySQL por default
            return `DATE_FORMAT(${col}, '${format.replace(/YYYY/, '%Y').replace(/MM/, '%m').replace(/DD/, '%d')}')`;
        });

        return result;
    }

    toSQLInline(options?: ViewSQLOptions): string {
        if (this.unionParts.length > 0) {
            return this.applyMacros(this.unionParts.map((v) => v.toSQLInline(options)).join(`\nUNION ${this.unionType}\n`), options);
        }

        const qg = options?.sequelize?.getQueryInterface()?.queryGenerator;

        const select = this.generateSelectClause(qg);
        const from = this.generateFromClause(qg);
        const joins = this.generateJoins(qg);
        const where = this.generateWhere();
        const groupBy = this.generateGroupBy();
        const having = this.generateHaving();
        const limit = this.limitSql;
        const order = this.orderBy;

        const rawSql = `
SELECT
  ${select}
${from}
${joins ? joins : ''}
${where ? where : ''}
${groupBy ? groupBy : ''}
${having ? having : ''}
${order ? order : ''}
${limit ? limit : ''}
`.trim();

        return this.applyMacros(rawSql, options);
    }

    toSQL(viewName: string, options?: ViewSQLOptions): string {
        const qg = options?.sequelize?.getQueryInterface()?.queryGenerator;
        const withClause = this.generateWithClause(options);
        const body = this.toSQLInline(options);
        const name = this.titleView !== '' ? this.titleView : viewName;
        
        const mat = this._isMaterialized ? 'MATERIALIZED ' : '';
        let dropView = `DROP ${mat}VIEW IF EXISTS ${this.quoteIdent(name, qg)} ;`;
        let createView = `CREATE ${mat}VIEW ${this.quoteIdent(name, qg)} AS`;

        if (options?.sequelize?.getDialect() === 'mssql') {
            dropView = `IF OBJECT_ID('${name}', 'V') IS NOT NULL DROP VIEW ${name};`;
            createView = `CREATE VIEW ${this.quoteIdent(name, qg)} AS`; 
        } 

        let indexesSQL = '';
        if (this._isMaterialized && this._indexes.length > 0) {
            for (const idx of this._indexes) {
                const idxName = idx.options.name || `${name}_idx_${idx.columns.join('_')}`;
                const isUnique = idx.options.unique ? 'UNIQUE ' : '';
                const columnsStr = idx.columns.map(c => this.quoteIdent(c, qg)).join(', ');
                indexesSQL += `\nCREATE ${isUnique}INDEX IF NOT EXISTS ${this.quoteIdent(idxName, qg)} ON ${this.quoteIdent(name, qg)} (${columnsStr});`;
            }
        }

        return `
${dropView}
${createView}
${withClause ? withClause + '\n' : ''}${body};${indexesSQL}
`.trim();
    }

    toMigration(viewName: string, options?: ViewSQLOptions): string {
        const sql = this.toSQL(viewName, options);
        
        if (options?.sqlFileRelativePath) {
            return `
'use strict';
const fs = require('fs');
const path = require('path');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const sqlPath = path.resolve(__dirname, '${options.sqlFileRelativePath.replace(/\\/g, '\\\\')}');
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
        const mat = ${this._isMaterialized ? 'true' : 'false'} ? 'MATERIALIZED ' : '';
        await queryInterface.sequelize.query(\`DROP \${mat}VIEW IF EXISTS ${viewName};\`);
    }
};
`.trim();
        }

        // Se usa backticks en el template para poder incrustar SQL multi-linea de forma cruda si no hay utils.
        return `
'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        // SQL Auto-generado por sequelize-view-builder
        const sql = \`${sql.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
        // Dividir por punto y coma, cuidando que no estén dentro de comillas simples (básico)
        const statements = sql.split(/;(?=(?:[^']*'[^']*')*[^']*$)/g)
            .map(s => s.trim())
            .filter(Boolean);
            
        for (const statement of statements) {
            await queryInterface.sequelize.query(statement);
        }
    },

    down: async (queryInterface, Sequelize) => {
        const mat = ${this._isMaterialized ? 'true' : 'false'} ? 'MATERIALIZED ' : '';
        await queryInterface.sequelize.query(\`DROP \${mat}VIEW IF EXISTS ${viewName};\`);
    }
};
`.trim();
    }
}