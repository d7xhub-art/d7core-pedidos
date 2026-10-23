(()=>{
  const tables=['clientes','produtos','representadas','pedidos','orcamentos','followups','prospectos'];
  const idOf=x=>String(x?.id??x?.num??'');
  function read(key,fallback=[]){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
  function deleted(table){return new Set(read('d7_deleted_'+table).map(String));}
  function remember(table,ids){const all=deleted(table);for(const id of ids)all.add(String(id));localStorage.setItem('d7_deleted_'+table,JSON.stringify([...all]));return all;}
  function get(table){const rows=read('d7_'+table);if(!Array.isArray(rows))return rows;const ids=remember(table,rows.filter(x=>x._deleted).map(idOf));return rows.filter(x=>!x._deleted&&!ids.has(idOf(x)));}
  function set(table,rows){if(Array.isArray(rows)){const ids=remember(table,rows.filter(x=>x._deleted).map(idOf));rows=rows.filter(x=>!x._deleted&&!ids.has(idOf(x)));}localStorage.setItem('d7_'+table,JSON.stringify(rows));return rows;}
  function backup(){const result={versao:'3.7',app:'D7 PEDIDOS',exportadoEm:new Date().toISOString(),deleted:{}};for(const table of tables){result[table]=get(table);result.deleted[table]=[...deleted(table)];}return result;}
  function importBackup(data){
    if(!data||typeof data!=='object')throw Error('Backup inválido');
    const validated=[];
    for(const table of tables){
      let rows=data[table]??data['d7_'+table]??[];
      if(typeof rows==='string')rows=JSON.parse(rows);
      if(!Array.isArray(rows))throw Error('Tabela inválida: '+table);
      let ids=data.deleted?.[table]??data['d7_deleted_'+table]??[];
      if(typeof ids==='string')ids=JSON.parse(ids);
      if(!Array.isArray(ids))throw Error('Exclusões inválidas: '+table);
      if(rows.some(row=>!row||typeof row!=='object'||!idOf(row)))throw Error('Registro inválido: '+table);
      if(ids.some(id=>!['string','number'].includes(typeof id)))throw Error('Identificador de exclusão inválido: '+table);
      validated.push({table,rows,ids});
    }
    let count=0;
    for(const {table,rows,ids} of validated){
      remember(table,ids);
      const merged=new Map(get(table).map(row=>[idOf(row),row]));
      for(const row of rows){if(!row||!idOf(row))continue;const id=idOf(row);merged.set(id,{...merged.get(id),...row});count++;}
      set(table,[...merged.values()]);
    }
    return count;
  }
  window.D7Data={tables,get,set,deleted,remember,backup,importBackup};
})();
