// ─── SPORT CLOSET — admin.js ───────────────────────────────────────────────
// Integrado com Google Sheets via Apps Script.
// Cole aqui a URL gerada após implantar o Code.gs:
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw0KrdBrG0Afz4LmUjFL3adH-5AXvlCgQk2fkaWPJpIb-c9wGbo-XzHPTKkTpn5OkR_Rg/exec';

const BASE_URL_FOTOS = 'https://pub-4af8db08776e49b78718c90c788bddab.r2.dev/';
const ADMIN_PASSWORD = 'sportcloset123';
const AUTH_KEY = 'sport_closet_admin_authenticated';

let adminProducts = [];
let filteredIndices = [];
let activeEditIndex = -1;


// ── AUTH ───────────────────────────────────────────────────────────────────
const isAuth = () => localStorage.getItem(AUTH_KEY) === '1';
const setAuth = v => localStorage.setItem(AUTH_KEY, v ? '1' : '0');

function handleLogin() {
  const input = document.getElementById('adminPasswordInput');
  const error = document.getElementById('authError');
  if (input.value.trim() === ADMIN_PASSWORD) {
    setAuth(true);
    document.getElementById('authOverlay').style.display = 'none';
    initAdmin();
  } else {
    error.textContent = 'Senha incorreta. Tente novamente.';
    input.value = '';
    input.focus();
  }
}

// ── TOAST ──────────────────────────────────────────────────────────────────
let _tt;
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `show ${type}`;
  clearTimeout(_tt);
  _tt = setTimeout(() => { el.className = ''; }, 3500);
}

// ── CONFIRM DIALOG ─────────────────────────────────────────────────────────
function showConfirm(title, msg, onOk) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMsg').textContent = msg;
  document.getElementById('confirmDialog').classList.add('open');
  document.getElementById('confirmOk').onclick = () => {
    document.getElementById('confirmDialog').classList.remove('open');
    onOk();
  };
}

// ── LOADING STATE ──────────────────────────────────────────────────────────
function setLoading(active, msg = '') {
  const btn = document.getElementById('btnSave');
  const status = document.getElementById('saveStatus');
  if (btn) {
    btn.disabled = active;
    btn.textContent = active ? 'Salvando…' : 'Salvar no Sheets';
  }
  if (status) {
    status.textContent = msg;
    status.className = 'save-status' + (active ? ' loading' : '');
  }
}

// ── BUSCAR DADOS DO GOOGLE SHEETS ──────────────────────────────────────────
async function fetchFromSheets() {
  setLoading(false, 'Carregando dados…');
  try {
    const res = await fetch(APPS_SCRIPT_URL);
    const json = await res.json();
    
    // Se o Apps Script retornou sucesso e tem dados, usa eles
    if (json.ok && json.data && json.data.length > 0) {
      loadProducts(json.data);
      window.dispatchEvent(new CustomEvent('productsLoaded', { detail: json.data }));
      toast(`${json.data.length} produtos carregados do Google Sheets.`);
    } else {
      // Fallback para o CSV Público se o Apps Script estiver vazio ou falhar
      console.warn("Apps Script sem dados. Tentando CSV Público...");
      const csvRes = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vTJJsi5MlreQayUKZtiZIwb0RcZCPa5ngJOkOmq-uCkKvtxVD8oRvYIJuYosn-22qsXtCsZsHJHfjhs/pub?output=csv');
      const csvText = await csvRes.text();
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          loadProducts(results.data);
          window.dispatchEvent(new CustomEvent('productsLoaded', { detail: results.data }));
          toast(`${results.data.length} produtos carregados via CSV (Apps Script vazio).`);
        }
      });
    }
    setLoading(false, '');
  } catch (err) {
    console.error(err);
    setLoading(false, '');
    toast('Erro ao carregar dados: ' + err.message, 'error');
  }
}

