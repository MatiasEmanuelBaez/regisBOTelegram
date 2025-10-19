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

// Función para obtener la categoría desde una subcategoría
export async function getCategoryBySubcategory(subcategoryId) {
  const { data, error } = await Database
    .from('subcategories')
    .select(`
      *,
      categories (*)
    `)
    .eq('id', subcategoryId)
    .single();

  if (error) {
    console.error('Error getting category by subcategory:', error);
    throw error;
  }

  return data.categories;
}