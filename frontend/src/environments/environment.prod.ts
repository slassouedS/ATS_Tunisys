export const environment = {
  production: true,
  // URL absolue : permet de servir le frontend seul (sans reverse-proxy nginx),
  // utile pour un deploiement natif Windows sans Docker. Le CORS backend est
  // deja permissif (voir SecurityConfig.java) donc l'appel direct fonctionne.
  // Si vous deployez derriere un vrai reverse-proxy en prod, remettez '/api'.
  apiBaseUrl: (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8080/api` : '/api')
};
