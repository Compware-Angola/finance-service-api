import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common'; 

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 1. Definição do Prefixo Global (Já está correto)
  app.setGlobalPrefix('api');
  app.enableCors();
  


  // === INÍCIO DA CONFIGURAÇÃO DO SWAGGER ===
  const config = new DocumentBuilder()
    .setTitle('Invoice Service API')
    .setDescription('Serviço responsável por gerar faturas, calcular sequências fiscais e gerar o hash de assinatura (Hash Fiscal).')
    .setVersion('1.0') 
    // .addBearerAuth() 
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document); 
  // === FIM DA CONFIGURAÇÃO DO SWAGGER ===
 
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  // Use o processo.env.PORT ou 3001 como fallback
  await app.listen(process.env.PORT ?? 3001);
  console.log(`🚀 API Listening on port ${process.env.PORT ?? 3001}.`);
  console.log(`📖 Swagger Docs available at ${await app.getUrl()}/api/docs`);
}
bootstrap();