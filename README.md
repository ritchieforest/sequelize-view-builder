# 🏗️ sequelize-view-builder

> Generador programático y orquestador CLI de vistas SQL complejas perfectamente integradas con **Sequelize** y **TypeScript**.

[![npm version](https://badge.fury.io/js/sequelize-view-builder.svg)](https://badge.fury.io/js/sequelize-view-builder)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Sequelize-view-builder** nace para resolver el eslabón más débil de Sequelize: el manejo de Vistas. Te permite escribir consultas SQL enormes y dinámicas mediante una API fluida en TypeScript, resolver subconsultas fácilmente, **generar automáticamente las migraciones** y autodescubrir los "DataTypes" para crear tus **Modelos TypeScript dinámicos**.

¡Todo a nivel Empresarial soportando PostgreSQL, MySQL y SQL Server de manera agnóstica!

---

## 🚀 Instalación

Instala el paquete a través de tu gestor de paquetes favorito:

```bash
npm install sequelize-view-builder
```

---

## 🛠️ Nuevas Funciones "Killer Features"

1. **Vistas Materializadas**: Añade soporte a `CREATE MATERIALIZED VIEW` bajo demanda.
2. **Orquestador basado en Grafos DAG**: Resuelve el "Dependency Hell". Las vistas se evalúan en un Algoritmo Topológico, por lo que nunca fallarán si una vista depende de otra para su ejecución.
3. **Inyección de Asociaciones ORM (`.associate`)**: Las vistas generadas ya no quedan huérfanas: ¡podrán usarse con `include: [Model]` a través del auto-desarrollo del método `static associate`!
4. **Macros Agnósticas**: Funciones útiles que se traducen mágicamente al dialecto correcto (`DATE_FORMAT()`, `TO_CHAR()`, etc).

---

## 1️⃣ Creando vistas asombrosas con `ViewBuilder`

En lugar de construir enormes strings estáticos para vistas pesadas y sub-queries confusas, usa la API fluida. Soporta CTE (With), uniones, `HAVING`, y alias dinámicos. Guarda esto en un archivo (ej: `./src/views/usuarios_resumen.view.ts`).

```typescript
import { ViewBuilder } from 'sequelize-view-builder';
import { User, Post } from '../models'; // Tus modelos reales de Sequelize

export default () => {
  // 1. Construir una sub-consulta primero
  const last_post = new ViewBuilder()
    .from({ model: Post, alias: "sq1", select: [{ column: "id" }] })
    .where("user_id = u.id")
    .limit(1)
    .order({ "id": "DESC" });

  // 2. Construir la consulta principal combinada
  return new ViewBuilder()
    .title('user_with_last_post')
    // Novedad: Si usaste materializadas
    .materialized(true)
    // Novedad: Si quieres conectarle otro modelo final 
    .associate('User', 'belongsTo', { foreignKey: 'user_id' })
    .from({
        model: User,
        alias: 'u',
        select: [{ column: 'id', alias: 'user_id' }, { column: 'name', alias: 'user_name' }]
    })
    .join({
        model: Post,
        alias: 'p',
        on: { 
            'u.id': 'p.user_id',
            'p.id': `(${last_post.toSQLInline().replaceAll("\\n"," ")})` // <-- Integra tu subquery limpia!
        },
        select: [{ column: 'p.id', alias: 'post_count' }],
        type: 'LEFT'
    })
    .groupBy(['u.id', 'u.name'])
    // Novedad: Soporte total para filtado ulterior
    .having('COUNT(p.id) > 0');
}
```

---

## 2️⃣ Magia CLI de Orquestación y Tipado ¡En un comando!

No necesitas programar nada más. Tu `ViewBuilder` ya generó cómo será la vista, ahora deja que la terminal orqueste el tipado y auto-descubrimiento de la base de datos real.

Utiliza el binario de la consola a través de `npx`:

```bash
npx sequelize-view --config ./src/db.js --views ./src/views --models ./src/models --migrations ./db/migrations
```

### ¿Qué hace la CLI por debajo?
1. **Analiza el arbol**: Verifica si las vistas dependen entre sí usando grafos topológicos.
2. **Genera código Base**: Escribe el archivo nativo `.js` para el sistema de Migraciones de Sequelize (`up` y `down`).
3. **Escapado Dinámico Seguro**: Adapta el código utilizando el "Query Generator" interno de tu motor (Inyectando `" "` para Postgres o `` ` ` `` para MySQL protegiendo así tus palabras reservadas).
4. **Exporta Modelos de ORM reaccionables**: Va a la base de datos, revisa los verdaderos Datatypes (`INTEGER`, `BIGINT`, `STRING`) que tu vista devolvió, e inscribe una Clase TypeScript lista para importarse en tu API. 

**Ejemplo del Modelo TS generado:**
```typescript
import { Model, DataTypes } from 'sequelize';
// Tu conexión de config dinámicamente usada
import { sequelize } from '../../sequelize';

export class user_with_last_post extends Model {
  public user_id!: number;
  public user_name!: string;
  public post_count!: number;

  static associate(models: any) {
    // 🔗 ¡RELACIÓN AUTO-PRESERVADA DESDE TU BUILDER!
    this.belongsTo(models.User, {"foreignKey":"user_id"});
  }

  static async refreshView() {
    // 🔄 ¡COMO SE MARCÓ COMO MATERIALIZED, TIENE AUTOREFRESH!
    await this.sequelize?.query('REFRESH MATERIALIZED VIEW ' + this.tableName);
  }
}

user_with_last_post.init({
  user_id: { type: DataTypes.INTEGER, primaryKey: true },
  user_name: { type: DataTypes.STRING },
  post_count: { type: DataTypes.BIGINT }, // Tipos inferidos 100% correctos
}, {
  sequelize,
  tableName: 'user_with_last_post',
  timestamps: false,
});
```

---

## 🤝 Soporte a Macros Agnósticas

En vez de casarte con funciones `DATE_FORMAT()` que romperán si migras tu API de MySQL a Postgres, puedes usar nuestras macros abstractas desde `ViewBuilder.fn` (Ej: `ViewBuilder.fn.dateFormat('users.created_at', 'YYYY-MM-DD')`). El generador se encargará de traducir a `TO_CHAR` o `FORMAT` según corresponda.

## Comandos para Desarrolladores (Mantenimiento Core)

```bash
npm run build           # Traspila el TypeScript de src hacia dist/ (CLI bundleado)
```

MIT License © 2026 - Creado por [Villalba Ricardo Daniel](https://github.com/ritchieforests)
