import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Configuração do CORS para aceitar todas as origens
  app.enableCors();
  // === INÍCIO DA CONFIGURAÇÃO DO SWAGGER ===
  const config = new DocumentBuilder()
    .setTitle('Invoice Service API') // Título da sua API
    .setDescription('Serviço responsável por gerar faturas, calcular sequências fiscais e gerar o hash de assinatura (Hash Fiscal).') // Descrição do que a API faz
    .setVersion('1.0') 
    // Se você tiver autenticação JWT, poderia adicionar:
    // .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document); 
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
