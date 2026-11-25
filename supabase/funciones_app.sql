-- ============================================================================
-- FUNCIONES TRANSACCIONALES DE LA APLICACIÓN (ejecutar DESPUÉS de schema.sql)
-- Cada función corre en UNA transacción: si algo falla, no queda nada a medias.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- HU-02: alta de cliente + usuario + documento de compromiso -----------------
CREATE OR REPLACE FUNCTION sp_registrar_cliente(
    p_nit VARCHAR, p_razon_social VARCHAR, p_direccion VARCHAR, p_telefono VARCHAR,
    p_correo VARCHAR, p_login VARCHAR, p_contrasena_hash VARCHAR,
    p_nro_documento VARCHAR, p_fecha_firma DATE, p_deberes TEXT, p_id_admin INT
) RETURNS INT AS $$
DECLARE
    v_id_usuario INT;
    v_id_cliente INT;
BEGIN
    IF EXISTS (SELECT 1 FROM cliente WHERE nit = p_nit) THEN
        RAISE EXCEPTION 'El cliente ya está registrado (NIT duplicado, RN-02).';
    END IF;
    IF EXISTS (SELECT 1 FROM usuario WHERE login = p_login) THEN
        RAISE EXCEPTION 'El login % ya existe, intente nuevamente.', p_login;
    END IF;
    IF EXISTS (SELECT 1 FROM documento_compromiso WHERE nro_documento = p_nro_documento) THEN
        RAISE EXCEPTION 'El documento de compromiso % ya fue registrado (RN-03).', p_nro_documento;
    END IF;

    INSERT INTO usuario (nombre_completo, login, contrasena, rol)
    VALUES (p_razon_social, p_login, p_contrasena_hash, 'CLIENTE')
    RETURNING id_usuario INTO v_id_usuario;

    INSERT INTO cliente (nit, razon_social, direccion, telefono, correo, estado, id_usuario)
    VALUES (p_nit, p_razon_social, p_direccion, p_telefono, p_correo, 'ACTIVO', v_id_usuario)
    RETURNING id_cliente INTO v_id_cliente;

    INSERT INTO documento_compromiso (nro_documento, fecha_firma, deberes_sanciones, id_cliente)
    VALUES (p_nro_documento, p_fecha_firma, p_deberes, v_id_cliente);

    INSERT INTO bitacora_auditoria (id_usuario, accion, entidad, detalle)
    VALUES (p_id_admin, 'REGISTRO_CLIENTE', 'cliente', 'Cliente #' || v_id_cliente || ' NIT ' || p_nit);

    RETURN v_id_cliente;
END;
$$ LANGUAGE plpgsql;

-- HU-05: registrar pedido (cabecera + detalle) --------------------------------
CREATE OR REPLACE FUNCTION sp_registrar_pedido(
    p_id_cliente INT, p_id_usuario INT, p_observacion TEXT, p_items JSONB
) RETURNS INT AS $$
DECLARE
    v_estado estado_cliente;
    v_id INT;
    r JSONB;
    v_cant INT;
BEGIN
    SELECT estado INTO v_estado FROM cliente WHERE id_cliente = p_id_cliente;
    IF v_estado IS NULL THEN RAISE EXCEPTION 'El cliente no existe.'; END IF;
    IF v_estado <> 'ACTIVO' THEN
        RAISE EXCEPTION 'Solo un cliente ACTIVO puede registrar pedidos (RN-05).';
    END IF;
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'El pedido debe tener al menos un calzado.';
    END IF;

    INSERT INTO pedido (id_cliente, observacion)
    VALUES (p_id_cliente, NULLIF(trim(COALESCE(p_observacion, '')), ''))
    RETURNING id_pedido INTO v_id;

    FOR r IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_cant := (r->>'cantidad')::INT;
        IF v_cant IS NULL OR v_cant <= 0 THEN
            RAISE EXCEPTION 'Las cantidades deben ser mayores a cero.';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM calzado WHERE id_calzado = (r->>'id_calzado')::INT AND estado = 'ACTIVO') THEN
            RAISE EXCEPTION 'Un calzado del pedido no está disponible en el catálogo.';
        END IF;
        INSERT INTO detalle_pedido (id_pedido, id_calzado, cantidad_solicitada)
        VALUES (v_id, (r->>'id_calzado')::INT, v_cant);
    END LOOP;

    INSERT INTO bitacora_auditoria (id_usuario, accion, entidad, detalle)
    VALUES (p_id_usuario, 'REGISTRO_PEDIDO', 'pedido', 'Pedido #' || v_id || ' registrado');
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- HU-08: tomar un pedido para análisis (bloqueo RN-09) ------------------------
CREATE OR REPLACE FUNCTION sp_tomar_pedido(p_id_pedido INT, p_id_usuario INT)
RETURNS VOID AS $$
DECLARE
    v_estado estado_pedido;
    v_analista INT;
    v_estado_cliente estado_cliente;
    v_nombre VARCHAR;
