/* ═══════════════════════════════════════════════════════════════
   Raíz & Pixel — Database Module (CRUD)
   Suporta: Render/Supabase (produção) e XAMPP/MySQL (local)
   URL configurada via window.RP_API_URL em app.html
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // URL da API — configurada em app.html
  // Local:  'http://localhost/sistema/api'
  // Render: 'https://raiz-pixel-api.onrender.com/api'
  const API_BASE_URL = (window.RP_API_URL || 'http://localhost/sistema/api');

  async function apiRequest(endpoint, { method = 'GET', params = {}, body = null } = {}) {
    // Remove the basePath logic and use API_BASE_URL directly
    const url = new URL(`${API_BASE_URL}/${endpoint}.php`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) url.searchParams.set(key, value);
    });
    const fetchOptions = { method, headers: {} };
    if (body && (method === 'POST' || method === 'PUT')) {
      fetchOptions.headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(body);
    }
    const response = await fetch(url.toString(), fetchOptions);
    let data;
    try { data = await response.json(); } catch { data = null; }
    if (!response.ok) throw new Error((data && data.error) || `Erro ${response.status}`);
    return data;
  }

  // ─── Formatting Helpers ──────────────────────────────────────

  window.formatBRL = function (value) {
    return (parseFloat(value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  window.formatDate = function (isoDate) {
    if (!isoDate) return '—';
    var parts = String(isoDate).substring(0, 10).split('-');
    return parts.length !== 3 ? isoDate : parts[2] + '/' + parts[1] + '/' + parts[0];
  };

  window.formatDateTime = function (iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
           + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch { return String(iso); }
  };

  window.formatCPF = function (cpf) {
    if (!cpf) return '—';
    const digits = cpf.replace(/\D/g, '');
    return digits.length !== 11 ? cpf : digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // ─── Toast / Confirm ─────────────────────────────────────────

  window.showToast = function (message, type = 'success', duration = 4000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${type === 'success' ? '✓' : '✕'}</span><span class="toast-message">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, duration);
  };

  window.showConfirm = function (message, onConfirm) {
    const modal = document.getElementById('modal-confirm');
    if (!modal) { if (confirm(message)) onConfirm(); return; }
    document.getElementById('confirm-message').textContent = message;
    modal.classList.add('show', 'active');
    const btnOk = document.getElementById('btn-confirm-ok');
    const btnCancel = document.getElementById('btn-confirm-cancel');
    const newOk = btnOk.cloneNode(true); const newCancel = btnCancel.cloneNode(true);
    btnOk.parentNode.replaceChild(newOk, btnOk);
    btnCancel.parentNode.replaceChild(newCancel, btnCancel);
    newCancel.onclick = () => modal.classList.remove('show', 'active');
    newOk.onclick = () => { modal.classList.remove('show', 'active'); onConfirm(); };
  };

  function cleanCPF(cpf) { return cpf ? cpf.replace(/\D/g, '') : ''; }

  // ═══════════════════════════════════════════════════════════════
  //  DATABASE API — PHP + MySQL local (XAMPP)
  // ═══════════════════════════════════════════════════════════════

  window.DB = {

    clientes: {
      async getAll()              { return apiRequest('clientes'); },
      async getById(id)           { return apiRequest('clientes', { params: { id } }); },
      async getByCpf(cpf)         { return apiRequest('clientes', { params: { cpf: cleanCPF(cpf) } }); },
      async create({ nome, cpf, telefone }) {
        const body = { nome, cpf: cleanCPF(cpf) };
        if (telefone) body.telefone = telefone;
        return apiRequest('clientes', { method: 'POST', body });
      },
      async update(id, updates) {
        if (updates.cpf) updates.cpf = cleanCPF(updates.cpf);
        return apiRequest('clientes', { method: 'PUT', params: { id }, body: updates });
      },
      async delete(id) { return apiRequest('clientes', { method: 'DELETE', params: { id } }); }
    },

    pedidos: {
      async getAll()                    { return apiRequest('pedidos'); },
      getNewCount()                     { return apiRequest('pedidos', { params: { count_new: '1' } }); },
      async getByClienteId(clienteId)   { return apiRequest('pedidos', { params: { cliente_id: clienteId } }); },
      async getById(id)                 { return apiRequest('pedidos', { params: { id } }); },
      async create(pedido)              { return apiRequest('pedidos', { method: 'POST', body: pedido }); },
      async update(id, updates)         { return apiRequest('pedidos', { method: 'PUT', params: { id }, body: updates }); },
      async delete(id)                  { return apiRequest('pedidos', { method: 'DELETE', params: { id } }); },
      async getByStatus(status)         { return apiRequest('pedidos', { params: { status } }); },
      async getUpcoming(limit = 5)      { return apiRequest('pedidos', { params: { upcoming: 1, limit } }); },
      async getNeedRepost()             { return apiRequest('pedidos', { params: { repost: 1 } }); }
    },

    financeiro: {
      async getAll()                          { return apiRequest('financeiro'); },
      async getByMonth(year, month)           { return apiRequest('financeiro', { params: { year, month } }); },
      async getByDate(dateStr)                { return apiRequest('financeiro', { params: { date: dateStr } }); },
      async create(payload)                   { return apiRequest('financeiro', { method: 'POST', body: payload }); },
      async delete(id)                        { return apiRequest('financeiro', { method: 'DELETE', params: { id } }); },
      async getMonthSummary(year, month)      { return apiRequest('financeiro', { params: { summary: 1, year, month } }); }
    },

    produtos: {
      async getAll()                    { return apiRequest('produtos'); },
      async getByCategoria(categoria)   { return apiRequest('produtos', { params: { categoria } }); },
      async create(payload)             { return apiRequest('produtos', { method: 'POST', body: payload }); },
      async update(id, updates)         { return apiRequest('produtos', { method: 'PUT', params: { id }, body: updates }); },
      async delete(id)                  { return apiRequest('produtos', { method: 'DELETE', params: { id } }); }
    }
  };

  // ═══════════════════════════════════════════════════════════════
  //  BACKUP — Exportar / Importar dados
  // ═══════════════════════════════════════════════════════════════

  window.exportarDados = async function () {
    try {
      showToast('💾 Exportando dados...', 'success', 3000);
      const [clientes, pedidos, financeiro, produtos] = await Promise.all([
        DB.clientes.getAll(),
        DB.pedidos.getAll(),
        DB.financeiro.getAll(),
        DB.produtos.getAll()
      ]);
      const backup = {
        exportado_em: new Date().toISOString(),
        versao: '2.0',
        totais: {
          clientes:   (clientes   || []).length,
          pedidos:    (pedidos    || []).length,
          financeiro: (financeiro || []).length,
          produtos:   (produtos   || []).length
        },
        clientes:   clientes   || [],
        pedidos:    pedidos    || [],
        financeiro: financeiro || [],
        produtos:   produtos   || []
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `raiz-pixel-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      localStorage.setItem('rp_ultimo_backup', new Date().toISOString());
      showToast(`✅ Backup salvo! (${backup.totais.clientes} clientes, ${backup.totais.pedidos} pedidos)`, 'success', 5000);
    } catch (err) {
      showToast('Erro ao exportar: ' + (err.message || ''), 'error');
    }
  };

  window.importarDados = function (file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (e) {
      try {
        // ── Validação básica do arquivo ──────────────────────────
        let dados;
        try {
          dados = JSON.parse(e.target.result);
        } catch (parseErr) {
          showToast('❌ Arquivo inválido — não é um JSON válido.', 'error', 6000);
          return;
        }

        if (!dados.clientes && !dados.pedidos) {
          showToast('❌ Arquivo não reconhecido. Verifique se é o backup correto.', 'error', 6000);
          return;
        }

        // ── Mostrar resumo antes de importar ────────────────────
        const totalRegistros =
          (dados.clientes   || []).length +
          (dados.pedidos    || []).length +
          (dados.financeiro || []).length +
          (dados.produtos   || []).length;

        const origem = dados.origem || (dados.versao === '1.0' ? 'Hostinger' : 'Sistema atual');

        const confirmMsg =
          `📦 Backup encontrado (${origem})\n` +
          `Exportado em: ${dados.exportado_em ? new Date(dados.exportado_em).toLocaleString('pt-BR') : '?'}\n\n` +
          `Registros a importar:\n` +
          `  • ${(dados.clientes   || []).length} clientes\n` +
          `  • ${(dados.pedidos    || []).length} pedidos\n` +
          `  • ${(dados.financeiro || []).length} movimentações financeiras\n` +
          `  • ${(dados.produtos   || []).length} produtos\n\n` +
          `Total: ${totalRegistros} registros\n\n` +
          `Registros já existentes serão ignorados (sem duplicação).`;

        if (!confirm(confirmMsg)) return;

        showToast('⏳ Importando backup... por favor aguarde.', 'success', 30000);

        // ── Enviar para a nova API de importação do servidor ────
        const response = await fetch(`${API_BASE_URL}/importar-dados.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados)
        });

        let resultado;
        try {
          resultado = await response.json();
        } catch {
          showToast('❌ Erro: servidor retornou resposta inválida.', 'error', 8000);
          return;
        }

        if (!response.ok || resultado.error) {
          showToast('❌ Erro ao importar: ' + (resultado.error || 'Erro desconhecido'), 'error', 8000);
          return;
        }

        // ── Mostrar relatório detalhado ──────────────────────────
        const r = resultado.relatorio || {};
        const linhas = [];

        if (r.clientes)   linhas.push(`👥 Clientes:   ${r.clientes.ok} importados, ${r.clientes.pulados} já existiam`);
        if (r.produtos)   linhas.push(`📦 Produtos:   ${r.produtos.ok} importados, ${r.produtos.pulados} já existiam`);
        if (r.pedidos)    linhas.push(`📋 Pedidos:    ${r.pedidos.ok} importados, ${r.pedidos.pulados} já existiam`);
        if (r.financeiro) linhas.push(`💰 Financeiro: ${r.financeiro.ok} importados, ${r.financeiro.pulados} já existiam`);

        const totalOk = resultado.total_ok || 0;

        // Coletar erros inesperados para mostrar em console
        const errosDetalhados = [
          ...(r.clientes?.erros   || []),
          ...(r.produtos?.erros   || []),
          ...(r.pedidos?.erros    || []),
          ...(r.financeiro?.erros || []),
        ];
        if (errosDetalhados.length) {
          console.warn('[Importação] Erros inesperados:', errosDetalhados);
        }

        alert(
          `✅ Importação concluída!\n\n` +
          linhas.join('\n') +
          `\n\nTotal importado agora: ${totalOk} registros` +
          (resultado.total_pulados > 0 ? `\n(${resultado.total_pulados} já existiam e foram ignorados)` : '')
        );

        showToast(`✅ ${totalOk} registros importados com sucesso!`, 'success', 5000);
        setTimeout(() => window.location.reload(), 2000);

      } catch (err) {
        console.error('[Importação] Erro:', err);
        showToast('❌ Erro ao importar: ' + (err.message || 'Erro desconhecido'), 'error', 8000);
      }
    };

    reader.readAsText(file, 'UTF-8');
  };

  // ── Backup semanal automático ─────────────────────────────────
  function verificarBackupSemanal() {
    const ultimoBackup = localStorage.getItem('rp_ultimo_backup');
    if (!ultimoBackup) {
      localStorage.setItem('rp_ultimo_backup', new Date().toISOString());
      return;
    }
    const seteDias = 7 * 24 * 60 * 60 * 1000;
    if ((Date.now() - new Date(ultimoBackup).getTime()) > seteDias) {
      setTimeout(() => {
        showToast('📅 Backup semanal automático em andamento...', 'success', 4000);
        window.exportarDados();
      }, 4000);
    }
  }

  window.verificarBackupSemanal = verificarBackupSemanal;
  verificarBackupSemanal();

  console.log('[Raíz & Pixel] Database module carregado (MySQL/PostgreSQL via Render).');
})();