// ── SALVAR NO GOOGLE SHEETS ────────────────────────────────────────────────
async function saveToSheets() {
  if (!adminProducts.length) {
    toast('Nenhum produto para salvar.', 'error');
    return;
  }

  setLoading(true, 'Salvando na planilha…');

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save', data: adminProducts })
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Erro desconhecido');
    toast(`✓ ${json.saved} produtos salvos no Google Sheets!`);
    setLoading(false, `Salvo às ${new Date().toLocaleTimeString('pt-BR')}`);
  } catch (err) {
    console.error(err);
    setLoading(false, '');
    toast('Erro ao salvar: ' + err.message, 'error');
  }
}

// ── CARREGAR PRODUTOS ──────────────────────────────────────────────────────
function loadProducts(rows) {
  adminProducts = rows.map((row, i) => ({
    id: row.id || String(i + 1),
    nome: row.nome || '',
    marca: row.marca || '',
    tipo: row.tipo || '',
    liga: row.liga || '',
    preco_brl: row.preco_brl || row.preco_br || row.preco || '',
    preco_usa: row.preco_usa || row.preco_usd || row.usd || '',
    img_1: row.img_1 || '',
    img_2: row.img_2 || '',
    img_3: row.img_3 || '',
    tamanhos: row.tamanhos || row.sizes || '',
    descricao: row.descricao || row.desc || '',
    badge: row.badge || ''
  }));
  populateFilters();
  applyFilters();
  updateSidebar();
}

// ── MODAL DE EDIÇÃO ───────────────────────────────────────────────────────
function openProductModal(idx) {
  activeEditIndex = idx;
  const p = adminProducts[idx];
  
  document.getElementById('modalTitle').textContent = p.nome ? `Editar: ${p.nome}` : 'Novo Produto';
  
  // Imagens
  document.getElementById('modalImg1').value = p.img_1 || '';
  document.getElementById('modalImg2').value = p.img_2 || '';
  document.getElementById('modalImg3').value = p.img_3 || '';
  document.getElementById('modalImg1Prev').src = prevUrl(p.img_1);
  document.getElementById('modalImg2Prev').src = prevUrl(p.img_2);
  document.getElementById('modalImg3Prev').src = prevUrl(p.img_3);

  // Inputs
  document.getElementById('modalNome').value = p.nome || '';
  document.getElementById('modalId').value = p.id || '';
  document.getElementById('modalMarca').value = p.marca || '';
  document.getElementById('modalTipo').value = p.tipo || '';
  document.getElementById('modalLiga').value = p.liga || '';
  document.getElementById('modalBadge').value = p.badge || '';
  document.getElementById('modalPrecoBrl').value = p.preco_brl || '';
  document.getElementById('modalPrecoUsa').value = p.preco_usa || '';
  document.getElementById('modalTamanhos').value = p.tamanhos || '';
  document.getElementById('modalDescricao').value = p.descricao || '';

  document.getElementById('productModal').classList.add('open');
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('open');
  activeEditIndex = -1;
}

function saveProductModal() {
  if (activeEditIndex === -1) return;

  const p = adminProducts[activeEditIndex];
  p.nome = document.getElementById('modalNome').value;
  p.id = document.getElementById('modalId').value;
  p.marca = document.getElementById('modalMarca').value;
  p.tipo = document.getElementById('modalTipo').value;
  p.liga = document.getElementById('modalLiga').value;
  p.badge = document.getElementById('modalBadge').value;
  p.preco_brl = document.getElementById('modalPrecoBrl').value;
  p.preco_usa = document.getElementById('modalPrecoUsa').value;
  p.tamanhos = document.getElementById('modalTamanhos').value;
  p.descricao = document.getElementById('modalDescricao').value;
  p.img_1 = document.getElementById('modalImg1').value;
  p.img_2 = document.getElementById('modalImg2').value;
  p.img_3 = document.getElementById('modalImg3').value;

  closeProductModal();
  applyFilters();
  updateSidebar();
  toast('Alterações salvas no rascunho local!');
}


// ── FILTROS ────────────────────────────────────────────────────────────────
function populateFilters() {
  const marcas = [...new Set(adminProducts.map(p => p.marca).filter(Boolean))].sort();
  const tipos = [...new Set(adminProducts.map(p => p.tipo).filter(Boolean))].sort();
  document.getElementById('filterMarca').innerHTML =
    '<option value="">Todas as marcas</option>' +
    marcas.map(m => `<option>${esc(m)}</option>`).join('');
  document.getElementById('filterTipo').innerHTML =
    '<option value="">Todos os tipos</option>' +
    tipos.map(t => `<option>${esc(t)}</option>`).join('');
}

