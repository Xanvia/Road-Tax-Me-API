import { DataSource } from 'typeorm';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const entitiesPath = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '../entities/*.js')
  : path.join(__dirname, '../entities/*.ts');

const migrationsPath = process.env.NODE_ENV === 'production'
  ? path.join(__dirname, './migrations/*.js')
  : path.join(__dirname, './migrations/*.ts');

const subscribersPath = process.env.NODE_ENV === 'production'
  ? path.join(__dirname, '../subscribers/*.js')
  : path.join(__dirname, '../subscribers/*.ts');

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'taxme_user',
  password: process.env.DB_PASSWORD || 'secure_password',
  database: process.env.DB_NAME || 'roadtaxme_db',
  synchronize: true,
  logging: false,
  entities: [entitiesPath],
  migrations: [migrationsPath],
  subscribers: [subscribersPath],
});
