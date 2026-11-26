import { city, south, thailand, type City, type Template } from "./destinations";

export type Currency = "BRL" | "USD" | "EUR";
export type Preset = "south" | "thailand" | "custom";
export type StayType = "Hostel" | "Hotel" | "Temporada" | "Chalé";
export type Mode = "Ônibus" | "Avião";
export type Strategy = "economic" | "balanced" | "comfort" | "work";
export type Evidence = "ready" | "future" | "review" | "missing" | "expired" | "error";
export type Address = { lat: number; lon: number };
export const extras = ["Alimentação", "Mobilidade", "Internet e coworking", "Passeios", "Seguro", "Imprevistos"] as const;
export type Extra = (typeof extras)[number];

export type Plan = {
  preset: Preset; origin: City; end: City; via: City[]; loop: boolean; fixed: boolean;
  start: string; endDate: string; budget: number; currency: Currency; travelers: number;
  pace: "tranquilo" | "moderado" | "intenso"; transport: "qualquer" | Mode;
  stays: StayType[]; internet: boolean; extras: Extra[]; prompt: string;
  copiedFrom?: string; nightWeights?: number[]; arriveAtEnd?: boolean;
};
export type Stay = { id: string; type: StayType; name: string; nightly: number | null; position?: Address; provider: string; url?: string; status: Evidence };
export type Stop = { id: string; city: City; start: string; end: string; stay: Stay; done: boolean };
export type Leg = { id: string; from: string; to: string; mode: Mode; hours: number | null; price: number | null; status: Evidence; provider: string; url?: string };
export type Variant = { id: Strategy; plan: Plan; stops: Stop[]; legs: Leg[]; calibration: number };
export type Reservation = { state: "visited" | "registered"; date: string; paid?: number; signature: string; item: string; confirmedByTraveler?: boolean; googleCalendarLink?: string; googleCalendarTime?: string };
export type Trip = Variant & {
  tripId: string; title: string; revision: number; created: string;
  reservations: Record<string, Reservation>; reminders: Record<string, string>;
  calendarTimes?: Record<string, { signature: string; time: string }>;
  journey?: { startedAt: string; currentStopId: string | null };
};

export const strategies = {
  balanced: { title: "Equilibrada", summary: "Hospedagens intermediárias e equilíbrio entre custo e tempo de viagem." },
  economic: { title: "Econômica", summary: "Diárias mais baixas e ônibus nos trechos com estimativa disponível." },
  comfort: { title: "Conforto", summary: "Hotéis de categoria superior e preferência por voos nos deslocamentos." },
  work: { title: "Melhor para trabalhar", summary: "Distribui mais noites nas cidades com contexto de trabalho na demo." },
} as const;
export const stayTypes: StayType[] = ["Hostel", "Hotel", "Temporada", "Chalé"];

export function dateKey(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2,"0"), String(date.getDate()).padStart(2,"0")].join("-");
}
export function localDay(zone: string, now = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
export const addDays = (date: string, n: number) => new Date(Date.parse(date) + n * 86400000).toISOString().slice(0,10);
export function validDateKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [,year,month,day] = match.map(Number);
  const date = new Date(Date.UTC(year,month-1,day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month-1 && date.getUTCDate() === day;
}
export function addMonths(date: string, n: number) {
  const [year, month, day] = date.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + n, 1));
  const max = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day,max));
  return target.toISOString().slice(0,10);
}
export const shortDate = (date: string, year = false) => new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",year:year ? "numeric" : undefined,timeZone:"UTC"}).format(new Date(date));
export const money = (minor: number, currency: Currency = "BRL", decimals = false) => new Intl.NumberFormat("pt-BR",{style:"currency",currency, maximumFractionDigits: decimals ? 2 : 0, minimumFractionDigits: decimals ? 2 : 0}).format(minor / 100);
export const fx: Record<Currency, number> = { BRL: 1, USD: .2, EUR: .18 };
export const convert = (brl: number, currency: Currency) => Math.round(brl * fx[currency]);
export const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
export const address = (place: City): Address | undefined => place.lat !== undefined && place.lon !== undefined ? {lat:place.lat,lon:place.lon} : undefined;

export function distance(a: Address, b: Address) {
  const radians = Math.PI / 180;
  const value = Math.sin((b.lat-a.lat)*radians/2)**2 + Math.cos(a.lat*radians)*Math.cos(b.lat*radians)*Math.sin((b.lon-a.lon)*radians/2)**2;
  return 12742 * Math.asin(Math.sqrt(Math.min(1,value)));
}

