-- DATOS DE DEMOSTRACIÓN (opcional, ejecutar UNA sola vez, después de funciones_app.sql)
-- Clientes de ejemplo (clave 123456) y dos pedidos REGISTRADOS listos para analizar.

INSERT INTO usuario (nombre_completo, login, contrasena, rol) VALUES
('Zapatería Pequeños Pasos S.R.L.', 'cliente_zapateria', extensions.crypt('123456', extensions.gen_salt('bf', 10)), 'CLIENTE'),
('Distribuidora Moda Kids Ltda.',   'cli_modakids',      extensions.crypt('123456', extensions.gen_salt('bf', 10)), 'CLIENTE'),
('Calzados Infantil Sur',           'cli_infantilsur',   extensions.crypt('123456', extensions.gen_salt('bf', 10)), 'CLIENTE');

INSERT INTO cliente (nit, razon_social, direccion, telefono, correo, estado, id_usuario) VALUES
('1020304015', 'Zapatería Pequeños Pasos S.R.L.', 'Av. Banzer 3er Anillo', '77012345', 'compras@pasos.bo', 'ACTIVO',
   (SELECT id_usuario FROM usuario WHERE login = 'cliente_zapateria')),
('3098123018', 'Distribuidora Moda Kids Ltda.', 'Calle Libertad 120', '70011223', 'ventas@modakids.bo', 'ACTIVO',
   (SELECT id_usuario FROM usuario WHERE login = 'cli_modakids')),
('2045891012', 'Calzados Infantil Sur', 'Av. Cristo Redentor 55', '76543210', 'info@infantilsur.bo', 'SUSPENDIDO',
   (SELECT id_usuario FROM usuario WHERE login = 'cli_infantilsur'));

INSERT INTO documento_compromiso (nro_documento, fecha_firma, deberes_sanciones, id_cliente) VALUES
('COMP-2026-001', '2026-11-01', 'Cumplir plazos de pago y condiciones mayoristas.', (SELECT id_cliente FROM cliente WHERE nit = '1020304015')),
('COMP-2026-002', '2026-11-02', 'Cumplir plazos de pago y condiciones mayoristas.', (SELECT id_cliente FROM cliente WHERE nit = '3098123018')),
('COMP-2026-003', '2026-11-03', 'Cumplir plazos de pago y condiciones mayoristas.', (SELECT id_cliente FROM cliente WHERE nit = '2045891012'));

SELECT sp_registrar_pedido(
  (SELECT id_cliente FROM cliente WHERE nit = '1020304015'),
  (SELECT id_usuario FROM usuario WHERE login = 'cliente_zapateria'),
  'Entregar en tienda principal en horario de la mañana.',
  '[{"id_calzado":1,"cantidad":25},{"id_calzado":2,"cantidad":15}]'::jsonb);

SELECT sp_registrar_pedido(
  (SELECT id_cliente FROM cliente WHERE nit = '3098123018'),
  (SELECT id_usuario FROM usuario WHERE login = 'cli_modakids'),
  NULL,
  '[{"id_calzado":3,"cantidad":30}]'::jsonb);
