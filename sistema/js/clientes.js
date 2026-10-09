/* ═══════════════════════════════════════════════════════════════
   Raíz & Pixel — Clientes Module
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  let _allClientes = [];
  let _clientePedidosCount = {};
  let _editingClienteId = null;

  /**
   * Inicializa a lista de clientes.
   */
  window.initClientes = async function () {
    try {
      _allClientes = await DB.clientes.getAll();

      // Buscar contagem de pedidos por cliente
      const pedidos = await DB.pedidos.getAll();
      _clientePedidosCount = {};
      pedidos.forEach(p => {
        if (p.cliente_id) {
          _clientePedidosCount[p.cliente_id] = (_clientePedidosCount[p.cliente_id] || 0) + 1;
        }
      });

      renderClientes(_allClientes);
    } catch (err) {
      console.error('[Clientes] Erro ao carregar:', err);
      showToast('Erro ao carregar clientes', 'error');
    }
  };

  /**
   * Renderiza a tabela de clientes.
   */
  function renderClientes(clientes) {
    const tbody = document.getElementById('clientes-lista');
    const emptyState = document.getElementById('clientes-empty');
    if (!tbody) return;

    if (clientes.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    tbody.innerHTML = clientes.map(c => `
      <tr>
        <td><strong>${c.nome}</strong></td>
        <td>${formatCPF(c.cpf)}</td>
        <td>${formatDate(c.created_at)}</td>
        <td>${_clientePedidosCount[c.id] || 0}</td>
        <td>
          <div class="action-btns">
            <button class="btn btn-sm btn-secondary" onclick="showClienteDetalhe('${c.id}')" title="Ver detalhes">👁</button>
            <button class="btn btn-sm btn-secondary" onclick="editarCliente('${c.id}')" title="Editar">✏️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  /**
   * Filtra clientes pelo termo de busca.
   */
  window.filterClientes = function () {
    const term = (document.getElementById('clientes-search')?.value || '').toLowerCase().trim();
    if (!term) {
      renderClientes(_allClientes);
      return;
    }
    const filtered = _allClientes.filter(c => {
      const nome = (c.nome || '').toLowerCase();
      const cpf = (c.cpf || '').replace(/\D/g, '');
      const cpfFormatted = formatCPF(c.cpf).toLowerCase();
      return nome.includes(term) || cpf.includes(term) || cpfFormatted.includes(term);
    });
    renderClientes(filtered);
  };

  /**
   * Abre o modal para criar nova cliente.
   */
  window.openModalCliente = function () {
    _editingClienteId = null;
    document.getElementById('modal-cliente-title').textContent = 'Nova Cliente';
    document.getElementById('input-cliente-nome').value = '';
    document.getElementById('input-cliente-cpf').value = '';
    var telInput = document.getElementById('input-cliente-telefone');
    if (telInput) telInput.value = '';
    openModal('modal-cliente');
  };

  /**
   * Abre o modal para editar uma cliente existente.
   */
  window.editarCliente = function (id) {
    const cliente = _allClientes.find(c => c.id === id);
    if (!cliente) return;

    _editingClienteId = id;
    document.getElementById('modal-cliente-title').textContent = 'Editar Cliente';
    document.getElementById('input-cliente-nome').value = cliente.nome;
    document.getElementById('input-cliente-cpf').value = formatCPF(cliente.cpf);
    var telInput = document.getElementById('input-cliente-telefone');
    if (telInput) telInput.value = cliente.telefone || '';
    openModal('modal-cliente');
  };

  /**
   * Salva cliente (criar ou atualizar).
   */
  window.salvarCliente = async function () {
    const nome = document.getElementById('input-cliente-nome').value.trim();
    const cpf = document.getElementById('input-cliente-cpf').value.trim();
    var telInput = document.getElementById('input-cliente-telefone');
    const telefone = telInput ? telInput.value.trim() : '';

    if (!nome || !cpf) {
      showToast('Preencha nome e CPF', 'error');
      return;
    }

    const cpfClean = cpf.replace(/\D/g, '');
    if (cpfClean.length !== 11) {
      showToast('CPF deve ter 11 dígitos', 'error');
      return;
    }

    try {
      let novoCliente = null;
      if (_editingClienteId) {
        const updates = { nome, cpf: cpfClean };
        if (telefone) updates.telefone = telefone;
        novoCliente = await DB.clientes.update(_editingClienteId, updates);
        showToast('Cliente atualizada com sucesso!');
      } else {
        // Verificar se CPF já existe
        const existing = await DB.clientes.getByCpf(cpfClean);
        if (existing) {
          showToast('Já existe uma cliente com este CPF', 'error');
          return;
        }
        novoCliente = await DB.clientes.create({ nome, cpf: cpfClean, telefone });
        showToast('Cliente cadastrada com sucesso!');
      }

      closeModal('modal-cliente');

      // Se veio do modal de pedido, recarregar o select de clientes
      if (window._fromPedidoModal) {
        window._fromPedidoModal = false;
        try {
          const clientes = await DB.clientes.getAll();
          const selectCliente = document.getElementById('input-pedido-cliente');
          if (selectCliente) {
            selectCliente.innerHTML = '<option value="">Selecione uma cliente...</option>';
            clientes.forEach(function(c) {
              const opt = document.createElement('option');
              opt.value = c.id;
              opt.textContent = c.nome + ' — ' + formatCPF(c.cpf);
              selectCliente.appendChild(opt);
            });
            // Selecionar automaticamente o cliente recém-criado
            if (novoCliente && novoCliente.id) {
              selectCliente.value = novoCliente.id;
            }
          }
        } catch (e) {
          console.error('[Clientes] Erro ao recarregar select:', e);
        }
      } else {
        await initClientes();
      }
    } catch (err) {
      console.error('[Clientes] Erro ao salvar:', err);
      showToast('Erro ao salvar cliente: ' + (err.message || 'Erro desconhecido'), 'error');
    }
  };

  /**
   * Edita a cliente atualmente visualizada no detalhe.
   */
  window.editarClienteAtual = function () {
    if (window._currentClienteId) {
      editarCliente(window._currentClienteId);
    }
  };

  /**
   * Exibe a ficha detalhada de uma cliente.
   */
  window.showClienteDetalhe = async function (id) {
    try {
      window._currentClienteId = id;

      const [cliente, pedidos] = await Promise.all([
        DB.clientes.getById(id),
        DB.pedidos.getByClienteId(id)
      ]);

      if (!cliente) {
        showToast('Cliente não encontrada', 'error');
        return;
      }

      // Preencher dados
      document.getElementById('detalhe-cliente-titulo').textContent = cliente.nome;
      document.getElementById('detalhe-cliente-nome').textContent = cliente.nome;
      document.getElementById('detalhe-cliente-cpf').textContent = formatCPF(cliente.cpf);
      document.getElementById('detalhe-cliente-data').textContent = formatDateTime(cliente.created_at);
      document.getElementById('detalhe-cliente-total-pedidos').textContent = pedidos.length;

      // Histórico de pedidos
      const tbody = document.getElementById('detalhe-cliente-pedidos');
      if (pedidos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-muted" style="text-align:center;padding:20px;">Nenhum pedido registrado</td></tr>';
      } else {
        tbody.innerHTML = pedidos.map(p => `
          <tr>
            <td>${p.nome_aniversariante || '—'}</td>
            <td>${p.tema_festa || '—'}</td>
            <td>${formatDate(p.data_evento)}</td>
            <td>${getStatusBadge(p.status)}</td>
            <td>${formatBRL(p.valor_total)}</td>
            <td>
              <button class="btn btn-sm btn-secondary" onclick="showPedidoDetalhe('${p.id}')" title="Ver pedido">👁</button>
            </td>
          </tr>
        `).join('');
      }

      // Navegar para seção
      document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
      document.getElementById('section-cliente-detalhe').classList.add('active');
      document.querySelectorAll('.sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));

    } catch (err) {
      console.error('[Clientes] Erro ao carregar detalhe:', err);
      showToast('Erro ao carregar dados da cliente', 'error');
    }
  };

  /**
   * Gera o PDF da cliente atualmente visualizada.
   */
  window.gerarPDFClienteAtual = function () {
    if (window._currentClienteId && typeof generateClientePDF === 'function') {
      generateClientePDF(window._currentClienteId);
    }
  };

})();
