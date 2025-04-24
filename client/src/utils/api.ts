export async function fetchTree() {
  const res = await fetch("/api/tree");
  return await res.json();
}
