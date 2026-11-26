import test from "node:test";
import assert from "node:assert/strict";
import { parseTripRequest } from "./trip-request";

function budgetOf(prompt:string) {
  return parseTripRequest(prompt).plan.budget;
}

test("parser monetário entende milhares em formato en-US e pt-BR", () => {
  assert.equal(budgetOf("Quero viajar com orçamento de 80,000 reais"),8000000);
  assert.equal(budgetOf("Quero viajar com orçamento de 1,000,000 reais"),100000000);
  assert.equal(budgetOf("Quero viajar com orçamento de 80.000 reais"),8000000);
  assert.equal(budgetOf("Quero viajar com orçamento de 1.000,00 reais"),100000);
});

test("parser monetário preserva decimais e valores escritos", () => {
  assert.equal(budgetOf("Quero viajar com orçamento de 80,00 reais"),8000);
  assert.equal(budgetOf("Quero viajar com orçamento de 80 mil reais"),8000000);
});
