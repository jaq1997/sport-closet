
/* ─── CONFIGURAÇÕES ─────────────────────────────────────────────────────── */
const WPP = '5551989912555';
const BASE_URL_FOTOS = 'https://pub-9eb15062e53d4ad1a85362ac330e3002.r2.dev/';

/* ─── ESTADO DA APLICAÇÃO ────────────────────────────────────────────────── */
const path = window.location.pathname.split("/").pop();
const pageName = (path === '' || path === 'index.html') ? 'index' : path.replace(".html", "").toLowerCase();

const pageTypeMap = {
    'copa2026': 'camisa de seleção',
    'roupas-verao': ['camiseta', 'shorts', 'regata', 'casaco', 'legging'],
    'camisas': 'camisa de time',
    'tenis': 'tênis'
};
const pageType = pageTypeMap[pageName] || 'todos';

let activeFilters = {
  tipo: 'todos',
  liga: 'todos',
  marca: 'todos',
  peca: 'todos'
};
let searchQuery = '';
let curProd = null;
let curSize = null;

/* ─── DICIONÁRIO DE TRADUÇÃO E TEXTOS ────────────────────────────────────────── */
const i18n = {
  pt: {
    price: "Preço sob consulta",
    buy: "Pedir no WhatsApp",
    empty: "Nenhum produto encontrado.",
    found: "produtos encontrados",
    slides: [
      { sub: "COPA 2026", title: "CAMISAS DE<br>SELEÇÃO", btn: "VEJA AGORA" },
      { sub: "PISANDO COM ESTILO", title: "OS MELHORES<br>TÊNIS", btn: "EXPLORE" },
      { sub: "PARA O DIA A DIA", title: "ROUPAS DE<br>VERÃO", btn: "CONFERIR" }
    ]
  },
  en: {
    price: "Price on request",
    buy: "Order via WhatsApp",
    empty: "No products found.",
    found: "products found",
    slides: [
      { sub: "WORLD CUP 2026", title: "NATIONAL TEAM<br>JERSEYS", btn: "SHOP NOW" },
      { sub: "STYLE ON YOUR FEET", title: "THE BEST<br>SNEAKERS", btn: "EXPLORE" },
      { sub: "FOR YOUR DAILY", title: "SUMMER<br>WEAR", btn: "DISCOVER" }
    ],
    types: {
      "camisa de time": "Club Jersey",
      "camisa de seleção": "National Jersey",
      "tênis": "Sneakers",
      "camiseta": "T-Shirt",
      "shorts": "Shorts",
      "regata": "Tank Top",
      "casaco": "Jacket",
      "legging": "Legging"
    }
  }
};

/* ─── HELPERS ──────────────────────────────────────────────────────────── */
const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

function isUsa() { return document.getElementById('regionBtn')?.dataset.usa === '1'; }
function getLang() { return isUsa() ? i18n.en : i18n.pt; }

function tStr(str) {
  if (!str) return '';
  const lang = getLang();
  if (!isUsa() || !lang.types) return str;
  const lowerStr = str.toLowerCase();
  if (lang.types[lowerStr]) return lang.types[lowerStr];
  // Fallback for multi-type pages
  for (const key in lang.types) {
    if (lowerStr.includes(key)) return lang.types[key];
  }
  return str;
}

function wppMsg(p, sz) {
  const s = sz ? ` | Tamanho: ${sz}` : '';
  return encodeURIComponent(`Olá! Tenho interesse no produto:\n\n*${p.nome}* (ID: ${p.id})${s}\n\nVi no seu site.`);
}

function formatPrice(p) {
    if (isUsa()) {
        return p.usd && p.usd > 0 ? `$${p.usd.toFixed(2)}` : getLang().price;
    }
    const price = p.brl || 0;
    const formatted = price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return price > 0 ? formatted : getLang().price;
}

const wppSvg = `<svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.535 5.858L.057 23.633a.5.5 0 0 0 .61.61l5.775-1.478A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.944 9.944 0 0 1-5.088-1.392l-.363-.216-3.763.963.982-3.637-.237-.376A9.944 9.944 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>`;

