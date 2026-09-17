// Parses Markdown files exported from Notion (single page export or full database export)
// into the same { headers, rows } shape produced by parseCSV, so the existing
// trade/account detection & conversion logic (detectColumns, convertRows, etc.) can be reused.

export interface NotionFile {
  name: string;
  content: string;
}

// A Notion "Markdown & CSV" export of a database can include one .md file
// that renders the whole table — detect and parse that table format.
function parseMarkdownTable(text: string): { headers: string[]; rows: Record<string, string>[] } | null {
  const lines = text.replace(/\r\n/g, '\n').split('\n').map(l => l.trim()).filter(l => l.startsWith('|') && l.endsWith('|'));
  if (lines.length < 2) return null;
  if (!/^\|[\s\-:|]+\|$/.test(lines[1])) return null;

  const splitRow = (line: string) => line.slice(1, -1).split('|').map(c => c.trim());
  const headers = splitRow(lines[0]);

  const rows = lines.slice(2).map(line => {
    const cells = splitRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = cells[i] ?? ''; });
    return obj;
  });

  return { headers, rows };
}

// A Notion single-page export: "# Title" followed by "Key: Value" property
// lines, then a blank line, then the page body (kept as notes/content).
function parseNotionPage(text: string, filename: string): Record<string, string> {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const row: Record<string, string> = {};
  let i = 0;

  if (lines[0]?.startsWith('# ')) {
    row['Name'] = lines[0].slice(2).trim();
    i = 1;
  } else {
    row['Name'] = filename.replace(/\.md$/i, '');
  }

  while (i < lines.length && lines[i].trim() === '') i++;

  const propRegex = /^\*{0,2}([^:*]{1,60}?)\*{0,2}\s*:\s*(.*)$/;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { i++; break; }
    const m = line.match(propRegex);
    if (!m) break;
    row[m[1].trim()] = m[2].trim();
    i++;
  }

  const content = lines.slice(i).join('\n').trim();
  if (content) row['Notes'] = row['Notes'] ? `${row['Notes']}\n\n${content}` : content;

  return row;
}

export function parseNotionFiles(files: NotionFile[]): { headers: string[]; rows: Record<string, string>[] } {
  const mdFiles = files.filter(f => f.name.toLowerCase().endsWith('.md'));

  // Single file containing a database table export → use it directly
  if (mdFiles.length === 1) {
    const table = parseMarkdownTable(mdFiles[0].content);
    if (table) return table;
  }

  const rows: Record<string, string>[] = [];
  const headerSet = new Set<string>();

  for (const f of mdFiles) {
    const table = parseMarkdownTable(f.content);
    if (table) {
      table.headers.forEach(h => headerSet.add(h));
      rows.push(...table.rows);
      continue;
    }
    const row = parseNotionPage(f.content, f.name);
    Object.keys(row).forEach(h => headerSet.add(h));
    rows.push(row);
  }

  return { headers: Array.from(headerSet), rows };
}
