import { Database } from '../supabase.js';

export async function getPaymentMethods() {
  const { data, error } = await Database
    .from('payment_methods')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching payment methods:', error);
    throw error;
  }

  return data;
}

export async function createPaymentMethod(name, type, icon = '💳') {
  const { data, error } = await Database
    .from('payment_methods')
    .insert([{ 
      name, 
      type,
      icon 
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating payment method:', error);
    throw error;
  }

  return data;
}

export async function findPaymentMethodByName(paymentMethodName) {
  const { data, error } = await Database
    .from('payment_methods')
    .select('*')
    .ilike('name', paymentMethodName)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('Error finding payment method:', error);
    throw error;
  }

  return data;
}

export async function classifyPaymentMethod(description) {
  const lowerDescription = description.toLowerCase();
  
  // Obtener todas las categorías con sus keywords
  const { data: payment_methods, error } = await Database
    .from('payment_methods')
    .select('*');

  if (error) {
    console.error('Error fetching categories for classification:', error);
    throw error;
  }

  // Buscar coincidencias con keywords
  for (const payment_method of payment_methods) {
    const keywords = payment_method.keywords || [];
    
    for (const keyword of keywords) {
      if (lowerDescription.includes(keyword.toLowerCase())) {
        return payment_method;
      }
    }
  }

  // Si no encuentra coincidencia, devolver "Otros"
  const { data: otherCategory } = await Database
    .from('payment_methods')
    .select('*')
    .eq('name', 'Efectivo')
    .maybeSingle();

  return otherCategory;
}