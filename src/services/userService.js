import { Database } from '../supabase.js';

export async function getOrCreateUser(telegramUser) {
  const { id, username, first_name } = telegramUser;

  // Check if user exists
  const { data: existingUser, error: fetchError } = await Database
    .from('users')
    .select('*')
    .eq('telegram_id', id)
    .maybeSingle();

  if (fetchError) {
    console.error('Error fetching user:', fetchError);
    throw fetchError;
  }

  if (existingUser) {
    return existingUser;
  }

  // Create new user
  const { data: newUser, error: insertError } = await Database
    .from('users')
    .insert([
      {
        telegram_id: id,
        username: username || null,
        first_name: first_name || 'Usuario'
      }
    ])
    .select()
    .single();

  if (insertError) {
    console.error('Error creating user:', insertError);
    throw insertError;
  }

  return newUser;
}