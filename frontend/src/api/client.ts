import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

// Transactions
export const transactionsApi = {
  list: (params?: Record<string, any>) => api.get('/transactions', { params }),
  create: (data: any) => api.post('/transactions', data),
  update: (id: string, data: any) => api.put(`/transactions/${id}`, data),
  remove: (id: string) => api.delete(`/transactions/${id}`),
  monthlySummary: (year?: number, month?: number) =>
    api.get('/transactions/summary/monthly', { params: { year, month } }),
  history: () => api.get('/transactions/summary/history')
};

// Goals
export const goalsApi = {
  list: () => api.get('/goals'),
  create: (data: any) => api.post('/goals', data),
  update: (id: string, data: any) => api.put(`/goals/${id}`, data),
  remove: (id: string) => api.delete(`/goals/${id}`)
};

// Advisor
export const advisorApi = {
  insights: () => api.get('/advisor/insights'),
  analysis: () => api.get('/advisor/analysis'),
  chat: (message: string) => api.post('/advisor/chat', { message }),
  markRead: (id: string) => api.patch(`/advisor/insights/${id}/read`)
};

// Exchange
export const exchangeApi = {
  rates: () => api.get('/exchange-rate'),
  categories: () => api.get('/categories'),
  accounts: () => api.get('/accounts')
};

export default api;
