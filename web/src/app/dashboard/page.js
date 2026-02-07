import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardContent from '@/components/dashboard/DashboardContent';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: botUser } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .maybeSingle();

  if (!botUser) return null; // El layout ya muestra el mensaje de vinculación

  return <DashboardContent userId={botUser.id} />;
}
