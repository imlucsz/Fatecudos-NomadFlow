"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Box = {x:number;y:number;width:number;height:number};
type View = {id:string;box?:Box;width:number;height:number;cardHeight:number};
const margin=12;
const gap=18;
const cardMaxWidth=448;
const focusSelector="a[href],button,input,select,textarea,[tabindex]";

const clamp=(value:number,min:number,max:number)=>Math.min(Math.max(value,min),Math.max(min,max));

function visible(element:HTMLElement) {
  return element.getClientRects().length>0 && getComputedStyle(element).visibility==="visible" && !element.matches(":disabled");
}

function readBox(element:HTMLElement,width:number,height:number):Box|undefined {
  const rect=element.getBoundingClientRect();
  let left=Math.max(0,rect.left-6),top=Math.max(0,rect.top-6);
  let right=Math.min(width,rect.right+6),bottom=Math.min(height,rect.bottom+6);
  for (let parent=element.parentElement;parent && parent!==document.body;parent=parent.parentElement) {
    const style=getComputedStyle(parent);
    const clipsX=style.overflowX!=="visible",clipsY=style.overflowY!=="visible";
    if (!clipsX && !clipsY) continue;
    const bounds=parent.getBoundingClientRect();
    if (clipsX) {left=Math.max(left,bounds.left);right=Math.min(right,bounds.right);}
    if (clipsY) {top=Math.max(top,bounds.top);bottom=Math.min(bottom,bounds.bottom);}
  }
  if (right<=left || bottom<=top) return undefined;
  const x=Math.round(left),y=Math.round(top);
  return {x,y,width:Math.round(right)-x,height:Math.round(bottom)-y};
}

function placeCard({box,width,height,cardHeight}:View) {
  const cardWidth=Math.min(cardMaxWidth,width-2*margin);
  const viewportSpace=height-2*margin;
  const centered={x:(width-cardWidth)/2,y:Math.max(margin,(height-cardHeight)/2),side:"center",arrow:0,maxHeight:viewportSpace};
  if (!box) return centered;
  const cx=box.x+box.width/2,cy=box.y+box.height/2;
  const space={right:width-box.x-box.width,left:box.x,below:height-box.y-box.height,above:box.y};
  const y=clamp(cy-cardHeight/2,margin,height-cardHeight-margin);
  const x=clamp(cx-cardWidth/2,margin,width-cardWidth-margin);
  const side={y,arrow:clamp(cy-y,20,Math.min(cardHeight,viewportSpace)-20),maxHeight:viewportSpace};
  if (space.right>=cardWidth+gap+margin) return {...side,x:box.x+box.width+gap,side:"right"};
  if (space.left>=cardWidth+gap+margin) return {...side,x:box.x-cardWidth-gap,side:"left"};
  const below=space.below>=cardHeight+gap+margin || space.below>=space.above;
  const available=below ? space.below : space.above;
  const distance=available>=cardHeight+gap+margin ? gap : 9;
  const maxHeight=Math.max(0,available-distance-margin);
  if (maxHeight<40) return centered;
  return {x,y:below ? box.y+box.height+distance : box.y-distance-Math.min(cardHeight,maxHeight),
    side:below ? "below" : "above",arrow:clamp(cx-x,20,cardWidth-20),maxHeight};
}

function roundedHole({x,y,width,height}:Box) {
  const radius=Math.min(10,width/2,height/2);
  const right=x+width,bottom=y+height;
  return `M${x+radius} ${y}H${right-radius}Q${right} ${y} ${right} ${y+radius}V${bottom-radius}Q${right} ${bottom} ${right-radius} ${bottom}H${x+radius}Q${x} ${bottom} ${x} ${bottom-radius}V${y+radius}Q${x} ${y} ${x+radius} ${y}Z`;
}

