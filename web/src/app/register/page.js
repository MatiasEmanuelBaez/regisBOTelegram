import RegisterForm from '@/components/auth/RegisterForm';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mammon</h1>
          <p className="text-gray-500 mt-1">Crea tu cuenta para ver tus gastos</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Crear cuenta</h2>
          <RegisterForm />
          <p className="text-center text-sm text-gray-500 mt-6">
            Ya tenes cuenta?{' '}
            <Link href="/login" className="text-indigo-600 hover:underline">
              Iniciar sesion
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
