import { Database } from '../supabase.js';

// Obtener todas las categorías globales
export async function getAllCategories() {
  const { data, error } = await Database
    .from('categories')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }

  return data;
}

// Clasificar automáticamente un gasto basado en su descripción
export async function classifyExpense(description) {
  const lowerDescription = description.toLowerCase();
  
  // Obtener todas las categorías con sus keywords
  const { data: categories, error } = await Database
    .from('categories')
    .select('*');

  if (error) {
    console.error('Error fetching categories for classification:', error);
    throw error;
  }

  // Buscar coincidencias con keywords
  for (const category of categories) {
    const keywords = category.keywords || [];
    
    for (const keyword of keywords) {
      if (lowerDescription.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  // Si no encuentra coincidencia, devolver "Otros"
  const { data: otherCategory } = await Database
    .from('categories')
    .select('*')
    .eq('name', 'Otros')
    .maybeSingle();

  return otherCategory;
}

// Buscar categoría por nombre (para cuando el usuario especifique una)
export async function findCategoryByName(categoryName) {
  const { data, error } = await Database
    .from('categories')
    .select('*')
    .ilike('name', categoryName)
    .maybeSingle();

  if (error) {
    console.error('Error finding category:', error);
    throw error;
  }

  return data;
}