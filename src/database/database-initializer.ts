import { createConnection } from 'mysql2/promise';
import { Logger } from '@nestjs/common';

export class DatabaseInitializer {
  private static readonly logger = new Logger(DatabaseInitializer.name);

  static async initializeDatabase(): Promise<void> {
    try {
      const connection = await createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USERNAME || 'root',
        password: process.env.DB_PASSWORD || 'sadafpj6761',
      });

      const dbName = process.env.DB_NAME || 'job-aggregator-mysql';
      
      this.logger.log(`Checking if database '${dbName}' exists...`);
      
      await connection.execute(
        `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      
      this.logger.log(`Database '${dbName}' is ready!`);
      
      await connection.end();
    } catch (error) {
      this.logger.error('Failed to initialize database:', error);
      throw error;
    }
  }
}