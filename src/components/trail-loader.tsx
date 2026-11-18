import { geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import world from "world-atlas/countries-110m.json";
import type { GeometryCollection, Topology } from "topojson-specification";

const topology = world as unknown as Topology<{countries:GeometryCollection}>;
const projection = geoOrthographic().scale(82).translate([96,96]).rotate([-13,-22]);
const path = geoPath(projection);
const land = path(feature(topology,topology.objects.countries)) ?? "";
const grid = path(geoGraticule10()) ?? "";

export function TrailLoader() {
  return <div className="trail-loader" role="status" aria-live="polite">
    <div className="trail-loader-scene" aria-hidden="true">
      <div className="trail-loader-orbit"><i/></div>
      <svg viewBox="0 0 192 192" className="trail-loader-earth">
        <circle cx="96" cy="96" r="82" className="trail-loader-sea"/>
        <path d={land} className="trail-loader-land"/>
        <path d={grid} className="trail-loader-grid"/>
      </svg>
    </div>
    <strong>Carregando mapa 3D</strong>
    <span>Preparando o globo e conectando as paradas.</span>
  </div>;
}