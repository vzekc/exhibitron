import type { Options } from '@mikro-orm/postgresql';
import { GeneratedCacheAdapter, PostgreSqlDriver } from '@mikro-orm/postgresql';
import { SqlHighlighter } from '@mikro-orm/sql-highlighter';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { SeedManager } from '@mikro-orm/seeder';
import { Migrator } from '@mikro-orm/migrations';

import { existsSync, readFileSync } from 'node:fs';

const enableMetadataCache = () =>
  process.env.NODE_ENV === 'production' && existsSync('./temp/metadata.json');

const config: Options = {
  // for simplicity, we use the SQLite database, as it's available pretty much everywhere
  driver: PostgreSqlDriver,
  dbName: 'cc-katalog',
  // folder-based discovery setup, using common filename suffix
  entities: ['dist/**/*.entity.js'],
  entitiesTs: ['src/**/*.entity.ts'],
  // we will use the ts-morph reflection, an alternative to the default reflect-metadata provider
  // check the documentation for their differences: https://mikro-orm.io/docs/metadata-providers
  metadataProvider: TsMorphMetadataProvider,
  // enable debug mode to log SQL queries and discovery information
  debug: true,
  extensions: [SeedManager, Migrator],
  highlighter: new SqlHighlighter(),
  metadataCache: enableMetadataCache() ? {
    enabled: true,
    adapter: GeneratedCacheAdapter,
    // temp/metadata.json can be generated via `npx mikro-orm-esm cache:generate --combine`
    options: {
      data: JSON.parse(readFileSync('./temp/metadata.json', { encoding: 'utf8' })),
    },
  } : undefined,
};

export default config;
