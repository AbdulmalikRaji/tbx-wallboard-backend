import { Module } from '@nestjs/common';
import { MyGateway } from './gateway';
import { ProductModule } from '../product/product.module'; // Adjust the path as needed

@Module({
  imports: [ProductModule],
  providers: [MyGateway],
})
export class GatewayModule {}
