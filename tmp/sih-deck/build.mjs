import fs from 'node:fs/promises';
import path from 'node:path';
import { FileBlob, Presentation, PresentationFile } from '@oai/artifact-tool';

const root = 'C:/Users/prakh/Desktop/RailSync';
const dir = path.join(root, 'tmp/sih-deck');
const source = path.join(dir, 'NMIET_SIH_2026_PPT_Template.pptx');
const out = path.join(root, 'output/presentations');
await fs.mkdir(out, {recursive:true});
let p = await PresentationFile.importPptx(await FileBlob.load(source));
const proto = p.toProto();
proto.slides = proto.slides.slice(0,6);
p = Presentation.load(proto);
const S = p.slides.items;
const C={navy:'#16365A',blue:'#286DA8',pale:'#EAF1F7',line:'#C5D6E4',ink:'#203142',muted:'#5E6D78',green:'#28774F',gp:'#E9F5EC',amber:'#A76511',ap:'#FFF2DC',red:'#A73435',rp:'#FBEAEC',white:'#FFFFFF',gray:'#F3F6F8'};
const sans='Arial';
const clearIds=['sh/7qp4be9c','sh/wn6dc7eh','sh/qx4nud0b','sh/1k3214v2','sh/sjad83id','sh/g7alsnu1','sh/vq5cve1s'];
for(const id of clearIds) p.resolve(id).text='';
for(const id of ['sh/ove9o7yd','sh/m1c3mlsn','sh/i94r6xgz','sh/ahkvi1cb','sh/pc76hkr2']) { const z=p.resolve(id); z.text='RailSync'; z.text.style={typeface:sans,fontSize:17,bold:true,color:C.navy,alignment:'center',verticalAlignment:'middle',autoFit:'shrinkText'}; }
function box(sl,x,y,w,h,fill=C.white,stroke=C.line,r=0){return sl.shapes.add({geometry:r?'roundRect':'rect',position:{left:x,top:y,width:w,height:h},fill,line:{style:'solid',fill:stroke,width:1},...(r?{borderRadius:r}:{})});}
function tx(sl,str,x,y,w,h,size=20,color=C.ink,bold=false,align='left'){
 const z=sl.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 z.text=str; z.text.style={typeface:sans,fontSize:size,color,bold,alignment:align,verticalAlignment:'middle',wrap:'square',autoFit:'shrinkText',insets:{left:2,right:2,top:2,bottom:2}}; return z;
}
function rule(sl,x,y,w,color=C.line,width=2){sl.shapes.add({geometry:'line',position:{left:x,top:y,width:w,height:0},fill:'none',line:{style:'solid',fill:color,width}})}
function pill(sl,str,x,y,w,fill,color=C.navy){box(sl,x,y,w,30,fill,fill,14);tx(sl,str,x+5,y+1,w-10,28,15,color,true,'center')}
function step(sl,n,title,sub,x,y,w,fill=C.pale){box(sl,x,y,w,106,fill,C.line,10);pill(sl,String(n),x+12,y+11,30,C.navy,C.white);tx(sl,title,x+51,y+9,w-61,38,19,C.navy,true);tx(sl,sub,x+14,y+50,w-28,48,15,C.muted);}
function arrow(sl,x,y){tx(sl,'→',x,y,30,45,30,C.blue,true,'center')}
function note(sl,text){sl.speakerNotes.textFrame.setText(text)}

