import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppDataSource } from './config/ormconfig';

async function bootstrap() {
  await AppDataSource.initialize();
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // Enable CORS for API access
  await app.listen(3001);
}
bootstrap();
