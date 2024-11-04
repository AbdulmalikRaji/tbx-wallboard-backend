import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: '.env' });
// import * as cookieParser from 'cookie-parser';
const port = process.env.PORT || 3000;
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // app.use(cookieParser());
  app.enableCors();
  await app.listen(port);
}
bootstrap();