BEGIN
    SELECT p.estado, p.id_usuario_analista, c.estado
      INTO v_estado, v_analista, v_estado_cliente
      FROM pedido p JOIN cliente c ON c.id_cliente = p.id_cliente
     WHERE p.id_pedido = p_id_pedido
       FOR UPDATE OF p;

    IF v_estado IS NULL THEN RAISE EXCEPTION 'El pedido no existe.'; END IF;
    IF v_estado_cliente <> 'ACTIVO' THEN
        RAISE EXCEPTION 'El cliente no está ACTIVO; no se puede analizar el pedido (RN-05).';
    END IF;
    IF v_estado = 'EN_ANALISIS' THEN
        IF v_analista = p_id_usuario THEN RETURN; END IF;
        SELECT nombre_completo INTO v_nombre FROM usuario WHERE id_usuario = v_analista;
        RAISE EXCEPTION 'El pedido ya está siendo analizado por % (RN-09).', COALESCE(v_nombre, 'otro encargado');
    END IF;
    IF v_estado NOT IN ('REGISTRADO', 'PENDIENTE_STOCK') THEN
        RAISE EXCEPTION 'Un pedido en estado % no puede analizarse.', v_estado;
    END IF;

    UPDATE pedido
       SET estado = 'EN_ANALISIS', id_usuario_analista = p_id_usuario, fecha_analisis = NOW()
     WHERE id_pedido = p_id_pedido;

    INSERT INTO bitacora_auditoria (id_usuario, accion, entidad, detalle)
    VALUES (p_id_usuario, 'INICIO_ANALISIS', 'pedido', 'Pedido #' || p_id_pedido || ' en análisis');
END;
$$ LANGUAGE plpgsql;

-- Liberar el bloqueo sin decidir ----------------------------------------------
CREATE OR REPLACE FUNCTION sp_liberar_pedido(p_id_pedido INT, p_id_usuario INT)
RETURNS VOID AS $$
BEGIN
    UPDATE pedido
       SET estado = 'REGISTRADO', id_usuario_analista = NULL
     WHERE id_pedido = p_id_pedido AND estado = 'EN_ANALISIS' AND id_usuario_analista = p_id_usuario;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Solo quien analiza el pedido puede liberarlo.';
    END IF;
    INSERT INTO bitacora_auditoria (id_usuario, accion, entidad, detalle)
    VALUES (p_id_usuario, 'LIBERAR_PEDIDO', 'pedido', 'Pedido #' || p_id_pedido || ' liberado');
END;
$$ LANGUAGE plpgsql;

-- HU-08 Opción A: confirmar (asigna UN almacén, NO descuenta stock) -------------
CREATE OR REPLACE FUNCTION sp_confirmar_pedido(p_id_pedido INT, p_id_usuario INT, p_id_almacen INT)
RETURNS VOID AS $$
DECLARE
    v_estado estado_pedido;
    v_analista INT;
BEGIN
    SELECT estado, id_usuario_analista INTO v_estado, v_analista
      FROM pedido WHERE id_pedido = p_id_pedido FOR UPDATE;

    IF v_estado IS NULL THEN RAISE EXCEPTION 'El pedido no existe.'; END IF;
    IF v_estado <> 'EN_ANALISIS' OR v_analista IS DISTINCT FROM p_id_usuario THEN
        RAISE EXCEPTION 'El pedido debe estar EN_ANALISIS por usted para confirmarlo.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM almacen WHERE id_almacen = p_id_almacen AND estado = 'ACTIVO') THEN
        RAISE EXCEPTION 'El almacén seleccionado no existe o no está activo.';
    END IF;
    IF EXISTS (
        SELECT 1
          FROM detalle_pedido d
          LEFT JOIN existencia e ON e.id_calzado = d.id_calzado AND e.id_almacen = p_id_almacen
         WHERE d.id_pedido = p_id_pedido
           AND COALESCE(e.cantidad, 0) < d.cantidad_solicitada
    ) THEN
        RAISE EXCEPTION 'El almacén elegido no cubre todo el pedido (RN-06). Elija otro o registre una fecha aproximada.';
    END IF;

    UPDATE detalle_pedido SET cantidad_confirmada = cantidad_solicitada WHERE id_pedido = p_id_pedido;
    UPDATE pedido
       SET estado = 'CONFIRMADO', id_almacen = p_id_almacen, fecha_analisis = NOW()
     WHERE id_pedido = p_id_pedido;

    INSERT INTO bitacora_auditoria (id_usuario, accion, entidad, detalle)
    VALUES (p_id_usuario, 'CONFIRMAR_PEDIDO', 'pedido',
            'Pedido #' || p_id_pedido || ' confirmado, almacén #' || p_id_almacen);
