# Quick Reference: ViewBuilder & ViewGenerator

## ViewBuilder - Interfaz Fluida para SQL

Una clase que construye declarativamente queries SQL mediante encadenamiento de métodos.

### Métodos Clave

| Método | Propósito | Ejemplo |
|--------|----------|---------|
| `title(name)` | Define nombre de vista | `.title('user_posts')` |
| `from(clause)` | Tabla/Modelo base | `.from({model: User, alias: 'u'})` |
| `join(clause)` | Agregar JOIN | `.join({model: Post, alias: 'p', on: {...}})` |
| `where(sql)` | Condición WHERE | `.where('age > 18')` |
| `groupBy(cols)` | Grupo de por | `.groupBy(['user_id'])` |
| `having(sql)` | Filtro post-GROUP | `.having('COUNT(*) > 5')` |
| `order(obj)` | Ordenamiento | `.order({'created_at': 'DESC'})` |
| `limit(num)` | Límite de filas | `.limit(10)` |
| `materialized(bool)` | Persistencia en disco | `.materialized(true)` |
| `dependsOn(...names)` | **Crítico** para ordenamiento | `.dependsOn('users', 'posts')` |
| `associate(model, type)` | Relación en modelo | `.associate('User', 'belongsTo')` |
| `index(cols, opts)` | Índice (mat. views) | `.index(['user_id'], {unique: true})` |

### Salidas

- `toSQLInline()` → SELECT puro
- `toSQL(name)` → DROP + CREATE VIEW
- `toMigration(name)` → Código Sequelize migration

---

## ViewGenerator - Orquestador Automático

Motor que descubre, ordena y genera vistas automáticamente.

### Configuración Mínima

```typescript
const generator = new ViewGenerator({
    sequelize,                    // Instancia BD activa
    viewsDir: 'src/views',        // Donde están .view.ts
    migrationsDir: 'migrations',  // Destino migrations
    sqlDir: 'sql',                // SQL puro
    modelsDir: 'models'           // Modelos TypeScript
});
```

### Uso

```typescript
// Genera todas con cambios detectados
await generator.generateAllViews();

// Fuerza una y sus dependientes
await generator.generateAllViews('user_posts');
```

### Flujo Automático

1. **Descubre** archivos `*.view.ts`
2. **Calcula hashes** SHA1 para detectar cambios
3. **Ordena topológicamente** por dependencias
4. **Genera** SQL → migrations → modelos → TypeScript
5. **Ejecuta** migrations en BD
6. **Cachea** para evitar regeneración innecesaria

---

## Pattern: Composición de Vistas

```typescript
// 1. Vista Base
export default new ViewBuilder()
    .title('user_posts')
    .from({model: User, alias: 'u'})
    .join({model: Post, alias: 'p', on: {...}});

// 2. Vista que Depende de 1
export default new ViewBuilder()
    .title('top_users')
    .from({table: 'user_posts', alias: 'up'})
    .dependsOn('user_posts')  // ← CRÍTICO
    .order({'post_count': 'DESC'});
```

**Orden automático de generación:**
1. user_posts (sin deps)
2. top_users (depende de 1)

---

## Archivos Generados

```
sqlDir/
  ├── user_posts.sql              (SQL puro)
  └── top_users.sql

migrationsDir/
  ├── 20260401112150-create-user-posts.js    (Migration auto-ejecutable)
  └── 20260401112151-create-top-users.js

modelsDir/
  ├── user_posts.ts               (Modelo con tipos)
  └── top_users.ts
  
.view-cache.json                  (Hashes para cambios)
```

---

## Casos de Uso Comunes

### ✅ Vista Simple
```typescript
new ViewBuilder()
    .title('active_users')
    .from({model: User, alias: 'u'})
    .where('deleted_at IS NULL');
```

### ✅ Vista Materializada + Índices
```typescript
new ViewBuilder()
    .title('user_stats')
    .materialized(true)
    .from(...)
    .index(['user_id'], {unique: true});
```

### ✅ Subqueries
```typescript
new ViewBuilder()
    .title('trending')
    .from({...})
    .whereIn('id', subqueryView)
    .whereExists(anotherView);
```

### ✅ UNION
```typescript
new ViewBuilder()
    .title('all_users_and_guests')
    .unionAll(usersView, guestsView);
```

### ✅ CTEs Recursivas
```typescript
new ViewBuilder()
    .title('hierarchy')
    .with('recursive_tree', cteBuilder, true)
    .from({table: 'recursive_tree', alias: 'rt'});
```

---

## Red Flags & Soluciones

| Problema | Causa | Fix |
|----------|-------|-----|
| Vista no se regenera | Hash en caché coincide | Borra `.view-cache.json` |
| "Circular dependency" | Ciclo en deps | Dibuja el grafo |
| Modelos sin tipos | Import path incorrecto | Configura `sequelizeImportPath` |
| SQL con errores de sintaxis | Alias incorrecto | Verifica `from()` y `join()` |

---

## CLI Equivalente

```bash
npx sequelize-view \
    --config src/db.ts \
    --views src/views \
    --migrations migrations \
    --sql sql \
    --models models
```

---

## Stack Completo: Archivo de Vista

```typescript
// src/views/users_with_posts.view.ts
import { ViewBuilder } from 'sequelize-view-builder';
import { User, Post } from '../models';

export default new ViewBuilder()
    // Definición
    .title('users_with_posts')
    
    // FROM
    .from({
        model: User,
        alias: 'u',
        select: [
            {column: 'id', alias: 'user_id'},
            {column: 'name'}
        ]
    })
    
    // JOIN
    .join({
        model: Post,
        alias: 'p',
        type: 'LEFT',
        on: {'u.id': 'p.user_id'},
        select: [{column: 'COUNT(*)', alias: 'post_count'}]
    })
    
   // Filtros
    .where('u.deleted_at IS NULL')
    .having('post_count > 0')
    
    // Agrupación
    .groupBy(['u.id', 'u.name'])
    
    // Ordenamiento
    .order({'post_count': 'DESC'})
    
    // Optimizaciones
    .limit(1000)
    .materialized(true)
    .index(['user_id'])
    
    // Metadatos
    .dependsOn('users', 'posts')
    .associate('User', 'hasMany', {as: 'posts'});
```

---

## Performance Tips

1. **Usa `materialized(true)` para:**
   - Agregaciones complejas
   - Queries consultadas frecuentemente
   - Datos que no cambian en tiempo real

2. **Agrega índices en materializadas:**
   ```typescript
   .index(['user_id'], {unique: true})
   .index(['created_at'])
   ```

3. **Filtra temprano en WHERE:**
   ```typescript
   .where('created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)')
   ```

4. **Para actualizaciones de mat. views:**
   ```typescript
   // En modelo generado
   await UserStats.refreshView({concurrently: true});
   ```
