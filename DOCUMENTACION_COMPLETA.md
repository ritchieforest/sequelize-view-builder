# Documentación Completa: Sequelize View Builder

> ⚠️ **IMPORTANTE**: Esta librería es para **definir vistas SQL persistentes** que se crean UNA VEZ y se consultan MUCHAS VECES. No es un query builder para consultas dinámicas basadas en entrada de usuario. Para queries dinámicas, usa Sequelize directamente.

## 📋 Tabla de Contenidos
1. [Introducción](#introducción)
2. [Conceptos Fundamentales](#conceptos-fundamentales)
3. [Arquitectura General](#arquitectura-general)
4. [ViewBuilder: Constructor de Vistas](#viewbuilder-constructor-de-vistas)
5. [ViewGenerator: Orquestador de Generación](#viewgenerator-orquestador-de-generación)
6. [Guía de Uso](#guía-de-uso)
7. [Casos de Uso Avanzados](#casos-de-uso-avanzados)
8. [Best Practices](#best-practices)

---

## Introducción

**Sequelize View Builder** es una librería TypeScript que simplifica la creación, gestión y generación automática de vistas SQL complejas reutilizables. Se integra perfectamente con [Sequelize ORM](https://sequelize.org/) y proporciona una interfaz fluida y segura mediante Type-Safe API.

### Problemas que Resuelve

- ❌ **Vistas SQL duplicadas y mantenibles**: Las vistas se definen una sola vez y se reutilizan mediante composición
- ❌ **Dependencias circulares confusas**: Auto-detecta y ordena topológicamente
- ❌ **Migrations manuales complejas**: Genera migrations automáticas cuando cambian las vistas
- ❌ **Modelos generados incorrectamente**: Crea modelos TypeScript sincronizados automáticamente con la BD

---

## Conceptos Fundamentales

### Vista SQL
Una **vista SQL** es una consulta almacenada que se ejecuta como una tabla virtual. Sequelize View Builder abstrae la complejidad de estas consultas en un modelo de programación orientado a objetos.

### Tipos de Vistas Soportadas

#### 1. **Vistas Normales (Tmp View)**
```sql
CREATE VIEW user_posts AS
SELECT u.id, u.name, COUNT(p.id) as post_count
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
GROUP BY u.id, u.name;
```
- Actualizadas dinámicamente
- Sin almacenamiento persistente
- Más rápidas de crear

#### 2. **Vistas Materializadas (Materialized View)**
```sql
CREATE MATERIALIZED VIEW top_users AS
SELECT ...
```
- Datos almacenados en disco
- Necesitan actualizarse manualmente (`REFRESH MATERIALIZED VIEW`)
- Mejor para datos complejos o consultados frecuentemente
- Permiten índices

### Nivel de Composición
Las vistas se pueden componer de manera flexible:
```
Vista Base → Vista Intermedia → Vista Compleja
     ↓             ↓
  (Users)   (User Posts)  
              ↓
         (Top Users - depende de User Posts)
```

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────┐
│        Archivos .view.ts (Definiciones)             │
│  Ejemplo: user_post_summary.view.ts                 │
│  - Exportan una instancia de ViewBuilder            │
│  - Definen la lógica SQL de manera declarativa      │
└──────────────┬──────────────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────────────┐
│       ViewGenerator (Orquestador Principal)          │
│  - Lee archivos .view.ts dinámicamente              │
│  - Calcula hash para detectar cambios               │
│  - Ordena topológicamente por dependencias          │
│  - Genera SQL, Migrations y Modelos                 │
└──────────────┬──────────────────────────────────────┘
               │
        ┌──────┴──────┬──────────┬────────┐
        ↓             ↓          ↓        ↓
    ┌───────┐  ┌─────────┐  ┌──────┐  ┌──────────┐
    │SQL    │  │Migration│  │Model │  │Cache JSON│
    │Files  │  │.js Files│  │.ts   │  │.view-ca. │
    └───────┘  └─────────┘  └──────┘  └──────────┘
        ↓             ↓          ↓
  saved in:   Executes auto-  TypeScript
  sqlDir/     matically via   autocomplete
              Sequelize CLI   support
```

### Flujo de Datos

1. **Definición**: Developer escribe `.view.ts` usando `ViewBuilder`
2. **Detección**: `ViewGenerator` descubre cambios (hash comparison)
3. **Análisis**: Construye grafo de dependencias y las ordena
4. **Generación**:
   - SQL puro → `sqlDir/`
   - Migrations → `migrationsDir/` (auto-ejecutables)
   - TypeScript Models → `modelsDir/`
5. **Cache**: Guarda hashes para no regenerar sin cambios

---

## ViewBuilder: Constructor de Vistas

### Propósito
`ViewBuilder` es la clase que construye declarativamente el SQL mediante una **interfaz fluida (Fluent API)**. Encadena métodos para construir consultas complejas.

### Estructura Interna

```typescript
export class ViewBuilder {
    private fromClause?: FromClause;           // FROM principal
    private joins: JoinClause[] = [];          // JOINs acumuladas
    private wheres: Condition[] = [];          // WHERE conditions
    private groupBys: GroupByClause = [];      // GROUP BY
    private havings: Condition[] = [];         // HAVING (para agregados)
    private withViews: Array<...> = [];        // CTEs (WITH clause)
    private unionParts: ViewBuilder[] = [];    // UNION queries
    private orderBy: string = "";              // ORDER BY
    private limitSql: string = "";             // LIMIT
    private deps: string[] = [];               // Dependencias declaradas
    private _isMaterialized: boolean = false; // ¿Es materializada?
    private _associations: Array<...> = [];   // Relaciones Sequelize
    private _indexes: Array<...> = [];        // Índices para mat. views
}
```

### Métodos Principales

#### 1. **`title(name: string)`**
Define el nombre de la vista en la BD.
```typescript
viewBuilder.title('user_post_summary')
// ↓ Genera:
// CREATE VIEW user_post_summary AS ...
```
- **Retorna**: `this` (para encadenamiento)
- **Requerido**: Sí, para `toSQL()` y `toMigration()`

#### 2. **`from(clause: FromClause)`**
Define la tabla o modelo base.
```typescript
.from({
    model: User,           // Modelo Sequelize
    alias: 'u',           // Alias para la consulta
    select: [
        { column: 'id', alias: 'user_id' },
        { column: 'name', alias: 'user_name' }
    ]
})
```

**Opciones de Clause:**
- `model`: Modelo Sequelize directamente
- `table`: Nombre de tabla como string (BD existente)
- `alias`: Alias necesario en la consulta
- `select`: Array de columnas a proyectar (opcionalmente con alias)

#### 3. **`join(clause: JoinClause)`**
Agrega un JOIN a la vista.
```typescript
.join({
    model: Post,
    alias: 'p',
    type: 'LEFT',         // INNER (default), LEFT, RIGHT
    on: { 'u.id': 'p.user_id' },  // Condiciones ON
    select: [{ column: 'COUNT(p.id)', alias: 'post_count' }],
    additionalConditions: ['p.status = "active"']  // Optional
})
```

**Soporta 3 tipos de Joins:**
- `INNER JOIN`: Registros coincidentes
- `LEFT JOIN`: Todos de la izquierda + coincidencias
- `RIGHT JOIN`: Todos de la derecha + coincidencias

**Subqueries en JOINs:**
```typescript
.join({
    subview: anotherViewBuilder,  // ViewBuilder como subquery
    alias: 'subq',
    type: 'LEFT',
    on: { 'u.id': 'subq.user_id' }
})
```

#### 4. **`where(condition: Condition)`**
Agrega condiciones WHERE (raw SQL).
```typescript
.where('u.age > 18')
.where('u.country = "USA"')
// ↓ Genera:
// WHERE u.age > 18 AND u.country = "USA"
```
- Conditions se unen con `AND`
- Se escriben como strings SQL puro (crudo)

#### 5. **`whereIn(column: string, subview: ViewBuilder | string)`**
Cláusula IN especializada con subqueries.
```typescript
.whereIn('u.id', activeUsersView)
// ↓ Genera:
// WHERE u.id IN (
//   SELECT ... FROM ...
// )
```

#### 6. **`whereExists(subview: ViewBuilder | string)`**
EXISTS clause para subqueries.
```typescript
.whereExists(userWithPostsView)
// ↓ Genera:
// WHERE EXISTS (
//   SELECT ... FROM ...
// )
```

#### 7. **`groupBy(columns: string[])`**
Define agrupación.
```typescript
.groupBy(['u.id', 'u.name'])
// ↓ Genera:
// GROUP BY u.id, u.name
```
- Obligatorio cuando usas funciones de agregación (COUNT, SUM, etc.)

#### 8. **`having(condition: Condition)`**
Filtro POST-GROUP BY.
```typescript
.having('COUNT(p.id) > 5')
// ↓ Genera:
// HAVING COUNT(p.id) > 5
```
- Similar a WHERE pero opera sobre resultados agregados

#### 9. **`order(obj: Record<string, string>)`**
Ordenamiento.
```typescript
.order({ 'u.created_at': 'DESC', 'u.name': 'ASC' })
// ↓ Genera:
// ORDER BY u.created_at DESC, u.name ASC
```

#### 10. **`limit(num: number)`**
Limita resultados.
```typescript
.limit(10)
// ↓ Genera:
// LIMIT 10
```

#### 11. **`with(alias: string, builder: ViewBuilder, recursive?: boolean)`**
Agrega CTEs (Common Table Expressions / WITH clause).
```typescript
.with('active_users', activeUsersBuilder, false)
.with('user_posts', userPostsBuilder, false)
// ↓ Genera:
// WITH 
//   active_users AS (...),
//   user_posts AS (...)
// SELECT ...
```
- Útil para consultas complejas y recursivas
- `recursive`: Flag para CTEs recursivas

#### 12. **`unionAll(...builders: ViewBuilder[])`**
Combina múltiples vistas.
```typescript
.unionAll(queryA, queryB, queryC)
// ↓ Genera:
// SELECT ... FROM ...
// UNION ALL
// SELECT ... FROM ...
// UNION ALL
// SELECT ... FROM ...
```
- Combina resultados verticalmente
- Mantiene duplicados (`UNION ALL` vs `UNION DISTINCT`)

#### 13. **`dependsOn(...names: string[])`**
Declara dependencias para el orquestador.
```typescript
.dependsOn('users', 'posts', 'comments')
// O con arrays:
.dependsOn(['users', 'posts'], 'comments')
```
- Crítico para ordenamiento topológico correcto
- Detecta ciclos automáticamente

#### 14. **`materialized(value: boolean)`**
Marca la vista como materializada.
```typescript
viewBuilder
    .materialized(true)
    .title('expensive_aggregation')
// ↓ Genera:
// CREATE MATERIALIZED VIEW expensive_aggregation AS ...
```

#### 15. **`associate(targetModelName: string, type: RelationType, options: any)`**
Define relaciones Sequelize en el modelo generado.
```typescript
.associate('User', 'belongsTo', { foreignKey: 'user_id' })
.associate('Post', 'hasMany', { as: 'posts' })
```
- Tipos: `belongsTo`, `hasMany`, `hasOne`, `belongsToMany`
- Se inyectan en método `static associate()` del modelo

#### 16. **`index(columns: string[], options?: {...})`**
Crea índices en vistas materializadas.
```typescript
.index(['user_id', 'created_at'], { unique: false, name: 'idx_user_created' })
```
- Solo funciona con `materialized(true)`
- PostgreSQL y otros dialectos con MATERIALIZED VIEW

### Métodos de Salida

#### **`toSQLInline(options?: ViewSQLOptions)`**
Retorna SQL puro sin CREATE VIEW.
```typescript
const sql = viewBuilder.toSQLInline({ sequelize });
// Retorna:
// SELECT u.id, u.name, COUNT(p.id) as post_count
// FROM users u
// LEFT JOIN posts p ON u.id = p.user_id
// WHERE u.age > 18
// GROUP BY u.id, u.name
// ORDER BY post_count DESC
```
Usado internamente y para debugging.

#### **`toSQL(viewName: string, options?: ViewSQLOptions)`**
Genera SQL completo con DROP y CREATE.
```typescript
const sql = viewBuilder
    .title('top_users')
    .toSQL('top_users', { sequelize });
// Retorna:
// DROP VIEW IF EXISTS top_users;
// CREATE VIEW top_users AS
// SELECT ...;
```

#### **`toMigration(viewName: string, options?: ViewSQLOptions)`**
Genera código de migración Sequelize-CLI.
```typescript
const migration = viewBuilder.toMigration('user_posts');
// Retorna modulo.exports con up() y down()
```

### Propiedades Accesibles

- **`getDependencies()`**: Retorna array de dependencias
- **`getTitle()`**: Retorna nombre de la vista
- **`isMaterialized`**: Booleano si es materializada
- **`associations`**: Array de asociaciones definidas

---

## ViewGenerator: Orquestador de Generación

### Propósito
`ViewGenerator` es el motor que automatiza todo el flujo:
- Descubre archivos `.view.ts`
- Detecta cambios usando hash SHA1
- Ordena vistas por dependencias
- Genera SQL, Migrations y Modelos automáticamente
- Ejecuta migrations al BD
- Cachea para evitar regeneración innecesaria

### Configuración

```typescript
interface ViewGeneratorConfig {
    sequelize: Sequelize;              // Instancia Sequelize activa
    viewsDir: string;                  // Directorio con .view.ts
    migrationsDir?: string;            // Destino migrations
    sqlDir?: string;                   // Destino SQL puro
    modelsDir?: string;                // Destino modelos TypeScript
    cacheFile?: string;                // Ubicación .view-cache.json
    sequelizeImportPath?: string;      // Path import sequelize en modelos
}
```

### Ejemplo de Configuración

```typescript
import { ViewGenerator } from 'sequelize-view-builder';
import { sequelize } from './database';

const generator = new ViewGenerator({
    sequelize,
    viewsDir: path.join(__dirname, 'views'),
    migrationsDir: path.join(__dirname, 'migrations'),
    sqlDir: path.join(__dirname, 'sql'),
    modelsDir: path.join(__dirname, 'models'),
    cacheFile: path.join(__dirname, '.view-cache.json'),
    sequelizeImportPath: './database'  // Path relativo a modelsDir
});
```

### Métodos Principales

#### **`async generateAllViews(targetViewName?: string)`**

Ejecuta el flujo completo de generación.

```typescript
await generator.generateAllViews();  // Genera todas con cambios
await generator.generateAllViews('user_posts');  // Fuerza user_posts y dependientes
```

**Fases Internas (No explícitas, ocurren automáticamente):**

**FASE 1: Recolección**
- Busca recursivamente archivos `*.view.ts` en `viewsDir`
- Importa dinámicamente cada archivo
- Valida que exporte `ViewBuilder` o función que la retorne
- Calcula hash SHA1 del contenido

**FASE 2: Ordenamiento Topológico**
- Construye grafo de dependencias
- Detecta ciclos y lanza errores
- Ordena vistas desde menos dependientes a más complejas
- Garantiza que dependencias se generan primero

**FASE 3: Detección de Cambios**
- Compara hashes actuales vs. caché
- Si `targetViewName` es proporcionado, marca como forzada
- Recursivamente marca vistas dependientes para regeneración

**FASE 4: Generación y Ejecución**
- Para cada vista con cambios detectados:
  - Genera timestamp único para migration
  - Crea SQL puro en `sqlDir/`
  - Crea migration Sequelize en `migrationsDir/`
  - Ejecuta migration en BD
  - Genera modelo TypeScript en `modelsDir/`
- Guarda nuevo caché

### Archivos Generados

#### 1. **SQL Puro** (`sqlDir/`:
```sql
-- user_post_summary.sql
DROP VIEW IF EXISTS user_post_summary;
CREATE VIEW user_post_summary AS
SELECT
  u.id AS user_id,
  u.name AS user_name,
  COUNT(p.id) AS post_count
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
WHERE u.age > 18
GROUP BY u.id, u.name;
```

#### 2. **Migración Sequelize** (`migrationsDir/`):
```javascript
// 20260401112150-create-user-post-summary.js
'use strict';
const fs = require('fs');
const path = require('path');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const sqlPath = path.resolve(__dirname, '../sql/user_post_summary.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        const statements = sql.split(/;(?=(?:[^']*'[^']*')*[^']*$)/g)
            .map(s => s.trim())
            .filter(Boolean);
            
        for (const statement of statements) {
            await queryInterface.sequelize.query(statement);
        }
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.sequelize.query(`DROP VIEW IF EXISTS user_post_summary;`);
    }
};
```

#### 3. **Modelo TypeScript** (`modelsDir/`):
```typescript
// user_post_summary.ts
import { Model, DataTypes } from 'sequelize';
import { sequelize } from './database';

export class UserPostSummary extends Model {
    public user_id!: number;
    public user_name!: string;
    public post_count!: number;
}

UserPostSummary.init({
    user_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
    },
    user_name: {
        type: DataTypes.STRING,
    },
    post_count: {
        type: DataTypes.INTEGER,
    },
}, {
    sequelize,
    tableName: 'user_post_summary',
    timestamps: false,
});
```

#### 4. **Cache** (`.view-cache.json`):
```json
{
    "/path/to/views/user_post_summary.view.ts": "a1b2c3d4e5f6g7h8i9j0",
    "/path/to/views/top_users.view.ts": "k1l2m3n4o5p6q7r8s9t0"
}
```
- Detecta cambios comparando hashes antes/después
- Evita regeneración innecesaria

### Manejo de Dependencias

```typescript
// views/user_post_summary.view.ts
new ViewBuilder()
    .title('user_post_summary')
    .from({ model: User, alias: 'u' })
    .join({ model: Post, alias: 'p', on: {'u.id': 'p.user_id'}}); 
    // Sin .dependsOn() explícito - detecta automáticamente

// views/top_users.view.ts
new ViewBuilder()
    .title('top_users')
    .from({ 
        table: 'user_post_summary',  // Referencia directa
        alias: 'ups' 
    })
    .dependsOn('user_post_summary')  // Explícito para el orquestador
```

**Orden de Generación:**
1. `user_post_summary` (no dependencias)
2. `top_users` (depende de 1)

### Detección de Ciclos

```typescript
// ❌ Esto lanzará error
const viewA = new ViewBuilder()
    .title('view_a')
    .dependsOn('view_b');

const viewB = new ViewBuilder()
    .title('view_b')
    .dependsOn('view_a');

// Error: "Dependencia circular detectada en la vista: view_a"
```

---

## Guía de Uso

### Setup Básico

#### 1. **Instalar Dependencias**
```bash
npm install sequelize-view-builder sequelize
```

#### 2. **Configurar Sequelize**
```typescript
// db.ts
import { Sequelize } from 'sequelize';

export const sequelize = new Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'mysql',  // mysql, postgres, sqlite, mssql
});
```

#### 3. **Crear Directorio de Vistas**
```bash
mkdir -p src/views
mkdir -p src/sql
mkdir -p src/migrations
mkdir -p src/models
```

#### 4. **Definir Primera Vista**
```typescript
// src/views/users_active.view.ts
import { ViewBuilder } from 'sequelize-view-builder';
import { User } from '../models';