/* ─── FILTROS E BUSCA ───────────────────────────────────────────────────── */
function setFilter(group, value) {
  activeFilters[group] = value.toLowerCase();
  document.querySelectorAll(`.fb[data-g="${group}"]`).forEach(b => {
    b.classList.toggle('active', norm(b.dataset.v) === norm(value));
  });
  renderGrid();
}

function handleSearch(val) {
  searchQuery = norm(val);
  renderGrid();
}

function toggleRegion() {
  const btn = document.getElementById('regionBtn');
  if (!btn) return;
  const isCurrentlyUsa = btn.dataset.usa === '1';
  btn.dataset.usa = isCurrentlyUsa ? '0' : '1';
  btn.textContent = isCurrentlyUsa ? '🇧🇷 Brasil (R$)' : '🇺🇸 USA ($)';
  localStorage.setItem('sport_closet_usa', btn.dataset.usa);
  updateStaticTexts();
  renderGrid();
}

/* ─── ATUALIZAÇÃO DE TEXTOS DINÂMICOS ──────────────────────────────────────── */
function updateStaticTexts() {
  const lang = getLang();
  if (pageName === 'index') {
    const slides = document.querySelectorAll('#heroSlider .slide');
    slides.forEach((slide, idx) => {
      if (!lang.slides[idx]) return;
      slide.querySelector('.slide-subtitle').textContent = lang.slides[idx].sub;
      slide.querySelector('.slide-title').innerHTML = lang.slides[idx].title;
      slide.querySelector('.slide-btn').textContent = lang.slides[idx].btn;
    });
  }
}

/* ─── ALGORITMO DE RANDOMIZAÇÃO (FISHER-YATES) ─────────────────────────── */
function embaralhar(array) {
  let lista = [...array];
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista;
}

/* ─── RENDERIZAÇÃO DO GRID DE PRODUTOS ─────────────────────────────────── */
function renderGrid() {
  const source = window.produtos || [];
  const lang = getLang();

  if (pageName === 'index' && !searchQuery) {
    const selecionados = embaralhar(source);
    desenharCards('grid-drop-exclusivo', selecionados.slice(0, 10));
    desenharCards('grid-mais-vistos', selecionados.slice(10, 20));
  } else {
    const list = source.filter(p => {
      const pTipo = norm(p.tipo);
      const pMarca = norm(p.marca);
      const pNome = norm(p.nome);
      const pLiga = norm(p.liga);

      let matchPageType = false;
      if (pageType === 'todos' || pageName === 'index') {
          matchPageType = true;
      } else if (Array.isArray(pageType)) {
          matchPageType = pageType.includes(pTipo);
      } else {
          matchPageType = pTipo === pageType;
      }

      const matchLigaFilter = pageName !== 'camisas' || activeFilters.liga === 'todos' || pLiga === activeFilters.liga;
      const matchMarcaFilter = (pageName !== 'tenis' && pageName !== 'roupas-verao') || activeFilters.marca === 'todos' || pMarca === activeFilters.marca;
      
      let matchCopaSponsor = true;
      if (pageName === 'copa2026' && activeFilters.tipo !== 'todos') {
          if (activeFilters.tipo === 'outras') {
              matchCopaSponsor = !['nike', 'adidas', 'puma'].includes(pMarca);
          } else {
              matchCopaSponsor = pMarca === activeFilters.tipo;
          }
      }

      const matchBusca = !searchQuery || 
                         pNome.includes(searchQuery) || 
                         pMarca.includes(searchQuery) || 
                         pTipo.includes(searchQuery) || 
                         pLiga.includes(searchQuery);

      return matchPageType && matchLigaFilter && matchMarcaFilter && matchCopaSponsor && matchBusca;
    });

    const targetGrid = pageName === 'index' ? 'grid-drop-exclusivo' : 'grid';
    const countEl = document.getElementById('pcount');
    if (countEl) countEl.textContent = `${list.length} ${lang.found}`;
    
    desenharCards(targetGrid, list);
    if (pageName === 'index') {
        const grid2 = document.getElementById('grid-mais-vistos');
        if (grid2) grid2.innerHTML = '';
    }
  }
}

