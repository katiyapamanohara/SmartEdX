import { Module } from '@nestjs/common';
import { HttpModule as NestHttpModule } from '@nestjs/axios';
import { MulterModule } from '@nestjs/platform-express';
import { InstituteProxyController } from './institute-proxy.controller';
import { InstituteProxyService } from './institute-proxy.service';

@Module({
  imports: [
    NestHttpModule,
    MulterModule.register({ storage: undefined }), // memory storage (default)
  ],
  controllers: [InstituteProxyController],
  providers: [InstituteProxyService],
})
export class InstituteProxyModule {}
