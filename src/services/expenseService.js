import { Database } from '../supabase.js';
import { capitalizeSentence } from '../utils/helpers.js'

export async function createExpense(userId, subcategoryId, amount, description, paymentMethodId = null, expenseDate = null) {

  description = capitalizeSentence(description);

  const expenseData = {
    user_id: userId,
    subcategory_id: subcategoryId,
    amount: parseFloat(amount),
    description,
    payment_method_id: paymentMethodId,
    expense_date: expenseDate || new Date().toISOString().split('T')[0]
  };

  const { data, error } = await Database
    .from('expenses')
    .insert([expenseData])
    .select()
    .single();

  if (error) {
    console.error('Error creating expense:', error);
    throw error;
  }

  return data;
}

export async function getRecentExpenses(userId, limit = 10) {
  const { data, error } = await Database
    .from('expenses')
    .select(`
      *,
      categories (name, icon),
      payment_methods (name, icon, type)
    `)
    .eq('user_id', userId)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching expenses:', error);
    throw error;
  }

  return data;
}

export async function getMonthlyTotal(userId, year, month) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const { data, error } = await Database
    .from('expenses')
    .select('amount')
    .eq('user_id', userId)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate);

  if (error) {
    console.error('Error fetching monthly total:', error);
    throw error;
  }

  const total = data.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
  return total;
}

export async function getCategoryTotals(userId, year, month) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const { data, error } = await Database
    .from('expenses')
    .select(`
      amount,
      categories (name, icon)
    `)
    .eq('user_id', userId)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate);

  if (error) {
    console.error('Error fetching category totals:', error);
    throw error;
  }

  const totals = {};
  data.forEach(expense => {
    const categoryName = expense.categories?.name || 'Sin categoría';
    const categoryIcon = expense.categories?.icon || '📦';
    const key = `${categoryIcon} ${categoryName}`;
    
    if (!totals[key]) {
      totals[key] = 0;
    }
    totals[key] += parseFloat(expense.amount);
  });

  return totals;
}

export async function getPaymentMethodTotals(userId, year, month) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const { data, error } = await Database
    .from('expenses')
    .select(`
      amount,
      payment_methods (name, icon)
    `)
    .eq('user_id', userId)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate);

  if (error) {
    console.error('Error fetching payment method totals:', error);
    throw error;
  }

  const totals = {};
  data.forEach(expense => {
    const methodName = expense.payment_methods?.name || 'Sin especificar';
    const methodIcon = expense.payment_methods?.icon || '💰';
    const key = `${methodIcon} ${methodName}`;
    
    if (!totals[key]) {
      totals[key] = 0;
    }
    totals[key] += parseFloat(expense.amount);
  });

  return totals;
}