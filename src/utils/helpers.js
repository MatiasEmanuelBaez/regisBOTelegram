// Función para capitalizar la primera letra de una oración
export function capitalizeSentence(sentence) {
  if (!sentence || typeof sentence !== 'string') return sentence;
  
  // Trim espacios y convertir a minúsculas
  const trimmed = sentence.trim().toLowerCase();
  if (trimmed.length === 0) return sentence;
  
  // Capitalizar primera letra
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

// Función para capitalizar cada palabra
export function capitalizeWords(sentence) {
  if (!sentence || typeof sentence !== 'string') return sentence;
  
  return sentence
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}