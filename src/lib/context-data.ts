import { address, contextCities, distance, type Address, type Stop } from "./planning";

export const categories = ["Trabalho","Passeios","Freelas","Trocas"] as const;
export type Category = (typeof categories)[number];
type Result = {id:string;category:Category;name:string;kind:string;description:string;url:string;point?:Address;distance?:number};

export function stopContext(stop: Stop, radius: number, category: Category) {
  const city = stop.city;
  const origin = address(city), center = stop.stay.position ?? origin;
  const context: Result[] = [];
  const cityQuery = encodeURIComponent(city.name+" "+city.country);
  if (origin && contextCities.has(city.id)) {
    const point = (lat:number,lon:number) => ({lat:origin.lat+lat,lon:origin.lon+lon});
    context.push(
      {id:"cafe",category:"Trabalho",name:"Café do Bairro",kind:"Café · 08h–18h",description:"Wi-Fi anunciado pelo local na demonstração. Velocidade e data de medição indisponíveis.",url:"https://www.google.com/maps/search/?api=1&query=cafe+wifi+"+cityQuery,point:point(.008,-.007)},
      {id:"cowork",category:"Trabalho",name:"Estação Cowork",kind:"Coworking · 09h–19h",description:"Internet e tomadas anunciadas pelo local na demonstração. Consulte preço e regras com o espaço.",url:"https://www.google.com/maps/search/?api=1&query=coworking+"+cityQuery,point:point(-.028,.026)},
      {id:"walk",category:"Passeios",name:"Caminhada pelo centro",kind:"Cultura · 2 horas",description:"Roteiro a pé de exemplo. Visita sugerida durante o dia, com custo a consultar.",url:"https://www.google.com/maps/search/?api=1&query=centro+historico+"+cityQuery,point:point(.017,.017)},
      {id:"garden",category:"Passeios",name:"Parque urbano",kind:"Ao ar livre · 1–2 horas",description:"Passeio de demonstração para uma pausa no roteiro.",url:"https://www.google.com/maps/search/?api=1&query=parque+"+cityQuery,point:point(-.039,-.033)},
      {id:"photo",category:"Freelas",name:"Fotografia para comércios",kind:"Presencial · Região aproximada",description:"Exemplo de projeto local. Requer portfólio e edição de fotos. Remuneração e datas a combinar.",url:"https://www.workana.com/jobs",point:point(.013,-.023)},
      {id:"house",category:"Trocas",name:"Cuidar de uma casa",kind:"House sitting · Região aproximada",description:"Exemplo com estadia de 1 a 2 semanas e cuidados diários. Datas flexíveis e taxas a verificar.",url:"https://www.trustedhousesitters.com/house-and-pet-sitting-assignments/",point:point(.035,.015)},
      {id:"volunteer",category:"Trocas",name:"Apoio a um hostel",kind:"Voluntariado · Região aproximada",description:"Exemplo de recepção e atividades culturais. Estadia, horas e taxas dependem do anfitrião.",url:"https://www.worldpackers.com/pt-BR/search",point:point(-.024,-.03)},
      {id:"pet",category:"Trocas",name:"Cuidar de pets",kind:"Pet sitting · Região aproximada",description:"Exemplo de estadia em troca de alimentação e passeios dos animais. Taxas e datas a consultar.",url:"https://www.trustedhousesitters.com/house-and-pet-sitting-assignments/",point:point(.06,-.011)},
    );
  }
  context.push({id:"remote",category:"Freelas",name:"Edição de conteúdo",kind:"Remoto · Sem posição no mapa",description:"Exemplo de projeto para revisão e edição em português. Remuneração não divulgada.",url:"https://www.workana.com/jobs"});
  return {center,results:context.filter((item)=>item.category===category).map((item)=>({
    ...item,distance:item.point && center ? distance(center,item.point) : undefined,
  })).filter((item)=>item.distance===undefined || item.distance<=radius).sort((a,b)=>(a.distance ?? Infinity)-(b.distance ?? Infinity))};
}