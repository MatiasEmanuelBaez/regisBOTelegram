import TelegramBot from 'node-telegram-bot-api';
import { getOrCreateUser } from '../src/services/userService.js';
import { getAllCategories, classifyExpense } from '../src/services/categoryService.js';
import { getPaymentMethods, findPaymentMethodByName } from '../src/services/paymentMethodService.js';
import { createExpense, getRecentExpenses, getMonthlyTotal, getCategoryTotals, getPaymentMethodTotals } from '../src/services/expenseService.js';
import { parseExpenseMessage, formatCurrency } from '../src/utils/parser.js';

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const update = req.body;
      
      if (update.message) {
        await processMessage(update.message);
      }
      
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

async function processMessage(msg) {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  try {
    // Comando /start
    if (text === '/start') {
      await getOrCreateUser(msg.from);
      const welcomeMessage = `¡Hola ${msg.from.first_name}! 👋\n\nRegistra tus gastos y el bot los clasificará automáticamente.\n\nEjemplo: \`50 almuerzo restaurante\`\n\nComandos:\n/categorias\n/metodos\n/resumen\n/recientes\n/ayuda`;
      await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
      return;
    }

    // Comando /categorias
    if (text === '/categorias') {
      const categories = await getAllCategories();
      let message = '📂 *Categorías:*\n\n';
      categories.forEach(cat => {
        message += `${cat.icon} ${cat.name}\n`;
      });
      message += '\n💡 El bot clasificará automáticamente tus gastos.';
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      return;
    }

    // Comando /metodos
    if (text === '/metodos') {
      const methods = await getPaymentMethods();
      let message = '💳 *Medios de pago:*\n\n';
      methods.forEach(method => {
        message += `${method.icon} ${method.name}\n`;
      });
      message += '\n💡 Especifica el medio al final: `50 almuerzo efectivo`';
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      return;
    }

    // Comando /resumen
    if (text === '/resumen') {
      const user = await getOrCreateUser(msg.from);
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      
      const monthlyTotal = await getMonthlyTotal(user.id, year, month);
      const categoryTotals = await getCategoryTotals(user.id, year, month);
      const paymentMethodTotals = await getPaymentMethodTotals(user.id, year, month);
      
      let message = `📊 *Resumen del mes*\n\n💰 Total: *${formatCurrency(monthlyTotal)}*\n\n`;
      
      if (Object.keys(categoryTotals).length > 0) {
        message += '*Por categoría:*\n';
        for (const [category, total] of Object.entries(categoryTotals)) {
          message += `${category}: ${formatCurrency(total)}\n`;
        }
        
        message += '\n*Por medio de pago:*\n';
        for (const [method, total] of Object.entries(paymentMethodTotals)) {
          message += `${method}: ${formatCurrency(total)}\n`;
        }
      }
      
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      return;
    }

    // Comando /recientes
    if (text === '/recientes') {
      const user = await getOrCreateUser(msg.from);
      const expenses = await getRecentExpenses(user.id);
      
      if (expenses.length === 0) {
        await bot.sendMessage(chatId, 'No tienes gastos registrados.');
        return;
      }
      
      let message = '📋 *Últimos gastos:*\n\n';
      expenses.forEach(expense => {
        const icon = expense.categories?.icon || '📦';
        const category = expense.categories?.name || 'Sin categoría';
        const paymentIcon = expense.payment_methods?.icon || '💰';
        const paymentMethod = expense.payment_methods?.name || 'N/E';
        message += `${icon} ${formatCurrency(expense.amount)} - ${category}\n   ${expense.description}\n   ${paymentIcon} ${paymentMethod}\n\n`;
      });
      
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      return;
    }

    // Procesar gasto
    if (!text.startsWith('/')) {
      const user = await getOrCreateUser(msg.from);
      const parsed = parseExpenseMessage(text);
      
      if (!parsed.amount) {
        await bot.sendMessage(chatId, '❌ No detecté el monto. Ejemplo: `50 almuerzo`', { parse_mode: 'Markdown' });
        return;
      }
      
      // Clasificar automáticamente
      const category = await classifyExpense(parsed.description);
      
      if (!category) {
        await bot.sendMessage(chatId, '❌ Error al clasificar. Intenta de nuevo.');
        return;
      }
      
      // Buscar método de pago
      let paymentMethodId = null;
      if (parsed.paymentMethod) {
        const paymentMethod = await findPaymentMethodByName(user.id, parsed.paymentMethod);
        if (paymentMethod) {
          paymentMethodId = paymentMethod.id;
        }
      }
      
      const expense = await createExpense(user.id, category.id, parsed.amount, parsed.description, paymentMethodId);
      
      await bot.sendMessage(chatId, 
        `✅ Gasto registrado\n\n${category.icon} ${category.name}\n💰 ${formatCurrency(expense.amount)}\n📝 ${expense.description}`,
        { parse_mode: 'Markdown' }
      );
    }
  } catch (error) {
    console.error('Error:', error);
    await bot.sendMessage(chatId, '❌ Error. Intenta de nuevo.');
  }
}