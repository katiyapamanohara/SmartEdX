import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpModule } from './infra/http/http.module';
import { AuthProxyModule } from './modules/auth-proxy/auth-proxy.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    HttpModule,
    AuthProxyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

