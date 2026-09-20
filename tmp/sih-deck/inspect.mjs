import fs from 'node:fs/promises';
import {FileBlob, PresentationFile} from '@oai/artifact-tool';
const p=await PresentationFile.importPptx(await FileBlob.load('C:/Users/prakh/Downloads/SIH2026-IDEA-Presentation-Format (2).pptx'));
await fs.writeFile('template-inspect.txt',(await p.inspect({kind:'slide,textbox,shape,image',maxChars:60000})).ndjson);
await fs.writeFile('template-proto.json',JSON.stringify(p.toProto(),null,2));
for(let i=0;i<p.slides.items.length;i++) {
 const s=p.slides.items[i];
 await fs.writeFile(`template-${i+1}.png`,new Uint8Array(await (await s.export({format:'png',scale:1})).arrayBuffer()));
}
console.log('rendered',p.slides.items.length);
