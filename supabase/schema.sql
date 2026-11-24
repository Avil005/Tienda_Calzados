-- ============================================================================
-- SISTEMA DE DISTRIBUCIÓN DE CALZADOS - IMPORTADORA ABC (PAMPILI)
-- Motor: PostgreSQL / Supabase (Anexo A - SIS-303)
-- ============================================================================

-- 1. ENUMERACIONES (Figura 1)
CREATE TYPE rol_usuario AS ENUM (
    'ADMINISTRADOR', 'CLIENTE', 'ENCARGADO_ALMACEN', 'ENCARGADO_PEDIDOS'
);

CREATE TYPE estado_cliente AS ENUM ('ACTIVO', 'INACTIVO', 'SUSPENDIDO');

CREATE TYPE estado_pedido AS ENUM (
    'REGISTRADO', 'EN_ANALISIS', 'PENDIENTE_STOCK',
    'CONFIRMADO', 'DESPACHADO', 'ENTREGADO', 'CANCELADO'
);

CREATE TYPE tipo_almacen AS ENUM ('CENTRAL', 'MERCADO');

CREATE TYPE tipo_movimiento AS ENUM ('INGRESO', 'SALIDA', 'TRASPASO', 'AJUSTE');

-- 2. SEGURIDAD Y CLIENTES
CREATE TABLE usuario (
    id_usuario SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(120) NOT NULL,
    login VARCHAR(50) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL, -- RNF-02: Contraseña cifrada (hash)
    rol rol_usuario NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO'
);

CREATE TABLE cliente (
    id_cliente SERIAL PRIMARY KEY,
    nit VARCHAR(20) NOT NULL UNIQUE, -- RN-02: NIT único
    razon_social VARCHAR(150) NOT NULL,
    direccion VARCHAR(200) NOT NULL,
    telefono VARCHAR(30) NOT NULL,
    correo VARCHAR(100) NOT NULL,
    estado estado_cliente NOT NULL DEFAULT 'ACTIVO', -- RN-04: Sin borrado físico
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT UNIQUE REFERENCES usuario(id_usuario)
);

CREATE TABLE documento_compromiso (
    id_documento SERIAL PRIMARY KEY,
    nro_documento VARCHAR(50) NOT NULL UNIQUE,
    fecha_firma DATE NOT NULL,
    deberes_sanciones TEXT NOT NULL,
    id_cliente INT NOT NULL UNIQUE REFERENCES cliente(id_cliente) -- RN-03: 1 a 1
);

