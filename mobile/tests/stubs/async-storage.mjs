const daten = new Map();
export default {
  getItem: async (k) => daten.get(k) ?? null,
  setItem: async (k, v) => void daten.set(k, v),
  removeItem: async (k) => void daten.delete(k),
};
