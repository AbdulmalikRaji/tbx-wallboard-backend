import { OnModuleInit } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { faker } from '@faker-js/faker/locale/tr';
import { io, Socket } from 'socket.io-client';
import Redis from 'ioredis';
import { ProductService } from '../product/product.service';
import { config as dotenvConfig } from 'dotenv';
import { EventEmitter } from 'stream';
import { randomUUID } from 'crypto';
dotenvConfig({ path: '.env' });

interface Product {
  id: string;
  Shop: string;
  Barcode: string;
  ProductName: string;
  Category: string;
  ImageUrl: string;
  Location: [number, number];
}
const redis_endpoint = process.env.REDIS_ENDPOINT;
function generateFakeProductData(): Product {
  return {
    id: faker.string.uuid(),
    Shop: faker.string.uuid(),
    Barcode: faker.string.uuid(),
    ProductName: faker.commerce.productName(),
    Category: faker.commerce.department(),
    ImageUrl: faker.image.url(),
    Location: [
      faker.location.longitude({ max: 44.8345, min: 26.0419 }),
      faker.location.latitude({ max: 42.1075, min: 35.9152 }),
    ],
  };
}

@WebSocketGateway()
export class MyGateway implements OnModuleInit {
  constructor(private productService: ProductService) {}

  @WebSocketServer()
  server: Server;
  counter: number = 0;
  intervalID: NodeJS.Timeout;
  products: Product[] = [];
  maxProducts: number = parseInt(process.env.MAX_PRODUCTS, 10);
  proximityThreshold: number = parseFloat(process.env.PROXIMITY_THRESHOLD);
  productsSentLastHour: number = 0;
  productsSentLast24Hours: number = 0;
  uniqueCatsLastHour: number = 0;
  uniqueCatsLast24Hours: number = 0;
  lastHourStart: Date;
  last24HoursStart: Date;
  shortPins = [];
  longPins = [];
  emissionTimes: Date[] = [];
  emissionTimesHour: Date[] = [];
  categoryTimes: Map<string, { emitTime: Date; count: number }> = new Map();
  productsThisSecond: number = 0;
  thisSecond = 0;
  chartData = [];
  calculatingCounters = false;

  onModuleInit() {
    this.server.on('connection', async (socket) => {
      console.log('new connection id: ', socket.id);
    });

    let product: Product;
    let currentProductIndex = 0;
    const shortTimeout = 3000;
    const longTimeout = 30000;

    setInterval(() => {
      this.thisSecond++;
      this.removeExpiredPins();
      const categoryCounts = Array.from(this.categoryTimes.entries()).map(
        ([category, entry]) => ({
          category,
          count: entry.count.toString(),
        }),
      );
      this.server.emit('categoryCounts', categoryCounts);

      this.emitCounts();
      this.calculateCountersAsync(new Date());
    }, 1000);

    setInterval(() => {
      this.emitProducts();
    }, 500);

    setInterval(() => {
      if (!this.calculatingCounters) {
        this.calculatingCounters = true;

        setImmediate(async () => {
          await this.cleanUpEmissionTimes();
          this.calculatingCounters = false;
        });
      }
    }, 60000);

    const sendProductsInCycle = async () => {
      const products = await this.productService.getProductsByTimestampRange();

      for (const currentProduct of products) {
        const newProductDoc = this.parseProduct(currentProduct);
        if (this.isValidProduct(newProductDoc)) {
          this.emissionTimes.push(new Date());
          this.emissionTimesHour.push(new Date());
          this.productsThisSecond++;
          this.products.unshift(newProductDoc);
          this.products = this.products.slice(0, this.maxProducts + 1);

          const shortPin = {
            id: newProductDoc.id,
            productId: newProductDoc.id,
            Barcode: newProductDoc.Barcode,
            X: newProductDoc.Location[0],
            Y: newProductDoc.Location[1],
            Category: newProductDoc.Category,
            ProductName: newProductDoc.ProductName,
            expirationTime: Date.now() + shortTimeout,
          };
          this.updateOrAddPin(this.shortPins, shortPin);

          const longPin = {
            id: newProductDoc.id,
            productId: newProductDoc.id,
            Barcode: newProductDoc.Barcode,
            X: newProductDoc.Location[0],
            Y: newProductDoc.Location[1],
            Category: newProductDoc.Category,
            ProductName: newProductDoc.ProductName,
            expirationTime: Date.now() + longTimeout,
          };
          this.updateOrAddPin(this.longPins, longPin);

          const categoryEntry = this.categoryTimes.get(newProductDoc.Category);

          if (categoryEntry) {
            categoryEntry.emitTime = new Date();
            categoryEntry.count++;
          } else {
            this.categoryTimes.set(newProductDoc.Category, {
              emitTime: new Date(),
              count: 1,
            });
          }
        } else {
          console.error('Invalid product received: ', newProductDoc);
        }
      }
    };

    this.intervalID = setInterval(sendProductsInCycle, 3000);
  }

