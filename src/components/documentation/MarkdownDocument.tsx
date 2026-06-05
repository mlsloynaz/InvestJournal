type Block =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "hr" }
  | { type: "ul"; items: string[] }
  | { type: "blockquote"; lines: string[] }
  | { type: "pre"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] };

function inlineFormat(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-investep-navy">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function parseTableRow(line: string): string[] {
  return line
    .split("|")
    .map((cell) => cell.trim())
    .filter((cell, index, arr) => !(index === 0 && cell === "") && !(index === arr.length - 1 && cell === ""));
}

function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (line.trim() === "") {
      index++;
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push({ type: "h1", text: line.slice(2).trim() });
      index++;
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push({ type: "h2", text: line.slice(3).trim() });
      index++;
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push({ type: "h3", text: line.slice(4).trim() });
      index++;
      continue;
    }

    if (line.trim() === "---") {
      blocks.push({ type: "hr" });
      index++;
      continue;
    }

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      index++;
      while (index < lines.length && !lines[index].startsWith("```")) {
        codeLines.push(lines[index]);
        index++;
      }
      blocks.push({ type: "pre", text: codeLines.join("\n") });
      index++;
      continue;
    }

    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].startsWith(">")) {
        quoteLines.push(lines[index].replace(/^>\s?/, ""));
        index++;
      }
      blocks.push({ type: "blockquote", lines: quoteLines });
      continue;
    }

    if (line.includes("|") && index + 1 < lines.length && /^\|?[\s:-|]+\|?$/.test(lines[index + 1])) {
      const headers = parseTableRow(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].includes("|")) {
        rows.push(parseTableRow(lines[index]));
        index++;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (index < lines.length && lines[index].startsWith("- ")) {
        items.push(lines[index].slice(2).trim());
        index++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    const paragraphLines: string[] = [line.trim()];
    index++;
    while (
      index < lines.length &&
      lines[index].trim() !== "" &&
      !lines[index].startsWith("#") &&
      !lines[index].startsWith("- ") &&
      !lines[index].startsWith(">") &&
      !lines[index].startsWith("```") &&
      lines[index].trim() !== "---" &&
      !(
        lines[index].includes("|") &&
        index + 1 < lines.length &&
        /^\|?[\s:-|]+\|?$/.test(lines[index + 1])
      )
    ) {
      paragraphLines.push(lines[index].trim());
      index++;
    }
    blocks.push({ type: "p", text: paragraphLines.join(" ") });
  }

  return blocks;
}

export function MarkdownDocument({ source }: { source: string }) {
  const blocks = parseMarkdown(source);

  return (
    <article className="bg-white border rounded-lg p-6 space-y-4 text-sm text-gray-800 leading-relaxed">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "h1":
            return (
              <h1 key={index} className="text-2xl font-bold text-investep-navy">
                {inlineFormat(block.text)}
              </h1>
            );
          case "h2":
            return (
              <h2 key={index} className="text-lg font-semibold text-investep-navy pt-2 border-t border-investep-navy/10">
                {inlineFormat(block.text)}
              </h2>
            );
          case "h3":
            return (
              <h3 key={index} className="text-base font-semibold text-investep-navy">
                {inlineFormat(block.text)}
              </h3>
            );
          case "p":
            return (
              <p key={index}>{inlineFormat(block.text)}</p>
            );
          case "hr":
            return <hr key={index} className="border-investep-navy/15" />;
          case "ul":
            return (
              <ul key={index} className="list-disc list-inside space-y-1">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{inlineFormat(item)}</li>
                ))}
              </ul>
            );
          case "blockquote":
            return (
              <blockquote
                key={index}
                className="border-l-4 border-investep-gold bg-investep-cream/50 px-4 py-2 text-gray-700 space-y-1"
              >
                {block.lines.map((line, lineIndex) => (
                  <p key={lineIndex}>{inlineFormat(line)}</p>
                ))}
              </blockquote>
            );
          case "pre":
            return (
              <pre
                key={index}
                className="bg-investep-navy text-investep-cream text-xs p-4 rounded overflow-x-auto whitespace-pre-wrap font-mono"
              >
                {block.text}
              </pre>
            );
          case "table":
            return (
              <div key={index} className="overflow-x-auto">
                <table className="data-table text-sm">
                  <thead>
                    <tr>
                      {block.headers.map((header) => (
                        <th key={header}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex}>{inlineFormat(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          default:
            return null;
        }
      })}
    </article>
  );
}
