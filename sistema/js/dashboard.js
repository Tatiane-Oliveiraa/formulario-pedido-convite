/* ═══════════════════════════════════════════════════════════════
   Raíz & Pixel — Dashboard Module
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Feriados nacionais fixos (MM-DD) ────────────────────────
  // Adicione ou remova conforme necessário
  const FERIADOS_FIXOS = [
    '01-01', // Ano Novo
    '04-21', // Tiradentes
    '05-01', // Dia do Trabalho
    '09-07', // Independência
    '10-12', // N. Sra. Aparecida
    '11-02', // Finados
    '11-15', // Proclamação da República
    '12-25', // Natal
  ];

  /**
   * Verifica se uma data é feriado nacional fixo.
   * @param {Date} date
   * @returns {boolean}
   */
  function isFeriado(date) {
    const mmdd = String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    return FERIADOS_FIXOS.includes(mmdd);
  }

  /**
   * Verifica se uma data é dia útil (seg–sex, não feriado).
   * @param {Date} date
   * @returns {boolean}
   */
  function isDiaUtil(date) {
    const dow = date.getDay(); // 0=Dom, 6=Sáb
    return dow !== 0 && dow !== 6 && !isFeriado(date);
  }

  /**
   * Calcula a data limite somando N dias úteis a partir de uma data.
   * @param {Date} inicio — Data de início (a partir do dia seguinte útil)
   * @param {number} diasUteis — Número de dias úteis a somar
   * @returns {Date} — Data limite
   */
  function somarDiasUteis(inicio, diasUteis) {
    const d = new Date(inicio);
    let contados = 0;
    while (contados < diasUteis) {
      d.setDate(d.getDate() + 1);
      if (isDiaUtil(d)) contados++;
    }
    return d;
  }

  /**
   * Conta quantos dias úteis restam entre hoje e a data limite.
   * Retorna valor negativo se já venceu.
   * @param {Date} prazoFinal
   * @returns {number}
   */
  function diasUteisRestantes(prazoFinal) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const fim = new Date(prazoFinal);
    fim.setHours(0, 0, 0, 0);

    if (fim < hoje) {
      // Vencido — conta dias úteis negativos
      let count = 0;
      const d = new Date(fim);
      while (d < hoje) {
        d.setDate(d.getDate() + 1);
        if (isDiaUtil(d)) count--;
      }
      return count;
    }

    let count = 0;
    const d = new Date(hoje);
    while (d < fim) {
      d.setDate(d.getDate() + 1);
      if (isDiaUtil(d)) count++;
    }
    return count;
  }

  /**
   * Gera o badge HTML de prazo com cores e ícone dinâmicos.
   * @param {string|null} dataFechamento — data_fechamento do pedido (YYYY-MM-DD)
   * @returns {string} HTML do badge
   */
  function buildPrazoBadge(dataFechamento) {
    if (!dataFechamento) {
      return '<span class="deadline-badge deadline-sem-data">📅 Sem data de fechamento</span>';
    }

    // Parseia sem bug de timezone
    const partes = String(dataFechamento).substring(0, 10).split('-');
    const inicio = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
    const prazoFinal = somarDiasUteis(inicio, 7);
    const restantes = diasUteisRestantes(prazoFinal);

    const prazoStr = prazoFinal.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    if (restantes < 0) {
      const atrasado = Math.abs(restantes);
      return `<span class="deadline-badge deadline-vencido">💀 Vencido há ${atrasado} dia${atrasado !== 1 ? 's' : ''} útil${atrasado !== 1 ? 'eis' : ''}</span>`;
    }
    if (restantes === 0) {
      return `<span class="deadline-badge deadline-urgente">🔴 Entrega HOJE! (${prazoStr})</span>`;
    }
    if (restantes <= 2) {
      return `<span class="deadline-badge deadline-urgente">🔴 ${restantes} dia${restantes !== 1 ? 's' : ''} útil${restantes !== 1 ? 'eis' : ''} — ${prazoStr}</span>`;
    }
    if (restantes <= 4) {
      return `<span class="deadline-badge deadline-atencao">⚠️ ${restantes} dias úteis — ${prazoStr}</span>`;
    }
    return `<span class="deadline-badge deadline-ok">✅ ${restantes} dias úteis — ${prazoStr}</span>`;
  }

  /**
   * Calcula dias até a data de repostagem e gera badge.
   * @param {string|null} dataRepostagem — data_repostagem (YYYY-MM-DD)
   * @returns {string} HTML do badge
   */
  function buildRepostBadge(dataRepostagem) {
    if (!dataRepostagem) return '<span class="deadline-badge deadline-sem-data">—</span>';

    const partes = String(dataRepostagem).substring(0, 10).split('-');
    const repost = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    repost.setHours(0, 0, 0, 0);

    const diffMs = repost - hoje;
    const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));

    const dataStr = repost.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    if (diffDias < 0) {
      return `<span class="deadline-badge deadline-vencido">💀 Atrasada ${Math.abs(diffDias)} dia${Math.abs(diffDias) !== 1 ? 's' : ''}</span>`;
    }
    if (diffDias === 0) {
      return `<span class="deadline-badge deadline-urgente">🔴 HOJE — ${dataStr}</span>`;
    }
    if (diffDias === 1) {
      return `<span class="deadline-badge deadline-urgente">🔴 AMANHÃ — ${dataStr}</span>`;
    }
    if (diffDias <= 3) {
      return `<span class="deadline-badge deadline-atencao">⚠️ Em ${diffDias} dias — ${dataStr}</span>`;
    }
    return `<span class="deadline-badge deadline-ok">📅 Em ${diffDias} dias — ${dataStr}</span>`;
  }

  /**
   * Inicializa o dashboard com as duas seções principais.
   */
  window.initDashboard = async function () {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const todayStr = now.toISOString().split('T')[0];

      // ── Buscar dados em paralelo ────────────────────────────
      const [allPedidos, financeSummary, todayFinance, repost] = await Promise.all([
        DB.pedidos.getAll(),
        DB.financeiro.getMonthSummary(year, month),
        DB.financeiro.getByDate(todayStr),
        DB.pedidos.getNeedRepost()
      ]);

      // ── Pedidos do mês ──────────────────────────────────────
      const pedidosMes = allPedidos.filter(p => {
        if (!p.created_at) return false;
        const d = new Date(p.created_at);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      });

      const pedidosNovos = pedidosMes.filter(p => p.status === 'Novo').length;

      // ── Faturamento do dia ──────────────────────────────────
      let faturamentoDia = 0;
      todayFinance.forEach(item => {
        const val = parseFloat(item.valor) || 0;
        if (item.tipo === 'entrada') faturamentoDia += val;
        else faturamentoDia -= val;
      });

      // ── Atualizar stat cards ────────────────────────────────
      updateStatCard('stat-pedidos-mes', pedidosMes.length);
      updateStatCard('stat-pedidos-novos', pedidosNovos);
      updateStatCard('stat-faturamento-mes', formatBRL(financeSummary.entradas));
      updateStatCard('stat-faturamento-dia', formatBRL(faturamentoDia));

      // ── DEBUG TEMPORÁRIO — ver no F12 → Console ─────────────
      console.log('[Dashboard] Total pedidos:', allPedidos.length);
      console.log('[Dashboard] Status de cada pedido:',
        allPedidos.map(p => ({ id: p.id, status: p.status, statusHex: [...(p.status||'')].map(c => c.charCodeAt(0).toString(16)).join(' ') }))
      );

      // ── Pedidos em Andamento (Em Produção + Aguardando Aprovação) ──
      const tbodyAndamento = document.getElementById('dashboard-pedidos-andamento');
      if (tbodyAndamento) {

        // Normaliza string para comparação segura (remove acentos, minúsculas)
        function normalizeStatus(s) {
          return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        }

        const statusAlvo = ['em producao', 'aguardando aprovacao'];

        const emAndamento = allPedidos
          .filter(p => statusAlvo.includes(normalizeStatus(p.status)))
          .sort((a, b) => {
            const getPrazo = (p) => {
              if (!p.data_fechamento) return Infinity;
              const partes = String(p.data_fechamento).substring(0, 10).split('-');
              const inicio = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
              return somarDiasUteis(inicio, 7).getTime();
            };
            return getPrazo(a) - getPrazo(b);
          });

        console.log('[Dashboard] Pedidos em andamento encontrados:', emAndamento.length);

        if (emAndamento.length === 0) {
          tbodyAndamento.innerHTML = '<tr><td colspan="4" class="dashboard-empty">🎉 Nenhum pedido em andamento no momento</td></tr>';
        } else {
          tbodyAndamento.innerHTML = emAndamento.map(p => `
            <tr class="clickable-row" onclick="showPedidoDetalhe('${p.id}')">
              <td><span class="pedido-cliente-nome">${p.cliente ? p.cliente.nome : '—'}</span></td>
              <td>${p.nome_aniversariante || '—'}</td>
              <td>${getStatusBadge(p.status)}</td>
              <td>${buildPrazoBadge(p.data_fechamento)}</td>
            </tr>
          `).join('');
        }
      }

      // ── Repostagem Pendente ──────────────────────────────────
      const tbodyRepost = document.getElementById('dashboard-repostagem');
      if (tbodyRepost) {
        if (repost.length === 0) {
          tbodyRepost.innerHTML = '<tr><td colspan="3" class="dashboard-empty">✅ Nenhuma repostagem pendente</td></tr>';
        } else {
          // Já vem ordenado por data_repostagem ASC da API
          tbodyRepost.innerHTML = repost.map(p => `
            <tr class="clickable-row" onclick="showPedidoDetalhe('${p.id}')">
              <td><span class="pedido-cliente-nome">${p.nome_aniversariante || '—'}</span></td>
              <td>${formatDate(p.data_repostagem)}</td>
              <td>${buildRepostBadge(p.data_repostagem)}</td>
            </tr>
          `).join('');
        }
      }

    } catch (err) {
      console.error('[Dashboard] Erro ao carregar:', err);
    }
  };

  /**
   * Atualiza o valor exibido em um stat card.
   */
  function updateStatCard(id, value) {
    const card = document.getElementById(id);
    if (!card) return;
    const valEl = card.querySelector('.stat-value');
    if (valEl) valEl.textContent = value;
  }

})();
