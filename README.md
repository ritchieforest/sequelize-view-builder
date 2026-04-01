# 🏗️ sequelize-view-builder

> **The missing link between SQL power and Sequelize elegance.**

[![npm version](https://badge.fury.io/js/sequelize-view-builder.svg)](https://badge.fury.io/js/sequelize-view-builder)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()

**Sequelize-view-builder** is a dynamic typed orchestrator designed to solve the management of complex SQL views in Node.js/TypeScript ecosystems. Forget about static SQL strings and fragile manual migrations; define your views via a fluid API and let the orchestrator handle the rest.

---

## 💎 Potential and Added Value

### 1. Graph-Based Orchestration (DAG) 🧠
The biggest challenge with views is the dependency hierarchy. Our library uses a **topological sorting algorithm** to analyze which views depend on others. The CLI will always generate and execute migrations in the correct logical order, eliminating "table/view does not exist" errors.

### 2. Dynamic Type Safety (Auto-Inference) ⚡
Unlike other ORMs where you must write models by hand, our CLI **inspects the SQL engine catalog** in real-time. If your view returns a 20-digit `decimal` or a `uuid`, the generated TypeScript model will reflect exactly those types, ensuring total integrity in your code.

### 3. World-Class Materialized Views 🔄
Native support for materialized views with intelligent refresh capabilities (`refreshView()`) and automatic generation of **SQL indexes on the view**.

### 4. "Clean-Code" Migrations (SQL Integration) 📁
Generated migrations don't clutter your `.js` files with large SQL text blocks. Instead, they can be configured to **read external .sql files**, allowing your DBA team to work directly on the SQL while you maintain version control in the code.

---

## 🚀 Installation

```bash
npm install sequelize-view-builder
```

---

## 🛠️ Quick Start Guide

### 1. Define your data architecture in `/views`
Create clean and modular definitions (e.g., `user_report.view.ts`):

```typescript
import { ViewBuilder } from 'sequelize-view-builder';

export default new ViewBuilder()
  .title('user_summary_view')
  .materialized(true) // Support for materialized views
  .from({
    table: 'user_post_summary', // <-- NEW: Raw table/view name
    alias: 'ups',
    select: [{ column: 'user_id' }, { column: 'name' }]
  })
  .join({
    table: 'top_users', // <-- NEW: Join with another view
    alias: 'tu',
    on: { 'ups.user_id': 'tu.user_id' },
    select: [{ column: 'post_count', alias: 'total_posts' }],
    type: 'LEFT'
  })
  .dependsOn(['user_post_summary', 'top_users']) // 🔥 NEW: Array dependency support
  .groupBy(['ups.user_id', 'ups.name'])
  .associate('User', 'belongsTo', { foreignKey: 'user_id' }); // Inject ORM associations
```

> **IMPORTANT:**  
> If your view uses another view in the `FROM` or `JOIN` clause, **you must declare it** with `.dependsOn()`. This allows the orchestrator to generate migrations in the correct chronological order and ensures that when a base view is updated, all dependents are automatically refreshed in cascade.

### 2️⃣ Zero-Config Orchestration (CLI)

Instead of passing all paths via console, create a `sequelize-view.config.js` file in your project root:

```javascript
module.exports = {
  config: './src/db.ts',         // Sequelize instance
  views: './src/views',          // Folder with *.view.ts
  migrations: './migrations',    // Optional: JS Output
  sql: './out-sql',              // Optional: Pure SQL Output
  models: './src/models/views',  // Optional: Generated Models
  sequelizeImportPath: '@/db'    // Optional: Alias for sequelize import
};
```

### Simplified Commands ⚡

Now you can use ultra-short and intelligent commands:

*   **Migrate everything (Clear cache and force recreation):**
    ```bash
    npx sequelize-view --all
    ```
*   **Migrate a specific view (and its dependents):**
    ```bash
    npx sequelize-view user_post_summary
    ```
    *(The orchestrator will automatically detect which views call `user_post_summary` and recreate them in the correct order).*

---

## ⚙️ CLI Options (Overriding)

| Flag | Purpose | Default |
| :--- | :--- | :---: |
| `--config` | Path to `Sequelize` instance file. | Config File |
| `--views` | Folder with `*.view.ts` definitions. | Config File |
| `--migrations` | Directory for `.js` migrations. | Config File |
| `--sql` | Directory for raw `.sql` files. | Config File |
| `--models` | Directory for generated `.ts` models. | Config File |
| `--all` | Force update of the entire graph. | N/A |
| `[view_name]` | Force a specific view and its dependents. | N/A |

---

## 🌍 Dialect Agnostic Support

Thanks to the use of Sequelize internal frameworks, the generator automatically adapts the syntax for:
- ✅ **PostgreSQL** (Automatic use of double quotes and schemas)
- ✅ **MySQL / MariaDB** (Backticks and index optimization)
- ✅ **SQLite** (Simplified support for local testing)
- ✅ **SQL Server (MSSQL)** (Identifier protection brackets)

---
## 🌍 Languages

- 🇺🇸 English (default)
- 🇪🇸 [Español](./README.es.md)
- 🇧🇷 [Português](./README.pt.md)

## 🤝 Contributing
Have a great idea? We are open to PRs! 

```bash
npm install
npm run dev    # TypeScript compiler in watch mode
npm run build  # Final packaging for distribution
```

---


MIT License © 2026 - **Villalba Ricardo Daniel**
[GitHub Profile](https://github.com/ritchieforests)
