import { AppDataSource } from './config/ormconfig';
import { User } from './entities/user.entity';
import { Table } from './entities/table.entity';
import { Exhibition } from './entities/exhibition.entity';
import * as bcrypt from 'bcrypt';

async function seed() {
  await AppDataSource.initialize();
  console.log('📦 Database Connected!');

  // Hash password for an admin user
  const passwordHash = await bcrypt.hash('admin123', 10);

  // Create admin user
  const adminUser = new User();
  adminUser.name = 'admin';
  adminUser.password_hash = passwordHash;
  adminUser.is_administrator = true;

  // Create tables
  const table1 = new Table();
  table1.number = 1;
  table1.owner = adminUser;

  const table2 = new Table();
  table2.number = 2;
  table2.owner = adminUser;

  // Create exhibition
  const exhibition = new Exhibition();
  exhibition.title = 'First Exhibition';
  exhibition.description = 'This is a sample exhibition';
  exhibition.exhibitor = adminUser;
  exhibition.table_number = table1;

  // Save to database
  await AppDataSource.manager.save(adminUser);
  await AppDataSource.manager.save(table1);
  await AppDataSource.manager.save(table2);
  await AppDataSource.manager.save(exhibition);

  console.log('✅ Seed data inserted successfully!');
  await AppDataSource.destroy();
}

seed().catch((error) => {
  console.error('❌ Error seeding database:', error);
});
