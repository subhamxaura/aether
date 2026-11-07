import React from "react";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const blocks: React.ReactNode[] = [];
  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced Code Block
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push(
        <div
          key={`code-${i}`}
          style={{
            margin: "1.5rem 0",
            borderRadius: "0.5rem",
            overflow: "hidden",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            background: "#090d16",
          }}
        >
          {lang && (
            <div
              style={{
                padding: "0.4rem 1rem",
                fontSize: "0.75rem",
                color: "#94a3b8",
                borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                background: "rgba(255, 255, 255, 0.02)",
                fontFamily: "monospace",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {lang}
            </div>
          )}
          <pre
            style={{
              margin: 0,
              padding: "1rem",
              overflowX: "auto",
              fontSize: "0.875rem",
              lineHeight: 1.6,
              color: "#e2e8f0",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            }}
          >
            <code>{codeLines.join("\n")}</code>
          </pre>
        </div>
      );
      continue;
    }

    // Horizontal Rule
    if (/^(\*\*\*|---|___)$/.test(line.trim())) {
      blocks.push(
        <hr
          key={`hr-${i}`}
          style={{
            border: "none",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            margin: "2rem 0",
          }}
        />
      );
      i++;
      continue;
    }

    // Markdown Table
    if (line.includes("|") && line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 2) {
        const headerCols = tableLines[0]
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim());
        const rowLines = tableLines.slice(2); // skip header & separator
        blocks.push(
          <div
            key={`table-${i}`}
            style={{
              overflowX: "auto",
              margin: "1.5rem 0",
              borderRadius: "0.5rem",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.875rem",
                textAlign: "left",
              }}
            >
              <thead>
                <tr style={{ background: "rgba(255, 255, 255, 0.04)" }}>
                  {headerCols.map((col, cIdx) => (
                    <th
                      key={cIdx}
                      style={{
                        padding: "0.75rem 1rem",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                        color: "#38bdf8",
                        fontWeight: 600,
                      }}
                    >
                      {formatInline(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowLines.map((row, rIdx) => {
                  const cols = row.split("|").slice(1, -1).map((c) => c.trim());
                  return (
                    <tr
                      key={rIdx}
                      style={{
                        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                        background: rIdx % 2 === 1 ? "rgba(255, 255, 255, 0.015)" : "transparent",
                      }}
                    >
                      {cols.map((col, cIdx) => (
                        <td
                          key={cIdx}
                          style={{
                            padding: "0.75rem 1rem",
                            color: "#cbd5e1",
                          }}
                        >
                          {formatInline(col)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Blockquote
    if (line.trim().startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote
          key={`quote-${i}`}
          style={{
            margin: "1.5rem 0",
            padding: "0.75rem 1.25rem",
            borderLeft: "4px solid #38bdf8",
            background: "rgba(56, 189, 248, 0.05)",
            borderRadius: "0 0.5rem 0.5rem 0",
            color: "#94a3b8",
            fontStyle: "italic",
          }}
        >
          {quoteLines.map((ql, qIdx) => (
            <p key={qIdx} style={{ margin: "0.25rem 0" }}>
              {formatInline(ql)}
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Headings
    if (line.startsWith("# ")) {
      blocks.push(
        <h1
          key={`h1-${i}`}
          style={{
            fontSize: "2.25rem",
            fontWeight: 800,
            color: "#f8fafc",
            margin: "2.5rem 0 1rem 0",
            letterSpacing: "-0.02em",
          }}
        >
          {formatInline(line.slice(2))}
        </h1>
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h2
          key={`h2-${i}`}
          style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            color: "#38bdf8",
            margin: "2rem 0 0.75rem 0",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            paddingBottom: "0.5rem",
          }}
        >
          {formatInline(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push(
        <h3
          key={`h3-${i}`}
          style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            color: "#e2e8f0",
            margin: "1.5rem 0 0.5rem 0",
          }}
        >
          {formatInline(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith("#### ")) {
      blocks.push(
        <h4
          key={`h4-${i}`}
          style={{
            fontSize: "1.1rem",
            fontWeight: 600,
            color: "#cbd5e1",
            margin: "1.25rem 0 0.5rem 0",
          }}
        >
          {formatInline(line.slice(5))}
        </h4>
      );
      i++;
      continue;
    }

    // List items (- or * or numbered)
    if (/^(\s*[-*]|\s*\d+\.)\s/.test(line)) {
      const listItems: string[] = [];
      const isOrdered = /^\s*\d+\.\s/.test(line);
      while (i < lines.length && /^(\s*[-*]|\s*\d+\.)\s/.test(lines[i])) {
        listItems.push(lines[i].replace(/^(\s*[-*]|\s*\d+\.)\s+/, ""));
        i++;
      }
      const ListTag = isOrdered ? "ol" : "ul";
      blocks.push(
        <ListTag
          key={`list-${i}`}
          style={{
            margin: "1rem 0",
            paddingLeft: "1.5rem",
            color: "#cbd5e1",
            lineHeight: 1.7,
          }}
        >
          {listItems.map((item, lIdx) => (
            <li key={lIdx} style={{ margin: "0.25rem 0" }}>
              {formatInline(item)}
            </li>
          ))}
        </ListTag>
      );
      continue;
    }

    // Empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Paragraph
    blocks.push(
      <p
        key={`p-${i}`}
        style={{
          margin: "0.85rem 0",
          lineHeight: 1.75,
          color: "#cbd5e1",
          fontSize: "1rem",
        }}
      >
        {formatInline(line)}
      </p>
    );
    i++;
  }

  return <div>{blocks}</div>;
}

function formatInline(text: string): React.ReactNode {
  // Regex pattern for bold (**text**), code (`text`), link ([text](url)), italic (*text*)
  const tokens: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining) {
    // Code `...`
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)$/);
    // Bold **...**
    const boldMatch = remaining.match(/^(.*?)\*\*([^*]+)\*\*(.*)$/);
    // Link [...](...)
    const linkMatch = remaining.match(/^(.*?)\[([^\]]+)\]\(([^)]+)\)(.*)$/);

    // Pick earliest match
    let earliestType = null;
    let earliestIdx = Infinity;

    if (codeMatch && codeMatch[1].length < earliestIdx) {
      earliestType = "code";
      earliestIdx = codeMatch[1].length;
    }
    if (boldMatch && boldMatch[1].length < earliestIdx) {
      earliestType = "bold";
      earliestIdx = boldMatch[1].length;
    }
    if (linkMatch && linkMatch[1].length < earliestIdx) {
      earliestType = "link";
      earliestIdx = linkMatch[1].length;
    }

    if (earliestType === "code" && codeMatch) {
      if (codeMatch[1]) tokens.push(codeMatch[1]);
      tokens.push(
        <code
          key={key++}
          style={{
            background: "rgba(56, 189, 248, 0.1)",
            color: "#38bdf8",
            padding: "0.2rem 0.4rem",
            borderRadius: "0.25rem",
            fontSize: "0.875em",
            fontFamily: "monospace",
          }}
        >
          {codeMatch[2]}
        </code>
      );
      remaining = codeMatch[3];
    } else if (earliestType === "bold" && boldMatch) {
      if (boldMatch[1]) tokens.push(boldMatch[1]);
      tokens.push(
        <strong key={key++} style={{ color: "#f8fafc", fontWeight: 700 }}>
          {boldMatch[2]}
        </strong>
      );
      remaining = boldMatch[3];
    } else if (earliestType === "link" && linkMatch) {
      if (linkMatch[1]) tokens.push(linkMatch[1]);
      tokens.push(
        <a
          key={key++}
          href={linkMatch[3]}
          style={{
            color: "#38bdf8",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
          }}
        >
          {linkMatch[2]}
        </a>
      );
      remaining = linkMatch[4];
    } else {
      tokens.push(remaining);
      break;
    }
  }

  return <>{tokens}</>;
}
