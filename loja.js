/* ─── CONFIGURAÇÕES ─────────────────────────────────────────────────────── */
const WPP = '5551989912555';
const BASE_URL_FOTOS = 'https://pub-9eb15062e53d4ad1a85362ac330e3002.r2.dev/';

/* ─── ESTADO DA APLICAÇÃO ────────────────────────────────────────────────── */
const path = window.location.pathname.split("/").pop();
const pageBrand = (path === '' || path === 'index.html') ? '' : path.replace(".html", "").toLowerCase();
const marcasValidas = ['adidas', 'nike', 'supreme', 'bape', 'carhartt'];

const marcaFixa = marcasValidas.includes(pageBrand) ? pageBrand : 'todos';
let activeFilters = {
  tipo: 'todos'
};
let searchQuery = '';
let curProd = null;
let curSize = null;

/* ─── DICIONÁRIO DE TRADUÇÃO ─── */
const i18n = {
  pt: {
    price: "Preço sob consulta",
    buy: "Comprar no WhatsApp",
    explore: "EXPLORE O DROP",
    empty: "Nenhum produto encontrado.",
    found: "produtos encontrados",
    shipping: "ENVIO EUROPA & BRASIL",
    slides: [
      { sub: "NOVIDADES", title: "SUPREME<br>SS24", btn: "COMPRAR" },
      { sub: "COLLAB EXCLUSIVA", title: "NIKE x<br>NOCTA", btn: "EXPLORAR" },
      { sub: "ÍCONE STREETWEAR", title: "A BATHING<br>APE", btn: "DESCOBRIR" }
    ]
  },
  en: {
    price: "Price on request",
    buy: "Order via WhatsApp",
    explore: "DISCOVER THE DROP",
    empty: "No products found.",
    found: "products found",
    shipping: "EUROPE & BRAZIL SHIPPING",
    slides: [
      { sub: "NEW ARRIVALS", title: "SUPREME<br>SS24", btn: "SHOP NOW" },
      { sub: "EXCLUSIVE COLLAB", title: "NIKE x<br>NOCTA", btn: "EXPLORE" },
      { sub: "STREETWEAR ICON", title: "A BATHING<br>APE", btn: "DISCOVER" }
    ],
    types: {
      "calça": "Pants",
      "calças": "Pants",
      "camiseta": "T-Shirt",
      "camisetas": "T-Shirts",
      "jaqueta": "Jacket",
      "jaquetas": "Jackets",
      "moletom": "Hoodie",
      "moletons": "Hoodies",
      "tênis": "Sneakers",
      "acessório": "Accessory",
      "acessórios": "Accessories"
    }
  }
};

/* ─── HELPERS DE IDIOMA E MOEDA ─────────────────────────────────────────── */
function isEu() { return document.getElementById('regionBtn')?.dataset.eu === '1'; }
function getLang() { return isEu() ? i18n.en : i18n.pt; }

function tStr(str) {
  if (!str) return '';
  const lang = getLang();
  if (!isEu() || !lang.types) return str;
  let translated = str;
  for (const [key, val] of Object.entries(lang.types)) {
    const rx = new RegExp(`\\b${key}\\b`, 'gi');
    translated = translated.replace(rx, val);
  }
  return translated;
}

function wppMsg(p, sz) {
  const lang = getLang();
  const s = sz ? ` | Tamanho: ${sz}` : '';
  return encodeURIComponent(`Olá! Tenho interesse no produto:\n\n*${p.nome}*\nPreço: ${lang.price}${s}\n\nVi no catálogo Mirage Co.`);
}

