import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pathToFileURL } from 'url';
import { Sequelize } from 'sequelize';
import { ViewBuilder } from './ViewBuilder';

export interface ViewGeneratorConfig {
  sequelize: Sequelize;
  viewsDir: string;
  migrationsDir?: string;
  sqlDir?: string;
  modelsDir?: string;
  cacheFile?: string;
  sequelizeImportPath?: string;
}

export class ViewGenerator {
  private config: Required<Pick<ViewGeneratorConfig, 'sequelize' | 'viewsDir' | 'cacheFile'>> & Partial<ViewGeneratorConfig>;
  private cacheFile: string;

  constructor(config: ViewGeneratorConfig) {
    this.config = {
      ...config,
      cacheFile: config.cacheFile || path.resolve(process.cwd(), '.view-cache.json'),
    };
    this.cacheFile = this.config.cacheFile;
  }

  private getFileHash(filePath: string): string {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha1').update(content).digest('hex');
  }

  private loadCache(): Record<string, string> {
    if (fs.existsSync(this.cacheFile)) {
      return JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
    }
    return {};
  }

  private saveCache(cache: Record<string, string>) {
    fs.writeFileSync(this.cacheFile, JSON.stringify(cache, null, 2), 'utf8');
  }

  private mapToSequelizeType(sqlType: string) {
    const type = sqlType.toUpperCase();
    
    // Booleans
    if (type.includes('BOOLEAN') || type === 'TINYINT(1)' || type === 'BIT') return { tsType: 'boolean', sequelize: 'DataTypes.BOOLEAN' };
    
    // Integers
    if (type.includes('BIGINT')) return { tsType: 'number', sequelize: 'DataTypes.BIGINT' };
    if (type.includes('TINYINT')) return { tsType: 'number', sequelize: 'DataTypes.TINYINT' };
    if (type.includes('SMALLINT')) return { tsType: 'number', sequelize: 'DataTypes.SMALLINT' };
    if (type.includes('MEDIUMINT')) return { tsType: 'number', sequelize: 'DataTypes.MEDIUMINT' };
    if (type.includes('INT')) return { tsType: 'number', sequelize: 'DataTypes.INTEGER' };
    
    // Floating point / Numeric
    if (type.includes('DECIMAL') || type.includes('NUMERIC')) return { tsType: 'number', sequelize: 'DataTypes.DECIMAL' };
    if (type.includes('FLOAT')) return { tsType: 'number', sequelize: 'DataTypes.FLOAT' };
    if (type.includes('DOUBLE') || type.includes('REAL')) return { tsType: 'number', sequelize: 'DataTypes.DOUBLE' };
    
    // UUIDs
    if (type.includes('UUID') || type.includes('GUID')) return { tsType: 'string', sequelize: 'DataTypes.UUID' };
    
    // Strings & Characters
    if (type.includes('VARCHAR') || type.includes('NVARCHAR')) return { tsType: 'string', sequelize: 'DataTypes.STRING' };
    if (type.includes('CHAR')) return { tsType: 'string', sequelize: 'DataTypes.CHAR' };
    if (type.includes('TEXT')) return { tsType: 'string', sequelize: 'DataTypes.TEXT' };
    
    // Dates & Times
    if (type.includes('TIMESTAMP')) return { tsType: 'Date', sequelize: 'DataTypes.DATE' };
    if (type.includes('DATETIME')) return { tsType: 'Date', sequelize: 'DataTypes.DATE' };
    if (type.includes('DATE')) return { tsType: 'Date', sequelize: 'DataTypes.DATEONLY' };
    if (type.includes('TIME')) return { tsType: 'string', sequelize: 'DataTypes.TIME' };
    
    // Enums
    if (type.includes('ENUM')) return { tsType: 'string', sequelize: 'DataTypes.STRING' };
    
    // JSON / BINARY
    if (type.includes('JSONB')) return { tsType: 'any', sequelize: 'DataTypes.JSONB' };
    if (type.includes('JSON')) return { tsType: 'any', sequelize: 'DataTypes.JSON' };
    if (type.includes('BLOB') || type.includes('BYTEA')) return { tsType: 'Buffer', sequelize: 'DataTypes.BLOB' };

    // Fallback
    return { tsType: 'any', sequelize: 'DataTypes.STRING' };
  }