export default new ViewBuilder()
    .title('users_active')
    .from({
        model: User,
        alias: 'u',
        select: [
            { column: 'id', alias: 'user_id' },
            { column: 'name' },
            { column: 'email' }
        ]
    })
    .where('u.deleted_at IS NULL')
    .order({ 'u.created_at': 'DESC' });
```

#### 5. **Generar Automáticamente**

**Opción A: Programáticamente**
```typescript
// src/generate-views.ts
import { ViewGenerator } from 'sequelize-view-builder';
import { sequelize } from './db';
import path from 'path';

const generator = new ViewGenerator({
    sequelize,
    viewsDir: path.join(__dirname, 'views'),
    migrationsDir: path.join(__dirname, 'migrations'),
    sqlDir: path.join(__dirname, 'sql'),
    modelsDir: path.join(__dirname, 'models'),
});

(async () => {
    await generator.generateAllViews();
    console.log('✅ Vistas generadas');
})();
```

**Opción B: CLI (Command Line)**
```bash
npx sequelize-view \
    --config src/db.ts \
    --views src/views \
    --migrations src/migrations \
    --sql src/sql \
    --models src/models
```

#### 6. **Usar Modelos Generados**
```typescript
// src/services/user-service.ts
import { UserActive } from '../models/users_active';

