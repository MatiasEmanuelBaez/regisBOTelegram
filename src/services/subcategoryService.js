import { Database } from '../supabase.js';

// Obtener todas las subcategorias
export async function getAllSubcategories() {
  const { data, error } = await Database
    .from('subcategories')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching subcategories:', error);
    throw error;
  }

  return data;
}

// Clasificar automáticamente un gasto basado en su descripción
export async function classifyExpense(description) {
  const lowerDescription = description.toLowerCase();
  
  // Obtener todas las subcategorías con sus keywords
  const { data: subcategories, error } = await Database
    .from('subcategories')
    .select('*');

  if (error) {
    console.error('Error fetching subcategories for classification:', error);
    throw error;
  }

  // Buscar coincidencias con keywords
  for (const subcategory of subcategories) {
    const keywords = subcategory.keywords || [];
    
    for (const keyword of keywords) {
      if (lowerDescription.includes(keyword.toLowerCase())) {
        return subcategory;
      }
    }
  }

  // Si no encuentra coincidencia, devolver "Otros"
  const { data: otherCategory } = await Database
    .from('subcategories')
    .select('*')
    .eq('name', 'Otros no clasificados')
    .maybeSingle();

  return otherCategory;
}

// Buscar categoría por nombre (para cuando el usuario especifique una)
export async function findSubcategoryByName(subcategoryName) {
  const { data, error } = await Database
    .from('subcategories')
    .select('*')
    .ilike('name', subcategoryName)
    .maybeSingle();

  if (error) {
    console.error('Error finding subcategory:', error);
    throw error;
  }

  return data;
}

// Función para obtener subcategoría con su categoría
export async function getSubcategoryWithCategory(subcategoryId) {
  const { data, error } = await Database
    .from('subcategories')
    .select(`
      *,
      categories (*)
    `)
    .eq('id', subcategoryId)
    .single();

  if (error) {
    console.error('Error getting subcategory with category:', error);
    throw error;
  }

  return data;
}