// Slide 1 — retain the official masthead, SIH mark and hexagon art.
tx(S[0],'RailSync',56,212,605,68,58,C.navy,true);
tx(S[0],'AUTOMATIC BLOCK PLANNING\nWITH CONTROLLED RECOVERY',60,282,600,72,25,C.blue,true);
rule(S[0],60,366,580,C.blue,3);
tx(S[0],'SIH26027  ·  Transportation & Logistics  ·  Software',60,381,610,30,18,C.ink,true);
tx(S[0],'AI-Powered Automatic Block Planning to Maximize Asset Availability for Train Operations on Indian Railways',60,419,620,93,21,C.ink,true);
tx(S[0],'TEAM NSUT082  ·  NETAJI SUBHAS UNIVERSITY OF TECHNOLOGY (NSUT)',60,533,655,27,16,C.navy,true);
tx(S[0],'Prakhar Tyagi  ·  Somya Sharma  ·  Kunal Kumar\nPriyanshu Chauhan  ·  Gauransh  ·  Shreyaan Awasthi',60,565,650,50,15,C.muted);
note(S[0],'Source: SIH26027 problem statement and user-provided team identity. Product line is design positioning.');

// Slide 2 — full planning system first, recovery as the continuation.
tx(S[1],'One workflow from maintenance demand to a reviewable block plan',64,148,1150,42,27,C.navy,true);
const inputs=[['MAINTENANCE','requests + priority'],['TRAIN WINDOWS','occupancy + protection'],['RESOURCES','crew, machines, power'],['OPERATING RULES','sections, setup, deadlines']];
inputs.forEach((a,i)=>{let x=64+i*291;box(S[1],x,214,268,68,C.gray,C.line,8);tx(S[1],a[0],x+12,219,244,24,17,C.navy,true);tx(S[1],a[1],x+12,245,244,25,15,C.muted)});
tx(S[1],'↓',605,285,70,39,31,C.blue,true,'center');
const stages=[['PRIORITIZE','explainable scoring'],['COORDINATE','ENG / S&T / TRD'],['PLAN','feasible possessions'],['VALIDATE','complete plan'],['REVIEW','controller decision']];
stages.forEach((a,i)=>{let x=64+i*233;box(S[1],x,327,215,111,i===3?C.gp:C.pale,C.line,8);tx(S[1],a[0],x+8,340,199,31,19,i===3?C.green:C.navy,true,'center');tx(S[1],a[1],x+10,377,195,44,16,C.ink,false,'center');if(i<4)arrow(S[1],x+216,360)});
box(S[1],64,464,1150,126,C.gray,C.line,8);
tx(S[1],'WHEN EXECUTION DEVIATES',82,478,330,31,18,C.amber,true);
tx(S[1],'Execution snapshot  →  resource-linked repair  →  complete-plan revalidation',82,512,1100,36,22,C.navy,true);
tx(S[1],'Unaffected approved commitments stay fixed; scope expands only when dependencies require it.',82,552,1100,25,16,C.muted);
note(S[1],'Sources: README.md; docs/PRIORITY_ENGINE.md; docs/REOPTIMIZATION.md; optimizer/optimizer.py; optimizer/recovery.py; optimizer/recovery_validation.py. Workflow is the implemented prototype; authorized railway integration is future work.');

