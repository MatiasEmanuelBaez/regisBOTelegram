import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { getOrCreateUser } from './services/userService.js';
import { getAllCategories, classifyExpense, findCategoryByName } from './services/categoryService.js';
import { getPaymentMethods, findPaymentMethodByName } from './services/paymentMethodService.js';
import { createExpense, getRecentExpenses, getMonthlyTotal, getCategoryTotals, getPaymentMethodTotals } from './services/expenseService.js';
import { parseExpenseMessage, formatCurrency } from './utils/parser.js';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is required');
}

const bot = new TelegramBot(token, { polling: true });

// Comando /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from;

  try {
    await getOrCreateUser(user);
    
    const welcomeMessage = `
¡Hola ${user.first_name}! 👋

Soy tu asistente de gastos personales con clasificación automática.

*Cómo registrar un gasto:*
Simplemente envía un mensaje describiendo tu gasto:
\`50 almuerzo en restaurante\`
\`25.50 uber a casa tarjeta\`
\`15 farmacia efectivo\`

El bot detectará automáticamente:
✅ La categoría del gasto
✅ El medio de pago (si lo especificas)

*Comandos disponibles:*
/start - Ver este mensaje
/categorias - Ver todas las categorías
/metodos - Ver tus medios de pago
/resumen - Ver resumen del mes actual
/recientes - Ver últimos 10 gastos
/ayuda - Ver ayuda detallada
    `.trim();

    await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in /start:', error);
    await bot.sendMessage(chatId, '❌ Error al iniciar. Por favor intenta de nuevo.');
  }
});

// Comando /categorias
bot.onText(/\/categorias/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    const categories = await getAllCategories();
    
    let message = '📂 *Categorías disponibles:*\n\n';
    message += 'El bot clasificará automáticamente tus gastos en estas categorías:\n\n';
    
    categories.forEach(cat => {
      message += `${cat.icon} ${cat.name}\n`;
    });
    
    message += '\n💡 Solo describe tu gasto y el bot lo clasificará automáticamente.';
    
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in /categorias:', error);
    await bot.sendMessage(chatId, '❌ Error al obtener categorías.');
  }
});

// Comando /metodos
bot.onText(/\/metodos/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    const methods = await getPaymentMethods();
    
    let message = '💳 *Medios de pago disponibles:*\n\n';
    
    methods.forEach(method => {
      message += `${method.icon} ${method.name}\n`;
    });
    
    message += '\n💡 Puedes especificar el medio de pago al final de tu mensaje:\n';
    message += 'Ejemplo: `50 almuerzo efectivo`\n';
    message += 'Ejemplo: `30 uber tarjeta`';
    
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in /metodos:', error);
    await bot.sendMessage(chatId, '❌ Error al obtener medios de pago.');
  }
});

// Comando /resumen
bot.onText(/\/resumen/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    const user = await getOrCreateUser(msg.from);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    const monthlyTotal = await getMonthlyTotal(user.id, year, month);
    const categoryTotals = await getCategoryTotals(user.id, year, month);
    const paymentMethodTotals = await getPaymentMethodTotals(user.id, year, month);
    
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    let message = `📊 *Resumen de ${monthNames[month - 1]} ${year}*\n\n`;
    message += `💰 Total: *${formatCurrency(monthlyTotal)}*\n\n`;
    
    if (Object.keys(categoryTotals).length === 0) {
      message += 'No hay gastos registrados este mes.';
    } else {
      message += `*Por categoría:*\n`;
      for (const [category, total] of Object.entries(categoryTotals)) {
        message += `${category}: ${formatCurrency(total)}\n`;
      }
      
      message += `\n*Por medio de pago:*\n`;
      for (const [method, total] of Object.entries(paymentMethodTotals)) {
        message += `${method}: ${formatCurrency(total)}\n`;
      }
    }
    
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in /resumen:', error);
    await bot.sendMessage(chatId, '❌ Error al generar resumen.');
  }
});