function applyFilters() {
  const q = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const marca = document.getElementById('filterMarca')?.value || '';
  const tipo = document.getElementById('filterTipo')?.value || '';

  filteredIndices = adminProducts
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => {
      const mQ = !q || [p.nome, p.marca, p.liga, p.tipo, p.id]
        .some(v => (v || '').toLowerCase().includes(q));
      return mQ && (!marca || p.marca === marca) && (!tipo || p.tipo === tipo);
    })
    .map(({ i }) => i);

  renderTable();

  document.getElementById('filteredCount').textContent =
    filteredIndices.length === adminProducts.length
      ? `${adminProducts.length} produtos`
      : `${filteredIndices.length} de ${adminProducts.length}`;
}

function updateSidebar() {
  document.getElementById('statCount').textContent = adminProducts.length;
  const sel = document.getElementById('selectProductRow');
  if (sel) sel.innerHTML = adminProducts.map((p, i) =>
    `<option value="${i}">${esc(`${i + 1} – ${p.nome || 'Sem nome'}`)}</option>`
  ).join('');
}

// ── TABELA ─────────────────────────────────────────────────────────────────
function renderTable() {
  const tbody = document.getElementById('adminBody');
  tbody.innerHTML = '';

  filteredIndices.forEach((ri, di) => {
    const p = adminProducts[ri];
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="row-num">${di + 1}</td>
      <td><input data-i="${ri}" data-f="id"        value="${esc(p.id)}"         style="width:46px"></td>
      <td><input data-i="${ri}" data-f="nome"       value="${esc(p.nome)}"></td>
      <td><input data-i="${ri}" data-f="marca"      value="${esc(p.marca)}"     style="width:86px"></td>
      <td><input data-i="${ri}" data-f="tipo"       value="${esc(p.tipo)}"      style="width:78px"></td>
      <td><input data-i="${ri}" data-f="liga"       value="${esc(p.liga)}"      style="width:78px"></td>
      <td><input data-i="${ri}" data-f="preco_brl"  value="${esc(p.preco_brl)}" style="width:66px"></td>
      <td><input data-i="${ri}" data-f="preco_usa"  value="${esc(p.preco_usa)}" style="width:66px"></td>
      <td class="img-cell">
        <input data-i="${ri}" data-f="img_1" value="${esc(p.img_1)}">
        <img class="img-preview" src="${prevUrl(p.img_1)}" onerror="this.src='https://placehold.co/80x80/131313/444?text=?'">
      </td>
      <td class="img-cell">
        <input data-i="${ri}" data-f="img_2" value="${esc(p.img_2)}">
        <img class="img-preview" src="${prevUrl(p.img_2)}" onerror="this.src='https://placehold.co/80x80/131313/444?text=?'">
      </td>
      <td class="img-cell">
        <input data-i="${ri}" data-f="img_3" value="${esc(p.img_3)}">
        <img class="img-preview" src="${prevUrl(p.img_3)}" onerror="this.src='https://placehold.co/80x80/131313/444?text=?'">
      </td>
      <td><textarea data-i="${ri}" data-f="tamanhos"  rows="2">${esc(p.tamanhos)}</textarea></td>
      <td><textarea data-i="${ri}" data-f="descricao" rows="2">${esc(p.descricao)}</textarea></td>
      <td>
        <input data-i="${ri}" data-f="badge" value="${esc(p.badge)}" style="width:78px">
        ${p.badge ? `<span class="badge-chip">${esc(p.badge)}</span>` : ''}
      </td>
      <td>
        <div style="display:flex; gap:5px;">
          <button class="btn btn-sm btn-edit" data-i="${ri}" title="Editar Detalhes">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn btn-sm btn-danger btn-del" data-i="${ri}" title="Excluir">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6"/>
              <path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </td>`;

    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('input[data-f], textarea[data-f]').forEach(el =>
    el.addEventListener('input', onInput));

  tbody.querySelectorAll('.btn-edit').forEach(btn =>
    btn.addEventListener('click', e => {
      const idx = Number(e.currentTarget.dataset.i);
      openProductModal(idx);
    }));

  tbody.querySelectorAll('.btn-del').forEach(btn =>
    btn.addEventListener('click', e => {
      const idx = Number(e.currentTarget.dataset.i);
      const name = adminProducts[idx]?.nome || `#${idx + 1}`;
      showConfirm('Excluir produto', `Deseja excluir "${name}"?`, () => deleteProduct(idx));
    }));
}