// Slide 3 — two loops share an independent validator.
tx(S[2],'A single constraint model; a separate complete-plan validator',64,142,1150,39,26,C.navy,true);
pill(S[2],'INITIAL PLANNING',65,195,161,C.pale,C.navy);
const top=[['Inputs','maintenance + trains'],['Priority','explainable'],['Windows','candidate slots'],['CP-SAT','plan search'],['Validator','independent'],['Controller','review']];
top.forEach((a,i)=>{let x=64+i*192;box(S[2],x,236,174,73,i===4?C.gp:C.white,C.line,8);tx(S[2],a[0],x+8,242,158,28,18,i===4?C.green:C.navy,true,'center');tx(S[2],a[1],x+7,271,160,27,14,C.muted,false,'center');if(i<5)arrow(S[2],x+172,250)});
pill(S[2],'EXECUTION RECOVERY',65,327,184,C.ap,C.amber);
const bot=[['Snapshot','completed + in progress'],['Scope','resource adjacency'],['CP-SAT','fixed complement'],['Validator','whole candidate'],['Escalation','LOCAL → EXPANDED → FULL']];
bot.forEach((a,i)=>{let x=64+i*230;box(S[2],x,367,210,77,i===3?C.gp:C.white,C.line,8);tx(S[2],a[0],x+8,374,194,27,18,i===3?C.green:C.navy,true,'center');tx(S[2],a[1],x+6,401,198,33,14,C.muted,false,'center');if(i<4)arrow(S[2],x+207,385)});
rule(S[2],64,465,1150,C.blue,2);
tx(S[2],'SYNTHETIC GOLDEN RECOVERY CASE 2',64,477,485,29,17,C.amber,true);
tx(S[2],'P_A — M_SHARED — P_B — PROTECTION_R — P_C',64,508,720,38,23,C.navy,true);
pill(S[2],'LOCAL A+B  ·  INFEASIBLE',65,560,285,C.rp,C.red);
tx(S[2],'→',360,553,60,38,29,C.blue,true,'center');
pill(S[2],'EXPANDED A+B+C  ·  VALIDATED',429,560,385,C.gp,C.green);
tx(S[2],'5/5 required work retained',841,557,365,34,18,C.green,true,'right');
tx(S[2],'Python  ·  OR-Tools CP-SAT  ·  FastAPI/Pydantic  ·  React/Vite  ·  pytest',65,614,1144,25,15,C.muted);
note(S[2],'Sources: optimizer/optimizer.py; optimizer/recovery.py; optimizer/recovery_graph.py (standard-library adjacency); optimizer/recovery_validation.py; docs/GOLDEN_RECOVERY_SUITE.md; artifacts/golden-recovery/reference-solutions; Gate 9 evidence case 2. Case 2 is SYNTHETIC_GOLDEN_RECOVERY_FIXTURE.');

// Slide 4 — implemented evidence beside real deployment work.
tx(S[3],'Prototype evidence and the path to an authorized pilot',64,144,1150,39,26,C.navy,true);
box(S[3],64,202,551,278,C.gp,'#ACD3B8',9);box(S[3],637,202,577,278,C.gray,C.line,9);
tx(S[3],'IMPLEMENTED & VERIFIED',84,218,507,38,23,C.green,true);
tx(S[3],'408 automated tests pass\n11 / 11 golden recovery tests pass\n3 / 3 fixture contracts verified',84,267,498,112,24,C.navy,true);
tx(S[3],'Independent validation · execution-aware recovery\nStale proposal rejection · same CP-SAT model for FULL and RESTRICTED',84,388,498,69,17,C.ink);
tx(S[3],'DEPLOYMENT GAPS',657,218,537,38,23,C.navy,true);
tx(S[3],'Authorized operational feeds and pilot rules\nProduction persistence and access control\nRailway domain-expert validation\nCorridor-scale benchmarking',657,270,520,166,21,C.ink);
box(S[3],64,497,1150,81,C.rp,'#E6B8BA',8);
tx(S[3],'SYNTHETIC CASE 3',80,509,265,27,17,C.red,true);
tx(S[3],'LOCAL  →  INFEASIBLE     EXPANDED  →  INFEASIBLE     FULL TERRITORY  →  INFEASIBLE',80,540,1095,26,18,C.ink,true);
tx(S[3],'No adoptable repair; required work is not silently dropped.',65,592,1149,27,18,C.red,true);
tx(S[3],'Small synthetic fixtures validate behavior; they do not establish a general runtime advantage.',65,623,1149,21,15,C.muted);
note(S[3],'Sources: artifacts/golden-recovery/test-results.txt; docs/GOLDEN_RECOVERY_SUITE.md; artifacts/golden-recovery/summary.md; Gate 9 evidence case 3; docs/DATA_PROVENANCE.md; docs/ASSUMPTIONS.md. Deployment gaps are future work. 408 passed, 0 failed, 2 dependency deprecation warnings.');

