import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const DatabaseUrl = process.env.SUPABASE_URL;
const DatabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DatabaseUrl || !DatabaseKey) {
  throw new Error('Missing Database credentials');
}

export const Database = createClient(DatabaseUrl, DatabaseKey);