const name = "nomadflow";
const store = "workspace";
const snapshot = "state";
let opening:Promise<IDBDatabase>|undefined;

function database() {
  if (!opening) opening=new Promise<IDBDatabase>((resolve,reject)=>{
    const request=indexedDB.open(name,1);
    let blocked=false;
    request.onupgradeneeded=()=>request.result.createObjectStore(store);
    request.onsuccess=()=>{
      const connection=request.result;
      if (blocked) {connection.close();return;}
      connection.onversionchange=()=>{
        connection.close();
        opening=undefined;
      };
      connection.onclose=()=>{opening=undefined;};
      resolve(connection);
    };
    request.onerror=()=>reject(request.error);
    request.onblocked=()=>{
      blocked=true;
      reject(new Error("Banco local bloqueado por outra aba."));
    };
  }).catch((error:unknown)=>{
    opening=undefined;
    throw error;
  });
  return opening;
}

export async function readWorkspace<T>() {
  const db=await database();
  return new Promise<T|undefined>((resolve,reject)=>{
    const request=db.transaction(store).objectStore(store).get(snapshot);
    request.onsuccess=()=>resolve(request.result as T|undefined);
    request.onerror=()=>reject(request.error);
  });
}

export async function writeWorkspace(value:unknown) {
  const db=await database();
  return new Promise<void>((resolve,reject)=>{
    const transaction=db.transaction(store,"readwrite");
    transaction.oncomplete=()=>resolve();
    transaction.onerror=()=>reject(transaction.error);
    transaction.onabort=()=>reject(transaction.error);
    transaction.objectStore(store).put(value,snapshot);
  });
}
