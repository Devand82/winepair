import type { Food, Wine, MenuData, PairingResult, ModelInfo } from '../types';

interface ModelsResponse {
  default: string;
  models: ModelInfo[];
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: (apiUrl: string) =>
    fetch(`${apiUrl}/health`).then(handleResponse),

  getModels: (apiUrl: string): Promise<ModelsResponse> =>
    fetch(`${apiUrl}/api/models`).then(handleResponse<ModelsResponse>),

  extractText: (apiUrl: string, menuText: string, model?: string) =>
    fetch(`${apiUrl}/api/extract-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menu_text: menuText, model }),
    }).then(handleResponse<MenuData>),

  extractImage: (
    apiUrl: string,
    imageUri: string,
    mimeType = 'image/jpeg',
    model = 'openai/gpt-4o',
    extraText?: string,
  ) => {
    const form = new FormData();
    form.append('file', { uri: imageUri, type: mimeType, name: 'menu.jpg' } as any);
    form.append('model', model);
    if (extraText) form.append('extra_text', extraText);
    return fetch(`${apiUrl}/api/extract-image`, {
      method: 'POST',
      body: form,
    }).then(handleResponse<MenuData>);
  },

  pairWine: (apiUrl: string, food: Food, wines: Wine[], model?: string) =>
    fetch(`${apiUrl}/api/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ food, wines, model }),
    }).then(handleResponse<PairingResult>),
};
