'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { getMonthRange } from '@/lib/utils/dateUtils';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function PaymentBreakdown({ userId, year, month }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const supabase = createClient();
      const { start, end } = getMonthRange(year, month);

      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount, payment_methods(name, icon)')
        .eq('user_id', userId)
        .gte('expense_date', start)
        .lte('expense_date', end);

      if (!expenses) {
        setData([]);
        setLoading(false);
        return;
      }

      const totals = {};
      expenses.forEach((e) => {
        const pm = e.payment_methods;
        const name = pm ? `${pm.icon} ${pm.name}` : 'Sin especificar';
        totals[name] = (totals[name] || 0) + (e.amount || 0);
      });

      const chartData = Object.entries(totals)
        .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
        .sort((a, b) => b.value - a.value);

      setData(chartData);
      setLoading(false);
    }

    fetchData();
  }, [userId, year, month]);

  if (loading) return <Spinner />;
  if (data.length === 0) return null;

  return (
    <Card>
      <h3 className="text-sm font-medium text-gray-500 mb-4">Metodos de pago</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatCurrency(value)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
