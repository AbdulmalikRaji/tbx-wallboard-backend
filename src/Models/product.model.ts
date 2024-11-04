
import { Schema, Document } from 'mongoose';

export interface Product extends Document {
  name: string;
  barcode: number;
  timestamp: Date;
  cat1: string;
  location_name: string;
  latitude: number;
  longitude: number;
}

export const ProductSchema = new Schema<Product>({
    name: String,
    barcode: Number,
    timestamp: Date,
    location_name: String,
    cat1: String,
    latitude: Number,
    longitude: Number
  }, { collection: 'sales' }); 
  
  export interface transformedProduct{
    Shop: string,
    Barcode: string,
    ProductName: string,
    Category: string,
    ImageUrl: string,
    Location: [number, number]
  }

  export interface ProductSale{
    name: string;
    barcode: number;
    timestamp: Date;
    cat: string;
    location_name: string;
    latitude: number;
    longitude: number;
  }
  export interface ChangeStreamDocument {
    _id: {
      _data: string;
    };
    operationType: string;
    fullDocument: ProductSale;
  }
  interface ProductQueryOptions {
    limit?: number;
    sort?: Record<string, number>;
  }