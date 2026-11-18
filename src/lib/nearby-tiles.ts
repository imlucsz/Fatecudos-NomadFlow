import { VectorTile } from "@mapbox/vector-tile";
import type { Feature } from "geojson";
import { PbfReader } from "pbf";
import { areaFeature, mapBounds, type NearbyArea } from "./trail-geography";

type TileSet = {tiles:string[];maxzoom:number};

function tilesInArea(area:NearbyArea,zoom:number) {
  const [[west,south],[east,north]]=mapBounds(areaFeature(area).geometry.coordinates[0] as [number,number][]);
  const size=2**zoom;
  const column=(lon:number)=>Math.floor((lon+180)/360*size);
  const row=(lat:number)=>{
    const angle=Math.max(-85,Math.min(85,lat))*Math.PI/180;
    return Math.floor((1-Math.asinh(Math.tan(angle))/Math.PI)/2*size);
  };
  const tiles=[];
  for (let x=column(west);x<=column(east);x++) {
    for (let y=row(north);y<=row(south);y++) tiles.push({zoom,x:(x%size+size)%size,y});
  }
  return tiles;
}

export async function loadNearbyFeatures(area:NearbyArea,signal:AbortSignal):Promise<Feature[]> {
  if (Math.abs(area.point.lat)>85) return [];
  const response=await fetch("https://tiles.openfreemap.org/planet",{signal});
  if (!response.ok) throw new Error("Mapa de arredores indisponível");
  const {tiles:[template],maxzoom}=await response.json() as TileSet;
  const scale=Math.cos(area.point.lat*Math.PI/180);
  const zoom=maxzoom-Math.max(0,Math.ceil(Math.log2(area.radius/(6*scale))));
  const tiles=tilesInArea(area,zoom);
  if (zoom<maxzoom) tiles.push(...tilesInArea({...area,radius:Math.min(2,3*scale)},maxzoom));

  async function loadTile({zoom,x,y}: {zoom:number;x:number;y:number}) {
    const url=template.replace("{z}",String(zoom)).replace("{x}",String(x)).replace("{y}",String(y));
    const res=await fetch(url,{signal});
    if (res.status===404 || res.status===204) return [];
    if (!res.ok) throw new Error("Trecho do mapa indisponível");
    const data=new PbfReader(new Uint8Array(await res.arrayBuffer()));
    const layer=new VectorTile(data).layers.poi;
    const features:Feature[]=[];
    for (let index=0;index<(layer?.length ?? 0);index++) {
      const place=layer.feature(index);
      if (place.type===1) features.push(place.toGeoJSON(x,y,zoom));
    }
    return features;
  }

  const features:Feature[]=[];
  for (let index=0;index<tiles.length;index+=6) {
    const batch=await Promise.all(tiles.slice(index,index+6).map(loadTile));
    for (const points of batch) features.push(...points);
  }
  return features;
}