export function presetPlan(preset: Preset, start = addDays(dateKey(),30)): Plan {
  return {
    preset, origin:city("sao-paulo"), end:preset === "south" ? city("sao-paulo") : city(preset === "thailand" ? "bangkok" : "lisbon"),
    via:preset === "south" ? south : preset === "thailand" ? thailand : [],
    loop:preset === "south", fixed:preset !== "custom", start,
    endDate:preset === "south" ? addDays(start,365) : preset === "thailand" ? addMonths(start,24) : addDays(start,21),
    budget:(preset === "south" ? 80000 : preset === "thailand" ? 150000 : 0) * 100,
    currency:"BRL",travelers:1,pace:"moderado",transport:"qualquer",stays:[...stayTypes],internet:true,extras:[...extras],prompt:"",
  };
}

export function copyPlan(template: Template): Plan {
  const plan = presetPlan("custom");
  return {...plan, origin:template.origin, end:template.end, via:template.sequence, loop:template.loop, fixed:true,
    endDate:[addDays(plan.start,template.days),addMonths(plan.start,24)].sort()[0], currency:template.currency,
    budget:template.price ?? convert(plan.budget,template.currency), copiedFrom:template.slug,
    nightWeights:template.nights.length ? template.nights : undefined, arriveAtEnd:template.arriveAtEnd,
  };
}

export function sequence(plan: Plan) {
  const last = plan.loop ? plan.origin : plan.end;
  const via = plan.via.filter((item) => ![plan.origin.id,last.id].includes(item.id));
  if (plan.fixed || via.length < 2) return [plan.origin,...via,last];
  const remaining = [...via];
  const result = [plan.origin];
  while (remaining.length) {
    const from = address(result[result.length-1]);
    remaining.sort((a,b) => {
      const lhs = address(a), rhs = address(b);
      return (from && lhs ? distance(from,lhs) : Infinity) - (from && rhs ? distance(from,rhs) : Infinity) || a.name.localeCompare(b.name);
    });
    result.push(remaining.shift()!);
  }
  return [...result,last];
}

export const contextCities = new Set(["sao-paulo","buenos-aires","lima","lisbon","hanoi","delhi","kathmandu","bangkok","rome","amman","bogota","santiago"]);
export const arrivesAtEnd = (plan:Plan) => !!plan.arriveAtEnd && !plan.loop;
export const isArrivalStop = (variant: Pick<Variant,"plan"|"stops">, index: number) => arrivesAtEnd(variant.plan) && index === variant.stops.length-1;

export function stayOptions(place: City): Stay[] {
  const point = address(place);
  const sign = place.id.length % 2 ? 1 : -1;
  const demoOptions: Stay[] = [
    {id:"hostel",type:"Hostel",name:"Hostel Central",nightly:place.night * 100,position:point && {lat:point.lat+.005,lon:point.lon-.006},provider:"Hostelworld",status:"ready"},
    {id:"hotel",type:"Hotel",name:"Hotel Vista",nightly:Math.round(place.night * 1.95) * 100,position:point && {lat:point.lat-.019,lon:point.lon+.015*sign},provider:"Booking.com",status:"review"},
    {id:"season",type:"Temporada",name:"Estúdio Nômade",nightly:Math.round(place.night * 1.45) * 100,position:point && {lat:point.lat+.019,lon:point.lon+.016},provider:"Airbnb",status:"review"},
    {id:"cabin",type:"Chalé",name:"Refúgio da Serra",nightly:Math.round(place.night * 1.7) * 100,position:point && {lat:point.lat-.041,lon:point.lon-.037},provider:"Booking.com",status:"expired"},
    {id:"premium",type:"Hotel",name:"Hotel superior · estimativa",nightly:Math.round(place.night * 3.2) * 100,provider:"Booking.com",status:"review"},
  ];
  return demoOptions.map((item) => ({
    ...item,
    name:place.night ? item.name : item.type + " a pesquisar",
    nightly:place.night ? item.nightly : null,
    position:place.night ? item.position : undefined,
    status:place.night ? item.status : "missing",
    url:"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(item.type + " " + place.name + " " + place.country),
  }));
}

