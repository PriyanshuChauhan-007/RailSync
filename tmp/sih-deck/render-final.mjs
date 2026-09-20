import fs from 'node:fs/promises';
import path from 'node:path';
import {FileBlob,PresentationFile} from '@oai/artifact-tool';
const root='C:/Users/prakh/Desktop/RailSync';
const f=path.join(root,'output/presentations/RailSync_SIH26027_National_Screening_FINAL.pptx');
const p=await PresentationFile.importPptx(await FileBlob.load(f));
if(p.slides.items.length!==6) throw new Error('expected six slides');
for(let i=0;i<6;i++){
 const im=await p.slides.items[i].export({format:'png',scale:2});
 await fs.writeFile(path.join(root,`tmp/sih-deck/final-${i+1}.png`),new Uint8Array(await im.arrayBuffer()));
}
console.log('rendered',p.slides.items.length);
