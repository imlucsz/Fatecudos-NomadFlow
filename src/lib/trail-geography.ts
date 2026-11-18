import { geoInterpolate } from "d3-geo";
import type { Feature, FeatureCollection, Geometry, LineString, Point, Polygon } from "geojson";
import { address, distance, type Address } from "./planning";
import type { MapPoint } from "@/components/route-map";

export const nearbyCategories = ["Cafés","Turismo","Trabalho","Comida"] as const;
export type NearbyCategory = typeof nearbyCategories[number];
export type NearbyPlace = {id:string;name:string;kind:string;position:Address;km:number};
export type NearbyArea = {point:Address;radius:number;label:string;lodging:boolean};
type LngLat = [number,number];
type LegProperties = {state:"visited"|"planned"|"pending";bearing?:number};

const radians = Math.PI/180;
const degrees = 1/radians;
const tags: Record<NearbyCategory,Record<string,string>> = {
  "Cafés": {cafe:"Café",coffee_shop:"Cafeteria"},
  "Turismo": {attraction:"Atração turística",museum:"Museu",gallery:"Galeria",art_gallery:"Galeria de arte",viewpoint:"Mirante",monument:"Monumento",memorial:"Memorial",castle:"Castelo",ruins:"Ruínas",zoo:"Zoológico",artwork:"Arte pública",archaeological_site:"Sítio arqueológico",park:"Parque",theatre:"Teatro",landmark:"Ponto de interesse"},
  "Trabalho": {coworking_space:"Coworking",coworking:"Coworking",library:"Biblioteca"},
  "Comida": {restaurant:"Restaurante",fast_food:"Lanche",food_court:"Praça de alimentação",bakery:"Padaria",ice_cream:"Sorveteria"},
};

export const mapCoordinates = (point:Address): LngLat => [point.lon,point.lat];

export function collection<G extends Geometry,P>(features:Feature<G,P>[]): FeatureCollection<G,P> {
  return {type:"FeatureCollection",features};
}

function nearestLongitude(lon:number,reference:number) {
  return lon+360*Math.round((reference-lon)/360);
}

export function mapBounds(coordinates:LngLat[]): [LngLat,LngLat] {
  const longitudes = coordinates.map(([lon])=>(lon%360+360)%360).sort((a,b)=>a-b);
  let gap = -1, start=longitudes[0];
  for (let index=0; index<longitudes.length; index+=1) {
    const end=longitudes[index+1] ?? longitudes[0]+360;
    if (end-longitudes[index]>gap) {
      gap = end-longitudes[index];
      start = end%360;
    }
  }
  const west = start>180 ? start-360 : start;
  const latitudes = coordinates.map(([,lat])=>lat);
  return [[west,Math.min(...latitudes)],[west+360-gap,Math.max(...latitudes)]];
}

function bearing(a:LngLat,b:LngLat) {
  const [lon1,lat1]=a.map((value)=>value*radians);
  const [lon2,lat2]=b.map((value)=>value*radians);
  return Math.atan2(Math.sin(lon2-lon1)*Math.cos(lat2),Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(lon2-lon1))*degrees;
}

export function routeFeatures(points:MapPoint[],pending:readonly boolean[]) {
  return points.slice(1).flatMap((destination,index)=>{
    const origin=points[index];
    const a=address(origin.city), b=address(destination.city);
    if (!a || !b || distance(a,b)<.001) return [];
    const interpolate=geoInterpolate(mapCoordinates(a),mapCoordinates(b));
    const state = destination.status==="visited" || destination.status==="current" && origin.status==="visited"
      ? "visited" : pending[index] ? "pending" : "planned";
    const coordinates:LngLat[] = [];
    const samples = Math.min(64,Math.max(6,Math.ceil(distance(a,b)*32/6371)));
    for (let sample=0; sample<=samples; sample+=1) {
      const [lon,lat]=interpolate(sample/samples);
      coordinates.push([nearestLongitude(lon,coordinates.at(-1)?.[0] ?? lon),lat]);
    }
    const line:Feature<LineString,LegProperties> = {type:"Feature",geometry:{type:"LineString",coordinates},properties:{state}};
    const anchor=interpolate(.58);
    const arrow:Feature<Point,LegProperties> = {type:"Feature",geometry:{type:"Point",coordinates:anchor},properties:{state,bearing:bearing(anchor,interpolate(.6))}};
    return [[line,arrow]];
  });
}

export function areaFeature(area:NearbyArea): Feature<Polygon> {
  const {point,radius}=area;
  const longitude=point.lon*radians, latitude=point.lat*radians, length=radius/6371;
  const coordinates = Array.from({length:64},(_,index)=>{
    const angle=2*Math.PI*index/64;
    const lat=Math.asin(Math.sin(latitude)*Math.cos(length)+Math.cos(latitude)*Math.sin(length)*Math.cos(angle));
    const lon=longitude+Math.atan2(Math.sin(angle)*Math.sin(length)*Math.cos(latitude),Math.cos(length)-Math.sin(latitude)*Math.sin(lat));
    return [lon*degrees,lat*degrees];
  });
  coordinates.push(coordinates[0]);
  return {type:"Feature",properties:{},geometry:{type:"Polygon",coordinates:[coordinates]}};
}

export function findNearbyPlaces(features:Feature[],area:NearbyArea,category:NearbyCategory): NearbyPlace[] {
  const results = new Map<string,NearbyPlace>();
  for (const feature of features) {
    const fields=feature.properties;
    if (!fields || feature.geometry.type!=="Point") continue;
    const name=fields["name:pt"] ?? fields.name ?? fields["name:en"] ?? fields["name:latin"];
    if (typeof name!=="string" || !name.trim()) continue;
    const kind=category==="Trabalho" && /\bco[\s-]?working\b/i.test(name) ? "Coworking"
      : tags[category][fields.subclass || fields.class];
    if (typeof kind!=="string") continue;
    const [rawLon,lat]=feature.geometry.coordinates;
    if (!Number.isFinite(rawLon) || !Number.isFinite(lat)) continue;
    const lon=nearestLongitude(rawLon,area.point.lon);
    const position={lat,lon}, km=distance(area.point,position);
    if (km>area.radius) continue;
    const id=[name,Math.round(lat*10000),Math.round(lon*10000)].join("|");
    results.set(id,{id,name,kind,position,km});
  }
  return [...results.values()].sort((a,b)=>a.km-b.km || a.name.localeCompare(b.name)).slice(0,24);
}
