# 🏗️ sequelize-view-builder

> **O elo perdido entre a potência do SQL e a elegância do Sequelize.**

[![npm version](https://badge.fury.io/js/sequelize-view-builder.svg)](https://badge.fury.io/js/sequelize-view-builder)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()

**Sequelize-view-builder** é um orquestrador tipado dinâmico projetado para resolver o gerenciamento de views SQL complexas em ecossistemas Node.js/TypeScript. Esqueça as strings de SQL estáticas e as migrações manuais frágeis; defina suas views através de uma API fluida e deixe o orquestrador cuidar do resto.

---

## 💎 Potencial e Valor Agregado

### 1. Orquestração Baseada em Grafos (DAG) 🧠
O maior desafio das views é a hierarquia de dependências. Nossa biblioteca utiliza um **algoritmo de ordenação topológica** para analisar quais views dependem de outras. O CLI sempre gerará e executará as migrações na ordem lógica correta, eliminando o erro de "table/view does not exist".

### 2. Tipagem Segura Dinâmica (Auto-Inference) ⚡
Diferente de outros ORMs onde você deve escrever os modelos manualmente, nosso CLI **inspeciona o catálogo do motor SQL** em tempo real. Se sua view retornar um `decimal` de 20 dígitos ou um `uuid`, o modelo TypeScript gerado refletirá exatamente esses tipos, garantindo integridade total no seu código.

### 3. Views Materializadas de Classe Mundial 🔄
Suporte nativo para views materializadas com capacidades de atualização inteligente (`refreshView()`) e geração automática de **índices SQL sobre a view**.

### 4. Migrações "Clean-Code" (Integração SQL) 📁
As migrações geradas não poluem seus arquivos `.js` com grandes blocos de texto SQL. Em vez disso, podem ser configuradas para **ler arquivos .sql externos**, permitindo que sua equipe de DBAs trabalhe diretamente no SQL enquanto você mantém o controle de versão no código.

---

## 🚀 Instalação

```bash
npm install sequelize-view-builder
```

---

## 🛠️ Guia Rápido

### 1. Defina sua arquitetura de dados em `/views`
Crie definições limpas e modulares (ex: `user_report.view.ts`):

```typescript
import { ViewBuilder } from 'sequelize-view-builder';

export default new ViewBuilder()
  .title('user_summary_view')
  .materialized(true) // Suporte para views materializadas
  .from({
    table: 'user_post_summary', // <-- NOVO: Nome de tabela/view bruto
    alias: 'ups',
    select: [{ column: 'user_id' }, { column: 'name' }]
  })
  .join({
    table: 'top_users', // <-- NOVO: Join com outra view
    alias: 'tu',
    on: { 'ups.user_id': 'tu.user_id' },
    select: [{ column: 'post_count', alias: 'total_posts' }],
    type: 'LEFT'
  })
  .dependsOn(['user_post_summary', 'top_users']) // 🔥 NOVO: Suporte para array de dependências
  .groupBy(['ups.user_id', 'ups.name'])
  .associate('User', 'belongsTo', { foreignKey: 'user_id' }); // Injeta associações ORM
```

> [!IMPORTANT]
> **Por que usar `.dependsOn()`?**  
> Se sua view utiliza outra view no `FROM` ou `JOIN`, **você deve declará-la** com `.dependsOn()`. Isso permite que o orquestador gere as migrações na ordem cronológica correta e garante que, ao atualizar uma view base, todas as dependentes sejam atualizadas automaticamente em cascata.

### 2️⃣ Orquestração com Zero Configuração (CLI)

Em vez de passar todos os caminhos via console, crie um arquivo `sequelize-view.config.js` na raiz do seu projeto:

```javascript
module.exports = {
  config: './src/db.ts',         // Instância do Sequelize
  views: './src/views',          // Pasta com *.view.ts
  migrations: './migrations',    // Opcional: Saída JS
  sql: './out-sql',              // Opcional: Saída SQL puro
  models: './src/models/views',  // Opcional: Modelos gerados
  sequelizeImportPath: '@/db'    // Opcional: Alias para import do sequelize
};
```

### Comandos Simplificados ⚡

Agora você pode usar comandos ultra-curtos e inteligentes:

*   **Migrar tudo (Limpar cache e forçar recriação):**
    ```bash
    npx sequelize-view --all
    ```
*   **Migrar uma view específica (e suas dependentes):**
    ```bash
    npx sequelize-view user_post_summary
    ```
    *(O orquestrador detectará automaticamente quais views chamam `user_post_summary` e as recriará na ordem correta).*

---

## ⚙️ Opções do CLI (Overriding)

| Flag | Propósito | Default |
| :--- | :--- | :---: |
| `--config` | Caminho para o arquivo da instância `Sequelize`. | Arquivo Config |
| `--views` | Pasta com as definições `*.view.ts`. | Arquivo Config |
| `--migrations` | Diretório para migrações `.js`. | Arquivo Config |
| `--sql` | Diretório para arquivos `.sql` brutos. | Arquivo Config |
| `--models` | Diretório para os modelos `.ts` gerados. | Arquivo Config |
| `--all` | Forçar atualização de todo o grafo. | N/A |
| `[view_name]` | Forçar uma view específica e suas dependentes. | N/A |

---

## 🌍 Suporte Agnóstico ao Dialeto

Graças ao uso de frameworks internos do Sequelize, o gerador adapta automaticamente a sintaxe para:
- ✅ **PostgreSQL** (Uso automático de aspas duplas e esquemas)
- ✅ **MySQL / MariaDB** (Backticks e otimização de índices)
- ✅ **SQLite** (Suporte simplificado para testes locais)
- ✅ **SQL Server (MSSQL)** (Colchetes de proteção de identificadores)

---

## 🤝 Contribuir
Tem uma ótima ideia? Estamos abertos a PRs! 

```bash
npm install
npm run dev    # Compilador TypeScript em modo watch
npm run build  # Empacotamento final para distribuição
```

---

MIT License © 2026 - **Villalba Ricardo Daniel**
[GitHub Profile](https://github.com/ritchieforests)