async function getActiveUsers() {
    return await UserActive.findAll({
        limit: 10,
        order: [['created_at', 'DESC']]
    });
}
```

---

## Casos de Uso Avanzados

### 1. **Vistas Material izadas con Índices**

```typescript
// src/views/user_insights.view.ts
import { ViewBuilder } from 'sequelize-view-builder';

export default new ViewBuilder()
    .title('user_insights')
    .materialized(true)  // ← Persiste en disco
    .from({
        model: User,
        alias: 'u',
        select: [
            { column: 'id', alias: 'user_id' },
            { column: 'name' },
            { column: 'email' }
        ]
    })
    .index(['user_id'], { unique: true })
    .index(['created_at'], { name: 'idx_user_created' });
```

Genera:
```sql
CREATE MATERIALIZED VIEW user_insights AS ...;
CREATE UNIQUE INDEX idx_user_id ON user_insights (user_id);
CREATE INDEX idx_user_created ON user_insights (created_at);
```

### 2. **CTEs (WITH Recursivas)**

```typescript
// src/views/category_hierarchy.view.ts
export default new ViewBuilder()
    .title('category_hierarchy')
    .with('recursive_cats', 
        new ViewBuilder()
            .from({ table: 'categories', alias: 'c', select: [/*...*/] })
            .where('parent_id IS NULL')
            .unionAll(
                new ViewBuilder()
                    .from({ table: 'categories', alias: 'c' })
                    .join({
                        table: 'recursive_cats',
                        alias: 'rc',
                        on: { 'rc.id': 'c.parent_id' }
                    })
            ),
        true  // ← recursive: true
    )
    .from({ table: 'recursive_cats', alias: 'rc' });
