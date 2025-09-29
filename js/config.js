(function () {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const base = isLocal ? 'http://localhost:5002/api' : '/api';
  window.API_BASE = base;
})();
