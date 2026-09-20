import {FileBlob,PresentationFile} from '@oai/artifact-tool';
const p=await PresentationFile.importPptx(await FileBlob.load('C:/Users/prakh/Downloads/SIH2026-IDEA-Presentation-Format (2).pptx'));
console.log(p.help('*',{search:'delete remove slide shape',include:['index','notes','examples'],maxChars:8000}));
console.log(p.help('*',{search:'exportPdf',include:['index','notes','examples'],maxChars:4000}));
