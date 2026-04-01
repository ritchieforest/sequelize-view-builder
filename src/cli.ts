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
  --config <path>       Ruta al archivo JS/TS que inicie/exporte tu instancia de Sequelize. Requerido.
  --views <path>        Directorio de tus archivos *.view.ts. Requerido.
  --models <path>       (Opcional) Dónde guardar los Modelos TS generados.
  --migrations <path>   (Opcional) Dónde guardar los archivos de migración .js para sequelize-cli.
  --sql <path>          (Opcional) Dónde volcar el SQL en crudo.
  --sequelizeImportPath <path> (Opcional) Ruta de importación literal que se incluirá en los modelos TS generados.
  --help                Muestra este menú de ayuda.

Ejemplo:
  npx sequelize-view-builder --config ./src/db.ts --views ./src/views --models ./src/models --sequelizeImportPath '@/db/connection.ts'
`);
}

async function run() {
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    showHelp();
    return;
  }

  const getConfig = (key: string): string | undefined => {
    const idx = args.indexOf(key);
    if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('--')) {
      return args[idx + 1];
    }
    return undefined;
  };

  const configPath = getConfig('--config');
  const viewsDir = getConfig('--views');
  const modelsDir = getConfig('--models');
  const migrationsDir = getConfig('--migrations');
  const sqlDir = getConfig('--sql');
  const sequelizeImportPath = getConfig('--sequelizeImportPath');

  if (!configPath || !viewsDir) {
    console.error('❌ Error fatal: Argumentos requeridos ausentes (--config y --views). Usa --help para ver opciones.');
    process.exit(1);
  }

  const absoluteConfigPath = path.resolve(process.cwd(), configPath);
  if (!fs.existsSync(absoluteConfigPath)) {
    console.error(`❌ Error fatal: El path de configuración Sequelize provisto no se encontró en: ${absoluteConfigPath}`);
    process.exit(1);
  }

  // Importar instancia de la base de datos de manera dinámica e inteligente
  let sequelizeInstance;
  try {
    const configModule = require(absoluteConfigPath);
    // Extraer por si se uso export default o module.exports
    sequelizeInstance = configModule.default || configModule.sequelize || configModule;

    if (!sequelizeInstance || typeof sequelizeInstance.query !== 'function') {
        throw new Error("No se detectó un objeto compatible con Sequelize.");
    }
  } catch (err: any) {
    console.error(`❌ Error importando la instancia de Sequelize. ¿El archivo compila correctamente?`);
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
    await generator.generateAllViews(); // Levanta y ordena todo mágicamente
    console.log('✅ Pipeline Finalizada con éxito.');
  } catch (err) {
    console.error('❌ Fallo la orquestación:', err);
    process.exit(1);
  }
}

run();
