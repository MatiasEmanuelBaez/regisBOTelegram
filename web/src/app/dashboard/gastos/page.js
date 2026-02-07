import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ExpenseTable from '@/components/dashboard/ExpenseTable';

export default async function GastosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: botUser } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .maybeSingle();

  if (!botUser) return null;

  return <ExpenseTable userId={botUser.id} />;
}
