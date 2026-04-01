# 🏗️ sequelize-view-builder

> **El eslabón perdido entre la potencia de SQL y la elegancia de Sequelize.**

[![npm version](https://badge.fury.io/js/sequelize-view-builder.svg)](https://badge.fury.io/js/sequelize-view-builder)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()

**Sequelize-view-builder** es un orquestador tipado dinámico diseñado para resolver el manejo de vistas SQL complejas en ecosistemas Node.js/TypeScript. Olvídate de los strings de SQL estáticos y las migraciones manuales frágiles; define tus vistas mediante una API fluida y deja que el orquestador se encargue del resto.

---

## 💎 Potencial y Valor Agregado

### 1. Orquestación Basada en Grafos (DAG) 🧠
El mayor reto de las vistas es la jerarquía de dependencias. Nuestra librería utiliza un **algoritmo de ordenamiento topológico** para analizar qué vistas dependen de otras. El CLI siempre generará y ejecutará las migraciones en el orden lógico correcto, eliminando el error de "table/view does not exist".

### 2. Tipado Seguro Dinámico (Auto-Inference) ⚡
A diferencia de otros ORMs donde debes escribir los modelos a mano, nuestro CLI **inspecciona el catálogo del motor SQL** en tiempo real. Si tu vista devuelve un `decimal` de 20 dígitos o un `uuid`, el modelo TypeScript generado reflejará exactamente esos tipos, garantizando integridad total en tu código.

### 3. Vistas Materializadas de Clase Mundial 🔄
Soporte nativo para vistas materializadas con capacidades de refresco inteligentes (`refreshView()`) y generación automática de **índices SQL sobre la vista**.

### 4. Migraciones "Clean-Code" (SQL Integration) 📁
Las migraciones generadas no ensucian tus archivos `.js` con bloques de texto SQL. En su lugar, pueden configurarse para **leer archivos .sql externos**, permitiendo que tu equipo de DBAs trabaje directamente sobre el SQL mientras tú mantienes el control de la versión en el código.

---

## 🚀 Instalación

```bash
npm install sequelize-view-builder
```

---

## 🛠️ Guía Rápida

### 1. Define tu arquitectura de datos en `/views`
Crea definiciones limpias y modulares (ej: `user_report.view.ts`):

```typescript
import { ViewBuilder } from 'sequelize-view-builder';

export default new ViewBuilder()
  .title('user_summary_view')
  .materialized(true) // Soporte para vistas materializadas
  .from({
    table: 'user_post_summary', // <-- NUEVO: Nombre de tabla/vista crudo
    alias: 'ups',
    select: [{ column: 'user_id' }, { column: 'name' }]
  })
  .join({
    table: 'top_users', // <-- NUEVO: Join con otra vista
    alias: 'tu',
    on: { 'ups.user_id': 'tu.user_id' },
    select: [{ column: 'post_count', alias: 'total_posts' }],
    type: 'LEFT'
  })
  .dependsOn(['user_post_summary', 'top_users']) // 🔥 NUEVO: Soporte para array de dependencias
  .groupBy(['ups.user_id', 'ups.name'])
  .associate('User', 'belongsTo', { foreignKey: 'user_id' }); // Inyecta asociaciones al modelo TS
```

> **IMPORTANTE:**  
> Si tu vista utiliza otra vista en el `FROM` o `JOIN`, **debes declararla** con `.dependsOn()`. Esto permite que el orquestador genere las migraciones en el orden cronológico correcto y que, al actualizar una vista base, se refresquen automáticamente todas las dependientes en cascada.

### 2️⃣ Orquestación con Cero Configuración (CLI)

En vez de pasar todos los paths por consola, crea un archivo `sequelize-view.config.js` en la raíz de tu proyecto:

```javascript
module.exports = {
  config: './src/db.ts',         // Instancia de Sequelize
  views: './src/views',          // Carpeta con *.view.ts
  migrations: './migrations',    // Opcional: Salida JS
  sql: './out-sql',              // Opcional: Salida SQL puro
  models: './src/models/views',  // Opcional: Modelos generados
  sequelizeImportPath: '@/db'    // Opcional: Alias para import de sequelize
};
```

### Comandos Simplificados ⚡

Ahora puedes usar comandos ultra-cortos e inteligentes:

*   **Migrar todo (Limpiar caché y forzar recreación):**
    ```bash
    npx sequelize-view --all
    ```
*   **Migrar una vista específica (y sus dependientes):**
    ```bash
    npx sequelize-view user_post_summary
    ```
    *(El orquestador detectará automáticamente qué vistas llaman a `user_post_summary` y las recreará en el orden correcto).*

---

## ⚙️ Opciones del CLI (Overriding)

| Bandera | Propósito | Default |
| :--- | :--- | :---: |
| `--config` | Archivo de instancia de `Sequelize`. | Config File |
| `--views` | Carpeta de definiciones `*.view.ts`. | Config File |
| `--migrations` | Directorio para migraciones `.js`. | Config File |
| `--sql` | Directorio para archivos `.sql` puros. | Config File |
| `--models` | Directorio para los Modelos `.ts`. | Config File |
| `--all` | Forzar actualización de todo el grafo. | N/A |
| `[view_name]` | Forzar una vista y sus dependientes. | N/A |

---

## 🌍 Soporte Agnóstico al Dialecto

Gracias al uso de marcos internos de Sequelize, el generador adapta automáticamente la sintaxis para:
- ✅ **PostgreSQL** (Uso automático de double quotes y esquemas)
- ✅ **MySQL / MariaDB** (Backticks y optimización de índices)
- ✅ **SQLite** (Soporte simplificado para pruebas locales)
- ✅ **SQL Server (MSSQL)** (Claves de protección de identificadores)

---

## 🤝 Contribuir
¿Tienes una gran idea? ¡Estamos abiertos a PRs! 

```bash
npm install
npm run dev    # Compilador TypeScript en modo watch
npm run build  # Empaquetado final para distribución
```

---

MIT License © 2026 - **Villalba Ricardo Daniel**
[GitHub Profile](https://github.com/ritchieforests)
