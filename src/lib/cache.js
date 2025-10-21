const KEY = "meditrust_records_cache";

export function cacheSet(address, records) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || "{}");
    all[address.toLowerCase()] = records;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}

export function cacheGet(address) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || "{}");
    return all[address.toLowerCase()] || [];
  } catch {
    return [];
  }
}
