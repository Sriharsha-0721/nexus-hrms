// Resolve API base URL dynamically for production/development compatibility
let tempUrl = import.meta.env.VITE_API_URL || '/api';
if (tempUrl.startsWith('http') && !tempUrl.endsWith('/api') && !tempUrl.endsWith('/api/')) {
  tempUrl = tempUrl.endsWith('/') ? `${tempUrl}api` : `${tempUrl}/api`;
}
const BASE_URL = tempUrl;
console.log('[NEXUS API] Resolved BASE_URL:', BASE_URL);


const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Auto-serialize JSON requests
  let body = options.body;
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    body = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers,
    body,
  };

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);

    // Handle session expiration or invalid credentials
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userData');
      
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || 'Unauthorized');
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || 'Something went wrong');
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  } catch (error) {
    console.error(`API Error [${options.method || 'GET'} ${endpoint}]:`, error.message);
    throw error;
  }
};

export const api = {
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PUT', body }),
  delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),
  download: async (endpoint) => {
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${BASE_URL}${endpoint}`, { headers });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || 'Download failed');
    }
    return await response.blob();
  }
};

export default api;
