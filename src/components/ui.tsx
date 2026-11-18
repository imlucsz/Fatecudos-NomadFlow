"use client";

import Link from "next/link";
import { ArrowUpRight, Compass, X } from "lucide-react";
import { useEffect, useRef } from "react";

export function Brand({ footer = false }: { footer?: boolean }) {
  return <Link href="/" className={"brand" + (footer ? " brand-footer" : "")} aria-label="NomadFlow · Início">
    <span className="brand-mark" aria-hidden="true"><i/><i/><i/><i/></span><span>NomadFlow</span>
  </Link>;
}

export function Cta({href,children,className = "",onClick}: {href:string;children:React.ReactNode;className?:string;onClick?:React.MouseEventHandler<HTMLAnchorElement>}) {
  return <Link className={"button "+className} href={href} onClick={onClick}>{children}<ArrowUpRight size={17} aria-hidden="true"/></Link>;
}

export function Empty({title,description,href,label}: {title:string;description:string;href?:string;label?:string}) {
  return <div className="empty"><Compass size={26}/><h2>{title}</h2><p>{description}</p>{href && label && <Cta href={href}>{label}</Cta>}</div>;
}

export function Modal({title,children,onClose,wide=false,className=""}: {title:string;children:React.ReactNode;onClose:() => void;wide?:boolean;className?:string}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  },[]);
  return <dialog ref={ref} className={"modal"+(wide ? " modal-wide" : "")+" "+className} aria-label={title}
    onCancel={(event) => {event.preventDefault();onClose();}} onClick={(event) => {if (event.target === ref.current) onClose();}}>
    <div className="modal-inner"><div className="modal-header"><h2>{title}</h2><button className="icon-button" aria-label="Fechar" onClick={onClose}><X size={19}/></button></div>{children}</div>
  </dialog>;
}

export function Media({name,alt="",className="",eager=false}: {name:string;alt?:string;className?:string;eager?:boolean}) {
  // All artwork is locally optimized WebP and rendered in fixed-aspect boxes.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={"/images/"+name+".webp"} className={className} alt={alt} loading={eager ? "eager" : "lazy"}/>;
}
