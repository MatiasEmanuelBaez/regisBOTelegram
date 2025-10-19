import { classifyPaymentMethod } from "../services/paymentMethodService.js";

/**
 * Parsea un mensaje de gasto y devuelve monto, descripción y método de pago.
 * Formatos aceptados:
 * "50 almuerzo en restaurante"
 * "150.50 uber a casa tarjeta"
 * "30 farmacia efectivo"
 */

export async function parseExpenseMessage(message) {
  if (!message || typeof message !== 'string') {
    return {
      amount: null,
      description: 'Gasto sin descripción',
      paymentMethod: 'Efectivo'
    };
  }

  const [mainPart, paymentPart] = message.split('.');
  const parts = mainPart.trim().split(/\s+/);

  let amount = null;
  let description = [];
  let paymentMethod = null;

  for (const part of parts) {
    // Limpiar cualquier carácter que no sea dígito, punto o coma
    const cleanedPart = part.replace(/[^\d.,]/g, '').replace(',', '.');
    const numValue = parseFloat(cleanedPart);

    // Detectar monto: solo el primer número positivo
    if (!isNaN(numValue) && numValue > 0 && amount === null) {
      amount = Number(numValue); // Garantiza que sea número
    } else if (amount !== null) {
      description.push(part); // Después del monto, todo es descripción
    }
  }

  const descriptionText = description.join(' ') || 'Gasto sin descripción';

  // Detectar método de pago usando la función asíncrona
  try {
    const paymentMethodObj = await classifyPaymentMethod(paymentPart);
    paymentMethod = paymentMethodObj?.name || 'Efectivo';
  } catch (error) {
    console.error('Error clasificando método de pago:', error);
    paymentMethod = 'Efectivo';
  }

  return {
    amount,
    description: descriptionText,
    paymentMethod
  };
}


export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  }).format(amount);
}