const busPairs = new Set([
  "buenos-aires/montevideo","asuncion/buenos-aires","montevideo/sao-paulo","buenos-aires/santiago",
  "la-paz/santiago","la-paz/lima","avignon/florence","florence/rome","amman/petra","petra/wadi-rum",
  "amman/wadi-rum","lisbon/madrid","rio/sao-paulo","bogota/medellin","cusco/lima",
]);
const flightPairs = new Set([
  "montevideo/sao-paulo","buenos-aires/montevideo","asuncion/buenos-aires","asuncion/santiago",
  "la-paz/santiago","la-paz/lima","lima/quito","bogota/quito","georgetown/paramaribo","paramaribo/sao-paulo",
  "lisbon/sao-paulo","lisbon/madrid","madrid/rome","athens/rome","athens/istanbul","amman/istanbul",
  "amman/dubai","delhi/dubai","delhi/kathmandu","hanoi/kathmandu","bangkok/hanoi","athens/florence",
  "avignon/florence","florence/rome","rome/sao-paulo","paris/sao-paulo","bangkok/sao-paulo",
  "bali/bangkok","bangkok/chiang-mai","bangkok/kyoto","buenos-aires/sao-paulo","bogota/medellin","cusco/lima",
  "lima/sao-paulo","bogota/sao-paulo","new-york/sao-paulo","buenos-aires/santiago","rio/sao-paulo",
]);

export function transportOptions(from: City, to: City, id: string, fromId: string, toId: string): Leg[] {
  const a = address(from), b = address(to);
  const km = a && b ? distance(a,b) : null;
  const pair = [from.id,to.id].sort().join("/");
  return (["Ônibus","Avião"] as const).map((mode) => {
    const bus = mode === "Ônibus";
    const valid = (bus ? busPairs : flightPairs).has(pair);
    const price = valid && km !== null ? Math.round(bus ? 95 + km * .24 : 250 + km * .47) * 100 : null;
    const hours = valid && km !== null ? Math.ceil(bus ? 1 + km / 70 : 1 + km / 720) : null;
    const status: Evidence = !valid ? "missing" : pair === "buenos-aires/montevideo" ? "future" : pair === "lima/quito" ? "error" : pair === "bogota/quito" ? "expired" : bus ? "review" : "ready";
    return { id, from:fromId, to:toId, mode, hours, price, status, provider:bus ? "Busbud" : "Google Flights",
      url:bus ? "https://www.busbud.com/pt" : "https://www.google.com/travel/flights?q=" + encodeURIComponent("Voos de " + from.name + " para " + to.name) };
  });
}
const transitDays = (leg: Leg) => !leg.hours ? 0 : leg.hours > 14 ? Math.ceil((leg.hours + 7) / 24) : leg.hours > 5 ? 1 : 0;
const nightlyForGroup = (stay:Stay,travelers:number) => (stay.nightly ?? 0)*(stay.type==="Hostel" ? travelers : Math.ceil(travelers/2));

export function transportBudget({legs,plan}:Variant) {
  const total=legs.reduce((sum,leg)=>sum+(leg.price ?? 0)*plan.travelers,0);
  return {estimated:convert(total,plan.currency),pending:legs.filter((leg)=>leg.price===null).length};
}

export function costs(variant: Variant) {
  const { plan, stops, legs } = variant;
  const tripDays = Math.max(0,daysBetween(plan.start,plan.endDate));
  const lodgingNights = stops.reduce((sum, stop, index) => sum + (isArrivalStop(variant,index) ? 0 : daysBetween(stop.start,stop.end)),0);
  const transport = transportBudget(variant);
  const lodging = stops.reduce((sum, stop, index) => sum + (isArrivalStop(variant,index) ? 0 : nightlyForGroup(stop.stay,plan.travelers)*daysBetween(stop.start,stop.end)),0);
  const rates: Record<Extra, number> = {"Alimentação":75,"Mobilidade":16,"Internet e coworking":17,"Passeios":20,"Seguro":9,"Imprevistos":12};
  const rows = [
    {label:"Transporte",value:transport.estimated},
    {label:"Hospedagem",value:convert(lodging,plan.currency)},
    ...plan.extras.map((label) => ({label,value:convert(rates[label]*tripDays*plan.travelers*100,plan.currency)})),
  ];
  const known = rows.reduce((sum,row) => sum+row.value,0);
  const pendingStays = stops.filter((stop,index) => !isArrivalStop(variant,index) && stop.stay.nightly === null).length;
  const pending = pendingStays + transport.pending;
  return {rows, known, pending, over:plan.budget ? Math.max(0,known-plan.budget) : 0, spare:plan.budget ? Math.max(0,plan.budget-known) : 0, hours:legs.reduce((sum,leg) => sum+(leg.hours ?? 0),0), nights:lodgingNights, days:tripDays, lodgingNights, transitDays:legs.reduce((sum,leg) => sum+transitDays(leg),0)};
}

