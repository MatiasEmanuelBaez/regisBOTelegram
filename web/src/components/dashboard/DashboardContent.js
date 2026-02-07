'use client';

import { useState } from 'react';
import { getCurrentYearMonth, MONTH_NAMES } from '@/lib/utils/dateUtils';
import SummaryCards from './SummaryCards';
import CategoryChart from './CategoryChart';
import MonthlyTrend from './MonthlyTrend';
import PaymentBreakdown from './PaymentBreakdown';

export default function DashboardContent({ userId }) {
  const current = getCurrentYearMonth();
  const [year, setYear] = useState(current.year);
  const [month, setMonth] = useState(current.month);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
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

      <SummaryCards userId={userId} year={year} month={month} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryChart userId={userId} year={year} month={month} />
        <PaymentBreakdown userId={userId} year={year} month={month} />
      </div>

      <MonthlyTrend userId={userId} />
    </div>
  );
}