  private async createModelFromView(viewName: string, modelName: string, outputPath: string, builder?: ViewBuilder) {
    const viewSchema = await this.config.sequelize.getQueryInterface().describeTable(viewName);

    let classProps = '';
    let initFields = '';
    let primaryKeyField: string | null = null;

    for (const fieldName in viewSchema) {
      const field = viewSchema[fieldName];
      const type = this.mapToSequelizeType(field.type);

      if (!primaryKeyField) primaryKeyField = fieldName;

      classProps += `  public ${fieldName}!: ${type.tsType};\n`;

      initFields += `  ${fieldName}: {\n    type: ${type.sequelize},\n`;
      if (fieldName === primaryKeyField) {
        initFields += `    primaryKey: true,\n`;
      }
      initFields += `  },\n`;
    }

    let associationBlock = '';
    if (builder && builder.associations && builder.associations.length > 0) {
        associationBlock = `\n  static associate(models: any) {\n`;
        for (const assoc of builder.associations) {
            associationBlock += `    this.${assoc.type}(models.${assoc.target}, ${JSON.stringify(assoc.options)});\n`;
        }
        associationBlock += `  }\n`;
    }

    let refreshBlock = '';
    if (builder && builder.isMaterialized) {
        refreshBlock = `\n  static async refreshView(options?: { concurrently?: boolean }) {
    const concurrentStr = options?.concurrently ? 'CONCURRENTLY ' : '';
    await this.sequelize?.query(\`REFRESH MATERIALIZED VIEW \${concurrentStr}\${this.tableName}\`);
  }\n`;
    }

    const sequelizeImport = this.config.sequelizeImportPath 
        ? `import { sequelize } from '${this.config.sequelizeImportPath}'; // o ajusta a 'import sequelize from ...' si no usas llaves` 
        : `import { sequelize } from '../../sequelize'; // TODO: Configura --sequelizeImportPath en la CLI para definir tu instancia, o cambia este path dinámico.`;

    const modelContent = `import { Model, DataTypes } from 'sequelize';
// Nota para el usuario de la librería: Debes proveer tu propia instancia de sequelize aquí 
// si la generas dinámicamente o ajusta los imports manualmente si fuera necesario.
${sequelizeImport}

export class ${modelName} extends Model {
${classProps}
${associationBlock}
${refreshBlock}
}

${modelName}.init({
${initFields}}, {
  sequelize,
  tableName: '${viewName}',
  timestamps: false,
});
`;

    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
    }

    const filePath = path.join(outputPath, `${modelName}.ts`);
    fs.writeFileSync(filePath, modelContent, 'utf8');

