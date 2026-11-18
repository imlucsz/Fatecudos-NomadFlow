import { MapPin } from "lucide-react";

export function ProfileAvatar({name,photo}: {name:string;photo?:string}) {
  const initials=name.trim().split(/\s+/).filter(Boolean).slice(0,2).map((part)=>Array.from(part)[0]).join("").toLocaleUpperCase("pt-BR");
  return <span className="profile-avatar" aria-hidden="true">
    {/* Fotos de perfil são recortadas e reduzidas no dispositivo. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {photo ? <img src={photo} alt=""/> : initials || <MapPin size={16}/>}
  </span>;
}
