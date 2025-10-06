import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {CustomWsExceptionFilter} from './common/filters/WsExceptionFilter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new CustomWsExceptionFilter());
  await app.listen(process.env.PORT ?? 3000);
  console.log('app is running')
}
bootstrap();
