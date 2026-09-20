import path from 'node:path';
import {pathToFileURL} from 'node:url';
const skill='C:/Users/prakh/.codex/plugins/cache/openai-primary-runtime/presentations/26.904.11930/skills/presentations';
const root='C:/Users/prakh/Desktop/RailSync';
const staging=path.join(root,'tmp/sih-deck');
const final=path.join(root,'output/presentations/RailSync_SIH26027_National_Screening_FINAL.pptx');
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
const result=await finalizePresentation({
  explicitTotalSlideCount:6,
  requiredNativeTableOwnerSlides:[],
  requiredNativeChartOwnerSlides:[],
  workspaceDir:root,
  candidatePath:path.join(staging,'candidate.pptx'),
  finalPath:final,
  pythonExecutable:'C:/Users/prakh/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',
  integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),
  layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),
  layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit'],
  fontPolicy:{basis:'design',families:['Arial','Times New Roman','Garamond','Calibri','TradeGothic']},
  verifyArtifactToolImport:true,
  receiptPath:path.join(staging,'final-validation.json')
});
console.log(JSON.stringify(result));
