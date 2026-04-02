# 🏗️ Sequelize View Builder

> **El eslabón perdido entre la potencia de SQL y la elegancia de Sequelize—Vistas SQL tipadas sin fricción.**

<div align="center">

[![npm version](https://img.shields.io/npm/v/sequelize-view-builder.svg?style=flat-square)](https://www.npmjs.com/package/sequelize-view-builder)
[![descargas npm](https://img.shields.io/npm/dm/sequelize-view-builder.svg?style=flat-square)](https://www.npmjs.com/package/sequelize-view-builder)
[![Licencia: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.5%2B-blue?style=flat-square)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-16%2B-green?style=flat-square)](https://nodejs.org/)

**Disponible en:** [English](README.md) • [Español](README.es.md) • [Português](README.pt.md)

</div>

---

## 📖 Resumen

**Sequelize-view-builder** es una librería TypeScript lista para producción que revoluciona cómo gestionas vistas SQL complejas en aplicaciones Node.js. Resuelve un vacío crítico: las vistas SQL son poderosas pero dolorosas de mantener.

- ✅ **SQL seguro con tipos** y modelos TypeScript auto-generados
- ✅ **Resolución automática de dependencias** mediante ordenamiento topológico  
- ✅ **Soporte multi-dialecto** (MySQL, PostgreSQL, MSSQL, SQLite)
- ✅ **Vistas materializadas** con capacidades de refresco e indexación
- ✅ **CLI sin configuración** con caché inteligente
- ✅ **Listo para producción** con manejo completo de errores

---

## 🎯 Características Principales

### 📖 [DOCUMENTACION_COMPLETA.md](./DOCUMENTACION_COMPLETA.md)
Guía exhaustiva con referencia completa de API, casos de uso avanzados y mejores prácticas.

### ⚡ [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
Hoja de referencia rápida con ejemplos, tabla de métodos y solución de problemas.

### 1. **Orquestación Basada en Grafos (DAG)** 🧠
Algorithm topológico que automáticamente:
- Analiza dependencias de vistas
- Genera migraciones en orden lógico correcto
- Detecta ciclos con mensajes útiles
- Propaga actualizaciones cuando cambia una vista base

### 2. **SQL Seguro con Tipado Dinámico** ⚡
Nuestro CLI inspecciona el esquema de BD en tiempo real:
- Modelos TypeScript perfectamente tipados
- Definiciones de columnas precisas
- Soporte de autocompletado en IDE

### 3. **Vistas Materializadas + Indexación** 🔄
Soporte de primera clase:
- `.materialized(true)` para vistas persistentes
- Creación automática de índices
- Método `.refreshView()` para actualizaciones

### 4. **Soporte Multi-Dialecto** 🌍
Adaptación automática para:
- ✅ PostgreSQL, MySQL/MariaDB, SQLite, SQL Server

### 5. **Migraciones "Clean Code"** 📁
- Referencia archivos `.sql` externos
- Diffs de Git más limpios
- Colaboración más fácil

---

## 🚀 Instalación

```bash
npm install sequelize-view-builder
```

### Requisitos
- Node.js ≥ 16.0.0
- TypeScript ≥ 4.5
- Sequelize ≥ 6.0.0

---

##  🛠️ Inicio Rápido

### Paso 1: Crear Vistas

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

### Paso 2: Configuración

```javascript
// sequelize-view.config.js
module.exports = {
  config: './src/db.ts',
  views: './src/views',
  migrations: './migrations',
  models: './src/models/generated'
};
```

### Paso 3: Generar

```bash
npx sequelize-view
```

### Paso 4: Usar

```typescript
import { UserPosts } from './models/generated';
const data = await UserPosts.findAll();
```

---

## 📚 Documentación Completa

Para dominar la librería, consulta:

**📖 [DOCUMENTACION_COMPLETA.md](./DOCUMENTACION_COMPLETA.md)** - Guía de 5000+ líneas
- API completa (30+ métodos)
- Patrones avanzados
- Casos de estudio reales
- Tips de optimización

**⚡ [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Hoja de referencia rápida
- Tabla de métodos
- Ejemplos comunes
- Troubleshooting

---

## 🔒 Seguridad

### SQL Injection Prevention

✅ **Seguro**: Usa modelos Sequelize
```typescript
.from({ model: User, alias: 'u' })  // Auto-cotizado
```

❌ **Peligro**: Interpolar entrada de usuario
```typescript
.where(`id = ${userId}`)  // ¡NUNCA hagas esto!
```

### Mejores Prácticas

1. Usa modelos Sequelize cuando sea posible
2. Nunca interpoles entrada de usuario en SQL crudo
3. Valida nombres de vista proporcionados externamente
4. Mantén permisos de vista en la BD
5. Audita migraciones generadas antes de desplegar

---

## 📊 Rendimiento

| Escenario | Tiempo |
|-----------|--------|
| Vista simple | < 100ms |
| Vista compleja (5 joins) | 150-300ms |
| DAG completo (20 vistas) | 2-5s |
| Caché hit | < 10ms |

### Tips de Optimización

**Para vistas normales:**
```typescript
.where('deleted_at IS NULL')
.limit(10000)
```

**Para vistas materializadas:**
```typescript
.materialized(true)
.index(['user_id'], {unique: true})
```

---

## 🤝 Contribuir

¡Nos encanta las contribuciones!

### Setup de Desarrollo

```bash
git clone https://github.com/ritchieforest/sequelize-view-builder.git
cd sequelize-view-builder
npm install
npm run dev
npm run build
```

### Tipos de Contribuciones

1. **Correcciones de Errores**: Con pruebas
2. **Características**: Discute primero
3. **Documentación**: Mejoras y ejemplos
4. **Traducciones**: Otros idiomas
5. **Ejemplos**: Casos reales

### Diretrices

```bash
git checkout -b feature/mi-feature
# Hacer cambios + pruebas
npm test
npm run build
git push origin feature/mi-feature
```

---

## 🚀 Mejoras & Roadmap

Mantenemos un **roadmap exhaustivo** que detalla nuestra visión estratégica y características planeadas:

📖 **[IMPROVEMENTS.md](./IMPROVEMENTS.md)** - Documento de roadmap completo incluye:
- Estado actual y objetivos estratégicos
- Desglose versión por versión (v1.1, v1.2, v2.0 y más)
- Planes de optimización de rendimiento
- Roadmap de mejoras de seguridad
- Mejoras de experiencia del desarrollador
- Roadmap de características empresariales
- Oportunidades de contribución comunitaria
- Métricas de éxito

### Vista Rápida

**v1.1.0 (Q2 2026)**: Automatización & Visibilidad
- Planificador automático de refresco de vistas
- Visualización de dependencias en tiempo real
- Snapshots de migraciones y rollback
- Sistema de plugins para generadores

**v1.2.0 (Q3 2026)**: Características Avanzadas
- Soporte de clave primaria compuesta
- Estrategias personalizadas de nombramiento
- Herramientas de perfilado de rendimiento
- Linter de prevención de inyección SQL

**v2.0.0 (Q4 2026)**: Mejoras Mayores
- Generación de esquema GraphQL
- Framework de pruebas de vistas
- Simulación y dry-run de migraciones
- Monitoreo de esquema en tiempo real

### Ideas Impulsadas por la Comunidad 🤝

¿Tienes una solicitud de característica? [Abre un issue](https://github.com/ritchieforest/sequelize-view-builder/issues), [inicia una discusión](https://github.com/ritchieforest/sequelize-view-builder/discussions), o consulta [IMPROVEMENTS.md](./IMPROVEMENTS.md) para ver cómo contribuir ideas.

---

## 🆘 Solución de Problemas

### "View does not exist"
Verifica `.dependsOn()`. Las vistas deben crearse en orden de dependencia.

### "Circular dependency detected"
Revisa tus `dependsOn()` para ciclos. Dibuja el grafo de dependencias.

### Las importaciones fallan
Configura `sequelizeImportPath` correctamente en el config.

### Caché no se actualiza
```bash
rm .view-cache.json
npx sequelize-view --all
```

---

## 📝 Licencia

MIT License © 2026 - **Villalba Ricardo Daniel**

[Perfil GitHub](https://github.com/ritchieforest) • [npm](https://www.npmjs.com/package/sequelize-view-builder)

---

## 🌍 Idiomas

- 🇺🇸 [English](README.md)
- 🇪🇸 [Español](README.es.md)
- 🇧🇷 [Português](README.pt.md)

