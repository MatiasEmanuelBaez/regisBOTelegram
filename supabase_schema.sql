-- ============================================================
-- Mammon Bot - Schema completo de base de datos
-- Ejecutar en Supabase SQL Editor (en orden, de arriba a abajo)
-- ============================================================

-- ============================================================
-- 1. TABLAS
-- ============================================================

-- Usuarios (vinculados con Telegram y opcionalmente con Auth web)
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT NOT NULL DEFAULT 'Usuario',
  email TEXT UNIQUE,
  auth_id UUID UNIQUE REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categorías principales de gastos
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  icon TEXT NOT NULL DEFAULT '📦',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subcategorías (pertenecen a una categoría)
CREATE TABLE IF NOT EXISTS subcategories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Métodos de pago
CREATE TABLE IF NOT EXISTS payment_methods (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL DEFAULT 'other',
  icon TEXT NOT NULL DEFAULT '💳',
  keywords TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gastos registrados
CREATE TABLE IF NOT EXISTS expenses (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subcategory_id INTEGER NOT NULL REFERENCES subcategories(id),
  category_id INTEGER REFERENCES categories(id),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL DEFAULT 'Gasto sin descripcion',
  payment_method_id INTEGER REFERENCES payment_methods(id),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON subcategories(category_id);

-- ============================================================
-- 3. TRIGGER: auto-completar category_id en expenses
-- ============================================================

CREATE OR REPLACE FUNCTION set_expense_category()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.subcategory_id IS NOT NULL THEN
    SELECT category_id INTO NEW.category_id
    FROM subcategories
    WHERE id = NEW.subcategory_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_expense_category ON expenses;
CREATE TRIGGER trg_set_expense_category
  BEFORE INSERT OR UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION set_expense_category();

-- ============================================================
-- 4. ROW LEVEL SECURITY (para la web con anon key)
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Users: solo leen su propia fila
CREATE POLICY "Users read own data" ON users
  FOR SELECT USING (auth_id = auth.uid());

-- Expenses: solo leen sus propios gastos
CREATE POLICY "Users read own expenses" ON expenses
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Tablas de referencia: lectura pública
CREATE POLICY "Public read categories" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Public read subcategories" ON subcategories
  FOR SELECT USING (true);

CREATE POLICY "Public read payment_methods" ON payment_methods
  FOR SELECT USING (true);

-- NOTA: El bot usa service_role_key que bypasea RLS automáticamente.
-- No se necesitan políticas de INSERT/UPDATE/DELETE para el bot.

-- ============================================================
-- 5. DATA SEMILLA: Categorías
-- ============================================================

INSERT INTO categories (name, icon) VALUES
  ('Vivienda', '🏠'),
  ('Transporte', '🚗'),
  ('Alimentacion', '🍽️'),
  ('Salud y Belleza', '💊'),
  ('Educacion', '📚'),
  ('Entretenimiento', '🎬'),
  ('Familia', '👨‍👩‍👧'),
  ('Vestimenta', '👕'),
  ('Finanzas', '🏦'),
  ('Tecnologia', '📱'),
  ('Otros', '📦')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 6. DATA SEMILLA: Subcategorías con keywords
-- ============================================================

-- Vivienda
INSERT INTO subcategories (name, category_id, keywords) VALUES
  ('Alquileres', (SELECT id FROM categories WHERE name = 'Vivienda'), ARRAY['alquiler', 'amueblado', 'apartamento', 'arrendamiento', 'arriendo', 'campo', 'casa', 'deposito', 'fincas', 'garaje']),
  ('Servicios', (SELECT id FROM categories WHERE name = 'Vivienda'), ARRAY['agua', 'agua caliente', 'alarma hogar', 'alcantarillado', 'antena', 'asistente', 'caldera', 'calefaccion', 'canales', 'conserje']),
  ('Mantenimientos', (SELECT id FROM categories WHERE name = 'Vivienda'), ARRAY['abono', 'albanil', 'arreglo', 'atascos', 'averia', 'azulejo', 'brocha', 'cambio bombilla', 'carpintero', 'cerrajero']),
  ('Muebles y deco', (SELECT id FROM categories WHERE name = 'Vivienda'), ARRAY['alfombra', 'almohada', 'ambientador', 'armario', 'bodega', 'bricolaje decoracion', 'butaca', 'caja decoracion', 'cama', 'centro mesa']),
  ('Impuestos', (SELECT id FROM categories WHERE name = 'Vivienda'), ARRAY['actos juridicos', 'afip', 'agencias tributarias', 'ahorro', 'alcantarillado', 'alcohol', 'arbitrio', 'asesor fiscal', 'autoliquidacion', 'base imponible'])
ON CONFLICT (name) DO NOTHING;

-- Transporte
INSERT INTO subcategories (name, category_id, keywords) VALUES
  ('Combustible', (SELECT id FROM categories WHERE name = 'Transporte'), ARRAY['95 octanos', '98 octanos', 'adblue', 'ahorro combustible', 'autopista', 'barril', 'biodiesel', 'bomba', 'camion cisterna', 'carburante', 'nafta', 'gasolina', 'gasoil', 'diesel', 'gnc', 'carga combustible']),
  ('Transporte publico', (SELECT id FROM categories WHERE name = 'Transporte'), ARRAY['abono mensual', 'abono transporte', 'anden', 'app taxi', 'autobus', 'autocar', 'ave', 'billete', 'blablacar', 'boleto', 'colectivo', 'subte', 'tren', 'uber', 'cabify', 'taxi', 'sube']),
  ('Mantenimiento de vehiculo', (SELECT id FROM categories WHERE name = 'Transporte'), ARRAY['aceite', 'acumulador', 'adblue', 'aire acondicionado', 'alineacion', 'amortiguador', 'anticongelante', 'aparcamiento', 'balanceo', 'bateria', 'mecanico', 'taller', 'gomeria', 'neumatico']),
  ('Peaje y estacionamiento', (SELECT id FROM categories WHERE name = 'Transporte'), ARRAY['abono parking', 'aparcamiento aeropuerto', 'aparcamiento bici', 'aparcamiento centro comercial', 'aparcamiento cubierto', 'aparcamiento descubierto', 'aparcamiento disuasorio', 'aparcamiento estacion', 'aparcamiento moto', 'aparcamiento privado', 'peaje', 'estacionamiento', 'parking']),
  ('Seguro de vehiculo', (SELECT id FROM categories WHERE name = 'Transporte'), ARRAY['accidente', 'allianz', 'aseguradora vehiculo', 'asistencia en carretera', 'averia', 'axa', 'bonus', 'choque', 'cobertura', 'cobertura internacional', 'seguro auto']),
  ('Pago de vehiculos', (SELECT id FROM categories WHERE name = 'Transporte'), ARRAY['autoescuela', 'balloon', 'cambio propietario', 'carnet', 'carta verde', 'certificado revision', 'clases conduccion', 'coche kilometro 0', 'coche nuevo', 'coche segunda mano', 'patente', 'vtv']),
  ('Otros transportes', (SELECT id FROM categories WHERE name = 'Transporte'), ARRAY['a caballo', 'andar', 'avioneta', 'barco', 'bici', 'bici compartida', 'bici plegable', 'bicibus', 'bicicleta', 'bicicleta carretera'])
ON CONFLICT (name) DO NOTHING;

-- Alimentacion
INSERT INTO subcategories (name, category_id, keywords) VALUES
  ('Supermercado', (SELECT id FROM categories WHERE name = 'Alimentacion'), ARRAY['aceite', 'agua mineral', 'alimentacion', 'alimento mascota', 'almacen', 'aperitivo', 'arroz', 'azucar', 'bajo calorias', 'bebida isotonica', 'supermercado', 'verduleria', 'carniceria', 'fiambreria', 'compras', 'mercado']),
  ('Restaurantes', (SELECT id FROM categories WHERE name = 'Alimentacion'), ARRAY['agua', 'almuerzo', 'aniversario', 'asador', 'autoservicio', 'bar', 'booking', 'brunch', 'buffet', 'cafe', 'restaurante', 'cena', 'comida', 'parrilla', 'sushi', 'pizza', 'hamburguesa']),
  ('Cafeterias', (SELECT id FROM categories WHERE name = 'Alimentacion'), ARRAY['almuerzo', 'americano', 'aperitivo', 'bar cafe', 'batido', 'bizcocho', 'bocadillo', 'bolleria industrial', 'brunch', 'cafe', 'cafeteria', 'merienda', 'medialunas', 'facturas']),
  ('Delivery', (SELECT id FROM categories WHERE name = 'Alimentacion'), ARRAY['app comida', 'app delivery', 'bolsa termica', 'codigo promocional', 'combo', 'comida a casa', 'comida a domicilio', 'comida china a domicilio', 'comida llevar', 'comida rapida', 'pedidosya', 'rappi', 'glovo']),
  ('Bebidas', (SELECT id FROM categories WHERE name = 'Alimentacion'), ARRAY['absenta', 'agua con gas', 'agua embotellada', 'agua mineral', 'agua sabores', 'agua sin gas', 'agua tonica', 'anis', 'aperitivo', 'barril', 'cerveza', 'vino', 'gaseosa', 'jugo'])
ON CONFLICT (name) DO NOTHING;

-- Salud y Belleza
INSERT INTO subcategories (name, category_id, keywords) VALUES
  ('Seguro medico', (SELECT id FROM categories WHERE name = 'Salud y Belleza'), ARRAY['adeslas', 'ambulancia', 'analitica', 'app salud', 'aseguradora salud', 'asistencia sanitaria', 'asistencia telefonica', 'asistencia viaje', 'baja medica', 'capital asegurado', 'obra social', 'prepaga', 'osde', 'swiss medical']),
  ('Medicamentos', (SELECT id FROM categories WHERE name = 'Salud y Belleza'), ARRAY['aerosol', 'agua oxigenada', 'aguja', 'alcohol', 'ampolla', 'analgesico', 'ansiolitico', 'antiacido', 'antialergico', 'antibiotico', 'farmacia', 'remedio', 'medicamento', 'pastilla', 'ibuprofeno', 'paracetamol']),
  ('Consultas medicas', (SELECT id FROM categories WHERE name = 'Salud y Belleza'), ARRAY['alergologo', 'ambulatorio', 'analitica de sangre', 'anestesista', 'audiologo', 'auxiliar de clinica', 'baja laboral', 'biopsia', 'cardiologo', 'centro de salud', 'medico', 'doctor', 'odontologo', 'dentista', 'oculista', 'turno']),
  ('Ejercicio', (SELECT id FROM categories WHERE name = 'Salud y Belleza'), ARRAY['abdominales', 'acondicionamiento fisico', 'actividad fisica', 'adelgazar', 'aire libre', 'aquagym', 'artes marciales', 'atletismo', 'baile', 'bandas elasticas', 'gimnasio', 'gym', 'crossfit', 'pilates', 'yoga', 'natacion']),
  ('Higiene', (SELECT id FROM categories WHERE name = 'Salud y Belleza'), ARRAY['acondicionador', 'after shave', 'alcohol en gel', 'algodon', 'ambientador', 'ambientador bano', 'antibacterial', 'aseo', 'bano', 'bastoncillos', 'jabon', 'shampoo', 'desodorante', 'pasta dental']),
  ('Estetica', (SELECT id FROM categories WHERE name = 'Salud y Belleza'), ARRAY['acido hialuronico', 'afeitado tradicional', 'antiarrugas', 'anticelulitico', 'antiedad', 'aromaterapia', 'aumento de pecho', 'automaquillaje', 'balayage', 'banera de hidromasaje', 'peluqueria', 'manicura', 'depilacion', 'spa', 'masaje'])
ON CONFLICT (name) DO NOTHING;

-- Educacion
INSERT INTO subcategories (name, category_id, keywords) VALUES
  ('Colegiaturas', (SELECT id FROM categories WHERE name = 'Educacion'), ARRAY['academia', 'actividades extraescolares', 'ampa', 'anillo de graduacion', 'anualidad', 'asociacion de padres', 'autobus escolar', 'ayuda educativa', 'bachillerato', 'beca', 'colegio', 'escuela', 'cuota', 'matricula']),
  ('Cursos', (SELECT id FROM categories WHERE name = 'Educacion'), ARRAY['academia', 'academia de idiomas', 'acreditacion', 'alumno', 'aula virtual', 'autoescuela', 'bonificable', 'capacitacion', 'carrera', 'certificacion', 'curso', 'taller', 'seminario', 'clase']),
  ('Materiales', (SELECT id FROM categories WHERE name = 'Educacion'), ARRAY['acuarelas', 'agenda', 'alfileres', 'archivador', 'arcilla', 'audiolibro', 'barra de pegamento', 'bic', 'bloc de notas', 'block de dibujo', 'libro', 'cuaderno', 'lapiz', 'libreria']),
  ('Suscripciones educativas', (SELECT id FROM categories WHERE name = 'Educacion'), ARRAY['academia', 'acceso ilimitado', 'audible', 'aula virtual', 'autor', 'babbel', 'badge', 'biblioteca digital', 'blinkist', 'busuu', 'udemy', 'coursera', 'duolingo', 'platzi']),
  ('Guarderia', (SELECT id FROM categories WHERE name = 'Educacion'), ARRAY['actividades para ninos', 'adaptacion', 'almuerzo', 'app de comunicacion', 'arenero', 'au pair', 'aula', 'autorizacion', 'auxiliar de jardin de infancia', 'babysitter', 'jardin', 'guarderia', 'maternal'])
ON CONFLICT (name) DO NOTHING;

-- Entretenimiento
INSERT INTO subcategories (name, category_id, keywords) VALUES
  ('Cine / teatro / eventos', (SELECT id FROM categories WHERE name = 'Entretenimiento'), ARRAY['3d', 'aforo', 'anfiteatro', 'artista', 'auditorio', 'baile', 'ballet', 'banda', 'bebida', 'benefica', 'cine', 'teatro', 'recital', 'show', 'concierto', 'entrada', 'festival']),
  ('Streaming', (SELECT id FROM categories WHERE name = 'Entretenimiento'), ARRAY['alta definicion', 'amazon prime', 'anime', 'apple tv', 'atresplayer', 'avance', 'canal plus', 'catalogo', 'contenido sin conexion', 'continuar viendo', 'netflix', 'disney', 'hbo', 'spotify', 'youtube premium', 'crunchyroll']),
  ('Videojuegos', (SELECT id FROM categories WHERE name = 'Entretenimiento'), ARRAY['arma', 'artbook', 'aspecto', 'auriculares gaming', 'banda sonora', 'battle pass', 'battle.net', 'blizzard', 'caja botin', 'call of duty', 'playstation', 'xbox', 'nintendo', 'steam', 'ps plus', 'game pass']),
  ('Hobbies', (SELECT id FROM categories WHERE name = 'Entretenimiento'), ARRAY['acampada', 'acuario', 'aeromodelismo', 'aficion', 'ajedrez', 'analogica', 'asociacion', 'astronomia', 'baile', 'bateria', 'hobby', 'fotografia', 'pintura', 'musica', 'guitarra']),
  ('Viajes y vacaciones', (SELECT id FROM categories WHERE name = 'Entretenimiento'), ARRAY['accesibilidad', 'adaptador enchufe', 'aerolinea', 'aeropuerto', 'airbnb', 'all inclusive', 'alojamiento', 'apartamento turistico', 'asistencia en viaje', 'autobus', 'hotel', 'vuelo', 'pasaje', 'excursion', 'valija', 'vacaciones']),
  ('Deportes', (SELECT id FROM categories WHERE name = 'Entretenimiento'), ARRAY['abonado', 'abono', 'album', 'apuestas deportivas', 'arbitro', 'atletismo', 'autografo', 'balon', 'baloncesto', 'balonmano', 'futbol', 'cancha', 'padel', 'tenis', 'equipo deportivo']),
  ('Regalos', (SELECT id FROM categories WHERE name = 'Entretenimiento'), ARRAY['accesorios', 'adopcion animal', 'altavoz', 'amigo invisible', 'anillo', 'aniversario', 'arbol', 'arte', 'articulos de lujo', 'auriculares', 'regalo', 'cumpleanos', 'sorpresa', 'obsequio']),
  ('Actividades', (SELECT id FROM categories WHERE name = 'Entretenimiento'), ARRAY['acampada', 'actividad familiar', 'actividad solidaria', 'actuacion', 'acuario', 'album fotos', 'asado', 'avistamiento estrellas', 'ayuda comunitaria', 'barbacoa', 'escape room', 'parque', 'zoo'])
ON CONFLICT (name) DO NOTHING;

-- Familia
INSERT INTO subcategories (name, category_id, keywords) VALUES
  ('Cuidado de ninos', (SELECT id FROM categories WHERE name = 'Familia'), ARRAY['actividades', 'adaptacion del hogar', 'apoyo escolar', 'au pair', 'babyproofing', 'babysitter', 'bano', 'canguro', 'carrito', 'cena', 'ninera', 'panales']),
  ('Mascotas', (SELECT id FROM categories WHERE name = 'Familia'), ARRAY['accesorios mascota', 'acogida animal', 'acuario', 'adiestrador', 'adopcion', 'alimento humedo', 'alimento mascota', 'analitica mascota', 'antiparasitarios', 'arena gato', 'veterinario', 'perro', 'gato', 'mascota', 'pipeta'])
ON CONFLICT (name) DO NOTHING;

-- Vestimenta
INSERT INTO subcategories (name, category_id, keywords) VALUES
  ('Ropa', (SELECT id FROM categories WHERE name = 'Vestimenta'), ARRAY['abrigo', 'accesorios', 'albornoz', 'americana', 'armario capsula', 'arreglos', 'asesoria imagen', 'banador', 'basicos', 'batin', 'remera', 'pantalon', 'campera', 'jean', 'vestido', 'camisa']),
  ('Calzado', (SELECT id FROM categories WHERE name = 'Vestimenta'), ARRAY['adidas', 'almohadilla', 'alpargata', 'ancho', 'arreglo calzado', 'artesanal', 'bailarina', 'baile', 'ballet', 'baloncesto', 'zapatillas', 'zapatos', 'botas', 'ojotas', 'sandalias', 'nike']),
  ('Accesorios / joyas', (SELECT id FROM categories WHERE name = 'Vestimenta'), ARRAY['accesorio', 'alianza', 'anillo', 'arete', 'automatico', 'bandolera', 'bisuteria', 'bolso', 'brazalete', 'broche', 'reloj', 'lentes', 'cartera', 'mochila', 'cinturon'])
ON CONFLICT (name) DO NOTHING;

-- Finanzas
INSERT INTO subcategories (name, category_id, keywords) VALUES
  ('Comisiones', (SELECT id FROM categories WHERE name = 'Finanzas'), ARRAY['ajd', 'american express', 'aval', 'banca privada', 'banca tradicional', 'banco', 'banco espana', 'banco online', 'bankia', 'bbva', 'comision', 'mantenimiento cuenta', 'costo bancario']),
  ('Intereses / prestamos', (SELECT id FROM categories WHERE name = 'Finanzas'), ARRAY['amortizacion', 'amortizacion anticipada', 'asnef', 'aval', 'ayudas', 'banco', 'bonificacion interes', 'caja', 'cancelacion hipoteca', 'capital', 'prestamo', 'credito', 'cuota prestamo', 'hipoteca', 'interes']),
  ('Ahorros', (SELECT id FROM categories WHERE name = 'Finanzas'), ARRAY['acciones', 'ahorro', 'ahorro automatico', 'app ahorro', 'apuesta', 'ayuda', 'banca digital', 'beca', 'bienes raices', 'plazo fijo', 'fondo comun']),
  ('Inversiones', (SELECT id FROM categories WHERE name = 'Finanzas'), ARRAY['acciones', 'adquisicion', 'agm', 'agresivo', 'alfa', 'altcoin', 'amnistia fiscal', 'analisis', 'anual', 'apalancamiento', 'bitcoin', 'cripto', 'cedear', 'bono', 'fci']),
  ('Donaciones', (SELECT id FROM categories WHERE name = 'Finanzas'), ARRAY['accion contra hambre', 'accion social', 'acogida', 'agua potable', 'albergue', 'aldeas infantiles', 'alfabetizacion', 'alimentos', 'alzheimer', 'amnesty international', 'donacion', 'caridad', 'ong']),
  ('Ayuda familiar', (SELECT id FROM categories WHERE name = 'Finanzas'), ARRAY['accesibilidad', 'accidente', 'actividades extraescolares', 'adaptacion vivienda', 'alimentos', 'apoyo ancianos', 'apoyo discapacitados', 'apoyo economico', 'apoyo padres', 'ayuda familiar'])
ON CONFLICT (name) DO NOTHING;

-- Tecnologia
INSERT INTO subcategories (name, category_id, keywords) VALUES
  ('Telefono movil', (SELECT id FROM categories WHERE name = 'Tecnologia'), ARRAY['3g', '4g', '5g', 'accesibilidad', 'accesorios movil', 'actualizacion', 'adaptador', 'almacenamiento', 'android', 'antena', 'celular', 'telefono', 'plan celular', 'recarga', 'datos moviles']),
  ('Dispositivos', (SELECT id FROM categories WHERE name = 'Tecnologia'), ARRAY['2k', '4k', '5ghz', '6e', '8k', 'accesorios', 'actualizacion', 'actualizacion software', 'adaptador', 'ai', 'notebook', 'laptop', 'tablet', 'auriculares', 'mouse', 'teclado', 'monitor', 'pc']),
  ('Apps', (SELECT id FROM categories WHERE name = 'Tecnologia'), ARRAY['3ds max', 'adobe creative cloud', 'after effects', 'airbnb', 'almacenamiento nube', 'amazon appstore', 'aplicacion', 'app', 'app store', 'autocad', 'google one', 'icloud', 'microsoft 365', 'chatgpt'])
ON CONFLICT (name) DO NOTHING;

-- Otros
INSERT INTO subcategories (name, category_id, keywords) VALUES
  ('Otros no clasificados', (SELECT id FROM categories WHERE name = 'Otros'), ARRAY['abandono', 'absoluto', 'acabado', 'academico', 'accesorios varios', 'accidental', 'actitudes varias', 'activo', 'activos circulantes varios', 'activos diversos']),
  ('Gastos imprevistos', (SELECT id FROM categories WHERE name = 'Otros'), ARRAY['abogado urgente', 'accidente', 'accidente domestico', 'accidente trafico', 'acto vandalico', 'airbnb cancelado', 'aire acondicionado roto', 'alojamiento emergencia', 'ambulancia', 'asesoria juridica', 'emergencia', 'imprevisto', 'urgencia'])
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 7. DATA SEMILLA: Métodos de pago
-- ============================================================

INSERT INTO payment_methods (name, type, icon, keywords, is_active) VALUES
  ('Efectivo', 'cash', '💵', ARRAY['efectivo', 'cash', 'billete', 'moneda', 'plata'], TRUE),
  ('Tarjeta de debito', 'debit', '💳', ARRAY['debito', 'tarjeta debito', 'visa debito', 'maestro'], TRUE),
  ('Tarjeta de credito', 'credit', '💳', ARRAY['credito', 'tarjeta credito', 'visa', 'mastercard', 'amex', 'tarjeta'], TRUE),
  ('Transferencia', 'transfer', '🏦', ARRAY['transferencia', 'transferir', 'cbu', 'alias', 'banco'], TRUE),
  ('Mercado Pago', 'digital', '📱', ARRAY['mercado pago', 'mercadopago', 'mp', 'qr'], TRUE),
  ('Cuenta DNI', 'digital', '📱', ARRAY['cuenta dni', 'bna', 'banco nacion'], TRUE)
ON CONFLICT (name) DO NOTHING;