// Slide 5 — mechanism-supported impact, no fabricated percentages.
tx(S[4],'Operational value that the prototype can actually demonstrate',64,143,1150,40,26,C.navy,true);
const cols=[['PLAN BETTER','Explainable priority\nENG / S&T / TRD coordination\nHard train and resource constraints',C.pale,C.navy],['CHANGE LESS','Resource-linked scope\nPreserve unaffected approved work\nEscalate only when necessary',C.ap,C.amber],['FAIL SAFELY','Independent complete-plan validation\nNo invalid candidate adoption\nController remains in control',C.gp,C.green]];
cols.forEach((a,i)=>{let x=64+i*388;box(S[4],x,209,365,201,a[2],C.line,9);tx(S[4],a[0],x+16,223,333,34,22,a[3],true);rule(S[4],x+16,265,330,a[3],2);tx(S[4],a[1],x+18,281,330,110,18,C.ink)});
tx(S[4],'THREE DIFFERENT SYNTHETIC RECOVERY OUTCOMES',64,438,1150,32,19,C.navy,true);
const cases=[['01 · LOCAL SUCCESS','P_A/P_B repaired; nearby independent P_U unchanged.',C.gp,C.green],['02 · BOUNDED EXPANSION','LOCAL infeasible → EXPANDED validated; 5/5 work retained.',C.ap,C.amber],['03 · HONEST INFEASIBILITY','No feasible service-floor repair; no candidate adopted.',C.rp,C.red]];
cases.forEach((a,i)=>{let x=64+i*388;box(S[4],x,482,365,111,a[2],C.line,8);tx(S[4],a[0],x+13,492,336,30,17,a[3],true);tx(S[4],a[1],x+13,525,336,54,16,C.ink)});
tx(S[4],'Synthetic golden recovery fixtures  ·  408 automated tests passed across the current prototype',65,615,1149,25,15,C.muted);
note(S[4],'Sources: docs/PRIORITY_ENGINE.md; optimizer/optimizer.py; optimizer/recovery.py; optimizer/recovery_validation.py; artifacts/golden-recovery/reference-solutions; Gate 9 evidence figures case 1, 2, 3; artifacts/golden-recovery/test-results.txt. All three case outcomes are synthetic experiment evidence. No field impact metric is asserted.');

// Slide 6 — research context and implementation links.
tx(S[5],'Research grounding and inspectable implementation',64,143,1150,39,26,C.navy,true);
const refs=[
 ['PROBLEM CONTEXT','Ministry of Railways / Smart India Hackathon · SIH26027'],
 ['SCOPE RESTRICTION','Nygren, Eichenberger & Frejinger (2023) · arXiv:2305.03574'],
 ['MAINTENANCE DISRUPTION','Albrecht, Panton & Lee (2013) · DOI: 10.1016/j.cor.2010.09.001'],
 ['WINDOW RESCHEDULING','Yang et al. (2026) · DOI: 10.1016/j.trc.2026.105781'],
 ['OPTIMIZATION TOOL','Google OR-Tools · CP-SAT documentation']
];
refs.forEach((a,i)=>{let y=206+i*76;box(S[5],64,y,1150,62,i%2?C.gray:C.white,C.line,6);tx(S[5],a[0],81,y+6,320,24,16,C.blue,true);tx(S[5],a[1],397,y+6,796,49,18,C.ink)});
box(S[5],64,600,1150,48,C.pale,C.line,7);
tx(S[5],'CODE  github.com/prakhar9642/RailSync',80,606,520,34,17,C.navy,true);
tx(S[5],'PROTOTYPE  rail-sync-eosin.vercel.app',620,606,575,34,17,C.navy,true);
note(S[5],'External research sources are listed as context, not as evidence of RailSync field performance. Implementation: https://github.com/prakhar9642/RailSync; prototype: https://rail-sync-eosin.vercel.app.');

const candidate=path.join(dir,'candidate.pptx');
await (await PresentationFile.exportPptx(p)).save(candidate);
for(let i=0;i<6;i++){
 const blob=await S[i].export({format:'png',scale:1});
 await fs.writeFile(path.join(dir,`draft-${i+1}.png`),new Uint8Array(await blob.arrayBuffer()));
}
console.log(candidate);
