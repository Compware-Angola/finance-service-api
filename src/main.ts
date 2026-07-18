process.env.TZ = 'Africa/Luanda';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*', // permite todas as origens
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Prefixo global
  app.setGlobalPrefix('api');

  // === INÍCIO DA CONFIGURAÇÃO DO SWAGGER ===
  const config = new DocumentBuilder()
    .setTitle('Invoice Service API')
    .setDescription(
      'Serviço responsável por gerar faturas, "calcular" sequências fiscais e gerar o hash de assinatura (Hash Fiscal).',
    )
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  // === FIM DA CONFIGURAÇÃO DO SWAGGER ===

  // Validação global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Porta
  const port = process.env.PORT as any;
  await app.listen(port);

  console.log(`🚀 API Listening on port ${port}.`);
  console.log(`📖 Swagger Docs available at ${await app.getUrl()}/api/docs`);
}
bootstrap();

