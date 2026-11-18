export type City = { id: string; name: string; country: string; countryCode?: string; lat?: number; lon?: number; tz: string; night: number };

const entries: [string, string, string, number, number, string, number][] = [
  ["sao-paulo","São Paulo","Brasil",-23.55,-46.63,"America/Sao_Paulo",89],
  ["montevideo","Montevidéu","Uruguai",-34.9,-56.16,"America/Montevideo",88],
  ["buenos-aires","Buenos Aires","Argentina",-34.6,-58.38,"America/Argentina/Buenos_Aires",80],
  ["asuncion","Assunção","Paraguai",-25.26,-57.58,"America/Asuncion",70],
  ["santiago","Santiago","Chile",-33.45,-70.66,"America/Santiago",103],
  ["la-paz","La Paz","Bolívia",-16.49,-68.13,"America/La_Paz",65],
  ["lima","Lima","Peru",-12.05,-77.04,"America/Lima",78],
  ["quito","Quito","Equador",-0.18,-78.47,"America/Guayaquil",67],
  ["bogota","Bogotá","Colômbia",4.71,-74.07,"America/Bogota",72],
  ["caracas","Caracas","Venezuela",10.48,-66.9,"America/Caracas",90],
  ["georgetown","Georgetown","Guiana",6.8,-58.16,"America/Guyana",103],
  ["paramaribo","Paramaribo","Suriname",5.85,-55.2,"America/Paramaribo",88],
  ["lisbon","Lisboa","Portugal",38.72,-9.14,"Europe/Lisbon",150],
  ["madrid","Madri","Espanha",40.42,-3.7,"Europe/Madrid",145],
  ["rome","Roma","Itália",41.9,12.5,"Europe/Rome",158],
  ["athens","Atenas","Grécia",37.98,23.73,"Europe/Athens",126],
  ["istanbul","Istambul","Turquia",41.01,28.98,"Europe/Istanbul",102],
  ["amman","Amã","Jordânia",31.95,35.91,"Asia/Amman",96],
  ["petra","Petra","Jordânia",30.33,35.44,"Asia/Amman",101],
  ["wadi-rum","Wadi Rum","Jordânia",29.57,35.42,"Asia/Amman",98],
  ["dubai","Dubai","Emirados Árabes Unidos",25.2,55.27,"Asia/Dubai",158],
  ["delhi","Nova Délhi","Índia",28.61,77.21,"Asia/Kolkata",71],
  ["kathmandu","Catmandu","Nepal",27.72,85.32,"Asia/Kathmandu",63],
  ["hanoi","Hanói","Vietnã",21.03,105.83,"Asia/Bangkok",64],
  ["bangkok","Bangkok","Tailândia",13.75,100.5,"Asia/Bangkok",85],
  ["chiang-mai","Chiang Mai","Tailândia",18.79,98.98,"Asia/Bangkok",70],
  ["bali","Denpasar","Indonésia",-8.67,115.21,"Asia/Makassar",79],
  ["kyoto","Quioto","Japão",35.02,135.75,"Asia/Tokyo",173],
  ["new-york","Nova York","Estados Unidos",40.71,-74,"America/New_York",280],
  ["paris","Paris","França",48.86,2.35,"Europe/Paris",200],
  ["avignon","Avignon","França",43.95,4.81,"Europe/Paris",135],
  ["florence","Florença","Itália",43.77,11.25,"Europe/Rome",145],
  ["rio","Rio de Janeiro","Brasil",-22.91,-43.17,"America/Sao_Paulo",95],
  ["medellin","Medellín","Colômbia",6.25,-75.57,"America/Bogota",76],
  ["cusco","Cusco","Peru",-13.53,-71.97,"America/Lima",78],
  ["saint-georges","Caiena","Guiana Francesa",4.94,-52.33,"America/Cayenne",113],
  ["toronto","Toronto","Canadá",43.6533,-79.3839,"America/Toronto",180],
  ["montreal","Montréal","Canadá",45.5088,-73.5878,"America/Toronto",145],
  ["marrakech","Marrakech","Marrocos",31.6342,-7.9999,"Africa/Casablanca",82],
  ["casablanca","Casablanca","Marrocos",33.5883,-7.6114,"Africa/Casablanca",95],
  ["dakar","Dacar","Senegal",14.6937,-17.4441,"Africa/Dakar",105],
  ["sydney","Sydney","Austrália",-33.8678,151.2073,"Australia/Sydney",175],
  ["melbourne","Melbourne","Austrália",-37.814,144.9633,"Australia/Melbourne",150],
  ["auckland","Auckland","Nova Zelândia",-36.8485,174.7635,"Pacific/Auckland",145],
];

