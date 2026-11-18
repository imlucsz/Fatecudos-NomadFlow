import { cities as demoCities, type City } from "./destinations";
import { normalize } from "./planning";
import data from "./world-data.json";

type CountryRow = [code:string,numeric:string,original:string,continent:string,capital:string];
type CityRow = [id:string,name:string,lat:number,lon:number,tz:string];
export type Country = {code:string;numeric:string;name:string;original:string;continent:string;capital:string};

const names = new Intl.DisplayNames("pt-BR",{type:"region"});
const aliases:Record<string,string> = {
  "eua":"US","estados unidos da america":"US","reino unido":"GB","inglaterra":"GB","coreia do sul":"KR",
  "coreia do norte":"KP","vaticano":"VA","holanda":"NL","republica tcheca":"CZ","tchequia":"CZ",
  "emirados arabes":"AE","costa do marfim":"CI","north cyprus":"CY","n. cyprus":"CY","somaliland":"SO",
  "guiana francesa":"GF","cosovo":"XK",
};
const cityNames:Record<string,string> = {
  London:"Londres",Berlin:"Berlim",Brussels:"Bruxelas",Vienna:"Viena",Prague:"Praga",Warsaw:"Varsóvia",
  Moscow:"Moscou",Geneva:"Genebra",Munich:"Munique",Copenhagen:"Copenhague",Stockholm:"Estocolmo",
  Beijing:"Pequim",Shanghai:"Xangai",Tokyo:"Tóquio",Seoul:"Seul",Singapore:"Singapura",
  Cairo:"Cairo",Casablanca:"Casablanca",Marrakesh:"Marrakech",Sydney:"Sydney",Alexandria:"Alexandria",
  "Madrid":"Madri","Rio de Janeiro":"Rio de Janeiro","New York City":"Nova York",
};

export const worldCountries:Country[] = (data.countries as CountryRow[]).map(([code,numeric,original,continent,capital])=>({
  code,numeric,name:names.of(code) || original,original,continent,capital,
})).sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));

const byCode = new Map(worldCountries.map((country)=>[country.code,country]));
const byNumeric = new Map(worldCountries.filter((country)=>Number(country.numeric)>0).map((country)=>[Number(country.numeric),country]));
const byName = new Map(worldCountries.flatMap((country)=>[[normalize(country.name),country],[normalize(country.original),country]] as const));

export function findCountry(text:string) {
  const key = normalize(text);
  return byName.get(key) ?? byCode.get(aliases[key] ?? key.toUpperCase());
}

export function countryFromFeature(id:string|number|undefined,name:string) {
  return byNumeric.get(Number(id)) ?? findCountry(name);
}

export function countryForCity(place:City) {
  return place.countryCode ? byCode.get(place.countryCode) ?? findCountry(place.country) : findCountry(place.country);
}

const rows = data.cities as unknown as Record<string,CityRow[]>;
const lookup = new Map<string,City[]>();
for (const country of worldCountries) {
  const known = demoCities.filter((place)=>countryForCity(place)?.code===country.code);
  const knownNames = new Set(known.map((place)=>normalize(place.name)));
  const catalog = (rows[country.code] ?? []).map(([id,name,lat,lon,tz]):City=>({
    id:"geo-"+id,name:cityNames[name] ?? name,country:country.name,countryCode:country.code,lat,lon,tz:tz || "UTC",night:0,
  }));
  lookup.set(country.code,[...known,...catalog.filter((place)=>!knownNames.has(normalize(place.name)))]);
}

export const citiesOfCountry = (code:string) => lookup.get(code) ?? [];
export const worldCities = [...lookup.values()].flat();