    console.log(`✅ Modelo TypeScript generado: ${filePath}`);
  }

  private getAllViewFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    return entries.flatMap((entry) => {
      const res = path.resolve(dir, entry.name);
      if (entry.isDirectory()) {
        return this.getAllViewFiles(res); // 🔁 Recursión
      } else if (entry.isFile() && entry.name.endsWith('.view.ts')) {
        return [res];
      }
      return [];
    });
  }

  private topologicalSort(views: { filePath: string; hash: string; builder: ViewBuilder; viewName: string; }[]) {
    const sorted: typeof views = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    
    // Mapear por nombre para acceso rápido
    const viewMap = new Map(views.map(v => [v.viewName, v]));

    const visit = (viewName: string) => {
      if (visited.has(viewName)) return;
      if (visiting.has(viewName)) {
        throw new Error(`Dependencia circular detectada en la vista: ${viewName}`);
      }

      visiting.add(viewName);

      const viewConfig = viewMap.get(viewName);
      if (viewConfig) {
        const deps = viewConfig.builder.getDependencies();
        for (const dep of deps) {
          if (viewMap.has(dep)) visit(dep); // Visitar dependencias primero
        }
      }

      visiting.delete(viewName);
      visited.add(viewName);
      if (viewConfig) sorted.push(viewConfig);
    };

    for (const v of views) {
      visit(v.viewName);
    }

    return sorted;
  }

  public async generateAllViews(targetViewName?: string) {
    const files = this.getAllViewFiles(this.config.viewsDir);
    const cache = this.loadCache();
    let updatedCache = { ...cache };
    const listFiles: { file: string; nameView: string; outdir: string, builder: ViewBuilder }[] = [];

    // FASE 1: Recolectar todas las definiciones
    const viewDefs: { filePath: string; hash: string; builder: ViewBuilder; viewName: string }[] = [];
    for (const filePath of files) {
        const hash = this.getFileHash(filePath);
        
        let module;
        try {
            const fileUrl = pathToFileURL(filePath).href;
            module = await import(fileUrl);
        } catch(e) {
            console.error(`❌ Error importando la vista ${filePath}: \n`, e);
            continue;
        }

        const exp = module.default?.default || module.default || module;
        let viewBuilder: ViewBuilder;
        
        if (typeof exp === 'function') {
            viewBuilder = exp();
        } else if (exp instanceof ViewBuilder) {
            viewBuilder = exp;
        } else {
            console.warn(`⚠️ El archivo ${filePath} no exporta por default ni una función que retorne ViewBuilder ni una instancia directa de ViewBuilder. Se saltará.`);
            continue;
        }
        
        viewDefs.push({
            filePath,
            hash,
            builder: viewBuilder,
            viewName: viewBuilder.getTitle()
        });
    }

    // FASE 2: Ordenamiento Topológico según dependencias
    const sortedViewDefs = this.topologicalSort(viewDefs);

    // FASE 3: Identificar vistas a forzar si se proveyó targetViewName
    const forceUpdate = new Set<string>();
    if (targetViewName) {
      console.log(`🔍 Buscando dependientes para forzar actualización de: ${targetViewName}`);
      
      const findDependents = (name: string) => {
        if (forceUpdate.has(name)) return;
        forceUpdate.add(name);
        
        // Buscar quién depende de 'name'
        for (const def of viewDefs) {
          const deps = def.builder.getDependencies();
          if (deps.includes(name)) {
            findDependents(def.viewName);
          }
        }
      };
      
      const target = viewDefs.find(v => v.viewName === targetViewName);
      if (target) {
        findDependents(targetViewName);
      } else {
        console.warn(`⚠️ No se encontró la vista "${targetViewName}" para forzar. Se procederá normal.`);
      }
    }

    // FASE 4: Procesamiento en orden correcto
    const nowTimestamp = new Date();

    for (let i = 0; i < sortedViewDefs.length; i++) {
        const def = sortedViewDefs[i];
        const { filePath, hash, builder: viewBuilder, viewName } = def;

        if (cache[filePath] === hash && !forceUpdate.has(viewName)) {
            console.log(`🟡 Sin cambios: ${filePath}`);
            continue;
        }

        console.log(`🟢 Cambios detectados: ${filePath}`);
      
        // Dar nombre topológico incrementando los segundos cronológicamente, para Sequelize-CLI (YYYYMMDDHHmmss)
        // Ejemplo `20260401095543-create-user-post-summary.js`
        const d = new Date(nowTimestamp.getTime() + (i * 1000));
        const tsPrefix = d.toISOString().replace(/\D/g, '').slice(0, 14);
        
        const filename = `${tsPrefix}-create-${viewName.replace(/_/g, "-")}.js`;
        const fileView = `${viewName.replace(/_/g, "-")}.ts`;

      // Generar SQL puro si se proveyó carpeta para sql
      if (this.config.sqlDir) {
        if (!fs.existsSync(this.config.sqlDir)) {
          fs.mkdirSync(this.config.sqlDir, { recursive: true });
        }
        const filepathSql = path.join(this.config.sqlDir, viewName + ".sql");
        const getSql = viewBuilder.toSQL("", { sequelize: this.config.sequelize });
        fs.writeFileSync(filepathSql, getSql, 'utf8');
      }

      // Generar Migración de Sequelize temporal/definitiva si se proveyó carpeta
      if (this.config.migrationsDir) {
        if (!fs.existsSync(this.config.migrationsDir)) {
          fs.mkdirSync(this.config.migrationsDir, { recursive: true });
        }
        let sqlFileRelativePath: string | undefined;
        if (this.config.sqlDir && this.config.migrationsDir) {
          const sqlFilePath = path.resolve(this.config.sqlDir, viewName + ".sql");
          sqlFileRelativePath = path.relative(this.config.migrationsDir, sqlFilePath);
        }

        const filepath = path.join(this.config.migrationsDir, filename);
        const content = viewBuilder.toMigration(viewName, { 
          sequelize: this.config.sequelize,
          sqlFileRelativePath
        });
        fs.writeFileSync(filepath, content, 'utf8');
        console.log(`✅ Migración generada: ${filename}`);

        const file_estructure = path.dirname(path.dirname(filePath));
        listFiles.push({
          file: filepath,
          nameView: fileView.replace(/-/g, "_").replace(".ts", ""), // Asegurar que sea formato snake
          outdir: this.config.modelsDir || file_estructure, // Si no se seteo un modelo outdir, lo pone relativo a donde estaba la vista original
          builder: viewBuilder
        });
      }

      updatedCache[filePath] = hash;
    }

    try {
      if (listFiles.length > 0) {
          console.log("🚀 Ejecutando migraciones...");
          await this.runSpecificMigrations(listFiles);
          console.log("✅ Migraciones ejecutadas correctamente.");
      }
      this.saveCache(updatedCache);
    } catch (err) {
      console.error("❌ Error al ejecutar las migraciones:", err);
    }
  }

  private async runSpecificMigrations(filePaths: { file: string; nameView: string; outdir: string, builder: ViewBuilder }[]) {
    for (const fileItem of filePaths) {
      const migration = require(fileItem.file);
      await migration.up(this.config.sequelize.getQueryInterface(), Sequelize);
      console.log(`✅ Migración ejecutada: ${fileItem.file}`);
      
      try {
          await this.createModelFromView(fileItem.nameView, fileItem.nameView, fileItem.outdir, fileItem.builder);
      } catch (e) {
          console.error(`❌ Error al crear modelo para ${fileItem.nameView}: `, e);
      }
    }
  }
}
