'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { getMonthRange } from '@/lib/utils/dateUtils';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';

export default function SummaryCards({ userId, year, month }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const supabase = createClient();
      const { start, end } = getMonthRange(year, month);

      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount, subcategories(name, categories(name))')
        .eq('user_id', userId)
        .gte('expense_date', start)
        .lte('expense_date', end);

      if (!expenses || expenses.length === 0) {
        setData({ total: 0, count: 0, avgDaily: 0, topCategory: '-' });
        setLoading(false);
        return;
      }

      const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const count = expenses.length;
      const daysInMonth = new Date(year, month, 0).getDate();
      const avgDaily = total / daysInMonth;

      // Categoría más gastada
      const categoryTotals = {};
      expenses.forEach((e) => {
        const catName = e.subcategories?.categories?.name || 'Sin categoria';
        categoryTotals[catName] = (categoryTotals[catName] || 0) + (e.amount || 0);
      });
      const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

      setData({ total, count, avgDaily, topCategory });
      setLoading(false);
    }

    fetchData();
  }, [userId, year, month]);

  if (loading) return <Spinner />;

  const cards = [
    { label: 'Total del mes', value: formatCurrency(data.total), color: 'text-indigo-600' },
    { label: 'Cantidad de gastos', value: data.count, color: 'text-gray-900' },
    { label: 'Promedio diario', value: formatCurrency(data.avgDaily), color: 'text-emerald-600' },
    { label: 'Mayor categoria', value: data.topCategory, color: 'text-amber-600' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <p className="text-sm text-gray-500">{card.label}</p>
          <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
        </Card>
      ))}
    </div>
  );
}
