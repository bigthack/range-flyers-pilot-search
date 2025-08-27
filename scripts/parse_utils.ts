export type ParsedChunk = { levelChar: string; code: string };
export function parseChunkedField(value: string | null | undefined): ParsedChunk[] {
  if (!value) return [];
  const chunks: ParsedChunk[] = [];
  const regex = /([ACPVTS])\/([A-Z0-9\-]{1,8})/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(value)) !== null) { chunks.push({ levelChar: m[1], code: m[2] }); }
  if (chunks.length > 0) return chunks;
  for (let i = 0; i + 9 < value.length; i += 10) {
    const seg = value.slice(i, i + 10);
    const levelChar = seg.slice(0, 1).trim();
    const slash = seg.slice(1, 2);
    const code = seg.slice(2).trim();
    if (levelChar && slash === "/" && code) chunks.push({ levelChar, code });
  }
  return chunks;
}
