import * as dotenv from 'dotenv';

dotenv.config();

const config = {
  env: process.env.NODE_ENV || 'dev',
  db: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    name: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    user: process.env.DB_USER,
    url: process.env.DATABASE_URL,
  },
  redis: process.env.REDIS_URL,
};

export default config;