const wppSvg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="vertical-align:middle; margin-right:5px;"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.535 5.858L.057 23.633a.5.5 0 0 0 .61.61l5.775-1.478A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.944 9.944 0 0 1-5.088-1.392l-.363-.216-3.763.963.982-3.637-.237-.376A9.944 9.944 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>`;

/* ─── FILTROS E BUSCA ───────────────────────────────────────────────────── */
function setFilter(group, value) {
  const val = value.toLowerCase();

  if (group === 'marca') {
    if (val === 'todos' || val === 'todas') window.location.href = 'index.html';
    else window.location.href = `${val}.html`;
    return;
  }

  activeFilters[group] = val;
  document.querySelectorAll(`.fb[data-g="${group}"]`).forEach(b => {
    b.classList.toggle('active', b.dataset.v.toLowerCase() === val);
  });
  renderGrid();
}

function isMobile() {
  return window.innerWidth <= 768;
}

function handleSearch(val) {
  searchQuery = (val || '').toLowerCase().trim();
  renderGrid();

  // Comportamento mobile: esconde hero + promo e faz scroll pro grid
  if (isMobile()) {
    const hero = document.getElementById('heroSlider');
    const promo = document.querySelector('.promo-strip');
    const filterSection = document.querySelector('.filter-section');

    if (searchQuery.length > 0) {
      // Esconde o hero e o promo strip
      if (hero) hero.classList.add('search-hidden');
      if (promo) promo.classList.add('search-hidden');

      // Scroll suave até a seção de filtros/grid
      if (filterSection) {
        setTimeout(() => {
          filterSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      }
    } else {
      // Quando limpa a busca, restaura o hero e o promo
      if (hero) hero.classList.remove('search-hidden');
      if (promo) promo.classList.remove('search-hidden');
    }
  }
}

function updateStaticTexts() {
  const lang = getLang();

  // Atualiza o ticker em todas as páginas
  document.querySelectorAll('.ticker-inner span').forEach(span => {
    // Only target the shipping string, which usually has longer length
    if (span.textContent.includes('ENVIO') || span.textContent.includes('SHIPPING') || span.textContent.includes('EUROPA')) {
      span.textContent = lang.shipping;
    }
  });

  // Atualiza os botões de Filtro
  document.querySelectorAll('.fb[data-g="tipo"]').forEach(btn => {
    const val = btn.dataset.v.toLowerCase();
    if (val === 'todos') {
      btn.textContent = isEu() ? 'ALL' : 'TODOS';
    } else if (isEu() && lang.types && lang.types[val]) {
      btn.textContent = lang.types[val].toUpperCase();
    } else {
      btn.textContent = val.toUpperCase();
    }
  });

  const fgLabel = document.querySelector('.fg-label');
  if (fgLabel) {
    fgLabel.textContent = isEu() ? 'Item Type' : 'Tipo de peça';
  }

  // Atualiza os banners
  if (marcaFixa === 'todos') {
    const slides = document.querySelectorAll('#heroSlider .slide');
    slides.forEach((slide, idx) => {
      if (!lang.slides[idx]) return;
      const sub = slide.querySelector('.slide-subtitle');
      const title = slide.querySelector('.slide-title');
      const btn = slide.querySelector('.slide-btn');
      
      if (sub) sub.textContent = lang.slides[idx].sub;
      if (title) title.innerHTML = lang.slides[idx].title;
      if (btn) btn.textContent = lang.slides[idx].btn;
    });
  } else {
    // Banner dinâmico para páginas internas
    const slideTitle = document.querySelector('.slide-title');
    const slideSub = document.querySelector('.slide-subtitle');
    const slideBtn = document.querySelector('.slide-btn');
    if (slideTitle) slideTitle.innerHTML = `${marcaFixa.toUpperCase()}<br>COLLECTION`;
    if (slideSub) slideSub.textContent = lang.explore;
    if (slideBtn) slideBtn.style.display = 'none';
  }
}

function toggleRegion() {
  const btn = document.getElementById('regionBtn');
  if (!btn) return;
  const isEuNow = btn.dataset.eu === '1';
  const newEu = isEuNow ? '0' : '1';
  btn.dataset.eu = newEu;
  btn.textContent = newEu === '1' ? '🇪🇺 Europa (€)' : '🌎 Brasil (R$)';

  localStorage.setItem('euRegion', newEu);

  updateStaticTexts();
  renderGrid();
}

/* ─── ALGORITMO DE RANDOMIZAÇÃO (FISHER-YATES) ─── */
function embaralhar(array) {
  let lista = [...array];
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista.slice(0, 20);
}

/* ─── RENDERIZAÇÃO ──────────────────────────────────────────────────────── */
function renderGrid() {
  const source = window.todos || [];

  // HOME: curadoria de 20 produtos aleatórios divididos nas duas seções
  if (marcaFixa === 'todos') {
    const selecionados = embaralhar(source);
    desenharCards('grid-drop-exclusivo', selecionados.slice(0, 10));
    desenharCards('grid-mais-vistos', selecionados.slice(10, 20));
  } else {
    // Páginas de marca: mostra tudo daquela marca com filtros ativos
    const list = source.filter(p => {
      const pMarca = (p.marca || "").toLowerCase();
      const pTipo = (p.tipo || "").toLowerCase();
      const pNome = (p.nome || "").toLowerCase();

      const matchMarca = pMarca === marcaFixa;
      const matchTipo = activeFilters.tipo === 'todos' || pTipo === activeFilters.tipo || (activeFilters.tipo === 'calcas' && pTipo === 'calças');
      const matchBusca = !searchQuery || pNome.includes(searchQuery) || pMarca.includes(searchQuery);

      return matchMarca && matchTipo && matchBusca;
    });

    const countEl = document.getElementById('pcount');
    if (countEl) countEl.textContent = `${list.length} ${getLang().found}`;

    desenharCards('grid', list);
    
    // We already handled internal page banner dynamic titles in updateStaticTexts.
  }
}

/* ─── FUNÇÃO AUXILIAR PARA CRIAR OS CARDS ─── */
function desenharCards(containerId, lista) {
  const grid = document.getElementById(containerId);
  if (!grid) return;
  const lang = getLang();

  if (lista.length === 0) {
    grid.innerHTML = `<div class="empty">${lang.empty}</div>`;
    return;
  }

  grid.innerHTML = lista.map(p => {
    const fotoUrl = encodeURI(BASE_URL_FOTOS + p.imgs[0]);
    return `
    <div class="card" onclick="openModal(${p.id})">
      <div class="card-img">
        <img src="${fotoUrl}" alt="${p.nome}" loading="lazy" onerror="this.src='https://placehold.co/400x500?text=Foto+Indisponível'">
        ${p.badge ? `<div class="card-badge">${p.badge}</div>` : ''}
      </div>
      <div class="card-info">
        <div class="card-brand">${p.marca.toUpperCase()}</div>
        <div class="card-name">${tStr(p.nome)}</div>
        <div class="card-footer">
          <div class="card-price">${lang.price}</div>
          <button class="wpp-btn" onclick="event.stopPropagation();window.open('https://wa.me/${WPP}?text=${wppMsg(p, null)}','_blank')">
            ${wppSvg} ${lang.buy}
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
}

