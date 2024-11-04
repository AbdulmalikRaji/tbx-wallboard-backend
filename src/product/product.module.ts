import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductService } from './product.service';
import { Product, ProductSchema } from "../Models/product.model"; // Adjust the path as needed

@Module({
  imports: [],
  providers: [ProductService],
  exports: [ProductService], 
})
export class ProductModule {}
