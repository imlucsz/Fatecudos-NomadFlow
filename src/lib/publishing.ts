import type { Template } from "./destinations";
import { costs, daysBetween, normalize, type Trip } from "./planning";

export function publishTrip(trip: Trip, owner: string, title: string, description: string, prior?: Template): Template {
  const safe = normalize(title).replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,55) || "roteiro";
  const latest = trip.stops.at(-1)!;
  const quote = costs(trip);
  return {
    slug:prior?.slug ?? safe+"-"+trip.tripId.slice(0,8),
    title,description,image:trip.plan.preset === "thailand" ? "pagoda" : "hikers",
    origin:trip.stops[0].city,sequence:trip.stops.slice(1,-1).map((stop)=>stop.city),end:latest.city,
    loop:trip.plan.loop,arriveAtEnd:trip.plan.arriveAtEnd,nights:trip.stops.map((stop)=>daysBetween(stop.start,stop.end)),
    days:daysBetween(trip.plan.start,trip.plan.endDate),price:quote.pending ? null : quote.known,currency:trip.plan.currency,
    tags:[...new Set(trip.stops.map((stop)=>stop.city.country))],owner,tripId:trip.tripId,version:(prior?.version ?? 0)+1,visibility:prior?.visibility,
  };
}
