/* ═══════════════════════════════════════════════════════════════
   Raíz & Pixel — Auth Module
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const AUTH_KEY = 'rp_auth';
  const VALID_PASSWORD = 'anny2610';

  window.Auth = {
    /**
     * Tenta autenticar com a senha fornecida.
     * @param {string} password — Senha digitada pelo usuário
     * @returns {boolean} — true se a senha está correta
     */
    login(password) {
      if (password === VALID_PASSWORD) {
        sessionStorage.setItem(AUTH_KEY, 'true');
        return true;
      }
      return false;
    },

    /**
     * Encerra a sessão e redireciona para a página de login.
     */
    logout() {
      sessionStorage.removeItem(AUTH_KEY);
      window.location.href = 'index.html';
    },

    /**
     * Verifica se o usuário está autenticado.
     * @returns {boolean}
     */
    isAuthenticated() {
      return sessionStorage.getItem(AUTH_KEY) === 'true';
    },

    /**
     * Verifica a autenticação e redireciona para login se não autenticado.
     * Deve ser chamado no início de cada página protegida.
     */
    checkAuth() {
      if (!this.isAuthenticated()) {
        window.location.href = 'index.html';
      }
    }
  };
})();