```

### 3. **UNION de Múltiples Querys**

```typescript
// src/views/all_users_and_guests.view.ts
const usersQuery = new ViewBuilder()
    .from({ table: 'users', alias: 'u', select: [{column: 'id'}, {column: 'name'}] });

const guestsQuery = new ViewBuilder()
    .from({ table: 'guest_sessions', alias: 'g', select: [{column: 'id'}, {column: 'session_name', alias: 'name'}] });

export default new ViewBuilder()
    .title('all_users_and_guests')
    .unionAll(usersQuery, guestsQuery);
```

### 4. **Subqueries en JOINs**

```typescript
// src/views/users_with_top_posts.view.ts
const topPostsPerUser = new ViewBuilder()
    .from({ model: Post, alias: 'p' })
    .groupBy(['p.user_id'])
    .where('p.created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)');

export default new ViewBuilder()
    .title('users_with_top_posts')
    .from({ model: User, alias: 'u' })
    .join({
        subview: topPostsPerUser,
        alias: 'tp',
        on: { 'u.id': 'tp.user_id' }
    });
```

### 5. **Composite Views (Vista compuesta de otras vistas)**

```typescript
// views/user_post_summary.view.ts
export default new ViewBuilder()
    .title('user_post_summary')
    .from({ model: User, alias: 'u' })
    .join({ 
        model: Post, 
        alias: 'p', 
        on: {'u.id': 'p.user_id'}, 
        select: [{ column: 'COUNT(*)', alias: 'post_count' }]
    })
    .groupBy(['u.id']);