  calculateCountersAsync(currentTime: Date) {
    const oneHourAgo = new Date(currentTime.getTime() - 3600000); // 1 hour ago

    const productsSentLastHour = this.emissionTimesHour.length;
    const productsSentLast24Hours = this.emissionTimes.length;

    const uniqueCatsLastHour = Array.from(this.categoryTimes.values()).filter(
      (cat) => cat.emitTime > oneHourAgo,
    ).length;
    const uniqueCatsLast24Hours = this.categoryTimes.size;

    // Update the counters
    this.productsSentLastHour = productsSentLastHour;
    this.productsSentLast24Hours = productsSentLast24Hours;

    this.uniqueCatsLastHour = uniqueCatsLastHour;
    this.uniqueCatsLast24Hours = uniqueCatsLast24Hours;
  }

  async cleanUpEmissionTimes() {
    const currentTime = new Date();
    const oneDayAgo = new Date(currentTime.getTime() - 86400000);
    const oneHourAgo = new Date(currentTime.getTime() - 3600000); // 24 hours ago

    this.emissionTimesHour = this.emissionTimesHour.filter(
      (time) => time > oneHourAgo,
    );
    this.emissionTimes = this.emissionTimes.filter((time) => time > oneDayAgo);
    this.categoryTimes.forEach((entry, category) => {
      if (entry.emitTime <= oneDayAgo) {
        this.categoryTimes.delete(category);
      }
    });
  }
  removeExpiredPins() {
    const now = Date.now();

    // Remove expired short pins
    const updatedShortPins = this.shortPins.filter(
      (pin) => pin.expirationTime > now,
    );
    this.shortPins = updatedShortPins;

    // Remove expired long pins
    const updatedLongPins = this.longPins.filter(
      (pin) => pin.expirationTime > now,
    );
    this.longPins = updatedLongPins;
  }

  emitProducts() {
    this.server.emit('products', this.products);
    this.server.emit('shortPins', this.shortPins);
  }
  emitCounts() {
    this.chartData.push([
      new Date().toLocaleTimeString('en-US', {
        hour12: false,
        timeZone: 'Europe/Istanbul',
      }),
      this.productsThisSecond,
    ]);
    this.chartData = this.chartData.slice(-10);
    this.server.emit('productsThisSecond', this.chartData);
    this.server.emit('thisSecond', this.thisSecond);
    this.server.emit('longPins', this.longPins);
    this.productsThisSecond = 0;
    this.server.emit('catCounts', {
      uniqueCatsLastHour: this.uniqueCatsLastHour,
      uniqueCatsLast24Hours: this.uniqueCatsLast24Hours,
    });
    this.server.emit('productCounts', {
      productsSentLastHour: this.productsSentLastHour,
      productsSentLast24Hours: this.productsSentLast24Hours,
    });
  }
  parseProduct(input: any): Product {
    return {
      id: randomUUID(),
      Shop: input.location_name,
      Barcode: input.barcode.toString(),
      ProductName: input.name,
      Category: input.cat,
      ImageUrl: input.name,
      Location: [Number(input.latitude), Number(input.longitude)],
    };
  }
  isValidProduct(product) {
    const isMissing = (value) =>
      value === undefined || value === null || value === '';

    if (isMissing(product.Category)) {
      product.Category = 'None';
    }
    if (isMissing(product.Barcode)) {
      product.Barcode = '0';
    }
    if (isMissing(product.ProductName)) {
      // product.ProductName = 'Product';
      return false;
    }

    if (
      !isMissing(product.Location) &&
      Array.isArray(product.Location) &&
      product.Location.length === 2
    ) {
      const [latitude, longitude] = product.Location;
      if (isMissing(latitude) || isMissing(longitude)) {
        return false;
      }
    }

    return true; // Product is considered valid
  }
  updateOrAddPin(pinArray, newPin) {
    const existingPin = pinArray.find((pin) => {
      const distance = Math.sqrt(
        Math.pow(pin.X - newPin.X, 2) + Math.pow(pin.Y - newPin.Y, 2),
      );
      return distance < this.proximityThreshold;
    });

    if (existingPin) {
      // Update existing pin stats
      existingPin.expirationTime = newPin.expirationTime;
      existingPin.Barcode = newPin.Barcode;
      existingPin.ProductName = newPin.ProductName;
    } else {
      // Add new pin
      pinArray.push(newPin);
    }
  }
}
