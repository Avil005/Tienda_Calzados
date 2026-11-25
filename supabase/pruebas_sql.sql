-- ============================================================================
-- PRUEBAS TRANSACCIONALES EN SQL (evidencia para CP-11 y CP-12)
-- Ejecutar DESPUÉS de schema.sql, funciones_app.sql y datos_demo.sql.
-- Cada prueba crea su propio pedido, comprueba el resultado y deja la base como estaba.
-- Resultado: una fila con "APROBADO ..." o un error con "FALLÓ ...".
-- ============================================================================

-- CP-11: despacho correcto de 20 pares FAB-101-ROSA-28 y 10 pares FAB-310-NEGRO-34 desde Almacén Central
CREATE OR REPLACE FUNCTION test_cp11() RETURNS TEXT AS $$
DECLARE
    v_cli INT; v_user INT; v_ped INT; v_estado estado_pedido;
    v_a1 INT; v_a4 INT; v_d1 INT; v_d4 INT; v_mov INT; v_aud INT;
BEGIN
    SELECT id_cliente INTO v_cli FROM cliente WHERE nit = '1020304015';
    SELECT id_usuario INTO v_user FROM usuario WHERE login = 'almacen1';
    IF v_cli IS NULL OR v_user IS NULL THEN RAISE EXCEPTION 'FALLÓ CP-11: faltan datos de demo.'; END IF;

    INSERT INTO pedido (id_cliente, estado, id_almacen) VALUES (v_cli, 'CONFIRMADO', 1) RETURNING id_pedido INTO v_ped;
    INSERT INTO detalle_pedido (id_pedido, id_calzado, cantidad_solicitada, cantidad_confirmada)
    VALUES (v_ped, 1, 20, 20), (v_ped, 4, 10, 10);

    SELECT cantidad INTO v_a1 FROM existencia WHERE id_almacen = 1 AND id_calzado = 1;
    SELECT cantidad INTO v_a4 FROM existencia WHERE id_almacen = 1 AND id_calzado = 4;

    PERFORM sp_despachar_pedido(v_ped, v_user);

    SELECT cantidad INTO v_d1 FROM existencia WHERE id_almacen = 1 AND id_calzado = 1;
    SELECT cantidad INTO v_d4 FROM existencia WHERE id_almacen = 1 AND id_calzado = 4;
    SELECT estado INTO v_estado FROM pedido WHERE id_pedido = v_ped;
    SELECT count(*) INTO v_mov FROM movimiento_inventario WHERE id_pedido = v_ped AND tipo = 'SALIDA';
    SELECT count(*) INTO v_aud FROM bitacora_auditoria WHERE accion = 'DESPACHO_PEDIDO' AND detalle LIKE 'Pedido #' || v_ped || ' %';

    -- limpieza: devolver el stock y borrar lo creado por la prueba
    UPDATE existencia SET cantidad = v_a1 WHERE id_almacen = 1 AND id_calzado = 1;
    UPDATE existencia SET cantidad = v_a4 WHERE id_almacen = 1 AND id_calzado = 4;
    DELETE FROM detalle_movimiento WHERE id_movimiento IN (SELECT id_movimiento FROM movimiento_inventario WHERE id_pedido = v_ped);
    DELETE FROM movimiento_inventario WHERE id_pedido = v_ped;
    DELETE FROM bitacora_auditoria WHERE detalle LIKE 'Pedido #' || v_ped || ' %';
    DELETE FROM detalle_pedido WHERE id_pedido = v_ped;
    DELETE FROM pedido WHERE id_pedido = v_ped;

    IF v_d1 <> v_a1 - 20 OR v_d4 <> v_a4 - 10 OR v_estado <> 'DESPACHADO' OR v_mov <> 1 OR v_aud <> 1 THEN
        RAISE EXCEPTION 'FALLÓ CP-11: stock % -> % y % -> %, estado %, movimientos %, auditoría %',
            v_a1, v_d1, v_a4, v_d4, v_estado, v_mov, v_aud;
    END IF;
    RETURN format('APROBADO CP-11: stock %s->%s y %s->%s, pedido DESPACHADO, 1 movimiento SALIDA, 1 registro de auditoría',
                  v_a1, v_d1, v_a4, v_d4);
END;
$$ LANGUAGE plpgsql;

-- CP-12: stock insuficiente -> excepción, ROLLBACK, existencia intacta (RNF-06)
CREATE OR REPLACE FUNCTION test_cp12() RETURNS TEXT AS $$
DECLARE
    v_cli INT; v_user INT; v_ped INT; v_antes INT; v_despues INT; v_mov INT;
    v_estado estado_pedido; v_lanzo BOOLEAN := FALSE; v_msg TEXT;
BEGIN
    SELECT id_cliente INTO v_cli FROM cliente WHERE nit = '1020304015';
    SELECT id_usuario INTO v_user FROM usuario WHERE login = 'almacen1';
    IF v_cli IS NULL OR v_user IS NULL THEN RAISE EXCEPTION 'FALLÓ CP-12: faltan datos de demo.'; END IF;

    INSERT INTO pedido (id_cliente, estado, id_almacen) VALUES (v_cli, 'CONFIRMADO', 2) RETURNING id_pedido INTO v_ped;
    INSERT INTO detalle_pedido (id_pedido, id_calzado, cantidad_solicitada, cantidad_confirmada) VALUES (v_ped, 1, 500, 500);
    SELECT cantidad INTO v_antes FROM existencia WHERE id_almacen = 2 AND id_calzado = 1;

    BEGIN
        PERFORM sp_despachar_pedido(v_ped, v_user);
    EXCEPTION WHEN OTHERS THEN
        v_lanzo := TRUE; v_msg := SQLERRM;
    END;

    SELECT cantidad INTO v_despues FROM existencia WHERE id_almacen = 2 AND id_calzado = 1;
    SELECT count(*) INTO v_mov FROM movimiento_inventario WHERE id_pedido = v_ped;
    SELECT estado INTO v_estado FROM pedido WHERE id_pedido = v_ped;

    DELETE FROM detalle_pedido WHERE id_pedido = v_ped;
    DELETE FROM pedido WHERE id_pedido = v_ped;

    IF NOT v_lanzo OR v_antes <> v_despues OR v_mov <> 0 OR v_estado <> 'CONFIRMADO' THEN
        RAISE EXCEPTION 'FALLÓ CP-12: lanzó excepción=%, stock % -> %, movimientos %, estado %',
            v_lanzo, v_antes, v_despues, v_mov, v_estado;
    END IF;
    RETURN format('APROBADO CP-12: excepción "%s"; stock intacto (%s), sin movimiento, pedido sigue CONFIRMADO', v_msg, v_despues);
END;
$$ LANGUAGE plpgsql;

REVOKE EXECUTE ON FUNCTION test_cp11() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION test_cp12() FROM PUBLIC, anon, authenticated;

SELECT test_cp11() AS cp11, test_cp12() AS cp12;