export function TutorialSpotlight({targets,onClose,children,labelledBy}: {
  targets:string;onClose:()=>void;children:(target:string)=>React.ReactNode;labelledBy:string;
}) {
  const [view,setView]=useState<View>();
  const card=useRef<HTMLElement>(null);
  const selected=useRef<HTMLElement>(null);
  const close=useRef(onClose);
  useEffect(()=>{close.current=onClose;},[onClose]);

  useEffect(()=>{
    const app=document.querySelector(".app-shell") ?? document.body;
    const ids=targets.split(" ").filter(Boolean);
    let frame=0;
    let currentCard:HTMLElement|null=null;
    const resize=new ResizeObserver(schedule);
    const mutations=new MutationObserver(schedule);

    function schedule() {
      if (!frame) frame=requestAnimationFrame(measure);
    }

    function measure() {
      frame=0;
      const width=document.documentElement.clientWidth,height=window.innerHeight;
      const match=ids.flatMap((id)=>Array.from(app.querySelectorAll<HTMLElement>(`[data-tutorial-target="${id}"]`)))
        .find(visible) ?? null;
      if (match!==selected.current) {
        if (selected.current) resize.unobserve(selected.current);
        selected.current=match;
        if (match) {
          resize.observe(match);
          const anchor=match.querySelector<HTMLElement>("[data-tutorial-focus]") ?? match;
          const {top,bottom}=anchor.getBoundingClientRect();
          if (top<margin || bottom>height-margin || top<height && bottom>height*.72) {
            anchor.scrollIntoView({block:"center",inline:"nearest",behavior:"instant"});
          }
        }
      }
      if (currentCard!==card.current) {
        if (currentCard) resize.unobserve(currentCard);
        currentCard=card.current;
        if (currentCard) {
          resize.observe(currentCard);
          mutations.observe(currentCard,{subtree:true,childList:true,characterData:true});
        }
      }
      const box=match ? readBox(match,width,height) : undefined;
      const content=currentCard?.querySelector<HTMLElement>(".tutorial-body");
      const clipped=content ? Math.max(0,content.scrollHeight-content.clientHeight) : 0;
      const next={id:match?.dataset.tutorialTarget ?? "",box,width,height,cardHeight:(currentCard?.offsetHeight ?? 205)+clipped};
      setView((previous)=>previous && previous.id===next.id && previous.width===width && previous.height===height && previous.cardHeight===next.cardHeight &&
        previous.box?.x===box?.x && previous.box?.y===box?.y && previous.box?.width===box?.width && previous.box?.height===box?.height ? previous : next);
      if (!currentCard) schedule();
    }

    function keyboard(event:KeyboardEvent) {
      if (event.key==="Escape") {
        if (event.defaultPrevented) return;
        event.preventDefault();
        event.stopPropagation();
        close.current();
        selected.current?.focus({preventScroll:true});
        return;
      }
      if (event.key!=="Tab") return;
      const target=selected.current;
      const items=[...(target?.matches(focusSelector) ? [target] : []),...Array.from(target?.querySelectorAll<HTMLElement>(focusSelector) ?? []),
        ...Array.from(card.current?.querySelectorAll<HTMLElement>(focusSelector) ?? [])].filter((element)=>element.tabIndex>=0 && visible(element));
      if (!items.length) return;
      const index=items.findIndex((element)=>element===document.activeElement);
      const next=index<0 ? event.shiftKey ? items.length-1 : 0 : (index+(event.shiftKey ? -1 : 1)+items.length)%items.length;
      event.preventDefault();
      items[next].focus();
    }

    schedule();
    mutations.observe(app,{subtree:true,childList:true,attributes:true,attributeFilter:["data-open","data-tutorial-target","hidden","disabled"]});
    window.addEventListener("scroll",schedule,true);
    window.addEventListener("resize",schedule);
    document.addEventListener("keydown",keyboard,true);
    return ()=>{
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutations.disconnect();
      selected.current=null;
      window.removeEventListener("scroll",schedule,true);
      window.removeEventListener("resize",schedule);
      document.removeEventListener("keydown",keyboard,true);
    };
  },[targets]);

  const shown=!!view;
  useEffect(()=>{if (shown) card.current?.focus({preventScroll:true});},[shown]);

  if (!view) return null;
  const {box,width,height}=view;
  const placement=placeCard(view);
  return createPortal(<div className="tutorial-spotlight" data-target={view.id}>
    <svg className="tutorial-curtain" width={width} height={height} aria-hidden="true">
      <path className="tutorial-shadow" fillRule="evenodd" d={`M0 0H${width}V${height}H0Z${box ? roundedHole(box) : ""}`}/>
      {box && <rect className="tutorial-ring" {...box} rx={10}/>}
    </svg>
    <section ref={card} className="tutorial-card tutorial-balloon" aria-labelledby={labelledBy} tabIndex={-1} data-placement={placement.side}
      style={{left:placement.x,top:placement.y,maxHeight:placement.maxHeight,"--tutorial-arrow":placement.arrow+"px"} as React.CSSProperties}>
      {children(view.id)}
    </section>
  </div>,document.body);
}