/* ─── MODAL ─────────────────────────────────────────────────────────────── */
let carouselImgs = [];
let carouselIdx = 0;

function openModal(id) {
  const list = window.todos || [];
  const pid = typeof id === 'number' ? id : Number(id);
  const p = list.find(x => Number(x.id) === pid);
  if (!p) return;
  curProd = p; curSize = null;
  const lang = getLang();

  const overlay = document.getElementById('overlay');
  if (!overlay) return;

  // Carrossel
  carouselImgs = p.imgs || [];
  carouselIdx = 0;
  renderCarousel();

  document.getElementById('mBrand').textContent = p.marca.toUpperCase();
  document.getElementById('mName').textContent = tStr(p.nome);
  const mType = document.getElementById('mType');
  if (mType) mType.textContent = (tStr(p.tipo) || "").toUpperCase();
  document.getElementById('mPrice').textContent = lang.price;
  document.getElementById('mDesc').textContent = p.desc || "Exclusividade Mirage Co.";

  document.getElementById('mSizes').innerHTML = (p.sizes || ["P", "M", "G", "GG"])
    .map(s => `<button class="sz" onclick="selSize('${s}',this)">${s}</button>`).join('');

  const wppBtn = document.getElementById('mWpp');
  if (wppBtn) {
    wppBtn.innerHTML = `${wppSvg} ${lang.buy}`;
    wppBtn.onclick = () => window.open(`https://wa.me/${WPP}?text=${wppMsg(curProd, curSize)}`, '_blank');
  }

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function renderCarousel() {
  const track = document.getElementById('carouselTrack');
  const dots = document.getElementById('carouselDots');
  const chevL = document.getElementById('chevronLeft');
  const chevR = document.getElementById('chevronRight');
  if (!track) return;

  track.innerHTML = carouselImgs.map((img, i) => `
    <div class="carousel-slide" data-index="${i}">
      <img src="${encodeURI(BASE_URL_FOTOS + img)}" alt="" loading="${i === 0 ? 'eager' : 'lazy'}"
           onerror="this.src='https://placehold.co/400x500?text=Foto+Indisponível'">
    </div>`).join('');

  if (dots) {
    dots.innerHTML = carouselImgs.length > 1
      ? carouselImgs.map((_, i) => `<span class="carousel-dot${i === 0 ? ' active' : ''}" onclick="carouselGoTo(${i})"></span>`).join('')
      : '';
  }

  // Sincroniza scroll para o slide correto e atualiza chevrons
  scrollToSlide(carouselIdx, 'instant');
  updateChevrons();

  // Detecta scroll manual (dedo) e atualiza dots + chevrons
  track.onscroll = () => {
    const slideW = track.offsetWidth;
    if (!slideW) return;
    carouselIdx = Math.round(track.scrollLeft / slideW);
    updateDots();
    updateChevrons();
  };
}

function scrollToSlide(idx, behavior = 'smooth') {
  const track = document.getElementById('carouselTrack');
  if (!track) return;
  track.scrollTo({ left: idx * track.offsetWidth, behavior });
}

function carouselStep(dir) {
  carouselIdx = Math.max(0, Math.min(carouselImgs.length - 1, carouselIdx + dir));
  scrollToSlide(carouselIdx);
  updateDots();
  updateChevrons();
}

function carouselGoTo(idx) {
  carouselIdx = idx;
  scrollToSlide(carouselIdx);
  updateDots();
  updateChevrons();
}

function updateDots() {
  document.querySelectorAll('.carousel-dot').forEach((d, i) => {
    d.classList.toggle('active', i === carouselIdx);
  });
}

function updateChevrons() {
  const chevL = document.getElementById('chevronLeft');
  const chevR = document.getElementById('chevronRight');
  if (chevL) chevL.style.opacity = carouselIdx === 0 ? '0' : '1';
  if (chevL) chevL.style.pointerEvents = carouselIdx === 0 ? 'none' : 'auto';
  if (chevR) chevR.style.opacity = carouselIdx === carouselImgs.length - 1 ? '0' : '1';
  if (chevR) chevR.style.pointerEvents = carouselIdx === carouselImgs.length - 1 ? 'none' : 'auto';
}

function closeModal(e) {
  if (!e || e.target === document.getElementById('overlay') || e.target.className === 'mcls') {
    document.getElementById('overlay').classList.remove('open');
    document.body.style.overflow = '';
  }
}

function selSize(s, btn) {
  curSize = s;
  document.querySelectorAll('.sz').forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel');
  const wppBtn = document.getElementById('mWpp');
  if (wppBtn) wppBtn.onclick = () => window.open(`https://wa.me/${WPP}?text=${wppMsg(curProd, curSize)}`, '_blank');
}


/* ─── DROPDOWN BRANDS ────────────────────────────────────────────────────── */
function toggleBrandsDropdown(e) {
  if (e) e.stopPropagation();
  document.getElementById('brandsDropdown')?.classList.toggle('open');
}

/* ─── INICIALIZAÇÃO ──────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('regionBtn');
  const savedEu = localStorage.getItem('euRegion');
  if (btn && savedEu) {
    btn.dataset.eu = savedEu;
    btn.textContent = savedEu === '1' ? '🇪🇺 Europa (€)' : '🌎 Brasil (R$)';
  }

  updateStaticTexts();
  renderGrid();
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // Fecha dropdown de marcas ao clicar fora
  document.addEventListener('click', e => {
    const dropdown = document.getElementById('brandsDropdown');
    if (dropdown && !dropdown.contains(e.target) && !e.target.closest('.brands-toggle-mobile')) {
      dropdown.classList.remove('open');
    }
  });

  // Sincroniza os dois inputs de busca (desktop e mobile)
  const inputs = document.querySelectorAll('.nav-search-input');
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      const val = input.value;
      // Sincroniza o outro input
      inputs.forEach(other => { if (other !== input) other.value = val; });
      handleSearch(val);
    });
  });
});
