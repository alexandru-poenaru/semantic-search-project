import { Pool } from 'pg';

// Using "Pool" instead of "Client" allows the app to manage multiple connections
// without crashing when traffic gets high.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://postgres:mysecretpassword@localhost:5432/rag_db",
});

export default pool;