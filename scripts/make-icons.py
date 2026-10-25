from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1] / 'public'
root.mkdir(exist_ok=True)
points = [(92,30),(109,48),(133,34),(136,59),(165,56),(155,82),(178,99),(156,115),(168,143),(139,141),(131,168),(107,152),(86,169),(75,143),(47,150),(51,122),(25,111),(46,90),(33,67),(61,66),(66,39)]
for name, size, scale in [('icon-192.png',192,.9),('icon-512.png',512,.9),('icon-maskable.png',512,.72),('apple-touch-icon.png',180,.82)]:
    supersample = 3
    image = Image.new('RGB',(size*supersample,size*supersample),'#1839d5')
    draw = ImageDraw.Draw(image)
    unit = size*supersample/200*scale
    offset = size*supersample*(1-scale)/2
    def xy(x,y): return (offset+x*unit,offset+y*unit)
    draw.polygon([xy(x,y) for x,y in points],fill='#eb6b36')
    draw.ellipse([xy(78,59),xy(128,123)], fill='#f2efe4',outline='#142168',width=max(1,int(3*unit)))
    draw.ellipse([xy(97,81),xy(117,115)],fill='#142168')
    draw.ellipse([xy(108,86),xy(114,96)],fill='#f2efe4')
    draw.arc([xy(94,120),xy(117,136)],0,140,fill='#142168',width=max(1,int(3*unit)))
    image.resize((size,size),Image.Resampling.LANCZOS).save(root/name)

(root/'icon.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" rx="32" fill="#1839d5"/><path d="m92 30 17 18 24-14 3 25 29-3-10 26 23 17-22 16 12 28-29-2-8 27-24-16-21 17-11-26-28 7 4-28-26-11 21-21-13-23 28-1 5-27Z" fill="#eb6b36"/><ellipse cx="102" cy="91" rx="25" ry="32" fill="#f2efe4" stroke="#142168" stroke-width="3"/><ellipse cx="106" cy="98" rx="10" ry="17" fill="#142168"/><ellipse cx="110" cy="91" rx="3" ry="5" fill="#f2efe4"/><path d="M95 131q10 8 20-2" fill="none" stroke="#142168" stroke-width="3" stroke-linecap="round"/></svg>''',encoding='utf-8')
