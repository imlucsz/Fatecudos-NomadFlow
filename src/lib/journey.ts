import type { Stop, Trip } from "./planning";

export type StopStatus = "visited" | "current" | "upcoming";

export const stopStatusLabels: Record<StopStatus,string> = {
  visited:"Concluída",
  current:"Parada atual",
  upcoming:"A visitar",
};

export function statusOf(stop: Stop, currentId?: string | null): StopStatus {
  if (stop.done) return "visited";
  return stop.id === currentId ? "current" : "upcoming";
}

export function journeySummary(trip: Trip) {
  const current = trip.stops.find((stop)=>statusOf(stop,trip.journey?.currentStopId)==="current");
  const visited = trip.stops.filter((stop)=>stop.done);
  const upcoming = trip.stops.filter((stop)=>statusOf(stop,trip.journey?.currentStopId)==="upcoming");
  return {current,visited,upcoming,remaining:trip.stops.length-visited.length};
}

export function beginJourney(trip: Trip, stopId = trip.stops.find((stop)=>!stop.done)?.id, now = new Date()) {
  if (!stopId || trip.journey?.currentStopId === stopId || !trip.stops.some((stop)=>stop.id===stopId && !stop.done)) return trip;
  return {
    ...trip,revision:trip.revision+1,
    journey:{startedAt:trip.journey?.startedAt ?? now.toISOString(),currentStopId:stopId},
  };
}

export function toggleStopCompleted(trip: Trip, stopId: string): Trip {
  const index = trip.stops.findIndex((stop)=>stop.id===stopId);
  if (index<0) return trip;
  const stops = trip.stops.map((stop,i)=>i===index ? {...stop,done:!stop.done} : stop);
  let journey = trip.journey;
  if (journey?.currentStopId===stopId) {
    const next = stops.slice(index+1).find((stop)=>!stop.done) ?? stops.find((stop)=>!stop.done);
    journey = {...journey,currentStopId:next?.id ?? null};
  } else if (journey && !journey.currentStopId && !stops[index].done) {
    journey = {...journey,currentStopId:stopId};
  }
  return {...trip,revision:trip.revision+1,stops,journey};
}