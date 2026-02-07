import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardNav from '@/components/dashboard/DashboardNav';

export default async function DashboardLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Buscar el usuario vinculado del bot
  const { data: botUser } = await supabase
    .from('users')
    .select('id, first_name, telegram_id')
    .eq('auth_id', user.id)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav email={user.email} userName={botUser?.first_name} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!botUser ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <p className="text-amber-800 font-medium text-lg mb-2">
              Tu cuenta no esta vinculada al bot de Telegram
            </p>
            <p className="text-amber-700 text-sm mb-4">
              Para ver tus gastos, envia este comando en el bot:
            </p>
            <code className="bg-white rounded-lg px-4 py-2 text-sm text-indigo-700 border border-amber-200">
              /vincular {user.email}
            </code>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
