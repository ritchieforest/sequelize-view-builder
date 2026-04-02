# 🏗️ Sequelize View Builder

> **O elo perdido entre o poder do SQL e a elegância do Sequelize—Visualizações SQL type-safe sem fricção.**

<div align="center">

[![npm version](https://img.shields.io/npm/v/sequelize-view-builder.svg?style=flat-square)](https://www.npmjs.com/package/sequelize-view-builder)
[![downloads npm](https://img.shields.io/npm/dm/sequelize-view-builder.svg?style=flat-square)](https://www.npmjs.com/package/sequelize-view-builder)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.5%2B-blue?style=flat-square)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-16%2B-green?style=flat-square)](https://nodejs.org/)

**Disponível em:** [English](README.md) • [Español](README.es.md) • [Português](README.pt.md)

</div>

---

## 📖 Visão Geral

**Sequelize-view-builder** é uma biblioteca TypeScript pronta para produção que revoluciona como você gerencia visualizações SQL complexas em aplicações Node.js. Resolve uma lacuna crítica: visualizações SQL são poderosas, mas dolorosas de manter.

> ⚠️ **Importante**: Esta biblioteca é para **definir e gerenciar visualizações SQL persistentes** (armazenadas no BD), não para construir consultas dinâmicas. Uma vez criadas as visualizações, você as consulta usando modelos auto-gerados.

- ✅ **SQL type-safe** com modelos TypeScript auto-gerados
- ✅ **Resolução automática de dependências** via ordenação topológica
- ✅ **Suporte multi-dialeto** (MySQL, PostgreSQL, MSSQL, SQLite)
- ✅ **Visualizações materializadas** com capacidades de atualização e indexação
- ✅ **CLI sem configuração** com cache inteligente
- ✅ **Pronto para produção** com tratamento completo de erros

---

## 🎯 Quando Usar vs Quando NÃO Usar?

#### ✅ **PERFEITO PARA**
- Definir visualizações complexas reutilizáveis em sua aplicação
- Pré-calcular agregações e analytics
- JOINs complexos que você precisa reutilizar (relatórios, dashboards)
- Estruturas de dados críticas de performance (visualizações materializadas)
- Múltiplas visualizações com dependências complexas
- Equipes onde visualizações precisam de documentação

#### ❌ **NÃO ESTÁ PROJETADO PARA**
- Construir consultas dinâmicas baseadas em entrada do usuário
- Consultas SQL de uma única vez
- Substituir query builders como KNEX
- Consultas analíticas ad-hoc
- WHEREs dinâmicos que mudam por solicitação

Se você precisa de consultas dinâmicas, use **métodos integrados do Sequelize** ou um **query builder** em seu lugar.

## 🎯 Características Principais

### 📖 [DOCUMENTACAO_COMPLETA.md](./DOCUMENTACION_COMPLETA.md)
Guia exaustiva com referência completa de API, casos de uso avançados e melhores práticas.

### ⚡ [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
Folha de referência rápida com exemplos, tabela de métodos e resolução de problemas.

### 1. **Orquestração Baseada em Grafos (DAG)** 🧠
Algoritmo topológico que automaticamente:
- Analisa dependências de visualizações
- Gera migrações em ordem lógica correta
- Detecta ciclos com mensagens úteis
- Propaga atualizações quando uma visualização base muda

### 2. **SQL Type-Safe com Inferência Dinâmica** ⚡
Nosso CLI inspeciona o esquema do BD em tempo real:
- Modelos TypeScript perfeitamente tipados
- Definições de colunas precisas
- Suporte de autocomplete em IDE

### 3. **Visualizações Materializadas + Indexação** 🔄
Suporte de primeira classe:
- `.materialized(true)` para visualizações persistentes
- Criação automática de índices
- Método `.refreshView()` para atualizações

### 4. **Suporte Multi-Dialeto** 🌍
Adaptação automática para:
- ✅ PostgreSQL, MySQL/MariaDB, SQLite, SQL Server

### 5. **Migrações "Clean Code"** 📁
- Referenciam arquivos `.sql` externos
- Diffs Git mais limpos
- Colaboração facilitada

---

## 🚀 Instalação

```bash
npm install sequelize-view-builder
```

### Requisitos
- Node.js ≥ 16.0.0
- TypeScript ≥ 4.5
- Sequelize ≥ 6.0.0

---

## 🛠️ Início Rápido

### Passo 1: Criar Visualizações

```typescript
// src/views/user_posts.view.ts
import { ViewBuilder } from 'sequelize-view-builder';
import { User, Post } from '../models';

export default new ViewBuilder()
  .title('user_posts')
  .from({ model: User, alias: 'u' })
  .join({ model: Post, alias: 'p', on: {'u.id': 'p.user_id'} })
  .groupBy(['u.id'])
  .dependsOn('users', 'posts');
```

### Passo 2: Configuração

```javascript
// sequelize-view.config.js
module.exports = {
  config: './src/db.ts',
  views: './src/views',
  migrations: './migrations',
  models: './src/models/generated'
};
```

### Passo 3: Gerar

```bash
npx sequelize-view
```

### Passo 4: Usar

```typescript
import { UserPosts } from './models/generated';
const data = await UserPosts.findAll();
```

---

## 📚 Documentação Completa

Para dominar a biblioteca, consulte:

**📖 [DOCUMENTACAO_COMPLETA.md](./DOCUMENTACION_COMPLETA.md)** - Guia de 5000+ linhas
- API completa (30+ métodos)
- Padrões avançados
- Casos de estudo reais
- Dicas de otimização

**⚡ [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Folha de referência rápida
- Tabela de métodos
- Exemplos comuns
- Resolução de problemas

---

## 🔒 Segurança

### Prevenção de SQL Injection

✅ **Seguro**: Use modelos Sequelize
```typescript
.from({ model: User, alias: 'u' })  // Auto-cotado
```

❌ **Perigo**: Interpolar entrada de usuário
```typescript
.where(`id = ${userId}`)  // NUNCA faça isso!
```

### Melhores Práticas

1. Use modelos Sequelize quando possível
2. Nunca interpole entrada de usuário em SQL bruto
3. Valide nomes de visualização fornecidos externamente
4. Mantenha permissões de visualização no BD
5. Audite migrações geradas antes de implantar

---

## 📊 Performance

| Cenário | Tempo |
|---------|-------|
| Visualização simples | < 100ms |
| Visualização complexa (5 joins) | 150-300ms |
| DAG completo (20 visualizações) | 2-5s |
| Cache hit | < 10ms |

### Dicas de Otimização

**Para visualizações normais:**
```typescript
.where('deleted_at IS NULL')
.limit(10000)
```

**Para visualizações materializadas:**
```typescript
.materialized(true)
.index(['user_id'], {unique: true})
```

---

## 🤝 Contribuindo

Adoramos contribuições!

### Setup de Desenvolvimento

```bash
git clone https://github.com/ritchieforest/sequelize-view-builder.git
cd sequelize-view-builder
npm install
npm run dev
npm run build
```

### Tipos de Contribuições

1. **Correções de Erros**: Com testes
2. **Características**: Discuta primeiro
3. **Documentação**: Melhorias e exemplos
4. **Traduções**: Outros idiomas
5. **Exemplos**: Casos reais

### Diretrizes

```bash
git checkout -b feature/minha-feature
# Fazer alterações + testes
npm test
npm run build
git push origin feature/minha-feature
```

---

## 🚀 Melhorias & Roadmap

Mantemos um **roadmap abrangente** que detalha nossa visão estratégica e recursos planejados:

📖 **[IMPROVEMENTS.md](./IMPROVEMENTS.md)** - Documento de roadmap completo incluindo:
- Status atual e objetivos estratégicos
- Detalhamento versão por versão (v1.1, v1.2, v2.0 e além)
- Planos de otimização de performance
- Roadmap de melhorias de segurança
- Melhorias na experiência do desenvolvedor
- Roadmap de recursos corporativos
- Oportunidades de contribuição da comunidade
- Métricas de sucesso

### Visão Rápida

**v1.1.0 (Q2 2026)**: Automação & Visibilidade
- Agendador automático de atualização de visualizações
- Visualização de dependências em tempo real
- Snapshots de migrações e rollback
- Sistema de plugins para geradores

**v1.2.0 (Q3 2026)**: Recursos Avançados
- Suporte de chave primária composta
- Estratégias personalizadas de nomenclatura
- Ferramentas de análise de performance
- Linter de prevenção de injeção SQL

**v2.0.0 (Q4 2026)**: Aprimoramentos Maiores
- Geração de esquema GraphQL
- Framework de testes de visualizações
- Simulação e dry-run de migrações
- Monitoramento de esquema em tempo real

### Ideias Impulsionadas pela Comunidade 🤝

Tem uma solicitação de recurso? [Abra uma issue](https://github.com/ritchieforest/sequelize-view-builder/issues), [inicie uma discussão](https://github.com/ritchieforest/sequelize-view-builder/discussions), ou consulte [IMPROVEMENTS.md](./IMPROVEMENTS.md) para saber como contribuir com ideias.

---

## 🆘 Solução de Problemas

### "View does not exist"
Verifique `.dependsOn()`. As visualizações devem ser criadas em ordem de dependência.

### "Circular dependency detected"
Revise seus `dependsOn()` para ciclos. Desenhe o gráfico de dependências.

### As importações falham
Configure `sequelizeImportPath` corretamente no config.

### Cache não se atualiza
```bash
rm .view-cache.json
npx sequelize-view --all
```

---

## 📝 Licença

MIT License © 2026 - **Villalba Ricardo Daniel**

[Perfil GitHub](https://github.com/ritchieforest) • [npm](https://www.npmjs.com/package/sequelize-view-builder)

---

## 🌍 Idiomas

- 🇺🇸 [English](README.md)
- 🇪🇸 [Español](README.es.md)
- 🇧🇷 [Português](README.pt.md)

