/* ═══════════════════════════════════════════════════════════════
   Raíz & Pixel — Financeiro Module
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /**
   * Inicializa o módulo financeiro com base no mês/ano selecionado.
   */
  window.initFinanceiro = async function () {
    try {
      const mesEl = document.getElementById('financeiro-mes');
      const anoEl = document.getElementById('financeiro-ano');
      if (!mesEl || !anoEl) return;

      const month = parseInt(mesEl.value);
      const year = parseInt(anoEl.value);

      const summary = await DB.financeiro.getMonthSummary(year, month);

      // ── Atualizar totalizadores ─────────────────────────────
      document.getElementById('financeiro-total-entradas').textContent = formatBRL(summary.entradas);
      document.getElementById('financeiro-total-saidas').textContent = formatBRL(summary.saidas);

      const saldoEl = document.getElementById('financeiro-saldo');
      saldoEl.textContent = formatBRL(summary.saldo);
      // Cor do saldo
      const saldoCard = document.getElementById('card-saldo');
      if (saldoCard) {
        saldoCard.classList.remove('stat-success', 'stat-danger');
        if (summary.saldo >= 0) saldoCard.classList.add('stat-success');
        else saldoCard.classList.add('stat-danger');
      }

      // ── Renderizar tabela ───────────────────────────────────
      renderFinanceiro(summary.items);

    } catch (err) {
      console.error('[Financeiro] Erro ao carregar:', err);
      showToast('Erro ao carregar financeiro', 'error');
    }
  };

  /**
   * Renderiza a tabela de movimentações financeiras.
   */
  function renderFinanceiro(items) {
    const tbody = document.getElementById('financeiro-lista');
    const emptyState = document.getElementById('financeiro-empty');
    if (!tbody) return;

    if (items.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    tbody.innerHTML = items.map(item => {
      const isEntrada = item.tipo === 'entrada';
      const tipoBadge = isEntrada
        ? '<span class="badge badge-success">Entrada</span>'
        : '<span class="badge badge-danger">Saída</span>';
      const valorClass = isEntrada ? 'text-success' : 'text-danger';
      const valorPrefix = isEntrada ? '+' : '-';
      const pedidoLink = item.pedido_id
        ? `<a href="javascript:void(0)" onclick="showPedidoDetalhe('${item.pedido_id}')" class="link-gold">Ver pedido</a>`
        : '—';

      return `
        <tr>
          <td>${formatDate(item.data)}</td>
          <td>${tipoBadge}</td>
          <td>${item.descricao || '—'}</td>
          <td>${item.categoria || '—'}</td>
          <td>${pedidoLink}</td>
          <td class="${valorClass}" style="font-weight:600;">
            ${valorPrefix} ${formatBRL(item.valor)}
          </td>
          <td>
            <button class="btn btn-sm btn-danger" onclick="excluirMovimentacao('${item.id}', '${(item.descricao || '').replace(/'/g, '')}')" title="Excluir">🗑</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Abre o modal para criar nova movimentação.
   */
  window.openModalFinanceiro = function () {
    document.getElementById('form-financeiro').reset();
    openModal('modal-financeiro');
  };

  /**
   * Salva uma nova movimentação financeira.
   * A data é SEMPRE a data de hoje.
   */
  window.salvarFinanceiro = async function () {
    const tipo = document.getElementById('input-fin-tipo').value;
    const descricao = document.getElementById('input-fin-descricao').value.trim();
    let valor = parseFloat(document.getElementById('input-fin-valor').value);
    const categoria = document.getElementById('input-fin-categoria').value;
    const isCartao = document.getElementById('input-fin-cartao')?.checked;

    if (!descricao) {
      showToast('Informe uma descrição', 'error');
      return;
    }

    if (!valor || valor <= 0) {
      showToast('Informe um valor válido', 'error');
      return;
    }

    // Se for entrada e marcou pagamento no cartão, desconta 8%
    if (tipo === 'entrada' && isCartao) {
      valor = valor * 0.92;
    }

    const today = new Date().toISOString().split('T')[0];

    try {
      await DB.financeiro.create({
        tipo,
        descricao,
        valor,
        data: today, // SEMPRE na data de HOJE
        categoria
      });

      showToast('Movimentação registrada com sucesso!');
      closeModal('modal-financeiro');
      await initFinanceiro();
    } catch (err) {
      console.error('[Financeiro] Erro ao salvar:', err);
      showToast('Erro ao salvar movimentação', 'error');
    }
  };

  /**
   * Gera o relatório mensal do mês/ano atualmente selecionado.
   */
  window.gerarRelatorioAtual = function () {
    const month = parseInt(document.getElementById('financeiro-mes').value);
    const year = parseInt(document.getElementById('financeiro-ano').value);

    if (typeof generateRelatorioMensal === 'function') {
      generateRelatorioMensal(year, month);
    }
  };

  /**
   * Exclui uma movimentação financeira após confirmação.
   */
  window.excluirMovimentacao = function (id, descricao) {
    showConfirm('Tem certeza que deseja excluir a movimentação "' + (descricao || '') + '"? Esta ação não pode ser desfeita.', async function() {
      try {
        await DB.financeiro.delete(id);
        showToast('Movimentação excluída com sucesso!');
        await initFinanceiro();
      } catch (err) {
        console.error('[Financeiro] Erro ao excluir:', err);
        showToast('Erro ao excluir movimentação', 'error');
      }
    });
  };

})();
