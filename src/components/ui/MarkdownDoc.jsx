import React from 'react';
import './MarkdownDoc.css';

// ============================================================
// MARKDOWN DOC RENDERER
// The business manual's body text is real markdown (headers, bold,
// tables, bullet lists, [text](url) links) — it was being dumped as
// plain preformatted text instead of rendered, which is why it read
// like raw .md syntax. This is a small, dependency-free parser
// covering exactly what these documents use.
//
// It ALSO auto-links bare document-number mentions ("07", "04A",
// "System 05E") to the matching document, even when the original
// text has no markdown link at all — that's the "jump from one page
// to another" behavior. Existing [text](url) links to Google Docs
// still work too, just open externally.
// ============================================================

function renderInline(text, docNumberMap, onJumpToDoc, keyPrefix) {
  // Split on markdown links first: [text](url)
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  let i = 0;

  while ((match = linkPattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    parts.push({ type: 'link', label: match[1], url: match[2] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push({ type: 'text', value: text.slice(lastIndex) });

  return parts.map(part => {
    i += 1;
    if (part.type === 'link') {
      const isExternal = /^https?:\/\//.test(part.url);
      return isExternal ? (
        <a key={`${keyPrefix}-l${i}`} href={part.url} target="_blank" rel="noreferrer">{part.label}</a>
      ) : (
        <button key={`${keyPrefix}-l${i}`} className="doc-inline-link" onClick={() => onJumpToDoc(part.url)}>{part.label}</button>
      );
    }
    // Bold **text**, then auto-link bare doc-number mentions in what's left.
    const boldPattern = /\*\*([^*]+)\*\*/g;
    const boldParts = [];
    let li = 0, bm, bi = 0;
    while ((bm = boldPattern.exec(part.value)) !== null) {
      if (bm.index > li) boldParts.push({ type: 'text', value: part.value.slice(li, bm.index) });
      boldParts.push({ type: 'bold', value: bm[1] });
      li = bm.index + bm[0].length;
    }
    if (li < part.value.length) boldParts.push({ type: 'text', value: part.value.slice(li) });

    return boldParts.map(bp => {
      bi += 1;
      const key = `${keyPrefix}-b${i}-${bi}`;
      if (bp.type === 'bold') {
        return <strong key={key}>{autoLinkDocNumbers(bp.value, docNumberMap, onJumpToDoc, key)}</strong>;
      }
      return <React.Fragment key={key}>{autoLinkDocNumbers(bp.value, docNumberMap, onJumpToDoc, key)}</React.Fragment>;
    });
  });
}

/** Turns bare mentions like "System 07" or "04A" into a clickable jump
 *  to that document, IF a document with that doc_number actually
 *  exists — never links to something that isn't there. */
function autoLinkDocNumbers(text, docNumberMap, onJumpToDoc, keyPrefix) {
  const numbers = Object.keys(docNumberMap).sort((a, b) => b.length - a.length); // longest first, avoids "04" matching inside "04A"
  if (numbers.length === 0) return text;

  const pattern = new RegExp(`\\b(${numbers.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'g');
  const segments = [];
  let lastIndex = 0;
  let m;
  let i = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > lastIndex) segments.push(text.slice(lastIndex, m.index));
    const docId = docNumberMap[m[0]];
    segments.push(
      <button key={`${keyPrefix}-dn${i++}`} className="doc-inline-link" onClick={() => onJumpToDoc(docId, true)}>{m[0]}</button>
    );
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) segments.push(text.slice(lastIndex));
  return segments;
}

export default function MarkdownDoc({ text, docNumberMap = {}, onJumpToDoc = () => {} }) {
  if (!text) return null;
  const lines = text.split('\n');
  const blocks = [];
  let tableRows = null;
  let listItems = null;

  function flushTable() {
    if (tableRows && tableRows.length > 0) {
      blocks.push({ type: 'table', rows: tableRows });
      tableRows = null;
    }
  }
  function flushList() {
    if (listItems && listItems.length > 0) {
      blocks.push({ type: 'list', items: listItems });
      listItems = null;
    }
  }

  lines.forEach(line => {
    const trimmed = line.trim();
    if (/^#{1,3}\s/.test(trimmed)) {
      flushTable(); flushList();
      const level = trimmed.match(/^#+/)[0].length;
      blocks.push({ type: 'heading', level, text: trimmed.replace(/^#+\s*/, '') });
    } else if (/^\|.*\|$/.test(trimmed)) {
      flushList();
      if (!/^\|[\s:-]+\|$/.test(trimmed)) { // skip the |---|---| separator row
        (tableRows ||= []).push(trimmed.slice(1, -1).split('|').map(c => c.trim()));
      }
    } else if (/^[-*]\s/.test(trimmed)) {
      flushTable();
      (listItems ||= []).push(trimmed.replace(/^[-*]\s/, ''));
    } else if (trimmed === '') {
      flushTable(); flushList();
    } else {
      flushTable(); flushList();
      blocks.push({ type: 'paragraph', text: trimmed });
    }
  });
  flushTable(); flushList();

  return (
    <div className="markdown-doc">
      {blocks.map((b, i) => {
        const key = `block-${i}`;
        if (b.type === 'heading') {
          const Tag = `h${Math.min(b.level + 3, 6)}`; // keep headings visually subordinate to the page title
          return <Tag key={key} className="markdown-heading">{renderInline(b.text, docNumberMap, onJumpToDoc, key)}</Tag>;
        }
        if (b.type === 'table') {
          const [header, ...rows] = b.rows;
          return (
            <table key={key} className="markdown-table">
              <thead><tr>{header.map((c, ci) => <th key={ci}>{renderInline(c, docNumberMap, onJumpToDoc, `${key}-h${ci}`)}</th>)}</tr></thead>
              <tbody>{rows.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci}>{renderInline(c, docNumberMap, onJumpToDoc, `${key}-${ri}-${ci}`)}</td>)}</tr>)}</tbody>
            </table>
          );
        }
        if (b.type === 'list') {
          return <ul key={key} className="markdown-list">{b.items.map((it, ii) => <li key={ii}>{renderInline(it, docNumberMap, onJumpToDoc, `${key}-${ii}`)}</li>)}</ul>;
        }
        return <p key={key} className="markdown-paragraph">{renderInline(b.text, docNumberMap, onJumpToDoc, key)}</p>;
      })}
    </div>
  );
}
