import { bootstrap } from '../src/app.js';
import { initORM } from '../src/db.js';
import config from '../src/mikro-orm.config.js';
import { TestSeeder } from '../src/seeders/TestSeeder';
import { execSync } from 'child_process';

const generateRandomString = (length: number): string => {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

export async function initTestApp() {
  // this will create all the ORM services and cache them
  const dbName = `cc-katalog-test-${generateRandomString(8)}`;
  await createDatabase(dbName);
  const { orm } = await initORM({
    // first, include the main config
    ...config,
    // no need for debug information, it would only pollute the logs
    debug: false,
    dbName,
    // this will ensure the ORM discovers TS entities, with ts-node, ts-jest and vitest
    // it will be inferred automatically, but we are using vitest here
    // preferTs: true,
  });

  await orm.schema.refreshDatabase(); // Drops & re-creates schema
  await orm.seeder.seed(TestSeeder);

  const { app } = await bootstrap({ logLevel: process.env.TEST_LOG_LEVEL || 'fatal' });

  return { app, dbName };
}

export const runCommand = (command: string): void => {
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    throw new Error(`Command failed: ${command}: ${error}`);
  }
};

export const createDatabase = (dbName: string) =>
  runCommand(`createdb ${dbName}`);

export const deleteDatabase = (dbName: string) => runCommand(`dropdb ${dbName}`);
