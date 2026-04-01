#!/usr/bin/env node

import path from 'path';
import fs from 'fs';
// Soporte a la carga de módulos tsx y js nativo para requerir el config
require('ts-node').register({ transpileOnly: true });

import { ViewGenerator } from './ViewGenerator';

const args = process.argv.slice(2);

function showHelp() {
  console.log(`
Uso de: sequelize-view-builder CLI

Opciones:
  --config <path>       Ruta al archivo JS/TS de instancia de Sequelize.
  --views <path>        Directorio de tus archivos *.view.ts.
  --models <path>       (Opcional) Dónde guardar los Modelos TS generados.
  --migrations <path>   (Opcional) Dónde guardar las migraciones .js.
  --sql <path>          (Opcional) Dónde volcar el SQL en crudo.
  --view <name>         (Opcional) Forzar la migración de una vista específica.
  --all                 Forzar la actualización de todas las vistas (ignorar caché).
  --help                Muestra este menú de ayuda.

Nota: Puedes crear un archivo "sequelize-view.config.js" para no pasar los paths cada vez.
Ejemplos:
  npx sequelize-view-builder --all
  npx sequelize-view-builder my_view_name
`);
}

async function run() {
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  // Intentar cargar configuración desde archivo
  let fileConfig: any = {};
  const configFiles = ['sequelize-view.config.js', 'sequelize-view.config.ts', 'view-builder.config.js'];
  for (const f of configFiles) {
    const p = path.resolve(process.cwd(), f);
    if (fs.existsSync(p)) {
      try {
        const mod = require(p);
        fileConfig = mod.default || mod;
        console.log(`📦 Configuración cargada desde ${f}`);
        break;
      } catch (e) {}
    }
  }

  const getConfig = (key: string): string | undefined => {
    const idx = args.indexOf(key);
    if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('--')) {
      return args[idx + 1];
    }
    return undefined;
  };

  const configPath = getConfig('--config') || fileConfig.config;
  const viewsDir = getConfig('--views') || fileConfig.views;
  const modelsDir = getConfig('--models') || fileConfig.models;
  const migrationsDir = getConfig('--migrations') || fileConfig.migrations;
  const sqlDir = getConfig('--sql') || fileConfig.sql;
  const sequelizeImportPath = getConfig('--sequelizeImportPath') || fileConfig.sequelizeImportPath;
  
  // Determinar vista a forzar: bandera --view o primer argumento posicional
  let forceView = getConfig('--view');
  if (!forceView) {
    forceView = args.find(a => !a.startsWith('--'));
  }

  const forceAll = args.includes('--all');

  if (!configPath || !viewsDir) {
    if (args.length === 0) {
      showHelp();
      return;
    }
    console.error('❌ Error fatal: Argumentos requeridos ausentes. Se necesita por lo menos --config y --views, o un archivo de configuración.');
    process.exit(1);
  }

  const absoluteConfigPath = path.resolve(process.cwd(), configPath);
  if (!fs.existsSync(absoluteConfigPath)) {
    console.error(`❌ Error fatal: El path de configuración Sequelize provisto no se encontró en: ${absoluteConfigPath}`);
    process.exit(1);
  }

  // Borrar cache si se pidió --all
  if (forceAll) {
    const cachePath = path.resolve(process.cwd(), '.view-cache.json');
    if (fs.existsSync(cachePath)) {
        fs.unlinkSync(cachePath);
        console.log('🧹 Cache eliminada para migración completa (--all).');
    }
  }

  // Importar instancia de la base de datos
  let sequelizeInstance;
  try {
    const configModule = require(absoluteConfigPath);
    sequelizeInstance = configModule.default || configModule.sequelize || configModule;

    if (!sequelizeInstance || typeof sequelizeInstance.query !== 'function') {
        throw new Error("No se detectó un objeto compatible con Sequelize.");
    }
  } catch (err: any) {
    console.error(`❌ Error importando la instancia de Sequelize de: ${absoluteConfigPath}`);
    console.error(err.message);
    process.exit(1);
  }

  console.log('🚀 Iniciando Sequelize View Builder CLI...');

  const generator = new ViewGenerator({
    sequelize: sequelizeInstance,
    viewsDir: path.resolve(process.cwd(), viewsDir),
    modelsDir: modelsDir ? path.resolve(process.cwd(), modelsDir) : undefined,
    migrationsDir: migrationsDir ? path.resolve(process.cwd(), migrationsDir) : undefined,
    sqlDir: sqlDir ? path.resolve(process.cwd(), sqlDir) : undefined,
    sequelizeImportPath,
  });

  try {
    await generator.generateAllViews(forceView);
    console.log('✅ Pipeline Finalizada con éxito.');
  } catch (err) {
    console.error('❌ Fallo la orquestación:', err);
    process.exit(1);
  }
}

run();
