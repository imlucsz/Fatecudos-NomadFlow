import test from "node:test";
import assert from "node:assert/strict";
import { makeLocalPassword, matchesLocalPassword } from "./local-credentials";

test("credencial local ausente não é aceita como fail-open", async () => {
  assert.equal(await matchesLocalPassword("",undefined),false);
  assert.equal(await matchesLocalPassword("qualquer",undefined),false);
});

test("hash local valida somente a senha correta", async () => {
  const credential=await makeLocalPassword("senha-correta-123");
  assert.equal(await matchesLocalPassword("senha-correta-123",credential),true);
  assert.equal(await matchesLocalPassword("senha-errada-123",credential),false);
  assert.equal(await matchesLocalPassword("",credential),false);
});