export const cities: City[] = entries.map(([id,name,country,lat,lon,tz,night]) => ({id,name,country,lat,lon,tz,night}));
export const city = (id: string) => cities.find((item) => item.id === id)!;
export const south = cities.slice(1, 12);
export const thailand = ["lisbon","madrid","rome","athens","istanbul","amman","dubai","delhi","kathmandu","hanoi"].map(city);
export const timeZones = [...new Set(["UTC", ...cities.map((item) => item.tz)])].sort();

export type Template = {
  slug: string; title: string; description: string; image: string;
  origin: City; sequence: City[]; end: City; loop: boolean; nights: number[];
  days: number; price: number | null; currency: "BRL" | "USD" | "EUR"; tags: string[]; arriveAtEnd?:boolean;
  version: number; owner?: string; tripId?: string; visibility?: "public" | "private";
};

export const templates: Template[] = [
  { slug:"jordan-road", title:"Pela estrada da Jordânia", description:"Das colunas antigas de Amã ao deserto de Wadi Rum.", image:"amman", origin:city("amman"), sequence:[city("petra"),city("wadi-rum")], end:city("amman"), loop:true, nights:[7,6,4,1], days:18, price:427219, currency:"USD", tags:["Amã","Wadi Rum"], version:1 },
  { slug:"mediterraneo", title:"Europa em família", description:"Dezoito noites entre cidades históricas do Mediterrâneo.", image:"rome", origin:city("avignon"), sequence:[city("florence"),city("rome")], end:city("athens"), loop:false, nights:[4,4,5,5], days:18, price:427219, currency:"USD", tags:["Provença","Toscana","Roma"], version:1 },
  { slug:"petra-a-dois", title:"Lua de mel na Jordânia", description:"Um roteiro a dois por Amã, Petra e Wadi Rum.", image:"petra", origin:city("amman"), sequence:[city("wadi-rum")], end:city("petra"), loop:false, nights:[5,6,7], days:18, price:427219, currency:"USD", tags:["Amã","Wadi Rum"], version:1 },
  { slug:"america-do-sul", title:"Volta pela América do Sul", description:"Doze países em um circuito de um ano com saída de São Paulo.", image:"hikers", origin:city("sao-paulo"), sequence:south, end:city("sao-paulo"), loop:true, nights:[], days:365, price:8800000, currency:"BRL", tags:["América do Sul","Longa duração"], version:1 },
  { slug:"ate-bangkok", title:"De São Paulo a Bangkok", description:"Uma rota de longa duração pela Europa, Oriente Médio e Ásia.", image:"pagoda", origin:city("sao-paulo"), sequence:thailand, end:city("bangkok"), loop:false, nights:[], days:730, price:null, currency:"BRL", tags:["Ásia","Longa duração"], version:1 },
  { slug:"nordeste-da-america-do-norte", title:"De Nova York a Montréal", description:"Passe por Nova York e Toronto antes de conhecer a parte francófona do Canadá.", image:"bridge", origin:city("new-york"), sequence:[city("toronto")], end:city("montreal"), loop:false, nights:[7,7,7], days:21, price:null, currency:"BRL", tags:["América do Norte","Cidades"], version:1 },
  { slug:"sudeste-asiatico", title:"Sudeste Asiático em um mês", description:"Dos templos na Tailândia às ruas de Hanói e às praias de Bali.", image:"lagoon", origin:city("bangkok"), sequence:[city("chiang-mai"),city("hanoi")], end:city("bali"), loop:false, nights:[6,7,7,10], days:30, price:null, currency:"BRL", tags:["Ásia","Praias"], version:1 },
  { slug:"marrocos-e-senegal", title:"De Marrakech a Dacar", description:"Conheça as medinas de Marrocos, passe pelo litoral de Casablanca e siga para o Senegal.", image:"hikers", origin:city("marrakech"), sequence:[city("casablanca")], end:city("dakar"), loop:false, nights:[7,5,9], days:21, price:null, currency:"BRL", tags:["África","Cultura"], version:1 },
  { slug:"australia-e-nova-zelandia", title:"Austrália e Nova Zelândia", description:"Explore Sydney e Melbourne antes de atravessar o mar da Tasmânia até Auckland.", image:"mountains", origin:city("sydney"), sequence:[city("melbourne")], end:city("auckland"), loop:false, nights:[9,9,12], days:30, price:null, currency:"BRL", tags:["Oceania","Natureza"], version:1 },
];