END;
$$ LANGUAGE plpgsql;

-- HU-08 Opción B: stock insuficiente -> PENDIENTE_STOCK -------------------------
CREATE OR REPLACE FUNCTION sp_posponer_pedido(p_id_pedido INT, p_id_usuario INT, p_fecha DATE)
RETURNS VOID AS $$
DECLARE
    v_estado estado_pedido;
    v_analista INT;
BEGIN
    IF p_fecha IS NULL OR p_fecha < (NOW() AT TIME ZONE 'America/La_Paz')::DATE THEN
        RAISE EXCEPTION 'La fecha aproximada de entrega no puede ser anterior a hoy (RN-08).';
    END IF;
    SELECT estado, id_usuario_analista INTO v_estado, v_analista
      FROM pedido WHERE id_pedido = p_id_pedido FOR UPDATE;
    IF v_estado IS NULL THEN RAISE EXCEPTION 'El pedido no existe.'; END IF;
    IF v_estado <> 'EN_ANALISIS' OR v_analista IS DISTINCT FROM p_id_usuario THEN
        RAISE EXCEPTION 'El pedido debe estar EN_ANALISIS por usted para posponerlo.';
    END IF;

    UPDATE pedido
       SET estado = 'PENDIENTE_STOCK', fecha_aprox_entrega = p_fecha,
           id_usuario_analista = NULL, fecha_analisis = NOW()
     WHERE id_pedido = p_id_pedido;

    INSERT INTO bitacora_auditoria (id_usuario, accion, entidad, detalle)
    VALUES (p_id_usuario, 'PEDIDO_PENDIENTE_STOCK', 'pedido',
            'Pedido #' || p_id_pedido || ' pendiente de stock, entrega aprox. ' || p_fecha);
END;
$$ LANGUAGE plpgsql;

-- HU-13: confirmar la entrega al cliente ------------------------------------------
CREATE OR REPLACE FUNCTION sp_entregar_pedido(p_id_pedido INT, p_id_usuario INT)
RETURNS VOID AS $$
DECLARE v_estado estado_pedido;
BEGIN
    SELECT estado INTO v_estado FROM pedido WHERE id_pedido = p_id_pedido FOR UPDATE;
    IF v_estado IS NULL THEN RAISE EXCEPTION 'El pedido no existe.'; END IF;
    IF v_estado <> 'DESPACHADO' THEN
        RAISE EXCEPTION 'Solo se puede entregar un pedido DESPACHADO.';
    END IF;
    UPDATE pedido SET estado = 'ENTREGADO' WHERE id_pedido = p_id_pedido;
    INSERT INTO bitacora_auditoria (id_usuario, accion, entidad, detalle)
    VALUES (p_id_usuario, 'ENTREGA_PEDIDO', 'pedido', 'Pedido #' || p_id_pedido || ' entregado');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEGURIDAD: la app usa la clave service_role (solo en el servidor).
-- Se activa RLS sin políticas y se quita el acceso público a las funciones,
-- así la clave anónima no puede leer tablas ni invocar funciones.
-- ============================================================================
ALTER TABLE usuario              ENABLE ROW LEVEL SECURITY;
ALTER TABLE cliente              ENABLE ROW LEVEL SECURITY;
ALTER TABLE documento_compromiso ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipo_calzado         ENABLE ROW LEVEL SECURITY;
ALTER TABLE marca                ENABLE ROW LEVEL SECURITY;
ALTER TABLE modelo               ENABLE ROW LEVEL SECURITY;
ALTER TABLE calzado              ENABLE ROW LEVEL SECURITY;
ALTER TABLE almacen              ENABLE ROW LEVEL SECURITY;
ALTER TABLE existencia           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido               ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_pedido       ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimiento_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_movimiento   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bitacora_auditoria   ENABLE ROW LEVEL SECURITY;

REVOKE EXECUTE ON FUNCTION sp_registrar_cliente(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,DATE,TEXT,INT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION sp_registrar_pedido(INT,INT,TEXT,JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION sp_tomar_pedido(INT,INT)     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION sp_liberar_pedido(INT,INT)   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION sp_confirmar_pedido(INT,INT,INT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION sp_posponer_pedido(INT,INT,DATE) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION sp_entregar_pedido(INT,INT)  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION sp_despachar_pedido(INT,INT) FROM PUBLIC, anon, authenticated;

-- Contraseñas de los usuarios semilla = 123456 (hash bcrypt generado por la BD).
-- CÁMBIELAS antes de cualquier uso real.
UPDATE usuario
   SET contrasena = extensions.crypt('123456', extensions.gen_salt('bf', 10))
 WHERE login IN ('admin', 'pedidos1', 'almacen1');
