/* ═══════════════════════════════════════════════════════════════
   Raíz & Pixel — Pedidos Module
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  let _allPedidos = [];
  const CARD_SURCHARGE_RATE = 0.08;

  /**
   * Inicializa a lista de pedidos.
   */
  window.initPedidos = async function () {
    try {
      _allPedidos = await DB.pedidos.getAll();
      renderPedidos(_allPedidos);
    } catch (err) {
      console.error('[Pedidos] Erro ao carregar:', err);
      showToast('Erro ao carregar pedidos', 'error');
    }
  };

  /**
   * Renderiza a tabela de pedidos.
   */
  function renderPedidos(pedidos) {
    const tbody = document.getElementById('pedidos-lista');
    const emptyState = document.getElementById('pedidos-empty');
    if (!tbody) return;

    if (pedidos.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    tbody.innerHTML = pedidos.map(p => `
      <tr class="clickable-row" onclick="showPedidoDetalhe('${p.id}')">
        <td>${p.cliente ? p.cliente.nome : '—'}</td>
        <td>${p.nome_aniversariante || '—'}</td>
        <td>${formatDate(p.data_evento)}</td>
        <td>${p.modelo || '—'}</td>
        <td>${getStatusBadge(p.status)}</td>
        <td>${formatBRL(p.valor_total)}</td>
        <td>
          <div class="action-btns">
            <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); showPedidoDetalhe('${p.id}')" title="Ver">👁</button>
            <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); excluirPedido('${p.id}', '${(p.nome_aniversariante || '').replace(/'/g, '')}')" title="Excluir">🗑</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  /**
   * Filtra pedidos por busca e status.
   */
  window.filterPedidos = function () {
    const term = (document.getElementById('pedidos-search')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('pedidos-filtro-status')?.value || '';

    let filtered = _allPedidos;

    if (statusFilter) {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    if (term) {
      filtered = filtered.filter(p => {
        const clienteNome = (p.cliente?.nome || '').toLowerCase();
        const aniversariante = (p.nome_aniversariante || '').toLowerCase();
        const modelo = (p.modelo || '').toLowerCase();
        const tema = (p.tema_festa || '').toLowerCase();
        return clienteNome.includes(term) || aniversariante.includes(term) ||
               modelo.includes(term) || tema.includes(term);
      });
    }

    renderPedidos(filtered);
  };

  /**
   * Abre o modal para criar um novo pedido manual.
   * Carrega produtos do banco de dados para popular modelos e complementos.
   */
  window.openModalPedido = async function () {
    // Popular select de clientes
    try {
      const clientes = await DB.clientes.getAll();
      const selectCliente = document.getElementById('input-pedido-cliente');
      selectCliente.innerHTML = '<option value="">Selecione uma cliente...</option>';
      clientes.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.nome} — ${formatCPF(c.cpf)}`;
        opt.dataset.telefone = c.telefone || '';
        selectCliente.appendChild(opt);
      });
    } catch (err) {
      console.error('[Pedidos] Erro ao carregar clientes:', err);
    }

    // Popular modelos do banco de dados
    try {
      const modelos = await DB.produtos.getByCategoria('modelo');
      const selectModelo = document.getElementById('input-pedido-modelo');
      selectModelo.innerHTML = '<option value="" data-price="0">Selecione um modelo...</option>';

      // Agrupar por subcategoria
      const adultos = modelos.filter(m => m.subcategoria === 'adulto');
      const infantis = modelos.filter(m => m.subcategoria === 'infantil');
      const outros = modelos.filter(m => !m.subcategoria || (m.subcategoria !== 'adulto' && m.subcategoria !== 'infantil'));

      if (adultos.length) {
        const group = document.createElement('optgroup');
        group.label = 'Coleção 15 Anos/Casamento/Festas em Geral';
        adultos.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m.nome;
          opt.dataset.price = m.preco;
          opt.textContent = `${m.nome} - ${formatBRL(m.preco)}`;
          group.appendChild(opt);
        });
        selectModelo.appendChild(group);
      }
      if (infantis.length) {
        const group = document.createElement('optgroup');
        group.label = 'Coleção Infantil';
        infantis.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m.nome;
          opt.dataset.price = m.preco;
          opt.textContent = `${m.nome} - ${formatBRL(m.preco)}`;
          group.appendChild(opt);
        });
        selectModelo.appendChild(group);
      }
      outros.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.nome;
        opt.dataset.price = m.preco;
        opt.textContent = `${m.nome} - ${formatBRL(m.preco)}`;
        selectModelo.appendChild(opt);
      });
    } catch (err) {
      console.error('[Pedidos] Erro ao carregar modelos:', err);
      // mantém o HTML estático como fallback
    }

    // Popular complementos do banco de dados
    try {
      const complementos = await DB.produtos.getByCategoria('complemento');
      const container = document.getElementById('modal-complementos-container');
      if (container && complementos.length) {
        container.innerHTML = complementos.map(c => `
          <label>
            <input type="checkbox" class="modal-comp-checkbox" data-price="${c.preco}" data-nome="${c.nome}" />
            ${c.nome} (${c.preco > 0 ? formatBRL(c.preco) : 'Gratuito'})
          </label>
        `).join('');
      }
    } catch (err) {
      console.error('[Pedidos] Erro ao carregar complementos:', err);
    }

    // Popular álbuns do banco de dados
    try {
      const albuns = await DB.produtos.getByCategoria('album');
      const selectAlbum = document.getElementById('input-pedido-album-fotos');
      if (selectAlbum && albuns.length) {
        selectAlbum.innerHTML = '<option value="Nenhum" data-price="0">Nenhum</option>';
        albuns.forEach(a => {
          const opt = document.createElement('option');
          opt.value = a.nome;
          opt.dataset.price = a.preco;
          opt.textContent = `${a.nome} - ${formatBRL(a.preco)}`;
          selectAlbum.appendChild(opt);
        });
      }
    } catch (err) {
      console.error('[Pedidos] Erro ao carregar álbuns:', err);
    }

    // Popular tipos de confirmação do banco de dados
    try {
      const confirmacoes = await DB.produtos.getByCategoria('confirmacao');
      const selectConf = document.getElementById('input-pedido-tipo-confirmacao');
      if (selectConf && confirmacoes.length) {
        selectConf.innerHTML = '<option value="">Selecione...</option>';
        confirmacoes.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.nome;
          opt.dataset.price = c.preco;
          opt.textContent = `${c.nome}${c.preco > 0 ? ' - ' + formatBRL(c.preco) : ' (sem custo)'}`;
          selectConf.appendChild(opt);
        });
      }
    } catch (err) {
      console.error('[Pedidos] Erro ao carregar confirmações:', err);
    }

    // Limpar formulário
    document.getElementById('form-pedido').reset();
    openModal('modal-pedido');
  };

  /**
   * Salva um novo pedido manual.
   */
  window.salvarNovoPedido = async function () {
    const btnSalvar = document.getElementById('btn-salvar-novo-pedido');

    const clienteId = document.getElementById('input-pedido-cliente').value;
    if (!clienteId) {
      showToast('Selecione uma cliente', 'error');
      return;
    }

    // Desabilitar botão para evitar cliques duplos
    if (btnSalvar) {
      btnSalvar.disabled = true;
      btnSalvar.textContent = 'Salvando...';
    }

    try {
      // Coletar modelo e preço
      const modeloSelect = document.getElementById('input-pedido-modelo');
      const modeloOption = modeloSelect.options[modeloSelect.selectedIndex];
      // Se é a opção placeholder (value vazio), não usa o texto dela
      const modeloText = (modeloOption && modeloOption.value) ? modeloOption.text : '';
      const modeloPrice = parseFloat(modeloOption?.dataset?.price || 0);

      // Coletar botões interativos
      const botoes = [];
      document.querySelectorAll('.modal-botao-checkbox:checked').forEach(cb => {
        botoes.push(cb.value);
      });

      // Coletar complementos
      const complementos = [];
      let complementosPrice = 0;
      document.querySelectorAll('.modal-comp-checkbox:checked').forEach(cb => {
        const nomeComp = cb.dataset.nome || cb.parentElement.textContent.trim();
        complementos.push(nomeComp);
        complementosPrice += parseFloat(cb.dataset.price || 0);
      });

      // Álbum de fotos
      const albumSel = document.getElementById('input-pedido-album-fotos');
      const albumOption = albumSel ? albumSel.options[albumSel.selectedIndex] : null;
      const albumPrice = parseFloat(albumOption?.dataset?.price || 0);

      // Confirmação de presença tipo
      const tipoConfSel = document.getElementById('input-pedido-tipo-confirmacao');
      const tipoConfOption = tipoConfSel ? tipoConfSel.options[tipoConfSel.selectedIndex] : null;
      const tipoConfPrice = parseFloat(tipoConfOption?.dataset?.price || 0);

      // Calcular total
      const subtotal = modeloPrice + complementosPrice + albumPrice + tipoConfPrice;
      const pagamentoEl = document.querySelector('input[name="modal-pagamento"]:checked');
      const pagamento = pagamentoEl ? pagamentoEl.value : 'Pix';
      const isCartao = pagamento === 'Cartão';
      const total = isCartao ? subtotal * (1 + CARD_SURCHARGE_RATE) : subtotal;

      // Coletar e validar data/hora
      const dataEvento = document.getElementById('input-pedido-data-evento').value || null;
      const horaEvento = document.getElementById('input-pedido-hora-evento').value || null;

      if (!dataEvento) {
        showToast('Informe a data do evento', 'error');
        if (btnSalvar) { btnSalvar.disabled = false; btnSalvar.textContent = 'Criar Pedido'; }
        return;
      }
      if (!horaEvento) {
        showToast('Informe o horário do evento', 'error');
        if (btnSalvar) { btnSalvar.disabled = false; btnSalvar.textContent = 'Criar Pedido'; }
        return;
      }

      const pedidoData = {
        cliente_id: clienteId,
        nome_aniversariante: document.getElementById('input-pedido-aniversariante').value || '',
        data_evento: dataEvento,
        hora_evento: horaEvento,
        local_evento: document.getElementById('input-pedido-local-evento').value || '',
        tema_festa: document.getElementById('input-pedido-tema-festa').value || '',
        trilha_sonora: document.getElementById('input-pedido-trilha-sonora').value || '',
        dress_code: document.getElementById('input-pedido-dress-code').value || '',
        paleta_cores: document.getElementById('input-pedido-paleta-cores').value || '',
        confirmacao_presenca: document.getElementById('input-pedido-confirmacao-presenca').value || '',
        whatsapp_confirmacao: document.getElementById('input-pedido-whatsapp-confirmacao').value || '',
        sugestoes_presente: document.getElementById('input-pedido-sugestoes-presente').value || '',
        chave_pix: document.getElementById('input-pedido-chave-pix').value || '',
        outros_detalhes: document.getElementById('input-pedido-outros-detalhes').value || '',
        observacoes: document.getElementById('input-pedido-observacoes').value || '',
        modelo: modeloText,
        botoes_interativos: botoes.join(', '),
        complementos: complementos.join(', '),
        album_fotos: (function() {
          const albumSel = document.getElementById('input-pedido-album-fotos');
          return albumSel ? albumSel.value : 'Nenhum';
        })(),
        tipo_confirmacao: (function() {
          const tipoConf = document.getElementById('input-pedido-tipo-confirmacao');
          return tipoConf ? tipoConf.value : '';
        })(),
        forma_pagamento: pagamento,
        subtotal: subtotal,
        valor_total: total,
        aceite_termos: false,
        texto_termos: 'Pedido cadastrado manualmente',
        status: 'Novo'
      };

      console.log('[Pedidos] Criando pedido manual:', pedidoData);
      await DB.pedidos.create(pedidoData);
      showToast('Pedido criado com sucesso!');
      closeModal('modal-pedido');
      await initPedidos();
    } catch (err) {
      console.error('[Pedidos] Erro ao criar pedido:', err);
      showToast('Erro ao criar pedido: ' + (err.message || 'Erro desconhecido'), 'error');
    } finally {
      // Reabilitar botão
      if (btnSalvar) {
        btnSalvar.disabled = false;
        btnSalvar.textContent = 'Criar Pedido';
      }
    }
  };

  /**
   * Exibe os detalhes de um pedido.
   */
  window.showPedidoDetalhe = async function (id) {
    try {
      const pedido = await DB.pedidos.getById(id);
      if (!pedido) {
        showToast('Pedido não encontrado', 'error');
        return;
      }

      window._currentPedido = pedido;
      window._originalStatus = pedido.status;

      // ── Preencher dados readonly (coluna esquerda) ──────────
      document.getElementById('detalhe-pedido-titulo').textContent =
        `Pedido — ${pedido.nome_aniversariante || 'Sem nome'}`;

      document.getElementById('pedido-cliente-nome').textContent = pedido.cliente?.nome || '—';
      document.getElementById('pedido-cliente-cpf').textContent = formatCPF(pedido.cliente?.cpf);
      document.getElementById('pedido-cliente-telefone').textContent = pedido.cliente?.telefone || '—';
      document.getElementById('pedido-aniversariante').textContent = pedido.nome_aniversariante || '—';
      document.getElementById('pedido-data-evento').textContent = formatDate(pedido.data_evento);
      document.getElementById('pedido-hora').textContent = pedido.hora_evento || '—';
      document.getElementById('pedido-local').textContent = pedido.local_evento || '—';
      document.getElementById('pedido-tema').textContent = pedido.tema_festa || '—';
      document.getElementById('pedido-trilha').textContent = pedido.trilha_sonora || '—';
      document.getElementById('pedido-dresscode').textContent = pedido.dress_code || '—';
      document.getElementById('pedido-paleta').textContent = pedido.paleta_cores || '—';
      document.getElementById('pedido-confirmacao').textContent = pedido.confirmacao_presenca || '—';
      document.getElementById('pedido-whatsapp-conf').textContent = pedido.whatsapp_confirmacao || '—';
      document.getElementById('pedido-mensagem-confirmacao').textContent = pedido.mensagem_confirmacao || '—';
      document.getElementById('pedido-sugestoes').textContent = pedido.sugestoes_presente || '—';
      document.getElementById('pedido-chave-pix-info').textContent = pedido.chave_pix || '—';
      document.getElementById('pedido-cores-convite').textContent = pedido.cores_convite || '—';
      document.getElementById('pedido-manual-convidado').textContent = pedido.manual_convidado || '—';
      document.getElementById('pedido-outros').textContent = pedido.outros_detalhes || '—';
      document.getElementById('pedido-observacoes-cliente').textContent = pedido.observacoes || '—';
      document.getElementById('pedido-modelo').textContent = pedido.modelo || '—';
      document.getElementById('pedido-botoes').textContent = pedido.botoes_interativos || 'Nenhum';
      document.getElementById('pedido-complementos').textContent = pedido.complementos || 'Nenhum';
      document.getElementById('pedido-pagamento').textContent = pedido.forma_pagamento || '—';
      document.getElementById('pedido-subtotal').textContent = formatBRL(pedido.subtotal);
      document.getElementById('pedido-valor-total-info').textContent = formatBRL(pedido.valor_total);

      // ── Preencher campos editáveis (coluna direita) ─────────
      document.getElementById('pedido-status').value = pedido.status || 'Novo';
      document.getElementById('pedido-valor-sinal').value = pedido.valor_sinal || '';
      document.getElementById('pedido-valor-restante').value = pedido.valor_restante || '';
      document.getElementById('pedido-link-canva').value = pedido.link_canva || '';
      document.getElementById('pedido-link-convite').value = pedido.link_convite || '';
      document.getElementById('pedido-precisa-repostar').value = pedido.precisa_repostar ? 'true' : 'false';
      document.getElementById('pedido-data-repostagem').value = pedido.data_repostagem || '';
      document.getElementById('pedido-observacoes-internas').value = pedido.observacoes_internas || '';
      // Campo de edição direta do valor total
      const valorTotalEdit = document.getElementById('pedido-valor-total-edit');
      if (valorTotalEdit) valorTotalEdit.value = parseFloat(pedido.valor_total) || '';

      // ── Carregar e renderizar itens extras ──────────────────
      window._currentItensExtras = parseItensExtras(pedido.itens_extras);
      renderItensExtras();
      recalcularTotalComExtras();

      // Mostrar/ocultar campos condicionais
      onStatusChange();
      toggleRepostagem();

      // Navegar para seção
      document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
      document.getElementById('section-pedido-detalhe').classList.add('active');
      document.querySelectorAll('.sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));

    } catch (err) {
      console.error('[Pedidos] Erro ao carregar detalhe:', err);
      showToast('Erro ao carregar pedido', 'error');
    }
  };

  /**
   * Salva as alterações do pedido (status, valores, links, etc.)
   * e cria entradas financeiras automáticas quando necessário.
   */
  window.salvarPedidoDetalhe = async function () {
    const pedido = window._currentPedido;
    if (!pedido) return;

    const novoStatus = document.getElementById('pedido-status').value;
    const valorSinal = parseFloat(document.getElementById('pedido-valor-sinal').value) || 0;
    const valorRestante = parseFloat(document.getElementById('pedido-valor-restante').value) || 0;
    const today = new Date().toISOString().split('T')[0];

    // Validação: status Fechado precisa de valor de sinal
    if (novoStatus === 'Fechado' && window._originalStatus !== 'Fechado' && valorSinal <= 0) {
      showToast('Informe o valor do sinal para fechar o pedido', 'error');
      return;
    }

    const updates = {
      status: novoStatus,
      valor_sinal: valorSinal,
      valor_restante: valorRestante,
      link_canva: document.getElementById('pedido-link-canva').value || null,
      link_convite: document.getElementById('pedido-link-convite').value || null,
      precisa_repostar: document.getElementById('pedido-precisa-repostar').value === 'true',
      data_repostagem: document.getElementById('pedido-data-repostagem').value || null,
      observacoes_internas: document.getElementById('pedido-observacoes-internas').value || '',
      itens_extras: JSON.stringify(window._currentItensExtras || []),
      valor_total: (function() {
        // Se o usuário editou diretamente o valor total, usa esse valor
        const inputManual = parseFloat(document.getElementById('pedido-valor-total-edit')?.value);
        if (!isNaN(inputManual) && inputManual >= 0) return inputManual;
        return calcularNovoTotal();
      })()
    };

    // Data de fechamento (quando status muda para Fechado)
    if (novoStatus === 'Fechado' && window._originalStatus !== 'Fechado') {
      updates.data_fechamento = today;
    }

    // Data de entrega (quando status muda para Entregue)
    if (novoStatus === 'Entregue' && window._originalStatus !== 'Entregue') {
      updates.data_entrega = today;
    }

    try {
      await DB.pedidos.update(pedido.id, updates);

      // ── Entrada financeira automática: SINAL ────────────────
      // Só cria se o status MUDOU para Fechado (não se já era Fechado)
      if (novoStatus === 'Fechado' && window._originalStatus !== 'Fechado' && valorSinal > 0) {
        const clienteNome = pedido.cliente?.nome || 'Cliente';
        const aniversariante = pedido.nome_aniversariante || 'Pedido';
        
        // Verifica se a forma de pagamento é Cartão para descontar 8% apenas no financeiro
        const valorLiquidoSinal = pedido.forma_pagamento === 'Cartão' ? valorSinal * 0.92 : valorSinal;
        
        await DB.financeiro.create({
          tipo: 'entrada',
          descricao: `Sinal — ${aniversariante} (${clienteNome})`,
          valor: valorLiquidoSinal,
          data: today, // SEMPRE na data de HOJE
          pedido_id: pedido.id,
          categoria: 'Sinal'
        });
        showToast(`Sinal registrado no financeiro (${pedido.forma_pagamento === 'Cartão' ? 'Taxa do cartão descontada' : 'Valor integral'})`);
      }

      // ── Entrada financeira automática: ENTREGA ──────────────
      if (novoStatus === 'Entregue' && window._originalStatus !== 'Entregue' && valorRestante > 0) {
        const clienteNome = pedido.cliente?.nome || 'Cliente';
        const aniversariante = pedido.nome_aniversariante || 'Pedido';
        
        // Verifica se a forma de pagamento é Cartão para descontar 8% apenas no financeiro
        const valorLiquidoRestante = pedido.forma_pagamento === 'Cartão' ? valorRestante * 0.92 : valorRestante;

        await DB.financeiro.create({
          tipo: 'entrada',
          descricao: `Entrega — ${aniversariante} (${clienteNome})`,
          valor: valorLiquidoRestante,
          data: today, // SEMPRE na data de HOJE
          pedido_id: pedido.id,
          categoria: 'Entrega Final'
        });
        showToast(`Valor restante registrado no financeiro (${pedido.forma_pagamento === 'Cartão' ? 'Taxa do cartão descontada' : 'Valor integral'})`);
      }

      // ── Lembrete Google Calendar: REPOSTAGEM ────────────────
      if (updates.precisa_repostar && updates.data_repostagem) {
        const aniversariante = pedido.nome_aniversariante || 'Sem nome';
        const clienteNome = pedido.cliente?.nome || 'Cliente';
        const modelo = pedido.modelo || '';
        const linkConvite = document.getElementById('pedido-link-convite').value || '';

        // Formatar data para Google Calendar (all-day event: YYYYMMDD/YYYYMMDD+1)
        const dataRepost = updates.data_repostagem.replace(/-/g, '');
        // Calcular o dia seguinte para o formato all-day
        const dObj = new Date(updates.data_repostagem + 'T12:00:00');
        dObj.setDate(dObj.getDate() + 1);
        const nextDay = dObj.getFullYear() +
          String(dObj.getMonth() + 1).padStart(2, '0') +
          String(dObj.getDate()).padStart(2, '0');

        const titulo = `🔄 Repostar convite — ${aniversariante}`;
        let descricao = `Cliente: ${clienteNome}\nAniversariante: ${aniversariante}`;
        if (modelo) descricao += `\nModelo: ${modelo}`;
        if (linkConvite) descricao += `\nLink do convite: ${linkConvite}`;
        descricao += `\n\nLembrete automático gerado pelo sistema Raíz & Pixel.`;

        const gcalUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
          + '&text=' + encodeURIComponent(titulo)
          + '&dates=' + dataRepost + '/' + nextDay
          + '&details=' + encodeURIComponent(descricao);

        // Criar link clicável visível para evitar bloqueio de popup
        const gcalLink = document.createElement('div');
        gcalLink.className = 'gcal-toast-link';
        gcalLink.innerHTML = '<a href="' + gcalUrl + '" target="_blank" rel="noopener" style="color:#fff;text-decoration:underline;font-weight:bold;">📅 Clique aqui para adicionar ao Google Agenda</a>';
        gcalLink.style.cssText = 'background:#1a73e8;color:#fff;padding:14px 20px;border-radius:10px;margin-top:10px;text-align:center;cursor:pointer;position:fixed;bottom:90px;right:24px;z-index:10000;box-shadow:0 4px 16px rgba(0,0,0,.3);max-width:360px;animation:fadeIn .3s;';
        document.body.appendChild(gcalLink);
        // Auto-remover após 15 segundos
        setTimeout(() => { if (gcalLink.parentNode) gcalLink.parentNode.removeChild(gcalLink); }, 15000);
        showToast('Link do Google Agenda criado! Clique no botão azul abaixo.', 'success');
      }

      showToast('Pedido atualizado com sucesso!');

      // Atualizar o pedido no contexto
      window._currentPedido = await DB.pedidos.getById(pedido.id);
      window._originalStatus = novoStatus;

    } catch (err) {
      console.error('[Pedidos] Erro ao salvar:', err);
      showToast('Erro ao salvar pedido', 'error');
    }
  };

  /**
   * Exclui um pedido após confirmação.
   */
  window.excluirPedido = function (id, nome) {
    showConfirm('Tem certeza que deseja excluir o pedido "' + (nome || 'este pedido') + '"? Esta ação não pode ser desfeita.', async function() {
      try {
        await DB.pedidos.delete(id);
        showToast('Pedido excluído com sucesso!');
        // Se estava na tela de detalhe, voltar para lista
        if (window._currentPedido && window._currentPedido.id === id) {
          window._currentPedido = null;
          showSection('pedidos');
        }
        await initPedidos();
      } catch (err) {
        console.error('[Pedidos] Erro ao excluir:', err);
        showToast('Erro ao excluir pedido', 'error');
      }
    });
  };

  // ═══════════════════════════════════════════════════════════════
  //  ITENS EXTRAS — Funções de gerenciamento
  // ═══════════════════════════════════════════════════════════════

  /**
   * Faz o parse do JSON de itens extras do banco.
   */
  function parseItensExtras(jsonStr) {
    if (!jsonStr) return [];
    try {
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Renderiza a lista de itens extras na tela de detalhe.
   */
  function renderItensExtras() {
    const container = document.getElementById('lista-itens-extras');
    if (!container) return;

    const extras = window._currentItensExtras || [];

    if (extras.length === 0) {
      container.innerHTML = '<div class="extras-empty">Nenhum item extra adicionado</div>';
      return;
    }

    container.innerHTML = extras.map(function(item, index) {
      return '<div class="extras-item">' +
        '<div class="extras-item-info">' +
          '<span class="extras-item-desc">' + (item.descricao || '—') + '</span>' +
          '<span class="extras-item-valor">' + formatBRL(item.valor) + '</span>' +
        '</div>' +
        '<button class="btn btn-sm btn-danger extras-item-remove" onclick="removerItemExtra(' + index + ')" title="Remover">' +
          '✕' +
        '</button>' +
      '</div>';
    }).join('');
  }

  /**
   * Recalcula os totais exibidos na seção de extras.
   */
  function recalcularTotalComExtras() {
    const pedido = window._currentPedido;
    if (!pedido) return;

    const subtotalOriginal = parseFloat(pedido.subtotal) || 0;
    const extras = window._currentItensExtras || [];
    let totalExtras = 0;
    extras.forEach(function(item) {
      totalExtras += parseFloat(item.valor) || 0;
    });

    const novoSubtotal = subtotalOriginal + totalExtras;
    const isCartao = pedido.forma_pagamento === 'Cartão';
    const novoTotal = isCartao ? novoSubtotal * (1 + CARD_SURCHARGE_RATE) : novoSubtotal;

    document.getElementById('extras-subtotal-original').textContent = formatBRL(subtotalOriginal);
    document.getElementById('extras-total-extras').textContent = formatBRL(totalExtras);
    document.getElementById('extras-novo-total').textContent = formatBRL(novoTotal);

    // Atualizar o total exibido na coluna esquerda
    document.getElementById('pedido-valor-total-info').textContent = formatBRL(novoTotal);
  }

  /**
   * Calcula o novo valor total considerando os itens extras.
   * Usado ao salvar.
   */
  function calcularNovoTotal() {
    const pedido = window._currentPedido;
    if (!pedido) return 0;

    const subtotalOriginal = parseFloat(pedido.subtotal) || 0;
    const extras = window._currentItensExtras || [];
    let totalExtras = 0;
    extras.forEach(function(item) {
      totalExtras += parseFloat(item.valor) || 0;
    });

    const novoSubtotal = subtotalOriginal + totalExtras;
    const isCartao = pedido.forma_pagamento === 'Cartão';
    return isCartao ? novoSubtotal * (1 + CARD_SURCHARGE_RATE) : novoSubtotal;
  }

  /**
   * Adiciona um item extra à lista.
   */
  window.adicionarItemExtra = function () {
    const descInput = document.getElementById('input-extra-descricao');
    const valorInput = document.getElementById('input-extra-valor');

    const descricao = descInput.value.trim();
    const valor = parseFloat(valorInput.value);

    if (!descricao) {
      showToast('Informe a descrição do serviço extra', 'error');
      descInput.focus();
      return;
    }

    if (!valor || valor <= 0) {
      showToast('Informe um valor válido', 'error');
      valorInput.focus();
      return;
    }

    if (!window._currentItensExtras) {
      window._currentItensExtras = [];
    }

    window._currentItensExtras.push({
      descricao: descricao,
      valor: valor
    });

    // Limpar inputs
    descInput.value = '';
    valorInput.value = '';
    descInput.focus();

    // Re-renderizar
    renderItensExtras();
    recalcularTotalComExtras();

    showToast('Item extra adicionado! Clique em "Salvar Alterações" para confirmar.', 'success');
  };

  /**
   * Remove um item extra da lista.
   */
  window.removerItemExtra = function (index) {
    if (!window._currentItensExtras) return;

    window._currentItensExtras.splice(index, 1);
    renderItensExtras();
    recalcularTotalComExtras();

    showToast('Item removido! Clique em "Salvar Alterações" para confirmar.', 'success');
  };

  // ═══════════════════════════════════════════════════════════════
  //  EDITAR PEDIDO — Funções de edição dos dados do formulário
  // ═══════════════════════════════════════════════════════════════

  /**
   * Abre o modal de edição pré-preenchido com os dados atuais do pedido.
   */
  window.openEditarPedido = function () {
    const pedido = window._currentPedido;
    if (!pedido) {
      showToast('Nenhum pedido selecionado', 'error');
      return;
    }

    // Preencher todos os campos do modal de edição
    document.getElementById('edit-aniversariante').value = pedido.nome_aniversariante || '';
    document.getElementById('edit-data-evento').value = pedido.data_evento || '';
    document.getElementById('edit-hora-evento').value = pedido.hora_evento || '';
    document.getElementById('edit-local-evento').value = pedido.local_evento || '';
    document.getElementById('edit-tema-festa').value = pedido.tema_festa || '';
    document.getElementById('edit-trilha-sonora').value = pedido.trilha_sonora || '';
    document.getElementById('edit-dress-code').value = pedido.dress_code || '';
    document.getElementById('edit-paleta-cores').value = pedido.paleta_cores || '';
    document.getElementById('edit-cores-convite').value = pedido.cores_convite || '';
    document.getElementById('edit-confirmacao-presenca').value = pedido.confirmacao_presenca || '';
    document.getElementById('edit-whatsapp-confirmacao').value = pedido.whatsapp_confirmacao || '';
    document.getElementById('edit-mensagem-confirmacao').value = pedido.mensagem_confirmacao || '';
    document.getElementById('edit-sugestoes-presente').value = pedido.sugestoes_presente || '';
    document.getElementById('edit-chave-pix').value = pedido.chave_pix || '';
    document.getElementById('edit-manual-convidado').value = pedido.manual_convidado || '';
    document.getElementById('edit-outros-detalhes').value = pedido.outros_detalhes || '';
    document.getElementById('edit-observacoes').value = pedido.observacoes || '';
    document.getElementById('edit-botoes-interativos').value = pedido.botoes_interativos || '';
    document.getElementById('edit-complementos').value = pedido.complementos || '';
    document.getElementById('edit-subtotal').value = pedido.subtotal || '';

    // Selecionar modelo atual
    const editModelo = document.getElementById('edit-modelo');
    const modeloValue = pedido.modelo || '';
    let found = false;
    for (let i = 0; i < editModelo.options.length; i++) {
      // Match by comparing the option text (which includes price) or value
      if (editModelo.options[i].value === modeloValue ||
          editModelo.options[i].text.indexOf(modeloValue) !== -1) {
        editModelo.selectedIndex = i;
        found = true;
        break;
      }
    }
    if (!found) editModelo.selectedIndex = 0;

    // Selecionar álbum atual
    const editAlbum = document.getElementById('edit-album-fotos');
    const albumValue = pedido.album_fotos || 'Nenhum';
    for (let i = 0; i < editAlbum.options.length; i++) {
      if (editAlbum.options[i].value === albumValue) {
        editAlbum.selectedIndex = i;
        break;
      }
    }

    // Selecionar forma de pagamento
    const editPagamento = document.getElementById('edit-forma-pagamento');
    editPagamento.value = pedido.forma_pagamento || 'Pix';

    openModal('modal-editar-pedido');
  };

  /**
   * Salva os dados editados do pedido.
   */
  window.salvarEdicaoPedido = async function () {
    const pedido = window._currentPedido;
    if (!pedido) return;

    const btnSalvar = document.getElementById('btn-salvar-edicao-pedido');
    if (btnSalvar) {
      btnSalvar.disabled = true;
      btnSalvar.textContent = 'Salvando...';
    }

    try {
      const modeloSelect = document.getElementById('edit-modelo');
      const modeloOption = modeloSelect.options[modeloSelect.selectedIndex];
      const modeloNome = modeloOption ? modeloOption.value : '';

      const subtotal = parseFloat(document.getElementById('edit-subtotal').value) || 0;
      const formaPagamento = document.getElementById('edit-forma-pagamento').value;
      const isCartao = formaPagamento === 'Cartão';

      // Calcular novo total com extras
      const extras = window._currentItensExtras || [];
      let totalExtras = 0;
      extras.forEach(function(item) {
        totalExtras += parseFloat(item.valor) || 0;
      });
      const novoSubtotal = subtotal + totalExtras;
      const novoTotal = isCartao ? novoSubtotal * (1 + CARD_SURCHARGE_RATE) : novoSubtotal;

      const updates = {
        nome_aniversariante: document.getElementById('edit-aniversariante').value || '',
        data_evento: document.getElementById('edit-data-evento').value || null,
        hora_evento: document.getElementById('edit-hora-evento').value || null,
        local_evento: document.getElementById('edit-local-evento').value || '',
        tema_festa: document.getElementById('edit-tema-festa').value || '',
        trilha_sonora: document.getElementById('edit-trilha-sonora').value || '',
        dress_code: document.getElementById('edit-dress-code').value || '',
        paleta_cores: document.getElementById('edit-paleta-cores').value || '',
        cores_convite: document.getElementById('edit-cores-convite').value || '',
        confirmacao_presenca: document.getElementById('edit-confirmacao-presenca').value || '',
        whatsapp_confirmacao: document.getElementById('edit-whatsapp-confirmacao').value || '',
        mensagem_confirmacao: document.getElementById('edit-mensagem-confirmacao').value || '',
        sugestoes_presente: document.getElementById('edit-sugestoes-presente').value || '',
        chave_pix: document.getElementById('edit-chave-pix').value || '',
        manual_convidado: document.getElementById('edit-manual-convidado').value || '',
        outros_detalhes: document.getElementById('edit-outros-detalhes').value || '',
        observacoes: document.getElementById('edit-observacoes').value || '',
        modelo: modeloNome,
        botoes_interativos: document.getElementById('edit-botoes-interativos').value || '',
        complementos: document.getElementById('edit-complementos').value || '',
        album_fotos: document.getElementById('edit-album-fotos').value || 'Nenhum',
        forma_pagamento: formaPagamento,
        subtotal: subtotal,
        valor_total: novoTotal,
        itens_extras: JSON.stringify(extras)
      };

      await DB.pedidos.update(pedido.id, updates);
      showToast('Dados do pedido atualizados com sucesso!');
      closeModal('modal-editar-pedido');

      // Recarregar detalhe para refletir mudanças
      await showPedidoDetalhe(pedido.id);

    } catch (err) {
      console.error('[Pedidos] Erro ao salvar edição:', err);
      showToast('Erro ao salvar edição: ' + (err.message || 'Erro desconhecido'), 'error');
    } finally {
      if (btnSalvar) {
        btnSalvar.disabled = false;
        btnSalvar.textContent = 'Salvar Edição';
      }
    }
  };

})();
