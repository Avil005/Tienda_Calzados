# Tienda_Calzados — Importadora ABC (Pampili)

Sistema web para la distribución mayorista de calzados (SIS-303). Next.js 14 + TypeScript + Tailwind + Supabase (PostgreSQL).

## Historias de usuario implementadas
| HU | Pantalla | Ruta | Rol |
|----|----------|------|-----|
| HU-01 | Autenticación | `/login` | Todos |
| HU-02 | Registrar cliente y generar credenciales | `/admin/clientes` | ADMINISTRADOR |
| HU-04 | Consultar catálogo | `/catalogo` | CLIENTE |
| HU-05 | Registrar pedido y ver su estado | `/pedido` | CLIENTE |
| HU-08 | Analizar y confirmar pedido | `/pedidos/analisis` | ENCARGADO_PEDIDOS |
| HU-13 | Registrar salida de mercadería | `/almacen/despacho` | ENCARGADO_ALMACEN |

## Puesta en marcha
1. **Supabase**: cree un proyecto. En *SQL Editor* ejecute, en este orden:
   1. `supabase/schema.sql`
   2. `supabase/funciones_app.sql` (funciones transaccionales, RLS y contraseña `123456` para los usuarios semilla)
   3. `supabase/datos_demo.sql` (opcional: clientes y 2 pedidos de ejemplo)
2. Copie `.env.example` a `.env.local` y complete `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API) y `SESSION_SECRET` (cadena aleatoria larga).
3. `npm install` y luego `npm run dev` → http://localhost:3000
4. Pruebas: `npm test` (lógica) y `supabase/pruebas_sql.sql` en el SQL Editor (CP-11 y CP-12, transaccionales)

## Usuarios de prueba (clave `123456`)
`admin` · `pedidos1` · `almacen1` · `cliente_zapateria` (con datos_demo.sql)

## Flujo para probar de punta a punta
`cliente_zapateria`: catálogo → agregar → Mi Pedido → Enviar → `pedidos1`: Analizar → Confirmar → `almacen1`: checklist → Despachar → Confirmar entrega.

## Seguridad
- Las contraseñas se guardan con bcrypt (RNF-02); la sesión va en cookie `httpOnly` firmada (HMAC).
- La `service_role key` solo se usa en el servidor; RLS está activo sin políticas, así que la clave anónima no accede a nada.
- Cada pantalla valida el rol en el servidor (`requerirRol`), no solo ocultando botones.
