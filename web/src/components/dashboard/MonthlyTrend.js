'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { SHORT_MONTH_NAMES } from '@/lib/utils/dateUtils';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';

export default function MonthlyTrend({ userId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const supabase = createClient();

      // Últimos 6 meses
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const startDate = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;

      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount, expense_date')
        .eq('user_id', userId)
        .gte('expense_date', startDate)
        .order('expense_date');

      if (!expenses) {
        setData([]);
        setLoading(false);
        return;
      }

      // Agrupar por mes
      const monthlyTotals = {};
      for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyTotals[key] = { month: SHORT_MONTH_NAMES[d.getMonth()], total: 0 };
      }

      expenses.forEach((e) => {
        const key = e.expense_date.substring(0, 7); // "YYYY-MM"
        if (monthlyTotals[key]) {
          monthlyTotals[key].total += e.amount || 0;
        }
      });

      setData(Object.values(monthlyTotals));
      setLoading(false);
    }

    fetchData();
  }, [userId]);

  if (loading) return <Spinner />;
  if (data.length === 0) return null;

  return (
    <Card>
      <h3 className="text-sm font-medium text-gray-500 mb-4">Tendencia mensual (ultimos 6 meses)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
          <Tooltip formatter={(value) => formatCurrency(value)} />
          <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