// Comando /recientes
bot.onText(/\/recientes/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    const user = await getOrCreateUser(msg.from);
    const expenses = await getRecentExpenses(user.id);
    
    if (expenses.length === 0) {
      await bot.sendMessage(chatId, 'No tienes gastos registrados aún.');
      return;
    }
    
    let message = '📋 *Últimos gastos:*\n\n';
    
    expenses.forEach(expense => {
      const icon = expense.categories?.icon || '📦';
      const category = expense.categories?.name || 'Sin categoría';
      const paymentIcon = expense.payment_methods?.icon || '💰';
      const paymentMethod = expense.payment_methods?.name || 'No especificado';
      const date = new Date(expense.expense_date).toLocaleDateString('es-ES');
      
      message += `${icon} *${formatCurrency(expense.amount)}* - ${category}\n`;
      message += `   ${expense.description}\n`;
      message += `   ${paymentIcon} ${paymentMethod}\n`;
      message += `   📅 ${date}\n\n`;
    });
    
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in /recientes:', error);
    await bot.sendMessage(chatId, '❌ Error al obtener gastos recientes.');
  }
});

// Comando /ayuda
bot.onText(/\/ayuda/, async (msg) => {
  const chatId = msg.chat.id;
  
  const helpMessage = `
  📖 *Guía de uso*

  *Registrar un gasto:*
  Simplemente describe tu gasto con el monto y la descripción.
  El bot clasificará automáticamente la categoría.

  *Formatos válidos:*
  ✅ \`50 almuerzo restaurante\`
  ✅ \`25.50 uber casa tarjeta\`
  ✅ \`15 farmacia paracetamol efectivo\`
  ✅ \`100 pago de luz\`

  *Especificar medio de pago:*
  Puedes añadir al final:
  • efectivo / cash
  • tarjeta / debito / credito

  *Categorías automáticas:*
  🍔 Comida
  🚗 Transporte
  💡 Servicios
  🎬 Entretenimiento
  💊 Salud
  🛍️ Compras
  📚 Educación
  🏠 Hogar
  💅 Belleza
  🐾 Mascotas
  ✈️ Viajes
  💻 Tecnología
  📦 Otros

  *Comandos:*
  /categorias - Ver todas las categorías
  /metodos - Ver medios de pago
  /resumen - Resumen del mes
  /recientes - Últimos 10 gastos
  /ayuda - Esta ayuda
  `.trim();
  
  await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

// Procesar mensajes de texto (gastos)
bot.on('message', async (msg) => {
  // Ignorar comandos
  if (msg.text?.startsWith('/')) return;
  
  const chatId = msg.chat.id;
  const text = msg.text;
  
  if (!text) return;
  
  try {
    const user = await getOrCreateUser(msg.from);
    const parsed = await parseExpenseMessage(text);
    
    if (!parsed.amount) {
      await bot.sendMessage(chatId, 
        '❌ No pude detectar el monto.\n\nEjemplo: `50 almuerzo en restaurante`',
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    // Clasificar automáticamente la categoría basada en la descripción
    const category = await classifyExpense(parsed.description);
    
    if (!category) {
      await bot.sendMessage(chatId, '❌ Error al clasificar el gasto. Intenta de nuevo.');
      return;
    }
    
    // Buscar método de pago si fue especificado
    let paymentMethodId = null;
    if (parsed.paymentMethod) {
      const paymentMethod = await findPaymentMethodByName(parsed.paymentMethod);
      if (paymentMethod) {
        paymentMethodId = paymentMethod.id;
      }
    }
    
    // Crear gasto
    const expense = await createExpense(
      user.id,
      category.id,
      parsed.amount,
      parsed.description,
      paymentMethodId
    );
    
    const confirmationMessage = `
✅ *Gasto registrado*

${category.icon} Categoría: ${category.name} (detectada automáticamente)
💰 Monto: ${formatCurrency(expense.amount)}
📝 Descripción: ${expense.description}
${paymentMethodId ? `💳 Medio de pago: Especificado` : '💳 Medio de pago: No especificado'}
📅 Fecha: ${new Date(expense.expense_date).toLocaleDateString('es-ES')}
    `.trim();
    
    await bot.sendMessage(chatId, confirmationMessage, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error processing message:', error);
    await bot.sendMessage(chatId, '❌ Error al procesar el gasto. Por favor intenta de nuevo.');
  }
});

console.log('✅ Bot iniciado correctamente');