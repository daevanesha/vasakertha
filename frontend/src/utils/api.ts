// Use correct Vite env access for TypeScript
declare global {
  interface ImportMeta {
    env: {
      VITE_API_BASE_URL: string;
      [key: string]: any;
    };
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export const api = {
  get: (url: string) => fetch(`${API_BASE_URL}${url}`).then(res => res.json()),
  post: (url: string, data: any) => fetch(`${API_BASE_URL}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(res => res.json()),
  put: (url: string, data: any) => fetch(`${API_BASE_URL}${url}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(res => res.json()),
  delete: (url: string) => fetch(`${API_BASE_URL}${url}`, { method: 'DELETE' }).then(res => res.json()),
};
