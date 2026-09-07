import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];

for(const [index,match] of scripts.entries()){
  const source=match[1].trim();
  if(source)new vm.Script(source,{filename:`index-inline-${index}.js`});
}

console.log('JAVASCRIPT_SYNTAX_OK');