export function validatePlan(plan: Plan) {
  if (!plan.origin.name || !plan.end.name || !plan.start || !plan.endDate) return "Preencha a origem, o destino e as datas.";
  if (!validDateKey(plan.start) || !validDateKey(plan.endDate)) return "Informe datas válidas no calendário.";
  if (daysBetween(plan.start,plan.endDate) < 1) return "A data de término deve ser depois da saída.";
  if (!plan.loop && plan.origin.id === plan.end.id) return "Escolha um destino diferente da origem ou ative o retorno.";
  if (plan.loop && plan.via.length === 0) return "Adicione pelo menos uma parada para montar um circuito.";
  if (plan.endDate > addMonths(plan.start,24)) return "O período máximo é de 24 meses.";
  if (daysBetween(plan.start,plan.endDate) < sequence(plan).length-Number(arrivesAtEnd(plan))) return "Inclua pelo menos uma noite para cada parada.";
  if (!Number.isSafeInteger(plan.budget) || plan.budget < 0) return "Informe um orçamento válido ou deixe o campo vazio.";
  if (!Number.isInteger(plan.travelers) || plan.travelers < 1 || plan.travelers > 20) return "Escolha entre 1 e 20 viajantes.";
  if (!plan.stays.length) return "Escolha ao menos um tipo de hospedagem.";
  return "";
}

