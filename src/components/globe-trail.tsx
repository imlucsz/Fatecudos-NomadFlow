"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LineString, Point } from "geojson";
import type { ExpressionSpecification, GeoJSONSource, Map as MapLibre, Marker, Popup } from "maplibre-gl";
import { address } from "@/lib/planning";
import {
  areaFeature, collection, mapBounds, mapCoordinates, routeFeatures,
  type NearbyArea, type NearbyPlace,
} from "@/lib/trail-geography";
import type { MapPoint } from "./route-map";

type MapStatus = "loading" | "ready" | "unavailable";
type GlobeProps = {
  points:MapPoint[];selected:string;pending?:readonly boolean[];playback:number;cameraRequest:number;
  area?:NearbyArea;places:NearbyPlace[];activePlace?:NearbyPlace;
  onSelect:(id:string)=>void;onPlace:(place:NearbyPlace)=>void;
  onStatus:(status:MapStatus)=>void;
};
const mapStyle = "https://tiles.openfreemap.org/styles/liberty";
const routeSource = "nomadflow-route";
const areaSource = "nomadflow-area";
const routePaint:ExpressionSpecification = ["match",["get","state"],"visited","#11734c","pending","#a3672a","#326b9a"];
const noPending: readonly boolean[] = [];

function trackLayers(map:MapLibre) {
  map.addSource(routeSource,{type:"geojson",data:collection([])});
  map.addLayer({id:"trail-halo",type:"line",source:routeSource,filter:["==",["geometry-type"],"LineString"],layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":"#f6ffff","line-opacity":.86,"line-width":6}});
  map.addLayer({id:"trail-line",type:"line",source:routeSource,filter:["all",["==",["geometry-type"],"LineString"],["!=",["get","state"],"pending"]],layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":routePaint,"line-width":3.4}});
  map.addLayer({id:"trail-pending",type:"line",source:routeSource,filter:["all",["==",["geometry-type"],"LineString"],["==",["get","state"],"pending"]],layout:{"line-cap":"round"},paint:{"line-color":"#a3672a","line-width":3.3,"line-dasharray":[1.3,1.4]}});
  const arrow = document.createElement("canvas");
  arrow.width = arrow.height = 40;
  const ink = arrow.getContext("2d");
  if (ink) {
    ink.beginPath();ink.moveTo(9,26);ink.lineTo(20,13);ink.lineTo(31,26);
    ink.lineCap="round";ink.lineJoin="round";ink.strokeStyle="white";ink.lineWidth=9;ink.stroke();
    ink.strokeStyle="#2b5577";ink.lineWidth=4.5;ink.stroke();
    map.addImage("trail-chevron",ink.getImageData(0,0,40,40),{pixelRatio:2});
    map.addLayer({id:"trail-direction",type:"symbol",source:routeSource,filter:["==",["geometry-type"],"Point"],layout:{
      "icon-image":"trail-chevron","icon-rotate":["get","bearing"],"icon-rotation-alignment":"map","icon-allow-overlap":true,
    }});
  }
  map.addSource(areaSource,{type:"geojson",data:collection([])});
  map.addLayer({id:"trail-area-fill",type:"fill",source:areaSource,paint:{"fill-color":"#4b87b9","fill-opacity":.16}});
  map.addLayer({id:"trail-area-outline",type:"line",source:areaSource,paint:{"line-color":"#275e89","line-width":2.3,"line-dasharray":[2,1.5]}});
}

function duration(ms:number) {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : ms;
}

function outlineCamera(map:MapLibre,points:MapPoint[],animate:boolean) {
  const coordinates=points.flatMap(({city})=>{
    const point=address(city);
    return point ? [mapCoordinates(point)] : [];
  });
  if (!coordinates.length) { map.jumpTo({center:[10,20],zoom:1,pitch:0,bearing:0});return; }
  const paint = animate ? duration(850) : 0;
  const inset = Math.min(56,map.getContainer().clientWidth*.11);
  map.fitBounds(mapBounds(coordinates),{padding:{top:Math.min(81,map.getContainer().clientHeight*.23),bottom:46,left:inset,right:inset},maxZoom:5.3,pitch:0,bearing:0,duration:paint});
}

function buttonPin(className:string,label:string,text:string,onClick:()=>void) {
  const pin=document.createElement("button");
  pin.type="button";
  pin.className="globe-pin "+className;
  pin.title=label;
  pin.setAttribute("aria-label",label);
  pin.textContent=text;
  pin.addEventListener("click",(event)=>{
    event.stopPropagation();
    onClick();
  });
  return pin;
}

export function GlobeTrail({points,selected,pending=noPending,playback,cameraRequest,area,places,activePlace,onSelect,onPlace,onStatus}:GlobeProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibre|null>(null);
  const libRef = useRef<typeof import("maplibre-gl")|null>(null);
  const actions=useRef({onSelect,onPlace});
  const [ready,setReady] = useState(false);
  const legs = useMemo(()=>routeFeatures(points,pending),[points,pending]);
  const exploring = !!area;
  const outline = useRef(points);
  useEffect(()=>{actions.current={onSelect,onPlace};},[onSelect,onPlace]);
  useEffect(()=>{outline.current=points;},[points]);

  useEffect(()=>{
    let disposed=false;
    let map:MapLibre|undefined;
    let observer:ResizeObserver|undefined;
    let explorer:HTMLElement|null=null;
    let loaded=false;
    let failed=false;
    function unavailable() {
      if (disposed || failed) return;
      failed=true;
      onStatus("unavailable");
    }
    const timeout=window.setTimeout(unavailable,12000);
    void import("maplibre-gl").then((lib)=>{
      if (disposed || failed || !container.current) return;
      libRef.current=lib;
      lib.setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs",import.meta.url).toString());
      map=new lib.Map({
        container:container.current,style:mapStyle,center:[14,26],zoom:1.1,maxZoom:20,
        attributionControl:{compact:false},pitchWithRotate:true,cooperativeGestures:true,
        locale:{
          "NavigationControl.ZoomIn":"Aproximar mapa",
          "NavigationControl.ZoomOut":"Afastar mapa",
          "NavigationControl.ResetBearing":"Orientar para o norte",
          "FullscreenControl.Enter":"Ampliar mapa",
          "FullscreenControl.Exit":"Sair da tela cheia",
          "CooperativeGesturesHandler.MacHelpText":"Use ⌘ e role para aproximar ou afastar o mapa",
          "CooperativeGesturesHandler.WindowsHelpText":"Use Ctrl e role para aproximar ou afastar o mapa",
          "CooperativeGesturesHandler.MobileHelpText":"Use dois dedos para mover o mapa",
        },
        transformStyle:(_previous,style)=>({
          ...style,projection:{type:"globe"},
          layers:style.layers.filter((layer)=>!("source-layer" in layer && layer["source-layer"]==="poi")),
        }),
      });
      mapRef.current=map;
      map.addControl(new lib.NavigationControl({visualizePitch:true}),"top-right");
      explorer=container.current.closest<HTMLElement>(".trail-explorer");
      if (explorer) map.addControl(new lib.FullscreenControl({container:explorer,pseudo:true}),"top-right");
      map.addControl(new lib.ScaleControl({unit:"metric",maxWidth:88}),"bottom-left");
      observer=new ResizeObserver(()=>map?.resize());
      observer.observe(container.current);
      map.once("load",()=>{
        if (!map || disposed || failed) return;
        trackLayers(map);
        outlineCamera(map,outline.current,false);
        loaded=true;
        window.clearTimeout(timeout);
        setReady(true);
        onStatus("ready");
      });
      map.on("error",(event)=>{
        const message=String(event.error);
        if (/worker failed to load|webgl context/i.test(message)) { unavailable();return; }
        if (!loaded && /failed to fetch|networkerror|ajaxerror/i.test(message)) {
          if (map?.getStyle()?.layers.length) return;
          unavailable();
        }
      });
      map.on("webglcontextlost",unavailable);
    }).catch(unavailable);
    return ()=>{
      disposed=true;
      window.clearTimeout(timeout);
      observer?.disconnect();
      explorer?.classList.remove("maplibregl-pseudo-fullscreen");
      map?.remove();
      mapRef.current=null;
      libRef.current=null;
    };
  },[onStatus]);

  useEffect(()=>{
    const map=mapRef.current;
    if (!ready || !map) return;
    if (!area) {outlineCamera(map,outline.current,true);return;}
    map.resize();
    const ring=areaFeature(area).geometry.coordinates[0] as [number,number][];
    map.fitBounds(mapBounds(ring),{
      padding:{top:56,bottom:55,left:32,right:43},maxZoom:17,pitch:area.radius<=2 ? 26 : 16,bearing:0,duration:duration(800),
    });
  },[ready,area,cameraRequest]);

  useEffect(()=>{
    const map=mapRef.current;
    if (!ready || !map) return;
    (map.getSource(areaSource) as GeoJSONSource).setData(collection(area ? [areaFeature(area)] : []));
  },[area,ready]);

  useEffect(()=>{
    const map=mapRef.current;
    if (!ready || !map) return;
    const source=map.getSource(routeSource) as GeoJSONSource;
    const draw=(count:number)=>source.setData(collection<LineString|Point,{state:string;bearing?:number}>(legs.slice(0,count).flat()));
    if (exploring || !legs.length) {draw(0);return;}
    if (!duration(1)) {draw(legs.length);return;}
    draw(0);
    let drawn=0;
    const tick=window.setInterval(()=>{
      draw(++drawn);
      if (drawn===legs.length) window.clearInterval(tick);
    },Math.min(145,1380/legs.length));
    return ()=>window.clearInterval(tick);
  },[ready,legs,playback,exploring]);

  useEffect(()=>{
    const map=mapRef.current, lib=libRef.current;
    if (!ready || !map || !lib) return;
    const markers:Marker[] = [];
    if (area) {
      const pin=buttonPin("globe-lodging",area.label,area.lodging ? "⌂" : "•",()=>{
        map.easeTo({center:mapCoordinates(area.point),zoom:Math.max(14,map.getZoom()),duration:duration(440)});
      });
      markers.push(new lib.Marker({element:pin,opacityWhenCovered:"0"}).setLngLat(mapCoordinates(area.point)).addTo(map));
    } else {
      const duplicates = new Map<string,number>();
      points.forEach((item,index)=>{
        const point=address(item.city);
        if (!point) return;
        const coordinate=mapCoordinates(point);
        const key=coordinate.join("|"), occurrence=duplicates.get(key) ?? 0;
        duplicates.set(key,occurrence+1);
        const pin=buttonPin("globe-stop "+(item.status ?? "upcoming"),(index+1)+". "+item.city.name+", "+item.city.country,String(index+1),()=>actions.current.onSelect(item.id));
        pin.setAttribute("aria-pressed",String(item.id===selected));
        markers.push(new lib.Marker({element:pin,offset:[Math.min(occurrence,4)*23,0],opacityWhenCovered:"0"}).setLngLat(coordinate).addTo(map));
      });
    }
    return ()=>markers.forEach((marker)=>marker.remove());
  },[ready,points,selected,area]);

  useEffect(()=>{
    const map=mapRef.current, lib=libRef.current;
    if (!ready || !area || !map || !lib) return;
    const markers=places.map((place,index)=>{
      const pin=buttonPin("globe-poi",place.name+" · "+place.kind,String(index+1),()=>actions.current.onPlace(place));
      pin.setAttribute("aria-pressed",String(activePlace?.id===place.id));
      return new lib.Marker({element:pin,opacityWhenCovered:"0"}).setLngLat(mapCoordinates(place.position)).addTo(map);
    });
    let popup:Popup|undefined;
    if (activePlace) {
      const card=document.createElement("div");
      card.className="globe-popup";
      const title=document.createElement("strong");
      title.textContent=activePlace.name;
      const subtitle=document.createElement("small");
      subtitle.textContent=activePlace.kind+" · "+Math.round(activePlace.km*1000).toLocaleString("pt-BR")+" m";
      card.append(title,subtitle);
      const coordinate=mapCoordinates(activePlace.position);
      popup=new lib.Popup({closeButton:false,closeOnClick:false,offset:17,focusAfterOpen:false}).setLngLat(coordinate).setDOMContent(card).addTo(map);
      if (!map.getBounds().contains(coordinate)) map.easeTo({center:coordinate,duration:duration(450)});
    }
    return ()=>{markers.forEach((marker)=>marker.remove());popup?.remove();};
  },[ready,area,places,activePlace]);

  return <div className="globe-runtime" ref={container} role="region" aria-label={area ? "Mapa real dos arredores" : "Globo 3D do itinerário"}/>;
}
