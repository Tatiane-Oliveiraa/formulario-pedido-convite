/* ═══════════════════════════════════════════════════════════════
   Raíz & Pixel — Notification Module
   Polling + alerta sonoro para novos pedidos
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  let _lastCheckTime = new Date().toISOString();
  let _knownPedidoCount = -1; // -1 = not initialized yet
  let _pollingInterval = null;
  const POLL_INTERVAL_MS = 30000; // 30 seconds

  /**
   * Plays a notification sound using Web Audio API.
   * 3 ascending beeps (pleasant notification tone).
   */
  function playNotificationSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 (major chord)
      
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.2);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.2 + 0.05);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.2 + 0.2);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(ctx.currentTime + i * 0.2);
        osc.stop(ctx.currentTime + i * 0.2 + 0.25);
      });
    } catch (e) {
      console.log('[Notification] Web Audio API not available:', e);
    }
  }

  /**
   * Updates the badge counter on the sidebar "Pedidos" nav item.
   */
  function updateBadge(count) {
    let badge = document.getElementById('pedidos-badge');
    if (count > 0) {
      if (!badge) {
        // Create badge if it doesn't exist
        const navPedidos = document.getElementById('nav-pedidos');
        if (navPedidos) {
          badge = document.createElement('span');
          badge.id = 'pedidos-badge';
          badge.className = 'nav-badge';
          navPedidos.appendChild(badge);
        }
      }
      if (badge) {
        badge.textContent = count;
        badge.style.display = 'inline-flex';
      }
    } else {
      if (badge) badge.style.display = 'none';
    }
  }

  /**
   * Shows a special toast for new orders.
   */
  function showNewOrderToast(pedido) {
    const clienteNome = pedido.cliente ? pedido.cliente.nome : 'Nova cliente';
    const aniversariante = pedido.nome_aniversariante || '';
    const modelo = pedido.modelo || '';
    const valor = typeof formatBRL === 'function' ? formatBRL(pedido.valor_total) : 'R$ ' + pedido.valor_total;
    
    const msg = `🎉 Novo Pedido!\n${clienteNome}${aniversariante ? ' — ' + aniversariante : ''}${modelo ? '\n' + modelo : ''}\n${valor}`;
    
    if (typeof showToast === 'function') {
      showToast(msg, 'success', 8000);
    }
  }

  /**
   * Polls the server for new orders.
   */
  async function checkForNewOrders() {
    try {
      const result = await DB.pedidos.getNewCount();
      const newCount = result.count || 0;

      // Update badge
      updateBadge(newCount);

      // First run: just store the count, don't alert
      if (_knownPedidoCount === -1) {
        _knownPedidoCount = newCount;
        return;
      }

      // If count increased, we have new orders!
      if (newCount > _knownPedidoCount) {
        const diff = newCount - _knownPedidoCount;
        console.log(`[Notification] ${diff} novo(s) pedido(s) detectado(s)!`);
        
        // Play sound
        playNotificationSound();

        // Fetch the latest new orders to show details
        try {
          const newOrders = await DB.pedidos.getByStatus('Novo');
          if (newOrders && newOrders.length > 0) {
            // Show toast for the most recent one
            showNewOrderToast(newOrders[0]);
          }
        } catch (e) {
          // Fallback: generic toast
          if (typeof showToast === 'function') {
            showToast(`🎉 ${diff} novo(s) pedido(s) recebido(s)!`, 'success', 8000);
          }
        }

        // Auto-refresh dashboard if it's the active section
        const dashSection = document.getElementById('section-dashboard');
        if (dashSection && dashSection.classList.contains('active') && typeof initDashboard === 'function') {
          initDashboard();
        }

        // Auto-refresh pedidos list if it's the active section  
        const pedidosSection = document.getElementById('section-pedidos');
        if (pedidosSection && pedidosSection.classList.contains('active') && typeof initPedidos === 'function') {
          initPedidos();
        }
      }

      _knownPedidoCount = newCount;

    } catch (err) {
      console.log('[Notification] Polling error:', err.message);
    }
  }

  /**
   * Starts the polling interval.
   */
  window.startNotificationPolling = function () {
    if (_pollingInterval) return; // Already running
    
    // Initial check
    checkForNewOrders();
    
    // Set up interval
    _pollingInterval = setInterval(checkForNewOrders, POLL_INTERVAL_MS);
    console.log('[Notification] Polling started (every ' + (POLL_INTERVAL_MS / 1000) + 's)');
  };

  /**
   * Stops the polling interval.
   */
  window.stopNotificationPolling = function () {
    if (_pollingInterval) {
      clearInterval(_pollingInterval);
      _pollingInterval = null;
      console.log('[Notification] Polling stopped');
    }
  };

  /**
   * Manually trigger notification sound (for testing).
   */
  window.testNotificationSound = function () {
    playNotificationSound();
  };

})();
