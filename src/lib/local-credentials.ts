export type LocalPassword = {salt: number[]; hash: string};
export const passwordLength = {min:8,max:128};

async function passwordHash(value: string, salt: Uint8Array<ArrayBuffer>) {
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(value),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",iterations:600000,salt},key,256);
  return Array.from(new Uint8Array(bits),(byte)=>byte.toString(16).padStart(2,"0")).join("");
}

export async function makeLocalPassword(value: string): Promise<LocalPassword> {
  const salt=crypto.getRandomValues(new Uint8Array(16));
  return {salt:Array.from(salt),hash:await passwordHash(value,salt)};
}

export async function matchesLocalPassword(value: string, password: LocalPassword | undefined) {
  if (!password) return true;
  if (!value || value.length>passwordLength.max) return false;
  return await passwordHash(value,new Uint8Array(password.salt))===password.hash;
}
