import natural from 'natural';
import { SPANISH_SYNONYMS } from './SPANISH_SYNONYMS.js';

const STOPWORDS_ES = ['el', 'la', 'de', 'del', 'en', 'y', 'a', 'para', 'con', 'por', 'un', 'una', 'los', 'las', 'que', 'es', 'se', 'lo', 'al', 'le', 'su', 'me', 'mi'];

// Puntajes de coincidencia
const SCORE_EXACT = 10;
const SCORE_SUBSTRING = 6;
const SCORE_FUZZY = 4;
const MIN_SCORE = 4; // Puntaje mínimo para considerar válida una clasificación

/**
 * Normaliza texto: minúsculas, sin acentos, sin caracteres especiales.
 */
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^\w\s]/g, ' ')        // Quitar caracteres especiales
    .trim();
}

/**
 * Extrae palabras relevantes de un texto (sin stopwords ni palabras cortas).
 */
function extractWords(text) {
  const normalized = normalizeText(text);
  return normalized
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS_ES.includes(w));
}

/**
 * Calcula el puntaje de una descripción contra los keywords de una subcategoría.
 */
function scoreSubcategory(descriptionWords, keywords) {
  let totalScore = 0;

  for (const word of descriptionWords) {
    let bestScore = 0;

    for (const keyword of keywords) {
      const normalizedKeyword = normalizeText(keyword);
      const keywordParts = normalizedKeyword.split(/\s+/);

      for (const kwPart of keywordParts) {
        if (kwPart.length < 3) continue;

        // 1. Match exacto
        if (word === kwPart) {
          bestScore = Math.max(bestScore, SCORE_EXACT);
          continue;
        }

        // 2. Substring match (uno contiene al otro)
        if (word.length >= 4 && kwPart.length >= 4) {
          if (word.includes(kwPart) || kwPart.includes(word)) {
            bestScore = Math.max(bestScore, SCORE_SUBSTRING);
            continue;
          }
        }

        // 3. Similitud fuzzy (Jaro-Winkler >= 0.85)
        if (word.length >= 4 && kwPart.length >= 4) {
          const similarity = natural.JaroWinklerDistance(word, kwPart);
          if (similarity >= 0.85) {
            bestScore = Math.max(bestScore, SCORE_FUZZY);
          }
        }
      }
    }

    totalScore += bestScore;
  }

  return totalScore;
}

/**
 * Clasifica un gasto por su descripción.
 * Retorna el nombre de la subcategoría (string) o null si no hay match suficiente.
 */
export function classifyExpense(description) {
  if (!description) return null;

  const words = extractWords(description);
  if (words.length === 0) return null;

  let bestCategory = null;
  let bestScore = 0;

  for (const [subcategory, keywords] of Object.entries(SPANISH_SYNONYMS)) {
    // Ignorar categorías genéricas en el scoring principal
    if (subcategory === 'Otros no clasificados' || subcategory === 'Gastos imprevistos') continue;

    const score = scoreSubcategory(words, keywords);

    if (score > bestScore) {
      bestScore = score;
      bestCategory = subcategory;
    }
  }

  if (bestScore >= MIN_SCORE && bestCategory) {
    return bestCategory;
  }

  return null;
}