function desenharCards(containerId, lista) {
  const grid = document.getElementById(containerId);
  if (!grid) return;
  const lang = getLang();

  if (lista.length === 0) {
    grid.innerHTML = `<div class="empty">${lang.empty}</div>`;
    if (pageName !== 'index') {
        const countEl = document.getElementById('pcount');
        if (countEl) countEl.textContent = `0 ${lang.found}`;
    }
    return;
  }

  grid.innerHTML = lista.map(p => {
    const fotoUrl = p.imgs && p.imgs[0] ? encodeURI(BASE_URL_FOTOS + p.imgs[0]) : 'https://placehold.co/400x500?text=Foto+Indisponível';
    return `
    <div class="card" onclick="openModal(${p.id})">
      <div class="card-img">
        <img src="${fotoUrl}" alt="${p.nome}" loading="lazy" onerror="this.src='https://placehold.co/400x500?text=Foto+Indisponível'">
        ${p.badge ? `<div class="card-badge">${p.badge}</div>` : ''}
      </div>
      <div class="card-info">
        <div class="card-brand">${p.marca.toUpperCase()}</div>
        <div class="card-name">${p.nome}</div>
        <div class="card-footer">
          <div class="card-price">${formatPrice(p)}</div>
        </div>
      </div>
    </div>`;
  }).join('');
}

/* ─── MODAL ─────────────────────────────────────────────────────────────── */
let carouselImgs = [];
let carouselIdx = 0;

function openModal(id) {
  const list = window.produtos || [];
  curProd = list.find(x => Number(x.id) === Number(id));
  if (!curProd) return;
  curSize = null;
  const lang = getLang();
  
  carouselImgs = curProd.imgs || [];
  carouselIdx = 0;
  renderCarousel();

  document.getElementById('mBrand').textContent = curProd.marca.toUpperCase();
  document.getElementById('mName').textContent = curProd.nome;
  document.getElementById('mType').textContent = tStr(curProd.tipo).toUpperCase();
  document.getElementById('mPrice').textContent = formatPrice(curProd);
  document.getElementById('mPriceAlt').textContent = isUsa() ? formatPrice({ brl: curProd.brl }) : formatPrice({ usd: curProd.usd });
  document.getElementById('mDesc').textContent = curProd.desc || "";

  document.getElementById('mSizes').innerHTML = (curProd.tamanhos || [])
    .map(s => `<button class="sz" onclick="selSize('${s}',this)">${s}</button>`).join('');

  const wppBtn = document.getElementById('mWpp');
  wppBtn.innerHTML = wppSvg + ' ' + lang.buy;
  wppBtn.onclick = () => window.open(`https://wa.me/${WPP}?text=${wppMsg(curProd, curSize)}`, '_blank');
  
  document.getElementById('overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function selSize(s, btn) {
  curSize = s;
  document.querySelectorAll('.sz').forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel');
  const wppBtn = document.getElementById('mWpp');
  wppBtn.onclick = () => window.open(`https://wa.me/${WPP}?text=${wppMsg(curProd, curSize)}`, '_blank');
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('overlay')) return;
  document.getElementById('overlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ─── CARROSSEL DO MODAL ────────────────────────────────────────────────── */
function renderCarousel() {
  const track = document.getElementById('carouselTrack');
  track.innerHTML = carouselImgs.map((img, i) => `
    <div class="carousel-slide"><img src="${encodeURI(BASE_URL_FOTOS + img)}" loading="${i === 0 ? 'eager' : 'lazy'}"></div>`).join('');
  
  const dots = document.getElementById('carouselDots');
  dots.innerHTML = carouselImgs.length > 1 ? carouselImgs.map((_, i) => `<span class="carousel-dot${i === 0 ? ' active' : ''}" onclick="carouselGoTo(${i})"></span>`).join('') : '';
  
  scrollToSlide(carouselIdx, 'instant');
  updateChevrons();
  
  track.onscroll = () => {
    carouselIdx = Math.round(track.scrollLeft / track.offsetWidth);
    updateDots();
    updateChevrons();
  };
}

function scrollToSlide(idx, behavior = 'smooth') {
  const track = document.getElementById('carouselTrack');
  track.scrollTo({ left: idx * track.offsetWidth, behavior });
}

function carouselStep(dir) {
  carouselIdx = Math.max(0, Math.min(carouselImgs.length - 1, carouselIdx + dir));
  scrollToSlide(carouselIdx);
}

function carouselGoTo(idx) {
  carouselIdx = idx;
  scrollToSlide(carouselIdx);
}

function updateDots() {
  document.querySelectorAll('.carousel-dot').forEach((d, i) => d.classList.toggle('active', i === carouselIdx));
}

function updateChevrons() {
    const leftChevron = document.getElementById('chevronLeft');
    const rightChevron = document.getElementById('chevronRight');
    if(leftChevron) leftChevron.style.display = carouselImgs.length > 1 && carouselIdx > 0 ? 'flex' : 'none';
    if(rightChevron) rightChevron.style.display = carouselImgs.length > 1 && carouselIdx < carouselImgs.length - 1 ? 'flex' : 'none';
}


/* ─── INICIALIZAÇÃO ──────────────────────────────────────────────────────── */
function init() {
    renderGrid();
    const inputs = document.querySelectorAll('.nav-search-input');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            const val = input.value;
            inputs.forEach(other => { if (other !== input) other.value = val; });
            handleSearch(val);
        });
    });

    document.querySelector('.mcls')?.addEventListener('click', () => closeModal());
    document.getElementById('overlay')?.addEventListener('click', (e) => closeModal(e));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    const savedUsa = localStorage.getItem('sport_closet_usa');
    const btn = document.getElementById('regionBtn');
    if (btn && savedUsa === '1') {
        btn.dataset.usa = '1';
        btn.textContent = '🇺🇸 USA ($)';
    } else if (btn) {
        btn.textContent = '🇧🇷 Brasil (R$)'
    }
    updateStaticTexts();
    renderGrid();
}

