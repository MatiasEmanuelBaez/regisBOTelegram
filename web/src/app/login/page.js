import LoginForm from '@/components/auth/LoginForm';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mammon</h1>
          <p className="text-gray-500 mt-1">Control de gastos personales</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Iniciar sesion</h2>
          <LoginForm />
          <p className="text-center text-sm text-gray-500 mt-6">
            No tenes cuenta?{' '}
            <Link href="/register" className="text-indigo-600 hover:underline">
              Registrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