function onInput(e) {
  const idx = Number(e.target.dataset.i);
  const field = e.target.dataset.f;
  if (!Number.isFinite(idx) || !field) return;
  adminProducts[idx][field] = e.target.value;
  if (field.startsWith('img_')) {
    const img = e.target.nextElementSibling;
    if (img?.tagName === 'IMG') img.src = prevUrl(e.target.value);
  }
}

function addProduct() {
  const maxId = adminProducts.length
    ? Math.max(...adminProducts.map(p => Number(p.id) || 0)) : 0;
  adminProducts.push({
    id: String(maxId + 1), nome: '', marca: '', tipo: '', liga: '',
    preco_brl: '', preco_usa: '',
    img_1: '', img_2: '', img_3: '',
    tamanhos: '', descricao: '', badge: ''
  });
  document.getElementById('searchInput').value = '';
  document.getElementById('filterMarca').value = '';
  document.getElementById('filterTipo').value = '';
  applyFilters();
  updateSidebar();
  document.querySelector('.table-wrap').scrollTop = 99999;
  toast('Produto adicionado. Preencha os campos e salve no Sheets.');
}

function deleteProduct(idx) {
  adminProducts.splice(idx, 1);
  applyFilters();
  updateSidebar();
  populateFilters();
  toast('Produto removido. Clique em "Salvar no Sheets" para confirmar.', 'error');
}

// ── IMAGENS ────────────────────────────────────────────────────────────────
function prevUrl(val) {
  if (!val) return 'https://placehold.co/80x80/131313/444?text=?';
  return val.trim().startsWith('http')
    ? val.trim()
    : BASE_URL_FOTOS + encodeURI(val.trim());
}

async function handleUpload() {
  const setS = (msg, cls = '') => {
    const el = document.getElementById('uploadStatus');
    el.textContent = msg;
    el.className = 'upload-status ' + cls;
  };

  const file = document.getElementById('imageFileUpload').files[0];
  const acct = document.getElementById('cfAccountId').value.trim();
  const bucket = document.getElementById('cfBucketName').value.trim();
  const base = document.getElementById('cfR2BaseUrl').value.trim();
  const token = document.getElementById('cfApiToken').value.trim();
  const prodIdx = Number(document.getElementById('selectProductRow').value);
  const field = document.getElementById('selectImageSlot').value;

  if (!file) return setS('Escolha um arquivo de imagem.', 'err');
  if (!acct || !bucket || !token) return setS('Informe Account ID, Bucket Name e API Token.', 'err');
  if (!['img_1', 'img_2', 'img_3'].includes(field)) return setS('Slot inválido.', 'err');

  setS('Enviando para o Cloudflare R2…');
  try {
    const ep = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(acct)}/r2/buckets/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(file.name)}`;
    const res = await fetch(ep, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': file.type || 'application/octet-stream' },
      body: file
    });
    const json = await res.json();
    if (!res.ok || !json.success)
      throw new Error(json.errors?.map(e => e.message).join(', ') || 'Upload falhou');

    const url = base
      ? `${base.replace(/\/$/, '')}/${encodeURIComponent(file.name)}`
      : `https://${acct}.r2.cloudflarestorage.com/${bucket}/${encodeURIComponent(file.name)}`;

    adminProducts[prodIdx][field] = url;
    applyFilters();
    setS(`✓ Imagem enviada e inserida em ${field} do produto ${prodIdx + 1}.`, 'ok');
    toast('Upload concluído! Lembre de salvar no Sheets.');
  } catch (err) {
    setS('Erro: ' + err.message, 'err');
    toast('Erro no upload.', 'error');
  }
}

