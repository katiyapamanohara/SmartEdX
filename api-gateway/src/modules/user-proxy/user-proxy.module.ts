import { Module } from '@nestjs/common';
import { UserProxyController } from './user-proxy.controller';
import { UserProxyService } from './user-proxy.service';

@Module({
  controllers: [UserProxyController],
  providers: [UserProxyService],
})
export class UserProxyModule {}