/* ─── CARREGAMENTO DOS DADOS DO CSV LOCAL ──────────────────────────────── */
const LOCAL_CSV_URL = 'Tabela_Sport_Closet_2026.csv';

function bootStore() {
  const sc = document.createElement('script');
  sc.src = "https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js";
  sc.onload = () => {
    fetch(LOCAL_CSV_URL)
      .then(response => {
          if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.text();
      })
      .then(csvText => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: function(results) {
            processCSVData(results.data);
            init();
          },
          error: function(err) {
            console.error("Erro ao parsear CSV:", err);
            window.produtos = [];
            init();
          }
        });
      }).catch(err => {
        console.error("Erro ao carregar do CSV local", err);
        const grid = document.getElementById('grid');
        if(grid) grid.innerHTML = '<div class="empty">Erro ao carregar produtos. Verifique o console.</div>';
        window.produtos = [];
        init();
      });
  };
  document.head.appendChild(sc);
}

function processCSVData(data) {
  window.produtos = data.map((row, index) => {
    const szStr = row.tamanhos || '';
    const sep = szStr.includes(';') ? ';' : ',';
    const tamanhos = szStr.split(sep).map(s => s.trim()).filter(s => s);

    return {
      id: row.id || index + 1,
      nome: row.nome || '',
      marca: (row.marca || '').toLowerCase(),
      tipo: (row.tipo || '').toLowerCase(),
      liga: (row.liga || '').toLowerCase(),
      brl: parseFloat((row.preco_brl || '0').replace(',', '.')) || 0,
      usd: parseFloat((row.preco_usa || '0').replace(',', '.')) || 0,
      tamanhos: tamanhos,
      desc: row.descricao || '',
      badge: row.badge || '',
      imgs: [row.img_1, row.img_2, row.img_3].filter(img => img && img.trim())
    };
  }).filter(p => p.nome);
}

document.addEventListener('DOMContentLoaded', bootStore);
