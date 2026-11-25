import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import { firmarSesion, verificarSesion, type Sesion } from "../token";

const SECRETO = "secreto-de-prueba-123456";
const base: Sesion = { idUsuario: 1, nombre: "Admin", login: "admin", rol: "ADMINISTRADOR", idCliente: null, exp: Date.now() + 60_000 };

describe("HU-01 autenticación (RNF-02)", () => {
  it("CP-01: la contraseña se guarda como hash y se valida contra él", async () => {
    const hash = await bcrypt.hash("123456", 10);
    expect(hash).not.toBe("123456");
    expect(await bcrypt.compare("123456", hash)).toBe(true);
    expect(await bcrypt.compare("clave-incorrecta", hash)).toBe(false);
  });

  it("CP-02: la sesión firmada se verifica y devuelve los datos", () => {
    const t = firmarSesion(base, SECRETO);
    expect(verificarSesion(t, SECRETO)?.login).toBe("admin");
  });

  it("rechaza una sesión manipulada (cambio de rol)", () => {
    const t = firmarSesion(base, SECRETO);
    const [body, sig] = t.split(".");
    const falso = Buffer.from(JSON.stringify({ ...base, rol: "CLIENTE" })).toString("base64url");
    expect(verificarSesion(`${falso}.${sig}`, SECRETO)).toBeNull();
    expect(body).toBeTruthy();
  });

  it("rechaza una sesión vencida o con otro secreto", () => {
    const t = firmarSesion({ ...base, exp: 1000 }, SECRETO);
    expect(verificarSesion(t, SECRETO, 2000)).toBeNull();
    expect(verificarSesion(firmarSesion(base, SECRETO), "otro-secreto-distinto-1")).toBeNull();
  });
});