// views/top_users.view.ts
export default new ViewBuilder()
    .title('top_users')
    .from({
        table: 'user_post_summary',  // ← Usa la vista anterior
        alias: 'ups',
        select: [
            { column: 'id' },
            { column: 'name' },
            { column: 'post_count' }
        ]
    })
    .where('post_count > 10')
    .dependsOn('user_post_summary')  // ← Crucial para orden topológico
    .order({ 'post_count': 'DESC' });

// views/user_with_insights.view.ts
export default new ViewBuilder()
    .title('user_with_insights')
    .from({ model: User, alias: 'u' })
    .join({
        table: 'top_users',
        alias: 'tu',
        on: {'u.id': 'tu.id'},
        select: [{ column: 'post_count' }]
    })
    .dependsOn(['user_post_summary', 'top_users']);  // Múltiples dependencias
```

**Orden de generación automático:**
1. user_post_summary (sin dependencias)
2. top_users (depende de 1)
3. user_with_insights (depende de 1 y 2)

### 6. **Vistas con Macros (Formato de Fechas Multi-Dialect)**

```typescript
// src/views/posts_by_date.view.ts
export default new ViewBuilder()
    .title('posts_by_date')
    .from({
        model: Post,
        alias: 'p',
        select: [
            { column: ViewBuilder.fn.dateFormat('p.created_at', 'YYYY-MM-DD'), alias: 'post_date' },
            { column: 'COUNT(*)', alias: 'count' }
        ]
    })
    .groupBy([ViewBuilder.fn.dateFormat('p.created_at', 'YYYY-MM-DD')])
    .order({ 'post_date': 'DESC' });
