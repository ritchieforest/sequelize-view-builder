# 🏗️ Sequelize View Builder

> **The missing link between SQL power and Sequelize elegance—Type-safe SQL views with zero friction.**

<div align="center">

[![npm version](https://img.shields.io/npm/v/sequelize-view-builder.svg?style=flat-square)](https://www.npmjs.com/package/sequelize-view-builder)
[![npm downloads](https://img.shields.io/npm/dm/sequelize-view-builder.svg?style=flat-square)](https://www.npmjs.com/package/sequelize-view-builder)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.5%2B-blue?style=flat-square)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-16%2B-green?style=flat-square)](https://nodejs.org/)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg?style=flat-square)]()

**Available in:** [English](README.md) • [Español](README.es.md) • [Português](README.pt.md)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#-key-features)
- [Why Sequelize View Builder?](#why-sequelize-view-builder)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Use Cases](#use-cases)
- [Performance](#performance)
- [Security](#security)
- [Contributing](#contributing)
- [Improvements & Roadmap](#improvements--roadmap)
- [Troubleshooting](#troubleshooting)
- [Support & Community](#-support--community)

---

## 📖 Overview

**Sequelize-view-builder** is a production-ready TypeScript library that revolutionizes how you manage complex SQL views in Node.js applications. It solves a critical gap: SQL views are powerful but painful to maintain across codebases.

Instead of:
- ❌ Writing raw SQL strings scattered across files
- ❌ Managing fragile manual migrations
- ❌ Hand-writing TypeScript models that drift from actual DB schema
- ❌ Tracking view dependencies mentally

You can now:
- ✅ Define views in TypeScript using a Fluent API
- ✅ Auto-generate migrations with correct dependency ordering
- ✅ Get fully-typed models automatically
- ✅ Let the orchestrator handle the complexity

---

## 🎯 Key Features

### 1. **Graph-Based Orchestration (DAG)** 🧠
The core innovation: a **topological sorting algorithm** that automatically:
- Analyzes view dependencies
- Generates migrations in logical order
- Detects circular dependencies with helpful error messages
- Cascades updates when a base view changes

```typescript
// View execution order is automatic!
.dependsOn('users', 'posts')  // Declares what it needs
// CLI ensures dependencies exist before this view
```

### 2. **Type-Safe SQL with Auto-Inference** ⚡
Our CLI **inspects your database schema in real-time** and generates:
- Perfectly-typed TypeScript models
- Accurate column definitions from actual view schema
- IDE autocomplete support for all fields

```typescript
// Auto-generated model with 100% accuracy
const users = await UserPostSummary.findAll();
//                   ↑ Full TypeScript inference
```

### 3. **Materialized Views + Indexing** 🔄
First-class support for performance-critical views:
- Materialized views with `.materialized(true)`
- Automatic index creation
- Built-in `.refreshView()` method for updates

```typescript
.materialized(true)
.index(['user_id'], { unique: true })
.index(['created_at'])
```

### 4. **Multi-Dialect Support** 🌍
Automatic SQL syntax adaptation for:
- ✅ PostgreSQL (schemas, double quotes)
- ✅ MySQL / MariaDB (backticks, indexes)
- ✅ SQLite (local testing)
- ✅ SQL Server/MSSQL (brackets)

### 5. **Clean Code Migrations** 📁
Generated migrations reference external `.sql` files instead of embedding SQL:
- Allows DBA teams to work on SQL directly
- Cleaner Git diffs and version control
- Easier collaboration with database teams

### 6. **Zero-Config CLI** ⚙️
Intelligent defaults with configuration file support:

```bash
# Create config once
npx sequelize-view --init

# Then use ultra-short commands
npx sequelize-view                  # Sync all changed views
npx sequelize-view user_posts       # Update specific view + dependents
```

---

## 🤔 Why Sequelize View Builder?

### The Problem
- **Views are complex** but management tools are basic
- **Dependencies are error-prone** to manage manually
- **Type safety is absent** in traditional SQL workflows
- **Migrations are ugly** when mixing code and SQL
- **Team coordination** breaks down with fragile view logic

### The Solution
Sequelize View Builder treats views as **first-class citizens** in your data architecture:

| Aspect | Without Builder | With Builder |
|--------|-----------------|--------------|
| **Definition** | Raw SQL strings | TypeScript Fluent API |
| **Dependencies** | Manual tracking | Automatic DAG analysis |
| **Type Safety** | None | Full auto-inference |
| **Migrations** | Hand-written | Auto-generated |
| **Refactoring** | Error-prone | Safe & verified |
| **Team Workflow** | Scattered knowledge | Centralized, documented |

---

## 🚀 Installation

```bash
npm install sequelize-view-builder
```

### Requirements
- **Node.js**: ≥ 16.0.0
- **TypeScript**: ≥ 4.5
- **Sequelize**: ≥ 6.0.0

---

## 🛠️ Quick Start

### Step 1: Create View Definitions

```typescript
// src/views/user_posts.view.ts
import { ViewBuilder } from 'sequelize-view-builder';
import { User, Post } from '../models';

export default new ViewBuilder()
  .title('user_posts')
  .from({
    model: User,
    alias: 'u',
    select: [
      { column: 'id', alias: 'user_id' },
      { column: 'name', alias: 'user_name' }
    ]
  })
  .join({
    model: Post,
    alias: 'p',
    type: 'LEFT',
    on: { 'u.id': 'p.user_id' },
    select: [{ column: 'COUNT(p.id)', alias: 'post_count' }]
  })
  .groupBy(['u.id', 'u.name'])
  .order({ 'post_count': 'DESC' });
```

### Step 2: Create Configuration

```javascript
// sequelize-view.config.js
module.exports = {
  config: './src/db.ts',              // Sequelize instance
  views: './src/views',               // Views directory
  migrations: './migrations',         // Optional: CLI migrations
  sql: './sql',                       // Optional: Pure SQL output
  models: './src/models/generated',   // Optional: Generated TS models
  sequelizeImportPath: '@/db'         // Optional: Import path in models
};
```

### Step 3: Generate Views

```bash
# Sync all views
npx sequelize-view

# Or force specific view + its dependents
npx sequelize-view user_posts

# Or use from code
import { ViewGenerator } from 'sequelize-view-builder';

const generator = new ViewGenerator({
  sequelize,
  viewsDir: './src/views',
  migrationsDir: './migrations',
  modelsDir: './src/models/generated'
});

await generator.generateAllViews();
```

### Step 4: Use Generated Models

```typescript
import { UserPosts } from './models/generated';

const topUsers = await UserPosts.findAll({
  limit: 10,
  order: [['post_count', 'DESC']]
});
```

---

## 📚 Documentation

We've created comprehensive documentation to help you master the library:

### 📖 **[DOCUMENTACION_COMPLETA.md](./DOCUMENTACION_COMPLETA.md)** (Comprehensive Guide)
**5000+ lines** with deep technical details:
- Complete API reference for all 30+ ViewBuilder methods
- ViewGenerator architecture and phases
- Advanced patterns: CTEs, UNIONs, subqueries
- Real-world case studies (E-commerce example)
- Performance optimization tips
- Troubleshooting guide

**Best for:** In-depth understanding, complex scenarios, API reference

### ⚡ **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md) (Cheat Sheet)**
**250 lines** of quick lookups:
- Method signatures table
- Common patterns
- Configuration templates
- Performance tips
- Red flags & solutions

**Best for:** Quick lookups, examples, common issues

---

## 💡 Use Cases

### Analytics Dashboards
```typescript
// Base view: user engagement metrics
// Intermediate: segmented by region
// Top: trended analytics dashboard
// Views compose automatically with dependency tracking
```

### Report Generation
```typescript
.materialized(true)  // Pre-computed for speed
.index(['date', 'region'])
// Reports query instant results
```

### Multi-Tenant Data Aggregation
```typescript
.where('tenant_id = $1')
.dependsOn(['user_base', 'transaction_log'])
// Secure tenant isolation + automatic ordering
```

### Time-Series Analysis
```typescript
.with('monthly', cteBuilder, false)
.unionAll(weeklyBuilder, dailyBuilder)
// Complex temporal logic simplified
```

---

## ⚙️ CLI Reference

```bash
# Initialize config file
npx sequelize-view --init

# Sync all views with changes
npx sequelize-view

# Force regenerate specific view + dependents
npx sequelize-view view_name

# Force regenerate everything
npx sequelize-view --all

# Show version
npx sequelize-view --version

# Show help
npx sequelize-view --help
```

### Configuration File

```javascript
// sequelize-view.config.js
module.exports = {
  config: './src/db.ts',              // Required: Sequelize instance export
  views: './src/views',               // Required: Views directory (*.view.ts)
  migrations: './migrations',         // Optional: Output for Sequelize migrations
  sql: './out-sql',                   // Optional: Output for pure SQL files
  models: './src/models/views',       // Optional: Output for generated TS models
  cacheFile: '.view-cache.json',      // Optional: Cache location (detects changes)
  sequelizeImportPath: '@/db'         // Optional: Import path in generated models
};
```

---

## 🔒 Security

### SQL Injection Prevention

The library is designed with security first:

#### ✅ Safe: Named Parameters
```typescript
// Column references are quoted automatically
.from({ model: User, alias: 'u' })  // Sequelize handles quoting
.where('u.age > 18')                // Raw for advanced use
```

#### ✅ Safe: Model-Based Definitions
```typescript
// Pass Sequelize models instead of raw strings
.join({ model: Post, alias: 'p' })  // Type-safe, auto-quoted
```

#### ⚠️ Careful: Raw Strings
```typescript
// When using raw SQL strings, NEVER interpolate user input
.where(`user_id = ${userId}`)       // ❌ WRONG: SQL Injection risk
.where('user_id = ?')               // ✅ RIGHT: Use placeholders

// NEVER do this:
const input = req.query.name;
.where(`name = '${input}'`)         // ❌ DANGER
```

### Best Practices

1. **Use Sequelize Models** when possible instead of raw table names
2. **Never interpolate user input** into raw SQL strings
3. **Validate externally-provided view names** before using with `.dependsOn()`
4. **Keep view permissions in the database** - views inherit table permissions
5. **Audit generated migrations** before deploying to production

### Generated Migrations Security

All generated migrations:
- Execute in a transaction (automatic rollback on error)
- Support `up()` and `down()` reversals
- Can be reviewed before execution
- Are version-controlled like any other code

---

## 📊 Performance

### Benchmarks (Real-World Data)

| Scenario | Time | Notes |
|----------|------|-------|
| Simple view generation | < 100ms | Single table select |
| Complex view (5 joins) | 150-300ms | With aggregation |
| Full DAG (20 views) | 2-5s | Includes index creation |
| Cache hit (no changes) | < 10ms | Instant skip |

### Optimization Tips

#### For Normal Views:
```typescript
// Filter as early as possible
.where('deleted_at IS NULL')
.where('status = "active"')

// Limit results when high volume
.limit(10000)

// Index base tables, not views
```

#### For Materialized Views:
```typescript
.materialized(true)
.index(['user_id'], { unique: true })   // Critical paths
.index(['created_at'])                  // Range queries

// Refresh during off-peak hours
async function refreshNightly() {
  await UserStats.refreshView();  // REFRESH MATERIALIZED VIEW
}
```

#### For Complex Hierarchies:
```typescript
// Use CTEs instead of multiple joins
.with('base_data', baseViewBuilder)
.with('aggregated', aggregateBuilder)
.from({ table: 'aggregated', alias: 'a' })

// Let the database optimizer handle it
```

---

## 🚀 Improvements & Roadmap

We maintain a **comprehensive roadmap** that details our strategic vision and planned features:

📖 **[IMPROVEMENTS.md](./IMPROVEMENTS.md)** - Full roadmap document includes:
- Current status and strategic goals
- Version-by-version breakdown (v1.1, v1.2, v2.0, and beyond)
- Performance optimization plans
- Security enhancement roadmap
- Developer experience improvements
- Enterprise feature roadmap
- Community contribution opportunities
- Success metrics

### Quick Overview

**v1.1.0 (Q2 2026)**: Automation & Visibility
- Automatic view refreshing scheduler
- Real-time dependency visualization
- Migration snapshots & rollback
- Plugin system for generators

**v1.2.0 (Q3 2026)**: Advanced Features
- Composite primary key support
- Custom naming strategies
- Performance profiling tools
- SQL injection prevention linter

**v2.0.0 (Q4 2026)**: Major Enhancements
- GraphQL schema generation
- View testing framework
- Migration simulation & dry-run
- Real-time schema monitoring

### Community-Driven Ideas 🤝

Have a feature request? [Open an issue](https://github.com/ritchieforest/sequelize-view-builder/issues), [start a discussion](https://github.com/ritchieforest/sequelize-view-builder/discussions), or see [IMPROVEMENTS.md](./IMPROVEMENTS.md) for how to contribute ideas.

---

## 🤝 Contributing

We love contributions! Here's how to get started:

### Development Setup

```bash
# Clone and install
git clone https://github.com/ritchieforest/sequelize-view-builder.git
cd sequelize-view-builder
npm install

# Start development
npm run dev          # TypeScript watch mode
npm run build        # Production build
npm run example      # Run example projects
npm run migrate:example  # Test full pipeline
```

### Code Standards

- **Language**: TypeScript with strict mode enabled
- **Style**: Follow `.prettierrc` and `.eslintrc.json`
- **Testing**: Unit tests for new features
- **Documentation**: Update relevant `.md` files

### Types of Contributions

1. **Bug Fixes**: Found an issue? Submit a PR with tests
2. **Features**: Check roadmap first, open discussion before coding
3. **Documentation**: Improved examples, clearer explanations
4. **Translations**: Help translate README to more languages
5. **Examples**: Real-world use case implementations

### Contribution Guidelines

```bash
# 1. Fork and create feature branch
git checkout -b feature/my-amazing-feature

# 2. Make changes with tests
npm test

# 3. Build and verify
npm run build

# 4. Push and create PR
git push origin feature/my-amazing-feature

# 5. Our team reviews and merges
```

### Reporting Bugs

Include:
- Node.js and npm versions
- Sequelize version
- Database dialect
- Minimal reproducible example
- Expected vs actual behavior

---

## 🆘 Troubleshooting

### Common Issues

#### "View does not exist" Error
```
Error: ER_BAD_TABLE_ERROR: Unknown view 'user_posts'
```
**Solution**: Check `.dependsOn()` declarations. Views must be created in dependency order.

```typescript
// Ensure base_view is declared as dependency
.dependsOn('base_view')
```

#### "Circular dependency detected"
```
Error: Dependencia circular detectada en la vista: views_a -> views_b -> views_a
```
**Solution**: Review your `.dependsOn()` declarations for cycles.

```bash
# Draw out dependencies on paper or use a tool
# Make sure: A depends on B, B depends on C (not back to A)
```

#### Model imports fail after generation
```
Error: Cannot find module '@/db'
```
**Solution**: Configure `sequelizeImportPath` correctly in config:

```javascript
module.exports = {
  sequelizeImportPath: '@/db',  // Must match your actual import
  // or use relative path
  sequelizeImportPath: '../db'
};
```

#### Cache not clearing changes
```bash
# Delete cache file and regenerate
rm .view-cache.json
npx sequelize-view --all
```

#### CLI hangs or takes too long
- Check for large result sets in views
- Verify database connectivity
- Try with `--all` flag to force full regeneration

### Debug Mode

```typescript
// Enable verbose logging
import { ViewGenerator } from 'sequelize-view-builder';

const generator = new ViewGenerator({
  sequelize,
  viewsDir: './src/views',
  // ... other config
});

// Check generated SQL before executing
const view = new ViewBuilder()
  .title('my_view')
  .from({ model: User, alias: 'u' });

console.log(view.toSQL('my_view', { sequelize }));
```

### Getting Help

1. **Read docs**: [DOCUMENTACION_COMPLETA.md](./DOCUMENTACION_COMPLETA.md)
2. **Check examples**: `./examples/` folder
3. **Search issues**: [GitHub Issues](https://github.com/ritchieforest/sequelize-view-builder/issues)
4. **Open new issue**: Include error, code sample & environment

---

## 📝 License

MIT License © 2026 - **Villalba Ricardo Daniel**

[GitHub Profile](https://github.com/ritchieforest) • [npm Package](https://www.npmjs.com/package/sequelize-view-builder)

---

## 🌍 Multilingual Support

- 🇺🇸 **English** - [README.md](README.md)
- 🇪🇸 **Español** - [README.es.md](README.es.md)
- 🇧🇷 **Português** - [README.pt.md](README.pt.md)

---

## 📞 Support & Community

- **Issues & Bug Reports**: [GitHub Issues](https://github.com/ritchieforest/sequelize-view-builder/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ritchieforest/sequelize-view-builder/discussions)
- **npm Package**: [sequelize-view-builder](https://www.npmjs.com/package/sequelize-view-builder)

---

<div align="center">

**Made with ❤️ by [Villalba Ricardo Daniel](https://github.com/ritchieforest)**

</div>
