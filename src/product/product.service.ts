import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, transformedProduct } from 'src/Models/product.model';
import { ChangeStreamDocument, MongoClient, Collection } from 'mongodb';
import { config as dotenvConfig } from 'dotenv';
import { EventEmitter } from 'stream';
dotenvConfig({ path: '.env' });

@Injectable()
export class ProductService {
  private client: MongoClient;
  constructor() {
    this.client = new MongoClient(process.env.MONGODB_URI);
  }
  // constructor(@InjectModel('Product') private productModel: Model<Product>) {}

  // async getAllProducts(): Promise<Product[]> {
  //   try {
  //     const products = await this.productModel.find().exec();
  //     console.log('Fetched all products:', products);
  //     return products;
  //   } catch (error) {
  //     console.error('Error fetching products:', error);
  //     throw error;
  //   }
  // }

  // async getProductsLimit(limit: number, skips: number): Promise<transformedProduct[]> {
  //   try {
  //     const products = await this.productModel.find().sort({timestamp: 1}).skip(skips).limit(limit).exec();
  //     //console.log(`Fetched ${products.length} products with limit ${limit}:`, products);


  //       const transformedproducts = products.map(currentProduct => ({
  //           Shop: currentProduct.location_name,
  //           Barcode: currentProduct.barcode.toString(),
  //           ProductName: currentProduct.name,
  //           Category: currentProduct.cat,
  //           ImageUrl: currentProduct.name,
  //           Location: [currentProduct.latitude, currentProduct.longitude] as [number, number],
  //       }));

  //     return transformedproducts;
  //   } catch (error) {
  //     console.error('Error fetching products with limit:', error);
  //     throw error;
  //   }
  // }

  async getProductsByTimestampRange(): Promise<Product[]> {
    try {
      await this.client.connect();
      const db = this.client.db(process.env.DB_NAME);
      const coll: Collection<Product> = db.collection(process.env.COLLECTION_NAME);

      const currentTime = new Date(new Date().getTime() + 180 * 60000); // 60000ms in 1 min // to istanbul time
      const pastTime = new Date(currentTime.getTime() - 24 * 60 * 60 * 1000) ;
      const startTime = new Date(pastTime.getTime() - 3000);

      const query = { timestamp: { $gte: startTime, $lte: pastTime } };

      let productCursor = coll.find(query)//.sort({ timestamp: 1 });//.limit(30);



    const products = await productCursor.toArray();
    
        //console.log(products)
      return products;
      
    } catch (error) {
      console.error('Error fetching products by timestamp range:', error);
      throw error;
    } finally {
      //await this.client.close();
    }

  }
  

  // async createProduct(productData: Partial<Product>): Promise<Product> {
  //   try {
  //     const product = new this.productModel(productData);
  //     const savedProduct = await product.save();
  //     console.log('Created product:', savedProduct);
  //     return savedProduct;
  //   } catch (error) {
  //     console.error('Error creating product:', error);
  //     throw error;
  //   }
  // }

  


  // async startMongoDbWatcher(eventEmitter:EventEmitter) {
  //   await this.client.connect();
  //   const db = this.client.db(process.env.DB_NAME);
  //   const coll = db.collection(process.env.COLLECTION_NAME);

  //   const cursor = coll.watch([
  //     { $match: { operationType: { $in: ['insert', 'update', 'replace'] } } },
  //     { $project: { _id: 1, fullDocument: 1, ns: 1, documentKey: 1 } },
  //   ], { fullDocument: 'updateLookup' });

  //   while (await cursor.hasNext()) {
  //     const change = await cursor.next();
  //     const document = change;
  //     if(document){
  //       eventEmitter.emit('new-product', document);
  //     }
      
  //   }
  // }



}
