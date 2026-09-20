from pathlib import Path
from PIL import Image
from reportlab.pdfgen import canvas
import pypdfium2 as pdfium

root=Path('C:/Users/prakh/Desktop/RailSync')
tmp=root/'tmp/sih-deck'
out=root/'output/presentations'
base='RailSync_SIH26027_National_Screening_FINAL'
pdf=out/(base+'.pdf')
c=canvas.Canvas(str(pdf),pagesize=(960,540))
for n in range(1,7):
    c.drawImage(str(tmp/f'final-{n}.png'),0,0,width=960,height=540)
    c.showPage()
c.save()
doc=pdfium.PdfDocument(str(pdf))
assert len(doc)==6
ims=[]
for n in range(6):
    im=doc[n].render(scale=1.333333).to_pil().convert('RGB')
    im.save(tmp/f'pdf-slide-{n+1}.png')
    ims.append(im.resize((640,360)))
montage=Image.new('RGB',(1280,1080),'#dbe3e8')
for i,im in enumerate(ims): montage.paste(im,((i%2)*640,(i//2)*360))
montage.save(out/(base+'_montage.png'))
print(pdf,len(doc),out/(base+'_montage.png'))
