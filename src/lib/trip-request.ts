import { cities as demoCities, city, thailand as thailandStops, type City } from "./destinations";
import { addDays, addMonths, address, daysBetween, distance, normalize, presetPlan, type Currency, type Plan } from "./planning";
import { citiesOfCountry, countryForCity, worldCities, worldCountries } from "./world-catalog";

const numbers:Record<string,number> = {
  um:1,uma:1,dois:2,duas:2,tres:3,quatro:4,cinco:5,seis:6,sete:7,oito:8,nove:9,dez:10,onze:11,doze:12,
  treze:13,catorze:14,quatorze:14,quinze:15,dezesseis:16,dezessete:17,dezoito:18,dezenove:19,
  vinte:20,trinta:30,quarenta:40,cinquenta:50,sessenta:60,setenta:70,oitenta:80,noventa:90,
  cem:100,cento:100,duzentos:200,trezentos:300,quatrocentos:400,quinhentos:500,
};
const spelled = "(?:(?:"+Object.keys(numbers).join("|")+"|mil)(?:\\s+(?:e\\s+)?(?:"+Object.keys(numbers).join("|")+"|mil))*)";
const quantity = "(?:\\d+(?:[.,]\\d+)*(?:\\s+mil)?|"+spelled+")";
const durationPattern = new RegExp("\\b("+quantity+")\\s+(dia(?:s)?|semana(?:s)?|mes(?:es)?|ano(?:s)?)\\b");
const peoplePattern = new RegExp("\\b("+quantity+")\\s+(viajantes?|pessoas?)\\b");
const currencyTerms = "r\\$|brl|real|reais|us\\$|usd|dolar(?:es)?|€|eur|euro(?:s)?";
const budgetPrefix = new RegExp("("+currencyTerms+")\\s*("+quantity+")");
const budgetSuffix = new RegExp("\\b("+quantity+")\\s*("+currencyTerms+")(?=$|[\\s,.!?])");
const budgetIntent = new RegExp("(?:orcamento(?:\\s+de|\\s+ate)?|gastar(?:\\s+ate)?|custar(?:\\s+ate)?)\\s+("+quantity+")");
const months = ["janeiro","fevereiro","marco","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];

function readNumber(value: string) {
  if (/^\d/.test(value)) {
    const multiple = value.endsWith(" mil") ? 1000 : 1;
    const text = value.replace(/\s+mil$/,"");
    const groupedComma=/^\d{1,3}(?:,\d{3})+$/.test(text);
    const groupedDot=/^\d{1,3}(?:\.\d{3})+$/.test(text);
    let decimal=text;
    if (text.includes(",") && text.includes(".")) {
      const decimalSeparator=text.lastIndexOf(",")>text.lastIndexOf(".") ? "," : ".";
      const groupSeparator=decimalSeparator==="," ? "." : ",";
      decimal=text.replaceAll(groupSeparator,"").replace(decimalSeparator,".");
    } else if (groupedComma) decimal=text.replaceAll(",","");
    else if (groupedDot) decimal=text.replaceAll(".","");
    else decimal=text.replace(",",".");
    return Number(decimal)*multiple;
  }
  let total=0, section=0;
  for (const word of value.split(/\s+/)) {
    if (word==="mil") {total+=(section || 1)*1000;section=0;}
    else section+=numbers[word] ?? 0;
  }
  return total+section;
}

function isoDate(year:number,month:number,day:number) {
  const date=new Date(Date.UTC(year,month-1,day));
  return date.getUTCFullYear()===year && date.getUTCMonth()===month-1 && date.getUTCDate()===day
    ? date.toISOString().slice(0,10) : null;
}

function datesIn(text:string) {
  const pattern = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b|\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b|\b(\d{1,2}) de ([a-z]+) de (\d{4})\b/g;
  return [...text.matchAll(pattern)].flatMap((match)=>{
    const date = match[1] ? isoDate(+match[1],+match[2],+match[3])
      : match[4] ? isoDate(+match[6],+match[5],+match[4])
        : isoDate(+match[9],months.indexOf(match[8])+1,+match[7]);
    return date ? [date] : [];
  });
}

function currencyOf(value: string):Currency {
  if (/euro|€|eur/.test(value)) return "EUR";
  if (/dolar|usd|us\$/.test(value)) return "USD";
  return "BRL";
}

type Mention = {place:City;start:number;end:number;city:boolean};
function catalogNames() {
  const articles=new Map<string,{place:City;city:boolean}>();
  function add(name:string,place:City,isCity:boolean,minimum=4) {
    const key=normalize(name);
    if (key.length>=minimum && !articles.has(key)) articles.set(key,{place,city:isCity});
  }
  for (const place of [...demoCities,...worldCities]) add(place.name,place,true);
  for (const country of worldCountries) {
    const place=citiesOfCountry(country.code)[0];
    if (place) {add(country.name,place,false);add(country.original,place,false);}
  }
  add("EUA",city("new-york"),false,3);
  return articles;
}

let knownNames:ReturnType<typeof catalogNames>|undefined;
function mentions(text:string) {
  knownNames ??= catalogNames();
  const found:Mention[]=[];
  for (const [name,item] of knownNames) {
    for (let at=text.indexOf(name);at>=0;at=text.indexOf(name,at+name.length)) {
      const end=at+name.length;
      if (!/[a-z0-9]/.test(text[at-1] ?? "") && !/[a-z0-9]/.test(text[end] ?? "")) found.push({...item,start:at,end});
    }
  }
  found.sort((a,b)=>a.start-b.start || b.end-a.end || Number(b.city)-Number(a.city));
  const result:Mention[]=[];
  for (const item of found) if (item.start >= (result.at(-1)?.end ?? 0)) result.push(item);
  return result;
}

function unique(route:City[]) {
  return [...new Map(route.map((place)=>[place.id,place])).values()];
}

function suggestedVia(plan:Plan) {
  const start=address(plan.origin), end=address(plan.end);
  if (!start || !end || plan.loop || daysBetween(plan.start,plan.endDate)<150) return [];
  const range=distance(start,end);
  if (plan.end.country==="Tailândia" && range>1500) {
    const region=countryForCity(plan.origin)?.continent;
    const corridor=thailandStops.filter((place)=>place.id!==plan.origin.id && place.id!==plan.end.id);
    if (region==="SA") return corridor;
    const first=thailandStops.findIndex((place)=>place.id===plan.origin.id);
    if (first>=0) return thailandStops.slice(first+1);
    const closest=corridor.reduce((a,b)=>distance(start,address(a)!)<=distance(start,address(b)!) ? a : b);
    if (region==="EU" || region==="AS" || region==="AF") return corridor.slice(corridor.indexOf(closest)).filter((place)=>distance(address(place)!,end)<range);
  }
  const stopCount=Math.min(8,Math.max(1,Math.floor(daysBetween(plan.start,plan.endDate)/42)));
  const candidates=demoCities.filter((place)=>place.id!==plan.origin.id && place.id!==plan.end.id).map((place)=>{
    const point=address(place)!;
    return {place,to:distance(point,end),from:distance(start,point)};
  }).filter(({from,to})=>from>350 && to>350 && from+to<range*1.2).sort((a,b)=>b.to-a.to);
  const result:City[]=[];
  let previous=range;
  for (const candidate of candidates) {
    if (previous-candidate.to<Math.max(350,range/(stopCount+1)*.65)) continue;
    result.push(candidate.place);
    previous=candidate.to;
    if (result.length===stopCount) break;
  }
  return result;
}

export function parseTripRequest(prompt:string,previous?:Plan) {
  const text=normalize(prompt);
  const thailand=/\b(tailandia|bangkok)\b/.test(text);
  const duration=text.match(durationPattern);
  const length=duration ? readNumber(duration[1]) : 0;
  const longTrip=duration ? length>0 && (duration[2].startsWith("ano") || (duration[2].startsWith("mes") && length>=5) || (duration[2].startsWith("semana") && length>=22) || (duration[2].startsWith("dia") && length>=150))
    : previous?.prompt && daysBetween(previous.start,previous.endDate)>=150;
  const preset=text.includes("america do sul") ? "south" : thailand && longTrip ? "thailand" : previous?.preset ?? "custom";
  const defaults=presetPlan(preset,previous?.start || undefined);
  const base=previous?.preset===preset ? previous : previous?.prompt ? {...previous,...defaults,
    origin:previous.origin,endDate:previous.endDate,travelers:previous.travelers,currency:previous.currency,transport:previous.transport,
    pace:previous.pace,stays:previous.stays,internet:previous.internet,extras:previous.extras} : defaults;
  const next:Plan={...base,budget:previous?.budget ?? 0,prompt:prompt.trim()};
  const fields:string[]=[];
  const found=mentions(text);
  const hint=(item:Mention)=>text.slice(Math.max(0,item.start-37),item.start);
  const origin=found.find((item)=>/\b(?:(?:sair|saio|saindo|partir|partindo|ir|viajar|origem)\s+(?:de|do|da)|origem(?:\s+em|\s*:)|desde)\s*$/.test(hint(item)))
    ?? found.find((item)=>/^(?:viagem\s+)?(?:de|do|da)\s*$/.test(hint(item)));
  const append=/\b(?:adicion[ae]r?|inclu[ai]r?|acrescent[ae]r?)\b/.test(text);
  const intendedEnd=found.findLast((item)=>item!==origin && /\b(?:ate|para|pra|pro|destino(?: final)?|chegar(?: em| no| na)?)\s*:?(?:\s+(?:o|a|os|as))?\s*$/.test(hint(item)));
  const loop=/\b(?:sem voltar|so ida|apenas ida)\b/.test(text) ? false
    : /\b(?:voltar|voltando|retornar|ida e volta|circuito)\b/.test(text) ? true : intendedEnd ? false : base.loop;
  const returning=(item:Mention)=>/\b(?:voltar|voltando|retornar|retornando)(?:\s+(?:ao?|aos|as|para|pra|pro|ate))?(?:\s+(?:o|a|os|as))?\s*$/.test(hint(item));
  const stops=found.filter((item)=>item!==origin && (!loop || !returning(item)));
  const destination=loop || append ? undefined : intendedEnd ?? (preset==="custom" || thailand ? stops.at(-1) : undefined);
  next.origin=origin?.place ?? base.origin;
  next.loop=loop;
  next.end=loop ? next.origin : destination?.place ?? (preset==="custom" && thailand ? city("bangkok") : base.end);
  if (destination && ((preset==="thailand" && next.end.country!=="Tailândia") || preset==="south")) next.preset="custom";
  const via=stops.filter((item)=>item!==destination && item.place.id!==next.origin.id && item.place.id!==next.end.id)
    .filter((item)=>append || preset==="custom" || loop && /\b(?:ate|para|pra|pro)\s+(?:(?:a|o|as|os)\s+)?$/.test(hint(item))
      || /\b(?:passar|passando|parar|parando|visitar|visitando|incluindo|via)\b/.test(text.slice(0,item.start)));
  if (via.length) {
    next.via=unique([...(append ? base.via : []),...via.map((item)=>item.place)]);
    next.fixed=true;
    next.nightWeights=undefined;
  } else if (destination && (preset==="custom" || destination.place.id!==base.end.id)) {
    next.via=[];
    next.nightWeights=undefined;
  }
  if (origin || destination || via.length || preset!==previous?.preset || loop!==base.loop) fields.push("Rota");

  const [start,end]=datesIn(text);
  next.start=start ?? (base.start || presetPlan(preset).start);
  if (end) next.endDate=end;
  else if (duration && length && length>0) {
    const unit=duration[2];
    next.endDate=unit.startsWith("mes") ? addMonths(next.start,Math.min(24,length))
      : unit.startsWith("ano") ? addMonths(next.start,Math.min(24,length*12))
        : addDays(next.start,Math.min(731,length*(unit.startsWith("semana") ? 7 : 1)));
  } else if (start) next.endDate=addDays(start,base.start && base.endDate ? daysBetween(base.start,base.endDate) : 21);
  if (!end && next.endDate>addMonths(next.start,24)) next.endDate=addMonths(next.start,24);
  if (start || duration || end) fields.push("Datas e duração");
  const suggestions=via.length===0 && (destination || !next.via.length || origin && preset==="thailand") && suggestedVia(next);
  if (suggestions && suggestions.length) {
    next.via=suggestions;
    next.fixed=true;
    next.nightWeights=undefined;
  }
  next.arriveAtEnd=!next.loop && (base.arriveAtEnd || /\bate (?:chegar|a chegada)\b/.test(text)
    || !!(destination || previous?.prompt && duration || suggestions && suggestions.length) && daysBetween(next.start,next.endDate)>=150);

  const prefix=text.match(budgetPrefix), suffix=text.match(budgetSuffix), amount=text.match(budgetIntent);
  const value=prefix?.[2] ?? suffix?.[1] ?? amount?.[1];
  if (/\b(?:sem orcamento|tirar o orcamento|remover o orcamento)\b/.test(text)) {
    next.budget=0;
    fields.push("Orçamento");
  } else if (value) {
    const budget=readNumber(value);
    if (budget>0 && Number.isSafeInteger(Math.round(budget*100))) {
      next.currency=prefix || suffix ? currencyOf(prefix?.[1] ?? suffix![2]) : base.currency;
      next.budget=Math.round(budget*100);
      fields.push("Orçamento");
    }
  }
  const people=text.match(peoplePattern);
  if (people || /\b(?:casal|romantica)\b/.test(text)) {
    next.travelers=Math.max(1,Math.min(20,people ? readNumber(people[1]) : 2));
    fields.push("Viajantes");
  }
  if (/\b(?:onibus|aviao|voos?)\b/.test(text)) {
    next.transport=text.includes("onibus") && /\b(?:aviao|voos?)\b/.test(text) ? "qualquer" : text.includes("onibus") ? "Ônibus" : "Avião";
    fields.push("Transporte");
  }
  return {plan:next,fields,hasDestination:!!destination || preset!=="custom"};
}
