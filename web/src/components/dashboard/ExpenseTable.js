'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { getMonthRange, getCurrentYearMonth, MONTH_NAMES } from '@/lib/utils/dateUtils';
import Spinner from '@/components/ui/Spinner';

const PAGE_SIZE = 15;

export default function ExpenseTable({ userId }) {
  const current = getCurrentYearMonth();
  const [year, setYear] = useState(current.year);
  const [month, setMonth] = useState(current.month);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    async function fetchExpenses() {
      setLoading(true);
      const supabase = createClient();
      const { start, end } = getMonthRange(year, month);

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE;

      const { data } = await supabase
        .from('expenses')
        .select('id, amount, description, expense_date, subcategories(name, categories(name, icon)), payment_methods(name, icon)')
        .eq('user_id', userId)
        .gte('expense_date', start)
        .lte('expense_date', end)
        .order('expense_date', { ascending: false })
        .range(from, to);

      if (data) {
        setHasMore(data.length > PAGE_SIZE);
        setExpenses(data.slice(0, PAGE_SIZE));
      } else {
        setExpenses([]);
        setHasMore(false);
      }

      setLoading(false);
    }

    fetchExpenses();
  }, [userId, year, month, page]);

  // Resetear página al cambiar filtros
  useEffect(() => {
    setPage(0);
  }, [year, month]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Historial de gastos</h1>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={i} value={i + 1}>{name}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {[current.year - 1, current.year, current.year + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : expenses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-500">
          No hay gastos registrados en este periodo.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Descripcion</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Categoria</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Pago</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expenses.map((expense) => {
                  const cat = expense.subcategories?.categories;
                  const pm = expense.payment_methods;
                  return (
                    <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(expense.expense_date).toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {expense.description}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {cat ? `${cat.icon} ${cat.name}` : '-'}
                        {expense.subcategories?.name && (
                          <span className="text-gray-400 ml-1 text-xs">/ {expense.subcategories.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {pm ? `${pm.icon} ${pm.name}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                        {formatCurrency(expense.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-colors"
            >
              Anterior
            </button>
            <span className="text-sm text-gray-500">Pagina {page + 1}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-colors"
            >
              Siguiente
            </button>
          </div>
        </>
      )}
    </div>
  );
}
