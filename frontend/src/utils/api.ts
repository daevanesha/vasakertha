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

const handleResponse = async (res: Response) => {
  try {
    if (!res.ok) return [];
    const data = await res.json();
    return data === undefined ? [] : data;
  } catch {
    return [];
  }
};

export const api = {
  get: async (url: string) => {
    const response = await fetch(`http://localhost:8000${url}`); // Ensure the correct backend URL
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  },
  post: (url: string, data: any) => fetch(`${API_BASE_URL}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(handleResponse),
  put: (url: string, data: any) => fetch(`${API_BASE_URL}${url}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(handleResponse),
  delete: (url: string) => fetch(`${API_BASE_URL}${url}`, { method: 'DELETE' }).then(handleResponse),
  upload: (url: string, formData: FormData) => fetch(`${API_BASE_URL}${url}`, {
    method: 'POST',
    body: formData,
  }).then(handleResponse),
};
