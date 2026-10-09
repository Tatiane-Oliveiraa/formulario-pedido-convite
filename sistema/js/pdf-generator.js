/* ═══════════════════════════════════════════════════════════════
   Raíz & Pixel — PDF Generator Module
   Utiliza jsPDF para gerar PDFs de clientes e relatórios mensais.
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const MARGIN_X = 48;
  const PAGE_WIDTH = 595;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

  const COLORS = {
    ink: [58, 37, 64],
    inkSoft: [107, 84, 112],
    gold: [184, 137, 63],
    goldDeep: [212, 175, 106],
    lilac: [107, 50, 92],
    success: [76, 175, 107],
    white: [255, 250, 246],
    muted: [140, 125, 145]
  };

  function getJsPDF() {
    if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
    return null;
  }

  /**
   * Gera o PDF da ficha de uma cliente.
   * Inclui dados pessoais, histórico de pedidos, termos e aceite digital.
   */
  window.generateClientePDF = async function (clienteId) {
    const JsPDF = getJsPDF();
    if (!JsPDF) {
      showToast('Biblioteca de PDF não carregada. Recarregue a página.', 'error');
      return;
    }

    try {
      showToast('Gerando PDF da cliente...', 'success');

      const [cliente, pedidos] = await Promise.all([
        DB.clientes.getById(clienteId),
        DB.pedidos.getByClienteId(clienteId)
      ]);

      if (!cliente) {
        showToast('Cliente não encontrada', 'error');
        return;
      }

      const doc = new JsPDF({ unit: 'pt', format: 'a4' });
      let y = 50;

      function checkPage(extra = 20) {
        if (y + extra > doc.internal.pageSize.height - 50) {
          doc.addPage();
          y = 50;
        }
      }

      // ── HEADER ──────────────────────────────────────────────
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(...COLORS.lilac);
      doc.text('Raíz & Pixel', MARGIN_X, y);
      y += 18;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(...COLORS.inkSoft);
      doc.text('Ficha da Cliente', MARGIN_X, y);
      y += 8;

      // Linha decorativa
      doc.setDrawColor(...COLORS.goldDeep);
      doc.setLineWidth(1.5);
      doc.line(MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y);
      y += 25;

      // ── DADOS DA CLIENTE ────────────────────────────────────
      addSectionTitle(doc, 'Dados da Cliente');
      addField(doc, 'Nome:', cliente.nome);
      addField(doc, 'CPF:', formatCPF(cliente.cpf));
      addField(doc, 'Cadastrada em:', formatDateTime(cliente.created_at));
      addField(doc, 'Total de Pedidos:', String(pedidos.length));
      y += 10;

      // ── HISTÓRICO DE PEDIDOS ────────────────────────────────
      if (pedidos.length > 0) {
        pedidos.forEach((pedido, index) => {
          checkPage(80);
          addSectionTitle(doc, `Pedido ${index + 1} — ${pedido.nome_aniversariante || 'Sem nome'}`);

          // Detalhes do evento
          addField(doc, 'Status:', pedido.status || 'Novo');
          addField(doc, 'Data do Evento:', formatDate(pedido.data_evento));
          addField(doc, 'Horário:', pedido.hora_evento || '—');
          addField(doc, 'Local:', pedido.local_evento || '—');
          addField(doc, 'Tema:', pedido.tema_festa || '—');
          if (pedido.trilha_sonora) addField(doc, 'Trilha Sonora:', pedido.trilha_sonora);
          if (pedido.dress_code) addField(doc, 'Dress Code:', pedido.dress_code);
          if (pedido.paleta_cores) addField(doc, 'Paleta de Cores:', pedido.paleta_cores);
          addField(doc, 'Confirmação:', pedido.confirmacao_presenca || '—');
          if (pedido.whatsapp_confirmacao) addField(doc, 'WhatsApp:', pedido.whatsapp_confirmacao);
          if (pedido.mensagem_confirmacao) addField(doc, 'Msg. Confirmação:', pedido.mensagem_confirmacao);
          if (pedido.cores_convite) addField(doc, 'Cores do Convite:', pedido.cores_convite);
          if (pedido.sugestoes_presente) addField(doc, 'Sugestões:', pedido.sugestoes_presente);
          if (pedido.chave_pix) addField(doc, 'Chave Pix:', pedido.chave_pix);
          if (pedido.manual_convidado) addField(doc, 'Manual do Convidado:', pedido.manual_convidado);
          if (pedido.outros_detalhes) addField(doc, 'Outros:', pedido.outros_detalhes);
          if (pedido.observacoes) addField(doc, 'Observações:', pedido.observacoes);

          checkPage(20);
          y += 5;
          addField(doc, 'Modelo:', pedido.modelo || '—');
          addField(doc, 'Botões:', pedido.botoes_interativos || 'Nenhum');
          addField(doc, 'Complementos:', pedido.complementos || 'Nenhum');
          addField(doc, 'Pagamento:', pedido.forma_pagamento || '—');
          addField(doc, 'Subtotal:', formatBRL(pedido.subtotal));

          checkPage(30);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(...COLORS.gold);
          doc.text(`Valor Total: ${formatBRL(pedido.valor_total)}`, MARGIN_X, y);
          y += 14;

          // Valores administrativos
          if (pedido.valor_sinal) addField(doc, 'Sinal Recebido:', formatBRL(pedido.valor_sinal));
          if (pedido.valor_restante) addField(doc, 'Valor Restante:', formatBRL(pedido.valor_restante));
          if (pedido.link_canva) addField(doc, 'Link Canva:', pedido.link_canva);
          if (pedido.link_convite) addField(doc, 'Link Convite:', pedido.link_convite);
          if (pedido.data_fechamento) addField(doc, 'Fechado em:', formatDate(pedido.data_fechamento));
          if (pedido.data_entrega) addField(doc, 'Entregue em:', formatDate(pedido.data_entrega));

          // ── TERMOS DE CONTRATAÇÃO ────────────────────────────
          if (pedido.texto_termos && pedido.aceite_termos) {
            checkPage(60);
            y += 8;
            addSectionTitle(doc, 'Termos de Contratação');

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...COLORS.muted);
            const termosWrapped = doc.splitTextToSize(pedido.texto_termos, CONTENT_WIDTH);
            termosWrapped.forEach(line => {
              checkPage(10);
              doc.text(line, MARGIN_X, y);
              y += 10;
            });

            // Aceite digital
            checkPage(25);
            y += 10;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(...COLORS.success);
            doc.text(
              `[OK] Aceite digital registrado em ${formatDateTime(pedido.created_at)}`,
              MARGIN_X, y
            );
            y += 16;
          }

          y += 10;
        });
      }

      // ── FOOTER ──────────────────────────────────────────────
      checkPage(30);
      y += 10;
      doc.setDrawColor(...COLORS.goldDeep);
      doc.setLineWidth(0.5);
      doc.line(MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y);
      y += 15;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.muted);
      doc.text(
        `Documento gerado em ${formatDateTime(new Date().toISOString())} — Raíz & Pixel Convites`,
        MARGIN_X, y
      );

      // ── Salvar ──────────────────────────────────────────────
      const fileName = `Ficha_${cliente.nome.replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);
      showToast(`PDF "${fileName}" gerado com sucesso!`);

    } catch (err) {
      console.error('[PDF] Erro ao gerar ficha da cliente:', err);
      showToast('Erro ao gerar PDF', 'error');
    }

    // ── Funções auxiliares (escopo do generateClientePDF) ────
    function addSectionTitle(doc, text) {
      checkPage(28);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(...COLORS.lilac);
      doc.text(text, MARGIN_X, y);
      y += 6;
      doc.setDrawColor(...COLORS.goldDeep);
      doc.setLineWidth(1);
      doc.line(MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y);
      y += 16;
    }

    function addField(doc, label, value) {
      checkPage(14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.ink);
      doc.text(label, MARGIN_X, y);

      doc.setFont('helvetica', 'normal');
      const labelWidth = doc.getTextWidth(label) + 6;
      const maxValueWidth = CONTENT_WIDTH - labelWidth;
      const wrapped = doc.splitTextToSize(String(value || '—'), maxValueWidth);
      doc.text(wrapped, MARGIN_X + labelWidth, y);
      y += 14 * Math.max(1, wrapped.length);
    }
  };

  /**
   * Gera o PDF de um pedido individual.
   * Exibe todos os detalhes do pedido + dados do contratante.
   */
  window.generatePedidoPDF = async function (pedidoId) {
    const JsPDF = getJsPDF();
    if (!JsPDF) {
      showToast('Biblioteca de PDF nao carregada. Recarregue a pagina.', 'error');
      return;
    }

    try {
      showToast('Gerando PDF do pedido...', 'success');

      const pedido = await DB.pedidos.getById(pedidoId);
      if (!pedido) {
        showToast('Pedido nao encontrado', 'error');
        return;
      }

      const doc = new JsPDF({ unit: 'pt', format: 'a4' });
      let y = 50;

      function checkPage(extra = 20) {
        if (y + extra > doc.internal.pageSize.height - 50) {
          doc.addPage();
          y = 50;
        }
      }

      function addSectionTitle(text) {
        checkPage(28);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(...COLORS.lilac);
        doc.text(text, MARGIN_X, y);
        y += 6;
        doc.setDrawColor(...COLORS.goldDeep);
        doc.setLineWidth(1);
        doc.line(MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y);
        y += 16;
      }

      function addField(label, value) {
        checkPage(14);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.ink);
        doc.text(label, MARGIN_X, y);
        doc.setFont('helvetica', 'normal');
        const labelWidth = doc.getTextWidth(label) + 6;
        const maxValueWidth = CONTENT_WIDTH - labelWidth;
        const wrapped = doc.splitTextToSize(String(value || '--'), maxValueWidth);
        doc.text(wrapped, MARGIN_X + labelWidth, y);
        y += 14 * Math.max(1, wrapped.length);
      }

      // -- HEADER
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(...COLORS.lilac);
      doc.text('Raiz & Pixel', MARGIN_X, y);
      y += 18;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(...COLORS.inkSoft);
      doc.text('Detalhes do Pedido', MARGIN_X, y);
      y += 8;

      doc.setDrawColor(...COLORS.goldDeep);
      doc.setLineWidth(1.5);
      doc.line(MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y);
      y += 25;

      // -- CONTRATANTE
      addSectionTitle('Dados do Contratante');
      addField('Nome:', pedido.cliente ? pedido.cliente.nome : '--');
      addField('CPF:', pedido.cliente ? formatCPF(pedido.cliente.cpf) : '--');
      y += 10;

      // -- DETALHES DO EVENTO
      addSectionTitle('Detalhes do Evento');
      addField('Aniversariante:', pedido.nome_aniversariante || '--');
      addField('Data do Evento:', formatDate(pedido.data_evento));
      addField('Horario:', pedido.hora_evento || '--');
      addField('Local:', pedido.local_evento || '--');
      addField('Tema:', pedido.tema_festa || '--');
      if (pedido.trilha_sonora) addField('Trilha Sonora:', pedido.trilha_sonora);
      if (pedido.dress_code) addField('Dress Code:', pedido.dress_code);
      if (pedido.paleta_cores) addField('Paleta de Cores:', pedido.paleta_cores);
      addField('Confirmacao:', pedido.confirmacao_presenca || '--');
      if (pedido.whatsapp_confirmacao) addField('WhatsApp:', pedido.whatsapp_confirmacao);
      if (pedido.mensagem_confirmacao) addField('Msg. Confirmacao:', pedido.mensagem_confirmacao);
      if (pedido.cores_convite) addField('Cores do Convite:', pedido.cores_convite);
      if (pedido.sugestoes_presente) addField('Sugestoes:', pedido.sugestoes_presente);
      if (pedido.chave_pix) addField('Chave Pix:', pedido.chave_pix);
      if (pedido.manual_convidado) addField('Manual do Convidado:', pedido.manual_convidado);
      if (pedido.outros_detalhes) addField('Outros:', pedido.outros_detalhes);
      if (pedido.observacoes) addField('Observacoes:', pedido.observacoes);
      y += 10;

      // -- PRODUTO CONTRATADO
      checkPage(80);
      addSectionTitle('Produto Contratado');
      addField('Modelo:', pedido.modelo || '--');
      addField('Botoes Interativos:', pedido.botoes_interativos || 'Nenhum');
      addField('Complementos:', pedido.complementos || 'Nenhum');
      addField('Pagamento:', pedido.forma_pagamento || '--');
      addField('Subtotal:', formatBRL(pedido.subtotal));

      checkPage(30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...COLORS.gold);
      doc.text('Valor Total: ' + formatBRL(pedido.valor_total), MARGIN_X, y);
      y += 20;

      // -- GERENCIAMENTO
      checkPage(60);
      addSectionTitle('Gerenciamento');
      addField('Status:', pedido.status || 'Novo');
      if (pedido.valor_sinal) addField('Sinal Recebido:', formatBRL(pedido.valor_sinal));
      if (pedido.valor_restante) addField('Valor Restante:', formatBRL(pedido.valor_restante));
      if (pedido.link_canva) addField('Link Canva:', pedido.link_canva);
      if (pedido.link_convite) addField('Link Convite:', pedido.link_convite);
      if (pedido.data_fechamento) addField('Fechado em:', formatDate(pedido.data_fechamento));
      if (pedido.data_entrega) addField('Entregue em:', formatDate(pedido.data_entrega));
      if (pedido.observacoes_internas) addField('Obs. Internas:', pedido.observacoes_internas);

      // -- TERMOS
      if (pedido.texto_termos && pedido.aceite_termos) {
        checkPage(60);
        y += 8;
        addSectionTitle('Termos de Contratacao');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.muted);
        const termosWrapped = doc.splitTextToSize(pedido.texto_termos, CONTENT_WIDTH);
        termosWrapped.forEach(function(line) {
          checkPage(10);
          doc.text(line, MARGIN_X, y);
          y += 10;
        });
        checkPage(25);
        y += 10;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.success);
        doc.text('[OK] Aceite digital registrado em ' + formatDateTime(pedido.created_at), MARGIN_X, y);
        y += 16;
      }

      // -- FOOTER
      checkPage(30);
      y += 10;
      doc.setDrawColor(...COLORS.goldDeep);
      doc.setLineWidth(0.5);
      doc.line(MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y);
      y += 15;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.muted);
      doc.text(
        'Documento gerado em ' + formatDateTime(new Date().toISOString()) + ' -- Raiz & Pixel Convites',
        MARGIN_X, y
      );

      // -- Salvar
      var nomeAniv = (pedido.nome_aniversariante || 'Pedido').replace(/\s+/g, '_');
      var fileName = 'Pedido_' + nomeAniv + '.pdf';
      doc.save(fileName);
      showToast('PDF "' + fileName + '" gerado com sucesso!');

    } catch (err) {
      console.error('[PDF] Erro ao gerar PDF do pedido:', err);
      showToast('Erro ao gerar PDF do pedido', 'error');
    }
  };

  // ════════════════════════════════════════════════════════════
  //  RELATÓRIO MENSAL
  // ════════════════════════════════════════════════════════════

  const MESES_NOME = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  /**
   * Gera o relatório mensal em PDF.
   */
  window.generateRelatorioMensal = async function (year, month) {
    const JsPDF = getJsPDF();
    if (!JsPDF) {
      showToast('Biblioteca de PDF não carregada. Recarregue a página.', 'error');
      return;
    }

    try {
      showToast('Gerando relatório mensal...', 'success');

      const summary = await DB.financeiro.getMonthSummary(year, month);
      const mesNome = MESES_NOME[month - 1] || '';

      const doc = new JsPDF({ unit: 'pt', format: 'a4' });
      let y = 50;

      function checkPage(extra = 20) {
        if (y + extra > doc.internal.pageSize.height - 50) {
          doc.addPage();
          y = 50;
        }
      }

      // ── HEADER ──────────────────────────────────────────────
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(...COLORS.lilac);
      doc.text('Raíz & Pixel', MARGIN_X, y);
      y += 18;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(...COLORS.inkSoft);
      doc.text(`Relatório Mensal — ${mesNome} ${year}`, MARGIN_X, y);
      y += 8;

      doc.setDrawColor(...COLORS.goldDeep);
      doc.setLineWidth(1.5);
      doc.line(MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y);
      y += 30;

      // ── RESUMO ──────────────────────────────────────────────
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(...COLORS.lilac);
      doc.text('Resumo Financeiro', MARGIN_X, y);
      y += 22;

      // Entradas
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.success);
      doc.text('Total Entradas:', MARGIN_X, y);
      doc.setFont('helvetica', 'normal');
      doc.text(formatBRL(summary.entradas), MARGIN_X + 120, y);
      y += 16;

      // Saídas
      doc.setTextColor(224, 90, 111); // danger
      doc.setFont('helvetica', 'bold');
      doc.text('Total Saídas:', MARGIN_X, y);
      doc.setFont('helvetica', 'normal');
      doc.text(formatBRL(summary.saidas), MARGIN_X + 120, y);
      y += 16;

      // Saldo
      const saldoColor = summary.saldo >= 0 ? COLORS.success : [224, 90, 111];
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...COLORS.gold);
      doc.text('Saldo:', MARGIN_X, y);
      doc.setTextColor(...saldoColor);
      doc.text(formatBRL(summary.saldo), MARGIN_X + 120, y);
      y += 30;

      // ── TABELA DE MOVIMENTAÇÕES ─────────────────────────────
      doc.setDrawColor(...COLORS.goldDeep);
      doc.setLineWidth(1);
      doc.line(MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y);
      y += 16;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(...COLORS.lilac);
      doc.text('Movimentações Detalhadas', MARGIN_X, y);
      y += 20;

      if (summary.items.length === 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.muted);
        doc.text('Nenhuma movimentação registrada neste período.', MARGIN_X, y);
        y += 20;
      } else {
        // Cabeçalho da tabela
        const colWidths = [70, 60, 180, 80, 80];
        const headers = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor'];

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.ink);

        let x = MARGIN_X;
        headers.forEach((h, i) => {
          doc.text(h, x, y);
          x += colWidths[i];
        });
        y += 4;
        doc.setDrawColor(...COLORS.goldDeep);
        doc.setLineWidth(0.5);
        doc.line(MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y);
        y += 12;

        // Linhas
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        summary.items.forEach(item => {
          checkPage(14);
          x = MARGIN_X;

          doc.setTextColor(...COLORS.ink);
          doc.text(formatDate(item.data), x, y);
          x += colWidths[0];

          if (item.tipo === 'entrada') {
            doc.setTextColor(...COLORS.success);
            doc.text('Entrada', x, y);
          } else {
            doc.setTextColor(224, 90, 111);
            doc.text('Saída', x, y);
          }
          x += colWidths[1];

          doc.setTextColor(...COLORS.ink);
          const descWrapped = doc.splitTextToSize(item.descricao || '—', colWidths[2] - 10);
          doc.text(descWrapped[0], x, y);
          x += colWidths[2];

          doc.text(item.categoria || '—', x, y);
          x += colWidths[3];

          const isEntrada = item.tipo === 'entrada';
          doc.setTextColor(...(isEntrada ? COLORS.success : [224, 90, 111]));
          doc.setFont('helvetica', 'bold');
          doc.text(`${isEntrada ? '+' : '-'} ${formatBRL(item.valor)}`, x, y);
          doc.setFont('helvetica', 'normal');

          y += 14;
        });
      }

      // ── FOOTER ──────────────────────────────────────────────
      checkPage(30);
      y += 15;
      doc.setDrawColor(...COLORS.goldDeep);
      doc.setLineWidth(0.5);
      doc.line(MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y);
      y += 15;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.muted);
      doc.text(
        `Relatório gerado em ${formatDateTime(new Date().toISOString())} — Raíz & Pixel Convites`,
        MARGIN_X, y
      );

      // ── Salvar ──────────────────────────────────────────────
      const fileName = `Relatorio_${mesNome}_${year}.pdf`;
      doc.save(fileName);
      showToast(`Relatório "${fileName}" gerado com sucesso!`);

    } catch (err) {
      console.error('[PDF] Erro ao gerar relatório mensal:', err);
      showToast('Erro ao gerar relatório', 'error');
    }
  };

})();
