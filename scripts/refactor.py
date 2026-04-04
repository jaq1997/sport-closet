import os
import re

html_files = ["index.html", "bape.html", "nike.html", "adidas.html", "supreme.html", "carhartt.html"]

def read_file(filepath):
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return f.read()
    except UnicodeDecodeError:
        with open(filepath, "r", encoding="utf-16") as f:
            return f.read()

def save_file(filepath, content):
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

def get_block(content, start_str, end_str):
    start = content.find(start_str)
    if start == -1: return ""
    end = content.find(end_str, start)
    if end == -1: return ""
    return content[start:end]

# 1. Obter o `index.html` Original
idx_content = read_file("index.html")

# 2. Fazer o SWAP dos Banners (BAPE <-> MIRAGE Intercalado A) no index.html
bape_slide = """    <div class="slide" onclick="window.location='bape.html'">
      <picture>
        <source media="(max-width: 768px)"
          srcset="https://pub-9eb15062e53d4ad1a85362ac330e3002.r2.dev/banner-hero-3-mobile.png">
        <img src="https://pub-9eb15062e53d4ad1a85362ac330e3002.r2.dev/banner-hero-3.png" alt="Bape" loading="lazy">
      </picture>
      <div class="slide-content">
        <div class="slide-subtitle">STREETWEAR ICON</div>
        <div class="slide-title">A BATHING<br>APE</div>
        <button class="slide-btn">DISCOVER</button>
      </div>
    </div>"""

mirage_hero_slide = """    <div class="slide">
      <picture>
        <source media="(max-width: 768px)"
          srcset="https://pub-9eb15062e53d4ad1a85362ac330e3002.r2.dev/banner%20mirage%20mobile.png">
        <img src="https://pub-9eb15062e53d4ad1a85362ac330e3002.r2.dev/banner%20mirage.png" alt="Mirage" loading="lazy" style="width:100%; height:100%; object-fit:cover;">
      </picture>
      <div class="slide-content" style="pointer-events:none;">
      </div>
    </div>"""

mirage_intercalado = """  <!-- 3. Banner Intercalado A (ADIDAS) -->
  <div class="promo-banner">
    <picture>
      <source media="(max-width: 768px)"
        srcset="https://pub-9eb15062e53d4ad1a85362ac330e3002.r2.dev/banner%20mirage%20mobile.png">
      <img src="https://pub-9eb15062e53d4ad1a85362ac330e3002.r2.dev/banner%20mirage.png" alt="Promo Mirage 1"
        style="width:100%;">
    </picture>
  </div>"""

bape_intercalado = """  <!-- 3. Banner Intercalado A (BAPE) -->
  <div class="promo-banner" onclick="window.location='bape.html'" style="cursor:pointer;">
    <picture>
      <source media="(max-width: 768px)"
        srcset="https://pub-9eb15062e53d4ad1a85362ac330e3002.r2.dev/banner-hero-3-mobile.png">
      <img src="https://pub-9eb15062e53d4ad1a85362ac330e3002.r2.dev/banner-hero-3.png" alt="Promo Bape"
        style="width:100%;">
    </picture>
  </div>"""

# Troca o Slide
if bape_slide in idx_content:
    idx_content = idx_content.replace(bape_slide, mirage_hero_slide)
else:
    print("WARNING: BAPE slide not found literally, trying regex...")
    # if formatting changed slightly, just find the bounds of Bape slide
    m = re.search(r'<div class="slide"[^>]*onclick="window.location=\'bape\.html\'".*?</picture>.*?</div>.*?</div>', idx_content, flags=re.DOTALL)
    if m:
        idx_content = idx_content[:m.start()] + mirage_hero_slide + idx_content[m.end():]

# Troca o Intercalado
if mirage_intercalado in idx_content:
    idx_content = idx_content.replace(mirage_intercalado, bape_intercalado)
else:
    print("WARNING: Mirage intercalado A not found literally, trying regex...")
    m = re.search(r'<!-- 3\. Banner Intercalado.*?<div class="promo-banner">.*?banner%20mirage\\?%20mobile.*?</div>', idx_content, flags=re.DOTALL)
    if m:
        idx_content = idx_content[:m.start()] + bape_intercalado + idx_content[m.end():]

# 3. Remover SVG Gigante do Nav e do Footer
svg_logo_tag = '<img src="https://pub-9eb15062e53d4ad1a85362ac330e3002.r2.dev/logomirage.svg" class="logo-image" style="width: 120px; max-width: 100%;" alt="Mirage">'
# Nav Logo
idx_content = re.sub(r'<svg class="logo-svg" id="svg_nav".*?</svg>', svg_logo_tag, idx_content, flags=re.DOTALL)
# Footer Logo
idx_content = re.sub(r'<svg class="logo-svg" id="svg_foot".*?</svg>', svg_logo_tag, idx_content, flags=re.DOTALL)

save_file("index.html", idx_content)

# 4. Extrair o LAYOUT MESTRE (Header + Navbar + Dropdown) e (Footer + Overlay)
head_to_drop = get_block(idx_content, '<div class="ticker">', '<div class="hero-slider"')
if not head_to_drop:
    head_to_drop = get_block(idx_content, '<div class="ticker">', '<div class="filter-section"')

overlay_to_end = get_block(idx_content, '<div class="overlay"', '</body>')

# 5. Aplicar o Master Layout em TODAS as páginas
for file in html_files:
    if file == "index.html":
        continue
    if not os.path.exists(file):
        continue
    content = read_file(file)
    
    # 5.1 Atualizar Header
    start_c = content.find('<div class="ticker">')
    end_c = content.find('<div class="hero-slider"')
    if end_c == -1: end_c = content.find('<div class="hero"')
    if end_c == -1: end_c = content.find('<div class="filter-section"')
    
    if start_c != -1 and end_c != -1:
        content = content[:start_c] + head_to_drop + content[end_c:]
        
    # 5.2 Atualizar Footer e Overlay
    start_over = content.find('<div class="overlay"')
    end_over = content.find('</body>')
    
    if start_over != -1 and end_over != -1:
        content = content[:start_over] + overlay_to_end + content[end_over:]
        
    save_file(file, content)

print("Todas as páginas refatoradas com sucesso! SVGs removidos, Banners trocados!")