-- 3. CATÁLOGO DE CALZADOS
CREATE TABLE tipo_calzado (
    id_tipo SERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE marca (
    id_marca SERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    pais_origen VARCHAR(60) NOT NULL
);

CREATE TABLE modelo (
    id_modelo SERIAL PRIMARY KEY,
    codigo_modelo VARCHAR(40) NOT NULL UNIQUE,
    descripcion VARCHAR(150) NOT NULL,
    id_tipo INT NOT NULL REFERENCES tipo_calzado(id_tipo),
    id_marca INT NOT NULL REFERENCES marca(id_marca)
);

CREATE TABLE calzado (
    id_calzado SERIAL PRIMARY KEY,
    codigo_fabrica VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(40) NOT NULL,
    numero INT NOT NULL CHECK (numero > 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    id_modelo INT NOT NULL REFERENCES modelo(id_modelo)
);

-- 4. ALMACENES E INVENTARIO
CREATE TABLE almacen (
    id_almacen SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo tipo_almacen NOT NULL,
    ubicacion VARCHAR(200) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO'
);

CREATE TABLE existencia (
    id_almacen INT NOT NULL REFERENCES almacen(id_almacen),
    id_calzado INT NOT NULL REFERENCES calzado(id_calzado),
    cantidad INT NOT NULL DEFAULT 0 CHECK (cantidad >= 0), -- RNF-06: Nunca negativa
    stock_minimo INT NOT NULL DEFAULT 10 CHECK (stock_minimo >= 0),
    PRIMARY KEY (id_almacen, id_calzado)
);

-- 5. PEDIDOS
CREATE TABLE pedido (
    id_pedido SERIAL PRIMARY KEY,
    fecha_pedido TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_analisis TIMESTAMP NULL,
    fecha_aprox_entrega DATE NULL,
    estado estado_pedido NOT NULL DEFAULT 'REGISTRADO', -- RN-10
    observacion TEXT NULL,
    id_cliente INT NOT NULL REFERENCES cliente(id_cliente),
    id_usuario_analista INT NULL REFERENCES usuario(id_usuario), -- RN-09
    id_almacen INT NULL REFERENCES almacen(id_almacen) -- RN-06
);

CREATE TABLE detalle_pedido (
    id_detalle SERIAL PRIMARY KEY,
    cantidad_solicitada INT NOT NULL CHECK (cantidad_solicitada > 0),
    cantidad_confirmada INT NOT NULL DEFAULT 0 CHECK (cantidad_confirmada >= 0),
    id_pedido INT NOT NULL REFERENCES pedido(id_pedido) ON DELETE CASCADE,
    id_calzado INT NOT NULL REFERENCES calzado(id_calzado)
);

-- 6. MOVIMIENTOS DE INVENTARIO Y AUDITORÍA
CREATE TABLE movimiento_inventario (
    id_movimiento SERIAL PRIMARY KEY,
    nro_documento VARCHAR(50) NOT NULL UNIQUE, -- RN-14
    tipo tipo_movimiento NOT NULL,
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    motivo VARCHAR(200) NULL,
    id_usuario INT NOT NULL REFERENCES usuario(id_usuario),
    id_pedido INT NULL REFERENCES pedido(id_pedido),
    id_almacen_origen INT NULL REFERENCES almacen(id_almacen),
    id_almacen_destino INT NULL REFERENCES almacen(id_almacen),
    CONSTRAINT chk_almacenes_distintos CHECK (
        id_almacen_origen IS NULL OR id_almacen_destino IS NULL OR id_almacen_origen <> id_almacen_destino
    ) -- RN-11
);

CREATE TABLE detalle_movimiento (
    id_detalle_movimiento SERIAL PRIMARY KEY,
    cantidad INT NOT NULL CHECK (cantidad > 0), -- RN-12
    id_movimiento INT NOT NULL REFERENCES movimiento_inventario(id_movimiento) ON DELETE CASCADE,
    id_calzado INT NOT NULL REFERENCES calzado(id_calzado)
);

CREATE TABLE bitacora_auditoria ( -- RNF-03
    id_bitacora SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES usuario(id_usuario),
    fecha_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accion VARCHAR(100) NOT NULL,
    entidad VARCHAR(50) NOT NULL,
    detalle TEXT NOT NULL
);

-- 7. FUNCIÓN TRANSACCIONAL DE DESPACHO (HU-13, RNF-06, RN-07, RNF-03)
CREATE OR REPLACE FUNCTION sp_despachar_pedido(p_id_pedido INT, p_id_usuario INT)
RETURNS VOID AS $$
DECLARE
    v_estado estado_pedido;
    v_id_almacen INT;
    v_id_movimiento INT;
    v_stock_actual INT;
    r_detalle RECORD;
BEGIN
    SELECT estado, id_almacen INTO v_estado, v_id_almacen
    FROM pedido WHERE id_pedido = p_id_pedido FOR UPDATE;

    IF v_estado IS NULL THEN
        RAISE EXCEPTION 'El pedido no existe.';
    END IF;
    IF v_estado <> 'CONFIRMADO' THEN
        RAISE EXCEPTION 'Solo se pueden despachar pedidos en estado CONFIRMADO.';
    END IF;
    IF v_id_almacen IS NULL THEN
        RAISE EXCEPTION 'El pedido no tiene un almacén asignado.';
    END IF;

    INSERT INTO movimiento_inventario (nro_documento, tipo, motivo, id_usuario, id_pedido, id_almacen_origen)
    VALUES (
        'SAL-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || p_id_pedido,
        'SALIDA',
        'Despacho de pedido mayorista #' || p_id_pedido,
        p_id_usuario,
        p_id_pedido,
        v_id_almacen
    ) RETURNING id_movimiento INTO v_id_movimiento;

    FOR r_detalle IN
        SELECT id_calzado, cantidad_confirmada
        FROM detalle_pedido
        WHERE id_pedido = p_id_pedido AND cantidad_confirmada > 0
    LOOP
        SELECT cantidad INTO v_stock_actual
        FROM existencia
        WHERE id_almacen = v_id_almacen AND id_calzado = r_detalle.id_calzado
        FOR UPDATE;

        IF v_stock_actual IS NULL OR v_stock_actual < r_detalle.cantidad_confirmada THEN
            RAISE EXCEPTION 'Stock insuficiente en almacén para el calzado ID % (RNF-06).', r_detalle.id_calzado;
        END IF;

        UPDATE existencia
        SET cantidad = cantidad - r_detalle.cantidad_confirmada
        WHERE id_almacen = v_id_almacen AND id_calzado = r_detalle.id_calzado;

        INSERT INTO detalle_movimiento (cantidad, id_movimiento, id_calzado)
        VALUES (r_detalle.cantidad_confirmada, v_id_movimiento, r_detalle.id_calzado);
    END LOOP;

    UPDATE pedido SET estado = 'DESPACHADO' WHERE id_pedido = p_id_pedido;

    INSERT INTO bitacora_auditoria (id_usuario, accion, entidad, detalle)
    VALUES (
        p_id_usuario,
        'DESPACHO_PEDIDO',
        'pedido',
        'Pedido #' || p_id_pedido || ' despachado desde almacén #' || v_id_almacen
    );
END;
$$ LANGUAGE plpgsql;

-- 8. DATOS SEMILLA (Supuesto sección 2.4)
INSERT INTO usuario (nombre_completo, login, contrasena, rol) VALUES
('Admin Importadora ABC', 'admin', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'ADMINISTRADOR'),
('Carlos Pedidos', 'pedidos1', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'ENCARGADO_PEDIDOS'),
('Ana Almacén', 'almacen1', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'ENCARGADO_ALMACEN');

INSERT INTO almacen (nombre, tipo, ubicacion) VALUES
('Almacén Central Parque Industrial', 'CENTRAL', 'Parque Industrial Mz. 14, Santa Cruz'),
('Almacén Mercado La Ramada', 'MERCADO', 'Av. Grigotá y 2do Anillo, Santa Cruz');

INSERT INTO tipo_calzado (nombre) VALUES ('Sandalia'), ('Zapatilla'), ('Balerina');
INSERT INTO marca (nombre, pais_origen) VALUES ('Pampili', 'Brasil');

INSERT INTO modelo (codigo_modelo, descripcion, id_tipo, id_marca) VALUES
('PMP-101', 'Sandalia Infantil Brillo', 1, 1),
('PMP-205', 'Zapatilla Urbana Luz LED', 2, 1),
('PMP-310', 'Balerina Escolar Clásica', 3, 1);

INSERT INTO calzado (codigo_fabrica, color, numero, id_modelo) VALUES
('FAB-101-ROSA-28', 'Rosa', 28, 1),
('FAB-101-BLANCO-30', 'Blanco', 30, 1),
('FAB-205-LILA-32', 'Lila', 32, 2),
('FAB-310-NEGRO-34', 'Negro', 34, 3);

INSERT INTO existencia (id_almacen, id_calzado, cantidad, stock_minimo) VALUES
(1, 1, 120, 15),
(1, 2, 85, 15),
(1, 3, 60, 10),
(1, 4, 40, 10),
(2, 1, 30, 10),
(2, 3, 15, 10);