```

Se auto-traduce según dialect:
- **MySQL**: `DATE_FORMAT(p.created_at, '%Y-%m-%d')`
- **PostgreSQL**: `TO_CHAR(p.created_at, 'YYYY-MM-DD')`
- **MSSQL**: `FORMAT(p.created_at, 'yyyy-MM-dd')`

### 7. **Forzar Regeneración de Cascada**

```typescript
// Cuando cambias 'user_post_summary', todas sus dependientes se regeneran:
await generator.generateAllViews('user_post_summary');
// ↓ También regenera automáticamente:
//   - top_users
//   - user_with_insights
//   - cualquier otra que dependa transitivamente
```

---

## Best Practices

### 1. **Estructura de Directorio**
```
src/
├── models/
│   ├── User.ts
│   ├── Post.ts
│   └── generated/           ← Generados automáticamente
│       ├── user_posts.ts
│       └── top_users.ts
├── views/
│   ├── user_posts.view.ts
│   ├── top_users.view.ts
│   └── analytics/
│       ├── monthly_stats.view.ts
│       └── user_insights.view.ts
├── migrations/              ← Ejecutadas por Sequelize
├── sql/                     ← Copia de SQL puro
└── db.ts
```

### 2. **Naming Conventions**
- **Archivos views**: `snake_case.view.ts`
- **Nombres en BD**: `snake_case`
- **Modelos generados**: `PascalCase` (auto-generado)
- **Aliases en queries**: Cortos: `u`, `p`, `ups`, etc.

### 3. **Gestión de Dependencias**

✅ **Buen prácis:**
```typescript
.dependsOn('users', 'posts')  // Siempre explícito
```

❌ **Evitar:**
```typescript
// Incluso si haces referencia directa, siempre declara:
.from({ table: 'user_posts' })  // Sin .dependsOn()
```

### 4. **Performance Tips**

#### Para Vistas Normales (Tmp):
```typescript
// Mantenlas simples para ejecución rápida
.limit(1000)  // Limita si es posible
.where('created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)')  // Filtra temprano
```

#### Para Vistas Materializadas:
```typescript
.materialized(true)
.index(['user_id'], { unique: true })  // Índices críticos
.refreshView()  // Método en modelo para actualizar
```

### 5. **Manejo de Cambios**

```typescript
// Cuando cambias una vista:
// 1. Edita el archivo .view.ts
// 2. Ejecuta generación:
await generator.generateAllViews('view_name');