export function generate(plan: Plan): Variant[] {
  if (validatePlan(plan)) return [];
  const route = sequence(plan);
  const arrival=arrivesAtEnd(plan);
  const overnight=arrival ? route.slice(0,-1) : route;
  const duration = daysBetween(plan.start,plan.endDate);
  const variantIds = ["economic","balanced","comfort","work"] as const;
  const southDemo=plan.preset === "south" && duration === 365 && plan.travelers === 1 && plan.currency === "BRL" && plan.transport === "qualquer" && plan.extras.length === extras.length && plan.stays.includes("Hostel") && plan.via.length === south.length && south.every((place) => plan.via.some((item) => item.id === place.id));
  const variants = variantIds.flatMap((id): Variant[] => {
    const legs = route.slice(1).map((to,index) => {
      const options = transportOptions(route[index],to,"leg-"+index,"stop-"+index,"stop-"+(index+1));
      const preferBus = id === "economic" || id === "balanced" && options[0].hours !== null && options[0].hours <= 9;
      const preferred = plan.transport === "qualquer" ? (preferBus ? "Ônibus" : "Avião") : plan.transport;
      const choice = options.find((item) => item.mode === preferred)!;
      return choice.price === null && plan.transport === "qualquer" ? options.find((item) => item.price !== null) ?? choice : choice;
    });
    const availableNights = duration - legs.reduce((sum,leg) => sum + transitDays(leg),0);
    if (availableNights < overnight.length) return [];
    const weights = overnight.map((place,index) => {
      if (plan.nightWeights?.length === route.length) return plan.nightWeights[index];
      const pace = plan.pace === "tranquilo" ? 2 : plan.pace === "intenso" ? 6 : 4;
      if (plan.loop && index === route.length-1) return .2;
      if (id === "economic" && place.night > 0 && place.night <= 90) return pace + 2;
      if ((id === "balanced" || id === "work") && plan.internet && contextCities.has(place.id) && !southDemo) return pace+(id === "work" ? 2 : 1);
      return pace;
    });
    let elapsed = 0, weighted = 0;
    const scale = (availableNights-overnight.length)/weights.reduce((sum,n) => sum+n,0);
    const stops = route.map((place,index): Stop => {
      const allowed = stayOptions(place).filter((option) => plan.stays.includes(option.type));
      const priced = [...allowed].sort((a,b)=>nightlyForGroup(a,plan.travelers)-nightlyForGroup(b,plan.travelers));
      const lowest=priced[0];
      const middle=priced.find((item)=>item.id==="season" && item!==lowest) ?? priced.find((item)=>item!==lowest && item.id!=="premium") ?? lowest;
      const stay=id==="economic" ? lowest : id==="balanced" || id==="work" ? (southDemo ? allowed.find((item)=>item.id==="hostel")! : middle)
        : allowed.find((item)=>item.id==="premium") ?? priced.at(-1)!;
      if (arrival && index===route.length-1) return {id:"stop-"+index,city:place,start:plan.endDate,end:plan.endDate,stay,done:false};
      const nights = 1 + Math.round((weighted+weights[index])*scale)-Math.round(weighted*scale);
      weighted += weights[index];
      const start = addDays(plan.start,elapsed);
      elapsed += nights;
      const end = addDays(plan.start,elapsed);
      if (legs[index]) elapsed += transitDays(legs[index]);
      return {id:"stop-"+index,city:place,start,end,stay,done:false};
    });
    return [{id,plan,stops,legs,calibration:0}];
  });
  const seen = new Set<string>();
  return variants.filter((variant) => {
    const key = JSON.stringify([variant.stops.map((stop) => [stop.start,stop.end,stop.stay.id]),variant.legs.map((leg) => leg.mode)]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export type StopEdit = { stay: Stay; leg?: Leg; start: string; end: string };

export function editStop(trip: Trip, index: number, change: StopEdit): { result?: Trip; error?: string } {
  const current = trip.stops[index];
  if (!current) return {error:"Parada não encontrada nesta viagem."};
  if (isArrivalStop(trip,index)) return {error:"A chegada final não possui hospedagem. Ajuste a parada anterior para mudar a data de chegada."};
  const previous = trip.stops[index-1];
  const inbound = change.leg ?? trip.legs[index-1];
  if (!change.start || !change.end || !validDateKey(change.start) || !validDateKey(change.end)) return {error:"Informe datas válidas no calendário."};
  if (daysBetween(change.start,change.end) < 1) return {error:"A saída deve acontecer depois da chegada."};
  const previousEnd = previous && addDays(change.start,-transitDays(inbound));
  if (previous && previousEnd && daysBetween(previous.start,previousEnd)<1) return {error:"Mantenha ao menos uma noite na parada anterior e tempo para o deslocamento."};
  const shift = daysBetween(current.end,change.end);
  const stops = trip.stops.map((stop,i) => {
    if (i === index) return {...stop,start:change.start,end:change.end,stay:change.stay};
    if (i === index-1 && previousEnd) return {...stop,end:previousEnd};
    if (i > index && shift) return {...stop,start:addDays(stop.start,shift),end:addDays(stop.end,shift)};
    return stop;
  });
  const start = stops[0].start, last=stops.at(-1)!, endDate = arrivesAtEnd(trip.plan) ? last.start : last.end;
  if (endDate > addMonths(start,24)) return {error:"A edição deixaria a viagem com mais de 24 meses."};
  const legs = trip.legs.map((leg,i) => index-1 === i && change.leg ? change.leg : leg);
  const result = {...trip,stops,legs,plan:{...trip.plan,start,endDate},revision:trip.revision+1};
  const oldQueue = queue(trip);
  const revisedQueue = queue(result);
  const reminders = Object.fromEntries(Object.entries(trip.reminders).filter(([id]) => revisedQueue.some((item) => item.id === id && item.signature === oldQueue.find((old) => old.id === id)?.signature)));
  return {result:{...result,reminders}};
}

export const evidenceLabels: Record<Evidence,string> = {
  ready:"Disponível para consulta",future:"Venda ainda fechada",review:"Verificação pendente",
  missing:"Sem oferta encontrada",expired:"Cotação expirada",error:"Fonte indisponível",
};

export function bookingStay(stop:Stop,travelers:number) {
  if (stop.stay.provider==="Manual" && stop.stay.url) return stop.stay.url;
  const params=new URLSearchParams({ss:stop.city.name+", "+stop.city.country,checkin:stop.start,checkout:stop.end,
    group_adults:String(travelers),no_rooms:String(stop.stay.type==="Hostel" ? 1 : Math.ceil(travelers/2))});
  if (stop.stay.id==="premium") params.set("nflt","class=4;class=5");
  return "https://www.booking.com/searchresults.pt-br.html?"+params;
}

const busbudCities:Partial<Record<string,string>> = {
  "sao-paulo":"6gyf4c",rio:"75cm8y",montevideo:"6cb1cf","buenos-aires":"69y7pd",asuncion:"6ex006",
  santiago:"66jcf4","la-paz":"6mpd1k",lima:"6mc5rp",cusco:"6msg45",bogota:"d2g64p",medellin:"d345rz",
  lisbon:"eycs20",madrid:"ezjmgt",florence:"srb0bp",rome:"sr2yk4",
};
const flightCities:Partial<Record<string,string>> = {
  "sao-paulo":"SAO",rio:"RIO",montevideo:"MVD","buenos-aires":"BUE",asuncion:"ASU",santiago:"SCL",
  "la-paz":"LPB",lima:"LIM",cusco:"CUZ",quito:"UIO",bogota:"BOG",medellin:"MDE",caracas:"CCS",georgetown:"GEO",paramaribo:"PBM",
  lisbon:"LIS",madrid:"MAD",rome:"ROM",athens:"ATH",istanbul:"IST",amman:"AMM",dubai:"DXB",delhi:"DEL",
  kathmandu:"KTM",hanoi:"HAN",bangkok:"BKK","chiang-mai":"CNX",bali:"DPS","new-york":"NYC",paris:"PAR",florence:"FLR","saint-georges":"CAY",
};

export function bookingTransport(from:Stop,to:Stop,mode:Mode,travelers:number,currency:Currency="BRL") {
  const route=" de "+from.city.name+", "+from.city.country+" para "+to.city.name+", "+to.city.country;
  const search=route+" em "+from.end+" para "+travelers+" pessoas";
  if (mode==="Ônibus") {
    const origin=busbudCities[from.city.id],destination=busbudCities[to.city.id];
    if (origin && destination) return `https://www.busbud.com/pt/bus-schedules-results/${origin}/${destination}?`+new URLSearchParams({outbound_date:from.end,adults:String(travelers)});
    return "https://www.google.com/search?"+new URLSearchParams({q:"Passagens de ônibus"+search});
  }
  const origin=flightCities[from.city.id],destination=flightCities[to.city.id];
  if (origin && destination) {
    const day=from.end.replaceAll("-","");
    const params=new URLSearchParams({currency,locale:"pt-BR",market:"BR",adultsv2:String(travelers),cabinclass:"economy",rtn:"0"});
    return `https://www.skyscanner.com.br/transport/flights/${origin}/${destination}/${day}?`+params;
  }
  return "https://www.google.com/search?"+new URLSearchParams({q:"Voos só de ida"+search});
}

function ticketLink(leg:Leg,from:Stop,to:Stop,plan:Plan) {
  if (leg.provider==="Manual" && leg.url) return {url:leg.url,provider:leg.provider};
  const url=bookingTransport(from,to,leg.mode,plan.travelers,plan.currency);
  const provider=url.startsWith("https://www.busbud.com/") ? "Busbud"
    : url.startsWith("https://www.skyscanner.com.br/") ? "Skyscanner" : "Busca por rota";
  return {url,provider};
}

export function ticketOptions(variant:Variant,index:number) {
  const leg=variant.legs[index],from=variant.stops[index],to=variant.stops[index+1];
  if (!leg || !from || !to) return undefined;
  const alternative=transportOptions(from.city,to.city,leg.id,leg.from,leg.to).find((option)=>option.mode!==leg.mode && option.price!==null);
  const options=[leg,...(alternative ? [alternative] : [])].map((item)=>({leg:item,...ticketLink(item,from,to,variant.plan)}));
  return {from,to,options};
}

export type QueueItem = {
  id: string; name: string; kind: string; provider: string; url?: string;
  day: string; until?: string; zone: string; status: Evidence; value: number | null;
  opens?: string; expires?: string; checked: string; lead?: number; signature: string; reservation?: Reservation; reminder?: string;
  time?: string;
};

export function registeredReservation(item:QueueItem) {
  return item.reservation?.state==="registered" && item.reservation.signature===item.signature ? item.reservation : undefined;
}

export function reservationLabel(item:QueueItem) {
  return item.kind==="Hospedagem" ? "Hospedagem reservada" : "Passagem comprada";
}

export function setReservation(trip:Trip,target:Pick<QueueItem,"id"|"signature">,details:{paid?:number}|null) {
  const item=queue(trip).find((row)=>row.id===target.id && row.signature===target.signature);
  if (!item) return trip;
  const existing=registeredReservation(item);
  const reservations={...trip.reservations};
  if (details) {
    if (existing?.confirmedByTraveler && existing.paid===details.paid) return trip;
    reservations[item.id]={state:"registered",date:new Date().toISOString(),signature:item.signature,item:item.name,
      confirmedByTraveler:true,paid:details.paid,googleCalendarLink:existing?.googleCalendarLink,googleCalendarTime:existing?.googleCalendarTime};
  } else {
    if (!existing?.confirmedByTraveler) return trip;
    delete reservations[item.id];
  }
  return {...trip,revision:trip.revision+1,reservations};
}

export function setCalendarTime(trip:Trip,target:Pick<QueueItem,"id"|"signature">,time:string) {
  const item=queue(trip).find((row)=>row.id===target.id && row.signature===target.signature);
  if (!item || (time && !validLocalTime(item.day,time,item.zone))) return null;
  if ((item.time ?? "")===time) return trip;
  const calendarTimes={...trip.calendarTimes};
  if (time) calendarTimes[item.id]={signature:item.signature,time};
  else delete calendarTimes[item.id];
  return {...trip,revision:trip.revision+1,calendarTimes};
}

export function queue(trip: Trip, now = new Date()): QueueItem[] {
  const {stops,legs,plan} = trip;
  const checked = trip.created.slice(0,10);
  function row(data: Omit<QueueItem,"signature"|"reservation"|"reminder"|"checked"|"time">, originalProvider=data.provider): QueueItem {
    const signature = [data.name,data.kind,originalProvider,data.day,data.until,data.value].join("|");
    const timing=trip.calendarTimes?.[data.id];
    return {...data,signature,checked,reservation:trip.reservations[data.id],reminder:trip.reminders[data.id],
      time:timing?.signature===signature ? timing.time : undefined};
  }
  const stays = stops.flatMap((stop,index) => isArrivalStop(trip,index) ? [] : [row({
    id:stop.id,name:stop.stay.name+" · "+stop.city.name,kind:"Hospedagem",provider:stop.stay.provider,url:stop.stay.provider==="Booking.com" ? bookingStay(stop,plan.travelers) : stop.stay.url,
    day:stop.start,until:stop.end,zone:stop.city.tz,status:stop.stay.status,
    expires:stop.stay.status === "expired" ? addDays(checked,-1) : undefined,
    value:stop.stay.nightly === null ? null : convert(stop.stay.nightly*daysBetween(stop.start,stop.end)*(stop.stay.type === "Hostel" ? plan.travelers : Math.ceil(plan.travelers/2)),plan.currency),
  })]);
  const fares = legs.map((leg,index) => {
    const from = stops[index], to = stops[index+1];
    const opens = leg.status === "future" ? addDays(from.end,-30) : undefined;
    return row({id:leg.id,name:from.city.name+" → "+to.city.name,kind:leg.mode,...ticketLink(leg,from,to,plan),
      day:from.end,until:to.start,zone:from.city.tz,status:opens && opens <= localDay(from.city.tz,now) ? "review" : leg.status,
      opens,expires:leg.status === "expired" ? addDays(checked,-1) : undefined,lead:opens ? 30 : undefined,
      value:leg.price === null ? null : convert(leg.price*plan.travelers,plan.currency)},leg.provider);
  });
  const priority = (item: QueueItem) => registeredReservation(item) ? "9" : item.status === "future" ? "2" : item.status === "ready" ? "0" : "1";
  return [...stays,...fares].sort((a,b) => (priority(a)+(a.reminder ?? a.opens ?? a.day)).localeCompare(priority(b)+(b.reminder ?? b.opens ?? b.day)));
}

export function localInstant(day: string, hour: number|string, tz: string) {
  const time=typeof hour==="number" ? String(hour).padStart(2,"0")+":00" : hour;
  const target = Date.parse(day+"T"+time+":00Z");
  if (!Number.isFinite(target)) return new Date(NaN);
  const formatter = new Intl.DateTimeFormat("sv-SE",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"});
  let instant = target;
  for (let i=0;i<2;i++) {
    const displayed = formatter.format(new Date(instant)).replace(" ","T")+"Z";
    instant += target - Date.parse(displayed);
  }
  return new Date(instant);
}

export function formatLocalTime(instant:Date,tz:string) {
  return new Intl.DateTimeFormat("pt-BR",{hour:"2-digit",minute:"2-digit",timeZone:tz,hourCycle:"h23"}).format(instant);
}

export function validLocalTime(day:string,time:string,tz:string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return false;
  const instant=localInstant(day,time,tz);
  return Number.isFinite(+instant) && localDay(tz,instant)===day && formatLocalTime(instant,tz)===time;
}

export type CalendarEvent = { id: string; title: string; day: string; tz: string; instant: Date; type: "Viagem" | "Hospedagem" | "Lembrete"; alarm?: Date; bookingId?: string };
export function calendar(trip: Trip, now = new Date()): CalendarEvent[] {
  const result: CalendarEvent[] = [];
  const items=queue(trip,now);
  const bookings=new Map(items.map((item)=>[item.id,item]));
  function add(id: string, title: string, day: string, hour: number|string, tz: string, type: CalendarEvent["type"], alarm?: Date, bookingId?:string) {
    result.push({id,title,day,tz,type,instant:localInstant(day,hour,tz),alarm,bookingId});
  }
  for (const [index,stop] of trip.stops.entries()) {
    const tz = stop.city.tz;
    if (!isArrivalStop(trip,index)) {
      add(stop.id+"-in","Check-in · "+stop.stay.name,stop.start,bookings.get(stop.id)?.time ?? 19,tz,"Hospedagem",undefined,stop.id);
      add(stop.id+"-out","Check-out · "+stop.city.name,stop.end,8,tz,"Hospedagem");
    }
    const next = trip.stops[index+1];
    if (!next) continue;
    const leg = trip.legs[index];
    const time=bookings.get(leg.id)?.time ?? 10;
    const departure = localInstant(stop.end,time,tz);
    const seven = localInstant(addDays(stop.end,-7),time,tz);
    const alarm = departure > now ? new Date(Math.max(+seven,+now)) : undefined;
    const title = stop.city.name+" → "+next.city.name;
    add(leg.id+"-out","Partida · "+title,stop.end,time,tz,"Viagem",alarm,leg.id);
    const earliest = new Date(+departure + (leg.hours ?? 2) * 3600000);
    const arrival = new Date(Math.max(+earliest,+localInstant(next.start,17,next.city.tz)));
    result.push({id:leg.id+"-in",title:"Chegada · "+next.city.name,day:localDay(next.city.tz,arrival),tz:next.city.tz,instant:arrival,type:"Viagem"});
  }
  for (const item of items) {
    if (registeredReservation(item)?.confirmedByTraveler) continue;
    if (item.reminder) add(item.id+"-review","Reconsultar · "+item.name,item.reminder,9,item.zone,"Lembrete");
    if (item.opens && item.status === "future") add(item.id+"-sale","Abertura simulada · "+item.name,item.opens,9,item.zone,"Lembrete");
  }
  return result.sort((a,b) => +a.instant-+b.instant);
}

export function ics(trip: Trip) {
  const stamp = (value: Date) => value.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");
  const escape = (value: string) => value.replaceAll("\\","\\\\").replaceAll("\n","\\n").replaceAll(",","\\,").replaceAll(";","\\;");
  const lines = ["BEGIN:VCALENDAR","VERSION:2.0","CALSCALE:GREGORIAN","PRODID:-//NomadFlow//Agenda de viagem//PT"];
  const timed = new Set(queue(trip).filter((item)=>item.time).map((item)=>item.id));
  for (const event of calendar(trip)) {
    const allDay=event.bookingId && !timed.has(event.bookingId);
    lines.push("BEGIN:VEVENT","UID:"+trip.tripId+"-"+event.id+"@nomadflow","SEQUENCE:"+trip.revision,"DTSTAMP:"+stamp(new Date()),
      allDay ? "DTSTART;VALUE=DATE:"+event.day.replaceAll("-","") : "DTSTART:"+stamp(event.instant),
      "SUMMARY:"+escape(event.title),"DESCRIPTION:"+escape((allDay ? "Horário a confirmar · " : "")+event.tz+" · NomadFlow"));
    if (event.alarm) lines.push("BEGIN:VALARM","ACTION:DISPLAY","TRIGGER;VALUE=DATE-TIME:"+stamp(event.alarm),"DESCRIPTION:Lembrete de partida","END:VALARM");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  const encoder = new TextEncoder();
  return lines.map((line) => {
    const parts: string[] = [];
    let part = "";
    for (const char of line) {
      if (encoder.encode(part+char).length > 75) { parts.push(part); part = " "; }
      part += char;
    }
    return [...parts,part].join("\r\n");
  }).join("\r\n") + "\r\n";
}
