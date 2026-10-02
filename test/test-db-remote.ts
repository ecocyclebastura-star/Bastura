import { sql } from './src/model/connection.ts';
sql`SELECT 1`.then(console.log).catch(console.error).finally(()=>process.exit(0));