// Sistema automáticamente:
// ✅ Detecta cambio por hash
// ✅ Crea nueva migration con timestamp
// ✅ Ejecuta la migration en BD
// ✅ Regenera modelo TypeScript
// ✅ Marca vistas dependientes para regen. en próx. ejecución
```

### 6. **Seguridad & Validación**

```typescript
// ❌ MALO - SQL Injection risk
.where(`user_id = ${userId}`)

// ✅ BUENO - Valores enlazados
.where(`user_id = ${userId}`)  // Aún raw, pero typed
// Mejor: Usar modelos Sequelize que manejan binding

// ✅ MEJOR - Usar campos del modelo
.join({
    model: Post,
    alias: 'p',
    on: {'u.id': 'p.user_id'}  // Sequelize maneja tipado
})
```

### 7. **Testing de Vistas**

```typescript
// test/views.test.ts
import { ViewBuilder } from 'sequelize-view-builder';
import { sequelize } from '../src/db';

describe('Views', () => {
    it('should generate valid SQL', () => {
        const view = new ViewBuilder()
            .title('test_view')
            .from({ table: 'users', alias: 'u' });
        
        const sql = view.toSQL('test_view', { sequelize });
        expect(sql).toContain('CREATE VIEW');
        expect(sql).toContain('FROM users');
    });

    it('should detect circular dependencies', () => {
        // ViewGenerator lanza automáticamente
        expect(() => {
            new ViewGenerator({...config})
                .generateAllViews();
        }).toThrow('Dependencia circular');
    });
});
```

### 8. **Debugging**

```typescript
// Ver SQL generado sin ejecutar:
const sql = viewBuilder.toSQL('my_view', { sequelize });
console.log(sql);

// Ver SQL inline sin CREATE/DROP:
const inlineSql = viewBuilder.toSQLInline({ sequelize });
console.log(inlineSql);

// Inspeccionar dependencias:
console.log(viewBuilder.getDependencies());

// Verificar si es materializada:
console.log(viewBuilder.isMaterialized);
```

### 9. **Deploy & CI/CD**

```bash
# Generar vistas en pipeline
npm run generate:views

# Ejecutar migraciones automáticamente
npm run migrate

# O manualmente via Sequelize:
npx sequelize db:migrate
```

```json
// package.json
{
  "scripts": {
    "generate:views": "tsx src/generate-views.ts",
    "migrate": "npx sequelize db:migrate",
    "dev": "concurrently \"npm run generate:views -- --watch\" \"npm run start:dev\""
  }
}
```

### 10. **Troubleshooting Común**

| Problema | Causa | Solución |
|----------|-------|----------|
| "❌ Error importando la vista" | Archivo .view.ts no es válido | Verifica export default |
| "Dependencia circular detectada" | Ciclo en dependencias | Dibuja el grafo de deps |
| Modelos generados sin tipos | `sequelizeImportPath` incorrecto | Ajusta ruta import en config |
| Vistas no se regeneran | Caché desactualizado | Elimina `.view-cache.json` |
| SQL con diáfllexiones incorrectas | Macro formato fecha | Especifica dialect correcto |

---

## Ejemplo Completo: E-Commerce Analytics

### Estructura del Proyecto
```
src/
├── models/
│   ├── User.ts
│   ├── Product.ts
│   ├── Order.ts
│   └── generated/ (auto)
├── views/
│   ├── order_stats.view.ts
│   ├── user_spending.view.ts
│   ├── product_rankings.view.ts
│   └── analytics/
│       ├── daily_revenue.view.ts
│       └── cohort_analysis.view.ts
└── db.ts
```

### Vista 1: Order Stats Básica
```typescript
// src/views/order_stats.view.ts
import { ViewBuilder } from 'sequelize-view-builder';
import { Order } from '../models';

