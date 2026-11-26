import test from "node:test";
import assert from "node:assert/strict";
import { addDays, costs, daysBetween, editStop, generate, presetPlan, validDateKey, validatePlan, type Trip } from "./planning";

function demoPlan() {
  const plan = presetPlan("thailand","2027-01-10");
  plan.endDate = addDays(plan.start,365);
  plan.budget = 12000000;
  return plan;
}

function demoTrip(): Trip {
  const variant = generate(demoPlan()).find((item) => item.id === "economic")!;
  return {...variant,tripId:"trip-test",title:"Viagem de teste",revision:1,created:"2027-01-01T12:00:00.000Z",reservations:{},reminders:{}};
}

test("validDateKey aceita datas reais e rejeita datas impossíveis", () => {
  assert.equal(validDateKey("2027-02-28"),true);
  assert.equal(validDateKey("2028-02-29"),true);
  assert.equal(validDateKey("2027-02-29"),false);
  assert.equal(validDateKey("2027-13-01"),false);
  assert.equal(validDateKey("10/01/2027"),false);
});

test("validatePlan rejeita datas inválidas, período invertido e valores não inteiros", () => {
  const plan = demoPlan();
  assert.equal(validatePlan(plan),"");
  assert.match(validatePlan({...plan,start:"2027-02-29"}),/datas válidas/);
  assert.match(validatePlan({...plan,endDate:plan.start}),/depois da saída/);
  assert.match(validatePlan({...plan,budget:Number.NaN}),/orçamento válido/);
  assert.match(validatePlan({...plan,budget:-1}),/orçamento válido/);
  assert.match(validatePlan({...plan,travelers:1.5}),/1 e 20 viajantes/);
});

test("generate cria paradas íntegras, ordenadas e dentro da data final", () => {
  const plan = demoPlan();
  const variants = generate(plan);
  assert.ok(variants.length >= 2);
  for (const variant of variants) {
    assert.equal(variant.stops[0].start,plan.start);
    assert.equal(variant.stops.at(-1)!.end,plan.endDate);
    assert.equal(variant.legs.length,variant.stops.length-1);
    for (const stop of variant.stops) {
      assert.ok(validDateKey(stop.start),stop.start);
      assert.ok(validDateKey(stop.end),stop.end);
      assert.ok(daysBetween(stop.start,stop.end) >= 1,stop.city.name);
    }
    for (let index = 1; index < variant.stops.length; index++) {
      assert.ok(variant.stops[index].start >= variant.stops[index-1].end,"paradas não devem se sobrepor");
    }
    const totals = costs(variant);
    assert.ok(Number.isSafeInteger(totals.known));
    assert.ok(totals.known >= 0);
  }
});

test("editStop desloca etapas posteriores sem mutar o plano original", () => {
  const trip = demoTrip();
  const originalEnd = trip.plan.endDate;
  const originalFirstEnd = trip.stops[0].end;
  const originalSecondStart = trip.stops[1].start;
  const first = trip.stops[0];
  const newEnd = addDays(first.end,7);
  const {result,error} = editStop(trip,0,{stay:first.stay,start:first.start,end:newEnd});
  assert.equal(error,undefined);
  assert.ok(result);
  assert.equal(trip.plan.endDate,originalEnd,"a viagem original não pode ser mutada antes da confirmação");
  assert.equal(trip.stops[0].end,originalFirstEnd);
  assert.equal(result.stops[0].end,newEnd);
  assert.equal(result.stops[1].start,addDays(originalSecondStart,7));
  assert.equal(result.plan.endDate,addDays(originalEnd,7));
  assert.equal(result.revision,trip.revision+1);
  assert.notEqual(costs(result).known,costs(trip).known);
});

test("editStop reduz deslocamento quando a permanência é encurtada", () => {
  const trip = demoTrip();
  const first = trip.stops[0];
  const newEnd = addDays(first.end,-5);
  const {result,error} = editStop(trip,0,{stay:first.stay,start:first.start,end:newEnd});
  assert.equal(error,undefined);
  assert.ok(result);
  assert.equal(result.plan.endDate,addDays(trip.plan.endDate,-5));
  assert.equal(result.stops[1].start,addDays(trip.stops[1].start,-5));
});

test("editStop valida índice e datas sem lançar exceção", () => {
  const trip = demoTrip();
  const first = trip.stops[0];
  assert.match(editStop(trip,99,{stay:first.stay,start:first.start,end:first.end}).error ?? "",/não encontrada/);
  assert.match(editStop(trip,0,{stay:first.stay,start:"2027-02-29",end:first.end}).error ?? "",/datas válidas/);
  assert.match(editStop(trip,0,{stay:first.stay,start:first.end,end:first.start}).error ?? "",/depois da chegada/);
});
