import { Module } from '@nestjs/common';
import { HttpModule as NestHttpModule } from '@nestjs/axios';
import { InstituteProxyController } from './institute-proxy.controller';
import { InstituteProxyService } from './institute-proxy.service';

@Module({
  imports: [NestHttpModule],
  controllers: [InstituteProxyController],
  providers: [InstituteProxyService],
})
export class InstituteProxyModule {}