export default new ViewBuilder()
    .title('order_stats')
    .from({
        model: Order,
        alias: 'o',
        select: [
            { column: 'id', alias: 'order_id' },
            { column: 'total_amount' },
            { column: 'status' },
            { column: 'created_at' }
        ]
    })
    .where('status != "cancelled"');
```

### Vista 2: User Spending (Depende de Vista 1)
```typescript
// src/views/user_spending.view.ts
import { ViewBuilder } from 'sequelize-view-builder';
import { User } from '../models';

export default new ViewBuilder()
    .title('user_spending')
    .from({
        model: User,
        alias: 'u',
        select: [
            { column: 'id', alias: 'user_id' },
            { column: 'name', alias: 'user_name' },
            { column: 'email' }
        ]
    })
    .join({
        table: 'order_stats',
        alias: 'os',
        type: 'LEFT',
        on: { 'u.id': 'os.user_id' },
        select: [
            { column: 'SUM(os.total_amount)', alias: 'total_spent' },
            { column: 'COUNT(os.order_id)', alias: 'order_count' },
            { column: 'AVG(os.total_amount)', alias: 'avg_order_value' }
        ]
    })
    .groupBy(['u.id', 'u.name', 'u.email'])
    .dependsOn('order_stats')
    .order({ 'total_spent': 'DESC' });
```

### Vista 3: Rankings (También depende de user_spending)
```typescript
// src/views/analytics/cohort_analysis.view.ts
import { ViewBuilder } from 'sequelize-view-builder';

const monthlyUserJoins = new ViewBuilder()
    .from({
        model: User,
        alias: 'u',
        select: [
            { column: ViewBuilder.fn.dateFormat('u.created_at', 'YYYY-MM'), alias: 'cohort_month' },
            { column: 'COUNT(*)', alias: 'user_count' }
        ]
    })
    .groupBy([ViewBuilder.fn.dateFormat('u.created_at', 'YYYY-MM')]);

export default new ViewBuilder()
    .title('cohort_analysis')
    .materialized(true)
    .from({
        model: monthlyUserJoins,
        alias: 'muj'
    })
    .index(['cohort_month'])
    .dependsOn('users');
```

### Generar Todo
```typescript
// src/generate.ts
import { ViewGenerator } from 'sequelize-view-builder';
import { sequelize } from './db';
import path from 'path';

const generator = new ViewGenerator({
    sequelize,
    viewsDir: path.join(__dirname, 'views'),
    migrationsDir: path.join(__dirname, '../migrations'),
    sqlDir: path.join(__dirname, '../sql'),
    modelsDir: path.join(__dirname, 'models/generated'),
    sequelizeImportPath: '../db'
});

(async () => {
    console.log('🔄 Generando vistas...');
    await generator.generateAllViews();
    console.log('✅ Vistas generadas correctamente');
})();
```

### Usar las Vistas
```typescript
// src/services/analytics.ts
import { UserSpending } from '../models/generated/user_spending';
import { CohortAnalysis } from '../models/generated/cohort_analysis';

export async function getTopSpenders(limit = 10) {
    return UserSpending.findAll({
        limit,
        order: [['total_spent', 'DESC']]
    });
}

export async function getCohortData() {
    return CohortAnalysis.findAll({
        order: [['cohort_month', 'ASC']]
    });
}

export async function refreshCohortView() {
    // Para vistas materializadas
    await CohortAnalysis.refreshView();
}
```

---

## Conclusión

**Sequelize View Builder** simplifica enormemente la complejidad de:
- ✅ Definición y mantenimiento de vistas SQL
- ✅ Gestión automática de dependencias y ordenamiento
- ✅ Generación automática de migrations y modelos
- ✅ Type-safety en TypeScript
- ✅ Multi-dialect support
- ✅ Performance optimization con materializadas e índices

Combina la potencia de SQL con la seguridad de tipos y DX (Developer Experience) moderna.

---

**Versión: 1.0.3** | **Actualizado: 2 de Abril, 2026**
