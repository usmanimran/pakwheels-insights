const API_BASE = '/api';

export async function fetchCatalog() {
  const res = await fetch(`${API_BASE}/catalog`);
  if (!res.ok) throw new Error('Failed to fetch catalog');
  return res.json();
}

export async function fetchVariants(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  const res = await fetch(`${API_BASE}/variants?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch variants');
  return res.json();
}

export async function syncCatalog() {
  const res = await fetch(`${API_BASE}/catalog/sync`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to sync catalog');
  return res.json();
}

export async function fetchListings(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  const res = await fetch(`${API_BASE}/listings?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch listings');
  return res.json();
}

export async function fetchAnalytics(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  const res = await fetch(`${API_BASE}/analytics?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

export async function fetchScanStatus(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  const res = await fetch(`${API_BASE}/scan-status?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch scan status');
  return res.json();
}

export async function fetchCompare(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  const res = await fetch(`${API_BASE}/compare?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch comparison');
  return res.json();
}

export function getScrapeStreamUrl(params = {}) {
  const query = new URLSearchParams(params).toString();
  return `${API_BASE}/scrape/stream?${query}`;
}

export function getExportCsvUrl(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  return `${API_BASE}/export?${query.toString()}`;
}

export async function fetchProxySettings() {
  const res = await fetch(`${API_BASE}/settings/proxy`);
  if (!res.ok) throw new Error('Failed to fetch proxy settings');
  return res.json();
}

export async function saveProxySettings(proxy) {
  const res = await fetch(`${API_BASE}/settings/proxy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proxy })
  });
  if (!res.ok) throw new Error('Failed to save proxy');
  return res.json();
}

export async function testProxySettings(proxy) {
  const res = await fetch(`${API_BASE}/settings/proxy/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proxy })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || data.message || 'Proxy test failed');
  return data;
}
