'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { getMonthRange } from '@/lib/utils/dateUtils';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';

const COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
  '#e11d48', '#7c3aed',
];

export default function CategoryChart({ userId, year, month }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const supabase = createClient();
      const { start, end } = getMonthRange(year, month);

      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount, subcategories(categories(name, icon))')
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
        const cat = e.subcategories?.categories;
        const name = cat ? `${cat.icon} ${cat.name}` : 'Sin categoria';
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
      <h3 className="text-sm font-medium text-gray-500 mb-4">Gastos por categoria</h3>
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
