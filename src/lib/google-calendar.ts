import { addDays, localInstant, type QueueItem } from "./planning";

export const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID?.trim();
export const calendarScope = "https://www.googleapis.com/auth/calendar.events.owned";
export const googleCalendarHome = "https://calendar.google.com/calendar/";
const resource = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

type EventDate = {date?:string;dateTime?:string;timeZone?:string};
export type GoogleEvent = {
  id:string; summary?:string; start:EventDate; end:EventDate; status?:string; htmlLink?:string;
  location?:string; organizer?:{self?:boolean}; eventType?:string; locked?:boolean; etag?:string;
  extendedProperties?:{private?:Record<string,string>};
};
export type GoogleEventDraft = {
  title:string; location:string; startDay:string; endDay:string; startTime:string; endTime:string; zone:string; allDay:boolean;
};

export class CalendarApiError extends Error {
  constructor(public readonly status:number) {
    super("Google Calendar: "+status);
  }
}

async function request(token:string,path="",method="GET",body?:unknown,signal?:AbortSignal,etag?:string) {
  const headers=new Headers({Authorization:"Bearer "+token});
  if (body!==undefined) headers.set("Content-Type","application/json");
  if (etag) headers.set("If-Match",etag);
  const timeout=AbortSignal.timeout(15000);
  return fetch(resource+path,{method,headers,body:body===undefined ? undefined : JSON.stringify(body),
    signal:signal ? AbortSignal.any([signal,timeout]) : timeout,cache:"no-store"});
}

async function result<T>(response:Response):Promise<T> {
  if (!response.ok) throw new CalendarApiError(response.status);
  return response.json();
}

export function calendarLink(value?:string) {
  if (typeof value==="string" && /^https:\/\/(?:www\.google\.com\/calendar\/|calendar\.google\.com\/calendar\/)/.test(value)) return value;
  return undefined;
}

export function canEditGoogleEvent(event:GoogleEvent) {
  return !event.locked && (!event.eventType || event.eventType==="default") && event.organizer?.self!==false;
}

export async function getGoogleEvents(token:string,start:string,end:string,zone:string,signal:AbortSignal) {
  const query=new URLSearchParams({
    timeMin:localInstant(start,0,zone).toISOString(),timeMax:localInstant(end,0,zone).toISOString(),
    timeZone:zone,singleEvents:"true",orderBy:"startTime",maxResults:"250",
  });
  const events:GoogleEvent[]=[];
  let pageToken:string|undefined;
  do {
    if (pageToken) query.set("pageToken",pageToken);
    const page:{items?:GoogleEvent[];nextPageToken?:string}=await result(await request(token,"?"+query,"GET",undefined,signal));
    events.push(...(page.items ?? []).filter((event)=>event.start && event.end && event.status!=="cancelled"));
    pageToken=page.nextPageToken;
  } while (pageToken);
  return events;
}

function timed(instant:Date,timeZone:string) {return {dateTime:instant.toISOString(),timeZone};}

function dateForPatch(date:EventDate) {
  // A change between all-day and timed events must clear the previous representation.
  return {date:date.date ?? null,dateTime:date.dateTime ?? null,timeZone:date.timeZone ?? null};
}

export async function saveGoogleEvent(token:string,draft:GoogleEventDraft,existing?:GoogleEvent,signal?:AbortSignal) {
  const {title,location,startDay,endDay,startTime,endTime,allDay,zone}=draft;
  const start=allDay ? {date:startDay} : timed(localInstant(startDay,startTime,zone),zone);
  const end=allDay ? {date:addDays(endDay,1)} : timed(localInstant(endDay,endTime,zone),zone);
  const event={summary:title,location,start,end};
  if (!existing) return result<GoogleEvent>(await request(token,"","POST",event,signal));
  return result<GoogleEvent>(await request(token,"/"+encodeURIComponent(existing.id),"PATCH",
    {...event,start:dateForPatch(start),end:dateForPatch(end)},signal,existing.etag));
}

function bookingEvent(item:QueueItem) {
  const stay=item.kind==="Hospedagem";
  const instant=item.time ? localInstant(item.day,item.time,item.zone) : undefined;
  return {
    summary:(stay ? "Check-in · " : "Partida · ")+item.name,
    description:[item.kind+" · NomadFlow","Fuso local: "+item.zone+".",
      item.time ? "" : stay ? "Horário a confirmar com a hospedagem." : "Confira o horário de embarque no bilhete.",
      stay && item.until ? "Check-out previsto: "+item.until+"." : ""].filter(Boolean).join("\n"),
    ...(stay ? {location:item.name} : {}),
    start:instant ? timed(instant,item.zone) : {date:item.day},
    end:instant ? timed(new Date(+instant+30*60_000),item.zone) : {date:addDays(item.day,1)},
  };
}

export function googleCalendarDraft(item:QueueItem) {
  const event=bookingEvent(item);
  const compact=(value:string)=>value.replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");
  const point=(date:EventDate)=>compact(date.dateTime ?? date.date ?? "");
  const query=new URLSearchParams({action:"TEMPLATE",text:event.summary,dates:point(event.start)+"/"+point(event.end),details:event.description});
  if (event.location) query.set("location",event.location);
  if (item.time) query.set("ctz",item.zone);
  return googleCalendarHome+"render?"+query;
}

async function hash(fields:unknown[]) {
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(fields)));
  return Array.from(new Uint8Array(bytes),(byte)=>byte.toString(16).padStart(2,"0")).join("");
}

export async function sendGoogleBooking(token:string,tripId:string,item:QueueItem,signal:AbortSignal) {
  const id="nf"+await hash([tripId,item.id]);
  const fingerprint=await hash([item.signature,item.zone,item.time ?? null]);
  const event={
    ...bookingEvent(item),
    extendedProperties:{private:{nomadflowTrip:tripId,nomadflowItem:item.id,nomadflowSchedule:fingerprint}},
    reminders:{useDefault:false,overrides:[{method:"popup",minutes:item.kind==="Hospedagem" ? 24*60 : 7*24*60}]},
  };
  const created=await request(token,"","POST",{id,...event},signal);
  if (created.status!==409) return result<GoogleEvent>(created);
  const previous=await result<GoogleEvent>(await request(token,"/"+id,"GET",undefined,signal));
  const metadata=previous.extendedProperties?.private;
  // Keep edits made in Google until the traveler changes the schedule in NomadFlow.
  const unchanged=metadata?.nomadflowSchedule===fingerprint ||
    (!metadata?.nomadflowSchedule && !item.time && metadata?.nomadflowDeparture===item.day);
  if (unchanged && previous.status!=="cancelled") return previous;
  return result<GoogleEvent>(await request(token,"/"+id,"PATCH",
    {...event,start:dateForPatch(event.start),end:dateForPatch(event.end),status:"confirmed"},signal,previous.etag));
}
