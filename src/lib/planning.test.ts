import test from "node:test";
import assert from "node:assert/strict";
import { addDays, archiveInvalidReservation, costs, daysBetween, editStop, generate, ics, invalidReservations, presetPlan, queue, setReservation, validDateKey, validatePlan, type Trip } from "./planning";

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

test("arriveAtEnd trata o destino final como chegada sem noite extra", () => {
  const plan = demoPlan();
  plan.arriveAtEnd = true;
  const variant = generate(plan)[0];
  const final = variant.stops.at(-1)!;
  assert.equal(final.start,plan.endDate);
  assert.equal(final.end,plan.endDate);
  assert.equal(daysBetween(final.start,final.end),0);
  assert.equal(costs(variant).days,daysBetween(plan.start,plan.endDate));
});

test("despesas diárias usam todos os dias da viagem e ignoram calibração legada", () => {
  const plan = demoPlan();
  const variant = generate(plan)[0];
  const tripDays = daysBetween(plan.start,plan.endDate);
  const totals = costs(variant);
  const food = totals.rows.find((row) => row.label === "Alimentação");
  assert.equal(food?.value,75*tripDays*plan.travelers*100);
  assert.equal(costs({...variant,calibration:987654321}).known,totals.known);
  assert.ok(totals.transitDays >= 0);
  assert.ok(totals.lodgingNights <= tripDays);
});

test("editStop explica que a chegada final não é uma hospedagem editável", () => {
  const plan = demoPlan();
  plan.arriveAtEnd = true;
  const variant = generate(plan)[0];
  const trip: Trip = {...variant,tripId:"arrival",title:"Chegada",revision:1,created:"2027-01-01T00:00:00.000Z",reservations:{},reminders:{}};
  const final = trip.stops.at(-1)!;
  const result = editStop(trip,trip.stops.length-1,{stay:final.stay,start:final.start,end:final.end});
  assert.match(result.error ?? "",/chegada final/i);
  assert.equal(result.result,undefined);
});

test("reservas invalidadas ficam visíveis para revisão e podem ser arquivadas", () => {
  const trip = demoTrip();
  const firstStay = queue(trip).find((item) => item.kind === "Hospedagem")!;
  const confirmed = setReservation(trip,firstStay,{paid:123450});
  assert.notEqual(confirmed,trip);
  const first = confirmed.stops[0];
  const {result} = editStop(confirmed,0,{stay:first.stay,start:first.start,end:addDays(first.end,7)});
  assert.ok(result);
  const invalid = invalidReservations(result);
  assert.equal(invalid.length,1);
  assert.equal(invalid[0].reservation.replaced?.day,firstStay.day);
  const archived = archiveInvalidReservation(result,invalid[0].id,invalid[0].reservation.signature);
  assert.equal(invalidReservations(archived).length,0);
  assert.equal(archived.reservations[invalid[0].id].state,"invalidated");
});


test("ICS emite DTEND e mantém linhas dentro do limite de 75 octetos", () => {
  const output=ics(demoTrip());
  const lines=output.split("\r\n").filter(Boolean);
  const starts=lines.filter((line)=>line.startsWith("DTSTART"));
  const ends=lines.filter((line)=>line.startsWith("DTEND"));
  assert.ok(starts.length>0);
  assert.equal(ends.length,starts.length);
  const encoder=new TextEncoder();
  for (const line of lines) assert.ok(encoder.encode(line).length<=75,line.slice(0,90));
});