// ── EXPORTAR (backup local) ────────────────────────────────────────────────
function exportJson() {
  const json = JSON.stringify(adminProducts, null, 2);
  document.getElementById('csvOutput').value = json;
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([json], { type: 'application/json' })),
    download: 'backup_sport_closet.json'
  });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  toast('Backup JSON baixado!');
  switchTab('exportar');
}

function copyOutput() {
  const v = document.getElementById('csvOutput').value;
  if (!v) return toast('Gere um backup antes de copiar.', 'error');
  navigator.clipboard.writeText(v)
    .then(() => toast('Copiado!'))
    .catch(() => toast('Erro ao copiar.', 'error'));
}

// ── TABS ───────────────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-panel').forEach(p =>
    p.classList.toggle('active', p.id === `tab-${name}`));
  document.querySelectorAll('.tab-btn, .nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === name));
  const titles = {
    produtos: 'Produtos',
    upload: 'Upload para Cloudflare R2',
    exportar: 'Backup / Saída'
  };
  document.getElementById('topBarTitle').textContent = titles[name] || name;
}

// ── HELPERS ────────────────────────────────────────────────────────────────
function esc(v) {
  return String(v ?? '').replace(/[&<>"]/g,
    m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
}

function togglePass(inputId, btnId) {
  const inp = document.getElementById(inputId);
  inp.type = inp.type === 'password' ? 'text' : 'password';
  document.getElementById(btnId).title = inp.type === 'password' ? 'Mostrar' : 'Ocultar';
}

// ── INIT ───────────────────────────────────────────────────────────────────
function initAdmin() {
  document.querySelectorAll('.tab-btn, .nav-btn').forEach(b =>
    b.addEventListener('click', () => switchTab(b.dataset.tab)));

  document.getElementById('btnAdd').addEventListener('click', addProduct);
  document.getElementById('btnSave').addEventListener('click', saveToSheets);
  document.getElementById('btnReload').addEventListener('click', () =>
    showConfirm('Recarregar planilha', 'Alterações não salvas serão perdidas. Continuar?', fetchFromSheets));
  document.getElementById('btnExportJson').addEventListener('click', exportJson);
  document.getElementById('btnCopy').addEventListener('click', copyOutput);
  document.getElementById('btnUploadImage').addEventListener('click', handleUpload);

  document.getElementById('btnCloseModal').addEventListener('click', closeProductModal);
  document.getElementById('btnCancelModal').addEventListener('click', closeProductModal);
  document.getElementById('btnSaveModal').addEventListener('click', saveProductModal);

  // Auto-preview no modal
  ['modalImg1', 'modalImg2', 'modalImg3'].forEach(id => {
    document.getElementById(id).addEventListener('input', e => {
      document.getElementById(`${id}Prev`).src = prevUrl(e.target.value);
    });
  });


  document.getElementById('btnLogout').addEventListener('click', () =>
    showConfirm('Sair', 'Encerrar a sessão?', () => { setAuth(false); location.reload(); }));

  document.getElementById('searchInput').addEventListener('input', applyFilters);
  document.getElementById('filterMarca').addEventListener('change', applyFilters);
  document.getElementById('filterTipo').addEventListener('change', applyFilters);

  document.getElementById('confirmCancel').addEventListener('click', () =>
    document.getElementById('confirmDialog').classList.remove('open'));

  document.getElementById('cfTokenToggle')?.addEventListener('click', () =>
    togglePass('cfApiToken', 'cfTokenToggle'));

  // Avisa antes de fechar com alterações não salvas
  window.addEventListener('beforeunload', e => {
    if (adminProducts.length) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  fetchFromSheets();
}

function initAuth() {
  document.getElementById('passToggle').addEventListener('click', () =>
    togglePass('adminPasswordInput', 'passToggle'));

  document.getElementById('adminLoginBtn').addEventListener('click', handleLogin);
  document.getElementById('adminPasswordInput').addEventListener('keyup', e => {
    if (e.key === 'Enter') handleLogin();
  });
  if (isAuth()) {
    document.getElementById('authOverlay').style.display = 'none';
    initAdmin();
  }
}

window.addEventListener('DOMContentLoaded', initAuth);