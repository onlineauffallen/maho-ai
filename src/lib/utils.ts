export const canMakeGPTRequest = (): boolean => {
  const limitPerDay = 20; // Demo Limit
  const today = new Date().toISOString().split('T')[0];
  const key = `gpt_requests_${today}`;

  const requestsToday = Number(localStorage.getItem(key) || 0);

  if (requestsToday >= limitPerDay) {
    return false; // Limit erreicht
  }

  localStorage.setItem(key, String(requestsToday + 1));
  return true; // Limit noch nicht erreicht
};
