/* ═══════════════════════════════════════════════════════════════
   Raíz & Pixel — Produtos Module
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  let _allProdutos = [];

  const CATEGORIAS = {
    modelo:      'Modelo de Convite',
    complemento: 'Complemento',
    album:       'Álbum de Fotos',
    confirmacao: 'Confirmação de Presença'
  };

  const SUBCATEGORIAS = {
    adulto:   '15 Anos / Casamento / Festas',
    infantil: 'Infantil'
  };

  // ── Init ──────────────────────────────────────────────────────

  window.initProdutos = async function () {
    try {
      _allProdutos = await DB.produtos.getAll();
      renderTabelaProdutos();
    } catch (err) {
      console.error('[Produtos] Erro ao carregar:', err);
      showToast('Erro ao carregar catálogo', 'error');
    }
  };

  // ── Render tabela agrupada por categoria ──────────────────────

  function renderTabelaProdutos() {
    const container = document.getElementById('produtos-tabela-container');
    if (!container) return;

    if (_allProdutos.length === 0) {
      container.innerHTML = [
        '<div style="margin-bottom:20px;">',
          '<div class="empty-state" style="margin-bottom:20px;">',
            '<div class="empty-icon">📦</div>',
            '<p>Nenhum produto cadastrado ainda.<br>Clique em um dos botões abaixo para adicionar:</p>',
          '</div>',
          '<div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">',
            '<button class="btn btn-primary" onclick="openModalNovoProduto(\'modelo\')">📋 ＋ Novo Modelo de Convite</button>',
            '<button class="btn btn-primary" onclick="openModalNovoProduto(\'complemento\')">🎁 ＋ Novo Complemento</button>',
            '<button class="btn btn-primary" onclick="openModalNovoProduto(\'album\')">📸 ＋ Novo Álbum de Fotos</button>',
            '<button class="btn btn-primary" onclick="openModalNovoProduto(\'confirmacao\')">✅ ＋ Nova Confirmação de Presença</button>',
          '</div>',
        '</div>'
      ].join('');
      return;
    }

    // Agrupar por categoria
    const grupos = {};
    _allProdutos.forEach(p => {
      if (!grupos[p.categoria]) grupos[p.categoria] = [];
      grupos[p.categoria].push(p);
    });

    let html = '';
    Object.entries(grupos).forEach(([cat, produtos]) => {
      const catLabel = CATEGORIAS[cat] || cat;
      html += `
        <div class="card" style="margin-bottom:20px;">
          <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
            <h3>${getCatIcon(cat)} ${catLabel}</h3>
            <button class="btn btn-primary btn-sm" onclick="openModalNovoProduto('${cat}')">＋ Novo</button>
          </div>
          <div class="card-body" style="padding:0;">
            <div class="table-responsive">
              <table class="data-table">
                <thead><tr>
                  ${cat === 'modelo' ? '<th>Coleção</th>' : ''}
                  <th>Nome / Serviço</th>
                  <th>Preço</th>
                  ${cat === 'album' || cat === 'confirmacao' ? '<th>Observação</th>' : ''}
                  <th>Ações</th>
                </tr></thead>
                <tbody>
                  ${produtos.map(p => `
                    <tr>
                      ${cat === 'modelo' ? `<td>${SUBCATEGORIAS[p.subcategoria] || p.subcategoria || '—'}</td>` : ''}
                      <td>${p.nome}</td>
                      <td><strong>${p.preco > 0 ? formatBRL(p.preco) : 'Gratuito'}</strong></td>
                      ${cat === 'album' || cat === 'confirmacao' ? `<td style="font-size:0.83rem;color:var(--text-secondary);">${p.observacao || '—'}</td>` : ''}
                      <td>
                        <div class="action-btns">
                          <button class="btn btn-sm btn-secondary" onclick="openModalEditarProduto('${p.id}')" title="Editar">✏️</button>
                          <button class="btn btn-sm btn-danger" onclick="excluirProduto('${p.id}', '${(p.nome || '').replace(/'/g, '')}')" title="Excluir">🗑</button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    // Adicionar botões para categorias sem produtos ainda
    const categoriasComProdutos = Object.keys(grupos);
    const todasCategorias = Object.keys(CATEGORIAS);
    const categoriasSemProdutos = todasCategorias.filter(c => !categoriasComProdutos.includes(c));
    if (categoriasSemProdutos.length > 0) {
      const extra = document.createElement('div');
      extra.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;margin-top:4px;margin-bottom:8px;';
      categoriasSemProdutos.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary btn-sm';
        btn.onclick = () => openModalNovoProduto(cat);
        btn.textContent = `${getCatIcon(cat)} ＋ ${CATEGORIAS[cat]}`;
        extra.appendChild(btn);
      });
      container.appendChild(extra);
    }
  }

  function getCatIcon(cat) {
    const icons = { modelo: '📋', complemento: '🎁', album: '📸', confirmacao: '✅' };
    return icons[cat] || '📦';
  }

  // ── Modal: Novo Produto ───────────────────────────────────────

  window.openModalNovoProduto = function (categoriaPreset) {
    document.getElementById('modal-produto-title').textContent = 'Novo Produto / Serviço';
    document.getElementById('form-produto').reset();
    document.getElementById('produto-edit-id').value = '';
    if (categoriaPreset) {
      document.getElementById('input-produto-categoria').value = categoriaPreset;
    }
    toggleSubcategoriaField();
    openModal('modal-produto');
  };

  // ── Modal: Editar Produto ─────────────────────────────────────

  window.openModalEditarProduto = function (id) {
    const produto = _allProdutos.find(p => p.id === id);
    if (!produto) { showToast('Produto não encontrado', 'error'); return; }

    document.getElementById('modal-produto-title').textContent = 'Editar Produto / Serviço';
    document.getElementById('produto-edit-id').value = produto.id;
    document.getElementById('input-produto-categoria').value = produto.categoria;
    document.getElementById('input-produto-subcategoria').value = produto.subcategoria || '';
    document.getElementById('input-produto-nome').value = produto.nome;
    document.getElementById('input-produto-preco').value = produto.preco;
    document.getElementById('input-produto-observacao').value = produto.observacao || '';
    toggleSubcategoriaField();
    openModal('modal-produto');
  };

  // ── Salvar (Criar ou Editar) ──────────────────────────────────

  window.salvarProduto = async function () {
    const btnSalvar = document.getElementById('btn-salvar-produto');
    const editId = document.getElementById('produto-edit-id').value;
    const nome = document.getElementById('input-produto-nome').value.trim();
    const preco = parseFloat(document.getElementById('input-produto-preco').value);
    const categoria = document.getElementById('input-produto-categoria').value;

    if (!nome) { showToast('Informe o nome do produto', 'error'); return; }
    if (isNaN(preco) || preco < 0) { showToast('Informe um preço válido (0 para gratuito)', 'error'); return; }
    if (!categoria) { showToast('Selecione a categoria', 'error'); return; }

    const payload = {
      nome,
      preco,
      categoria,
      subcategoria: document.getElementById('input-produto-subcategoria').value || null,
      observacao: document.getElementById('input-produto-observacao').value.trim() || null
    };

    if (btnSalvar) { btnSalvar.disabled = true; btnSalvar.textContent = 'Salvando...'; }

    try {
      if (editId) {
        await DB.produtos.update(editId, payload);
        showToast('Produto atualizado com sucesso!');
      } else {
        await DB.produtos.create(payload);
        showToast('Produto cadastrado com sucesso!');
      }
      closeModal('modal-produto');
      await initProdutos();
    } catch (err) {
      console.error('[Produtos] Erro ao salvar:', err);
      showToast('Erro ao salvar: ' + (err.message || 'Erro desconhecido'), 'error');
    } finally {
      if (btnSalvar) { btnSalvar.disabled = false; btnSalvar.textContent = 'Salvar'; }
    }
  };

  // ── Excluir ───────────────────────────────────────────────────

  window.excluirProduto = function (id, nome) {
    showConfirm(`Excluir o produto "${nome}"? Esta ação não pode ser desfeita.`, async () => {
      try {
        await DB.produtos.delete(id);
        showToast('Produto excluído!');
        await initProdutos();
      } catch (err) {
        showToast('Erro ao excluir: ' + (err.message || ''), 'error');
      }
    });
  };

  // ── Toggle campo subcategoria (só para modelos) ───────────────

  window.toggleSubcategoriaField = function () {
    const cat = document.getElementById('input-produto-categoria').value;
    const grupo = document.getElementById('grupo-produto-subcategoria');
    if (grupo) grupo.style.display = (cat === 'modelo') ? 'block' : 'none';
  };

  // ── API pública: retorna produtos por categoria (para popular modais) ─

  window.getProdutosByCategoria = async function (categoria) {
    try {
      return await DB.produtos.getByCategoria(categoria);
    } catch (err) {
      console.error('[Produtos] Erro ao buscar por categoria:', err);
      return [];
    }
  };

})();
