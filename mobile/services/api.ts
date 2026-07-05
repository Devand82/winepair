import type {
  Food, Wine, MenuData, PairingResult, ModelInfo,
  PairReverseResponse, IdentifiedWine, FoodSuggestion, LookupPriceResponse,
} from '../types';

interface ModelsResponse {
  default: string;
  models: ModelInfo[];
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    let msg = `Request failed (${res.status})`;
    if (body.detail) {
      if (Array.isArray(body.detail)) {
        msg = body.detail.map((d: any) => d.msg || String(d)).join('; ');
      } else if (typeof body.detail === 'string') {
        msg = body.detail;
      } else {
        msg = String(body.detail);
      }
    }
    throw new Error(msg);
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
    imageUris: string[],
    mimeType = 'image/jpeg',
    model = 'openai/gpt-4o',
    extraText?: string,
  ) => {
    const form = new FormData();
    imageUris.forEach((uri, i) => {
      form.append('files', { uri, type: mimeType, name: `menu_${i}.jpg` } as any);
    });
    form.append('model', model);
    if (extraText) form.append('extra_text', extraText);
    return fetch(`${apiUrl}/api/extract-image`, {
      method: 'POST',
      body: form,
    }).then(handleResponse<MenuData>);
  },

  pairWine: (
    apiUrl: string,
    food: Food,
    wines: Wine[],
    model?: string,
    maxPrice?: number,
  ) =>
    fetch(`${apiUrl}/api/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ food, wines, model, max_price: maxPrice }),
    }).then(handleResponse<PairingResult>),

  pairReverse: (
    apiUrl: string,
    params: { wine_type: string; name?: string; region?: string; max_price?: number },
    model?: string,
  ): Promise<PairReverseResponse> =>
    fetch(`${apiUrl}/api/pair-reverse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, model }),
    }).then(handleResponse<PairReverseResponse>),

  identifyWine: (
    apiUrl: string,
    imageUri: string,
    model = 'openai/gpt-4o',
  ): Promise<IdentifiedWine> => {
    const form = new FormData();
    form.append('file', { uri: imageUri, type: 'image/jpeg', name: 'wine.jpg' } as any);
    form.append('model', model);
    return fetch(`${apiUrl}/api/identify-wine`, {
      method: 'POST',
      body: form,
    }).then(handleResponse<IdentifiedWine>);
  },

  extractDocument: (
    apiUrl: string,
    fileUris: { uri: string; type: string; name: string }[],
    model?: string,
    extraText?: string,
  ): Promise<MenuData> => {
    const form = new FormData();
    fileUris.forEach((f, i) => {
      form.append('files', { uri: f.uri, type: f.type, name: f.name } as any);
    });
    form.append('model', model || 'openai/gpt-4o');
    if (extraText) form.append('extra_text', extraText);
    return fetch(`${apiUrl}/api/extract-document`, {
      method: 'POST',
      body: form,
    }).then(handleResponse<MenuData>);
  },

  pairBatch: (
    apiUrl: string,
    foods: Food[],
    wines: Wine[],
    model?: string,
  ): Promise<PairingResult[]> =>
    fetch(`${apiUrl}/api/pair-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ foods, wines, model }),
    }).then(handleResponse<PairingResult[]>),

  fetchMenu: (
    apiUrl: string,
    url: string,
    model?: string,
  ): Promise<MenuData> =>
    fetch(`${apiUrl}/api/fetch-menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, model }),
    }).then(handleResponse<MenuData>),

  lookupPrice: (
    apiUrl: string,
    params: { wine_name: string; vintage?: string; region?: string; wine_type?: string },
    model?: string,
  ): Promise<LookupPriceResponse> =>
    fetch(`${apiUrl}/api/lookup-price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, model }),
    }).then(handleResponse<LookupPriceResponse>),
};
