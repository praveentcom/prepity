'use client';

import { Blockquote } from '@/components/ui/blockquote';
import { CodeBlock, type HighlightTheme } from '@/components/ui/code-block';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import parseMarkdown from '@/lib/markdown/parseMarkdown';
import { processInlineMarkdown } from '@/lib/markdown/processInlineMarkdown';
import { cn } from '@/lib/utils';
import { createRoot, Root } from 'react-dom/client';
import React, { useEffect, useRef } from 'react';

interface BlockquoteData {
  type: 'blockquote';
  props: { nested: boolean };
  content: React.ReactNode;
}

interface CodeBlockData {
  type: 'codeblock';
  props: {
    code: string;
    language?: string;
    filename?: string;
    hideLineNumbers: boolean;
  };
}

interface TableData {
  type: 'table';
  props: {
    headers: string[];
    rows: string[][];
    alignments: string[];
  };
}

export interface LatexData {
  type: 'latex';
  props: {
    content: string;
    isInline: boolean;
  };
}

export type ComponentData = BlockquoteData | CodeBlockData | TableData | LatexData;

/**
 * Extract blockquote data from markdown content
 * @param content - The content to extract blockquotes from
 * @param componentsMap - Map of existing components to resolve placeholders
 * @param theme - Syntax highlighting theme
 * @param renderLatex - Optional function to render latex content
 * @returns The extracted blockquotes
 */
export function extractBlockquotes(
  content: string,
  componentsMap?: Map<string, ComponentData>,
  theme?: HighlightTheme,
  renderLatex?: (content: string) => React.ReactNode
): {
  content: string;
  blockquotes: Map<string, ComponentData>;
} {
  const blockquotes = new Map<string, ComponentData>();
  const lines = content.split('\n');
  const result: string[] = [];
  let i = 0;
  let blockquoteCounter = 0;

  while (i < lines.length) {
    const line = lines[i];
    const blockquoteMatch = line?.match(/^(>+)\s*(.*)/);

    if (blockquoteMatch) {
      const quoteLevel = blockquoteMatch[1]?.length || 0;
      const firstContent = blockquoteMatch[2];

      // Collect all consecutive blockquote lines
      const blockquoteLines: { level: number; content: string }[] = [];
      blockquoteLines.push({ level: quoteLevel, content: firstContent || '' });

      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j];
        const nextMatch = nextLine?.match(/^(>+)\s*(.*)/);

        if (nextMatch) {
          const nextLevel = nextMatch[1]?.length || 0;
          const nextContent = nextMatch[2];
          blockquoteLines.push({
            level: nextLevel,
            content: nextContent || '',
          });
          j++;
        } else if (nextLine?.trim() === '') {
          const lineAfterEmpty = j + 1 < lines.length ? lines[j + 1] : '';
          const afterEmptyMatch = lineAfterEmpty?.match(/^(>+)\s*(.*)/);

          if (afterEmptyMatch) {
            blockquoteLines.push({
              level: quoteLevel,
              content: afterEmptyMatch[2] || '',
            });
            j++;
          } else {
            break;
          }
        } else {
          break;
        }
      }

      const processedContent = processBlockquoteLines(
        blockquoteLines,
        componentsMap,
        theme,
        renderLatex
      );

      const placeholder = `{{BLOCKQUOTE${blockquoteCounter}}}`;
      blockquotes.set(placeholder, {
        type: 'blockquote',
        props: { nested: false },
        content: processedContent,
      });

      result.push(placeholder);
      blockquoteCounter++;
      i = j;
    } else {
      result.push(line || '');
      i++;
    }
  }

  return { content: result.join('\n'), blockquotes };
}

/**
 * Process blockquote lines into React content
 * @param lines - The lines to process
 * @param componentsMap - Map of existing components to resolve placeholders
 * @param theme - Syntax highlighting theme
 * @param renderLatex - Optional function to render latex content
 * @returns The processed React content
 */
function processBlockquoteLines(
  lines: { level: number; content: string }[],
  componentsMap?: Map<string, ComponentData>,
  theme?: HighlightTheme,
  renderLatex?: (content: string) => React.ReactNode
): React.ReactNode {
  if (lines.length === 0) return null;

  const elements: React.ReactNode[] = [];
  let currentLevel = 0;
  const openElements: React.ReactNode[][] = [];

  for (let i = 0; i < lines.length; i++) {
    const { level, content } = lines[i] || { level: 0, content: '' };

    while (currentLevel > level) {
      const children = openElements.pop() || [];
      if (children && children.length > 0) {
        if (openElements.length > 0) {
          openElements[openElements.length - 1]?.push(
            <Blockquote key={`nested-${i}`} nested>
              {children}
            </Blockquote>
          );
        } else {
          elements.push(
            <Blockquote key={`root-${i}`} nested>
              {children}
            </Blockquote>
          );
        }
      }
      currentLevel--;
    }

    while (currentLevel < level) {
      openElements.push([]);
      currentLevel++;
    }

    if (content.trim() === '') {
      if (openElements.length > 0) {
        openElements[openElements.length - 1]?.push(<br key={`br-${i}`} />);
      } else {
        elements.push(<br key={`br-${i}`} />);
      }
    } else {
      const parts = content.split(/({{(?:CODEBLOCK|TABLE|LATEX)\d+}})/g);

      parts.forEach((part, partIndex) => {
        if (!part) return;

        let element: React.ReactNode = null;

        if (part.match(/^{{(?:CODEBLOCK|TABLE|LATEX)\d+}}$/)) {
          const componentData = componentsMap?.get(part);
          if (componentData) {
            if (componentData.type === 'codeblock') {
              element = (
                <div key={`comp-${i}-${partIndex}`} className="my-2 w-full min-w-0">
                  <CodeBlock {...componentData.props} theme={theme} />
                </div>
              );
            } else if (componentData.type === 'table') {
              element = (
                <div key={`comp-${i}-${partIndex}`}>
                  {renderTable(componentData.props)}
                </div>
              );
            } else if (componentData.type === 'latex') {
              if (renderLatex) {
                element = (
                  <React.Fragment key={`comp-${i}-${partIndex}`}>
                    {renderLatex(componentData.props.content)}
                  </React.Fragment>
                );
              } else {
                element = componentData.props.content;
              }
            }
          }
        } else {
          const processedContent = processInlineMarkdown(part);
          element = (
            <span
              key={`content-${i}-${partIndex}`}
              dangerouslySetInnerHTML={{ __html: processedContent }}
            />
          );
        }

        if (element) {
          if (openElements.length > 0) {
            openElements[openElements.length - 1]?.push(element);
          } else {
            elements.push(element);
          }
        }
      });

      if (i < lines.length - 1) {
        if (openElements.length > 0) {
          openElements[openElements.length - 1]?.push(
            <br key={`br-after-${i}`} />
          );
        } else {
          elements.push(<br key={`br-after-${i}`} />);
        }
      }
    }
  }

  while (openElements.length > 0) {
    const children = openElements.pop() || [];
    if (children && children.length > 0) {
      if (openElements.length > 0) {
        openElements[openElements.length - 1]?.push(
          <Blockquote key={`final-nested-${openElements.length}`} nested>
            {children}
          </Blockquote>
        );
      } else {
        elements.push(<Blockquote key={`final-root`}>{children}</Blockquote>);
      }
    }
  }

  return elements.length === 1 ? elements[0] : <>{elements}</>;
}

/**
 * Extract code blocks from markdown content
 * @param content - The content to extract code blocks from
 * @returns The extracted code blocks
 */
export function extractCodeBlocks(content: string): {
  content: string;
  codeBlocks: Map<string, ComponentData>;
} {
  const codeBlocks = new Map<string, ComponentData>();
  let codeBlockCounter = 0;

  const regex = /^([> ]*)```(\w+)?(?:\s+filename="([^"]+)")?\n([\s\S]*?)\n\1```/gm;

  const processedContent = content.replace(
    regex,
    (match, prefix, lang, filename, code) => {
      const placeholder = `{{CODEBLOCK${codeBlockCounter}}}`;
      
      let cleanCode = code;
      if (prefix) {
        const prefixTrimmed = prefix.trimEnd();
        cleanCode = code.split('\n').map((line: any) => {
          if (line.startsWith(prefix)) return line.slice(prefix.length);
          if (line.trim() === prefixTrimmed) return "";
          return line;
        }).join('\n');
      }

      codeBlocks.set(placeholder, {
        type: 'codeblock',
        props: {
          code: cleanCode.trim(),
          language: lang,
          filename: filename,
          hideLineNumbers: false,
        },
      });

      codeBlockCounter++;
      return prefix + placeholder;
    }
  );

  return { content: processedContent, codeBlocks };
}

/**
 * Extract latex from markdown content
 * @param content - The content to extract latex from
 * @returns The extracted latex
 */
export function extractLatex(content: string): {
  content: string;
  latexMap: Map<string, ComponentData>;
} {
  const latexMap = new Map<string, ComponentData>();
  let latexCounter = 0;

  const processMatch = (tex: string, isInline: boolean, leftDelim: string, rightDelim: string) => {
    const placeholder = `{{LATEX${latexCounter++}}}`;
    latexMap.set(placeholder, {
      type: 'latex',
      props: {
        content: isInline ? `${leftDelim}${tex}${rightDelim}` : `${leftDelim}\n${tex.trim()}\n${rightDelim}`,
        isInline,
      },
    });
    return placeholder;
  };

  // 1. Pattern for block $$...$$
  let processedContent = content.replace(/^([> ]*)\$\$\s*([\s\S]+?)\s*\n\1\$\$/gm, (match, prefix, tex) => {
    let cleanTex = tex;
    if (prefix) {
      const prefixTrimmed = prefix.trimEnd();
      cleanTex = tex.split('\n').map((line: string) => {
        if (line.startsWith(prefix)) return line.slice(prefix.length);
        if (line.trim() === prefixTrimmed) return "";
        return line;
      }).join('\n');
    }

    return prefix + processMatch(cleanTex, false, '$$', '$$');
  });

  // 2. Fallback for single line $$...$$ or cases without clean line starts
  processedContent = processedContent.replace(/\$\$\s*([\s\S]+?)\s*\$\$/g, (match, tex) => {
    if (match.startsWith('{{LATEX')) return match;
    return processMatch(tex, false, '$$', '$$');
  });

  // 3. Pattern for block \[ ... \]
  processedContent = processedContent.replace(/^([> ]*)\\\[\s*([\s\S]+?)\s*\n\1\\\]/gm, (match, prefix, tex) => {
    let cleanTex = tex;
    if (prefix) {
      const prefixTrimmed = prefix.trimEnd();
      cleanTex = tex.split('\n').map((line: string) => {
        if (line.startsWith(prefix)) return line.slice(prefix.length);
        if (line.trim() === prefixTrimmed) return "";
        return line;
      }).join('\n');
    }

    return prefix + processMatch(cleanTex, false, '\\[', '\\]');
  });

  // 4. Fallback for single line \[ ... \]
  processedContent = processedContent.replace(/\\\[\s*([\s\S]+?)\s*\\\]/g, (match, tex) => {
    if (match.startsWith('{{LATEX')) return match;
    return processMatch(tex, false, '\\[', '\\]');
  });

  // 5. Pattern for inline $...$
  processedContent = processedContent.replace(/(^|[^\\])\$([^\$]+?)\$/g, (match, prefix, tex) => {
    return prefix + processMatch(tex, true, '$', '$');
  });

  // 6. Pattern for inline \( ... \)
  processedContent = processedContent.replace(/\\\(\s*([\s\S]+?)\s*\\\)/g, (match, tex) => {
    return processMatch(tex, true, '\\(', '\\)');
  });

  return { content: processedContent, latexMap };
}

/**
 * Extract tables from markdown content
 * @param content - The content to extract tables from
 * @returns The extracted tables
 */
export function extractTables(content: string): {
  content: string;
  tables: Map<string, ComponentData>;
} {
  const tables = new Map<string, ComponentData>();
  const lines = content.split('\n');
  const result: string[] = [];
  let i = 0;
  let tableCounter = 0;

  while (i < lines.length) {
    const line = lines[i];
    const prefixMatch = line?.match(/^([> ]*)/);
    const prefix = prefixMatch ? prefixMatch[1] : '';
    const cleanLine = prefix ? line.slice(prefix.length) : (line || '');

    if (
      cleanLine?.includes('|') &&
      i + 1 < lines.length
    ) {
      const nextLine = lines[i + 1];
      const nextClean = prefix && nextLine?.startsWith(prefix) ? nextLine.slice(prefix.length) : (nextLine || '');

      if (nextClean?.includes('|') && nextClean?.includes('-')) {
        const headerLine = cleanLine;
        const separatorLine = nextClean;

        const headers = headerLine
          ?.split('|')
          .map((cell: string) => cell.trim())
          .filter((cell: string) => cell !== '');

        const alignments = separatorLine
          ?.split('|')
          .map((cell: string) => {
            const trimmed = cell.trim();
            if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
            if (trimmed.endsWith(':')) return 'right';
            return 'left';
          })
          .filter((_: string, index: number) => index < headers.length);

        const rows: string[][] = [];
        let j = i + 2;
        while (j < lines.length) {
          const rowLineOrig = lines[j];
          const rowClean = prefix && rowLineOrig?.startsWith(prefix) ? rowLineOrig.slice(prefix.length) : (rowLineOrig || '');
          
          if (!rowClean.includes('|')) break;

          const cells = rowClean
            ?.split('|')
            .map((cell: string) => cell.trim())
            .filter((cell: string) => cell !== '');

          if (cells?.length && cells.length > 0) {
            rows.push(cells || []);
          }
          j++;
        }

        const placeholder = `{{TABLE${tableCounter}}}`;
        tables.set(placeholder, {
          type: 'table',
          props: {
            headers,
            rows,
            alignments: alignments || [],
          },
        });

        tableCounter++;
        result.push(prefix + placeholder);
        i = j;
        continue;
      }
    }

    result.push(line || '');
    i++;
  }

  return { content: result.join('\n'), tables };
}

/**
 * Render a table component from parsed data
 */
export function renderTable({
  headers,
  rows,
  alignments,
}: {
  headers: string[];
  rows: string[][];
  alignments: string[];
}) {
  return (
    <div className="my-4">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header, index) => {
              const alignment = alignments?.[index] || 'left';
              const textAlign =
                alignment === 'center'
                  ? 'text-center'
                  : alignment === 'right'
                    ? 'text-right'
                    : 'text-left';
              return (
                <TableHead key={index} className={textAlign}>
                  {header}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {row.map((cell, cellIndex) => {
                const alignment = alignments?.[cellIndex] || 'left';
                const textAlign =
                  alignment === 'center'
                    ? 'text-center'
                    : alignment === 'right'
                      ? 'text-right'
                      : 'text-left';
                return (
                  <TableCell key={cellIndex} className={textAlign}>
                    {cell}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export interface MarkdownProps {
  /**
   * The markdown content to render
   */
  content: string;
  /**
   * Additional CSS class names to apply to the article container
   */
  className?: string;
  /**
   * Highlight.js theme to use for code blocks
   * @default "vs"
   */
  theme?: HighlightTheme;
  /**
   * Optional Latex component to support LaTeX rendering
   * @example
   * import Latex from 'react-latex-next';
   * <Markdown content="..." useLatex={Latex} />
   */
  useLatex?: React.ComponentType<{ children: string }>;
}

/**
 * A component that renders markdown content as sanitized HTML with syntax highlighting support
 *
 * @param content - The markdown string to parse and render
 * @param theme - Highlight.js theme for code blocks (requires hljs-themes.css import)
 * @param className - Additional CSS classes for the container
 * @param useLatex - Optional Latex component to render LaTeX content
 * @returns A React component that renders the parsed markdown
 */
export const Markdown = React.memo(({ content, theme = 'vs', className, useLatex: LatexComponent }: MarkdownProps) => {
  const rootsRef = useRef<Map<string, Root>>(new Map());
  const uniqueId = React.useId().replace(/:/g, '');

  if (!content) return null;

  const { content: afterTables, tables } = React.useMemo(() => extractTables(content), [content]);
  const { content: afterCodeBlocks, codeBlocks } = React.useMemo(() => extractCodeBlocks(afterTables), [afterTables]);

  const { afterLatex, latexMap } = React.useMemo(() => {
    if (LatexComponent) {
      const latexResult = extractLatex(afterCodeBlocks);
      return { afterLatex: latexResult.content, latexMap: latexResult.latexMap };
    }
    return { afterLatex: afterCodeBlocks, latexMap: new Map<string, ComponentData>() };
  }, [LatexComponent, afterCodeBlocks]);

  const { blockLatexMap, inlineLatexMap } = React.useMemo(() => {
    const blockLatexMap = new Map<string, ComponentData>();
    const inlineLatexMap = new Map<string, ComponentData>();

    latexMap.forEach((data, key) => {
      if (data.type === 'latex' && data.props.isInline) {
          inlineLatexMap.set(key, data);
      } else {
          blockLatexMap.set(key, data);
      }
    });
    return { blockLatexMap, inlineLatexMap };
  }, [latexMap]);

  const renderLatex = React.useCallback((latexContent: string) => {
    if (LatexComponent) {
      return (
        <LatexComponent>{latexContent}</LatexComponent>
      );
    }
    return latexContent;
  }, [LatexComponent]);

  const { content: afterBlockquotes, blockquotes } = React.useMemo(
    () => extractBlockquotes(
        afterLatex,
        new Map([...tables, ...codeBlocks, ...blockLatexMap, ...inlineLatexMap]),
        theme,
        renderLatex
    ),
    [afterLatex, tables, codeBlocks, blockLatexMap, inlineLatexMap, theme, renderLatex]
  );

  const sanitizedHtml = React.useMemo(() => {
    let html = parseMarkdown(afterBlockquotes);

    if (LatexComponent) {
        inlineLatexMap.forEach((data, key) => {
             const id = `${uniqueId}-latex-inline-${key.replace(/[{}]/g, '')}`;
             html = html.replace(key, `<span id="${id}" class="latex-inline-placeholder"></span>`);
        });
    }

    const sanitizeConfig = {
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'em', 'del', 'code', 'pre', 'ul', 'ol', 'li', 'hr', 'a', 'img', 'div', 'span', 'sup', 'kbd', 'svg', 'head', 'body', 'script', 'path', 'polyline',
      ],
      ALLOWED_ATTR: [
        'href', 'target', 'rel', 'class', 'src', 'alt', 'id', 'defer', 'async', 'type', 'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'd', 'points',
      ],
      ALLOWED_URI_REGEXP:
        /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    };

    let result = html;
    if (typeof window !== 'undefined') {
      const DOMPurify = require('dompurify');
      result = DOMPurify.sanitize(html, sanitizeConfig);
    }
    return result;
  }, [afterBlockquotes, LatexComponent, inlineLatexMap, uniqueId]);

  useEffect(() => {
    if (!LatexComponent) return;

    // Use requestAnimationFrame to ensure the dangerouslySetInnerHTML has committed to the DOM
    const handle = requestAnimationFrame(() => {
      const newRoots = new Map<string, Root>();

      inlineLatexMap.forEach((data, key) => {
         const id = `${uniqueId}-latex-inline-${key.replace(/[{}]/g, '')}`;
         const element = document.getElementById(id);
         if (element && data.type === 'latex') {
             try {
                const root = createRoot(element);
                newRoots.set(id, root);
                root.render(<LatexComponent>{data.props.content}</LatexComponent>);
             } catch (err) {
                console.error('Error rendering inline latex root:', err);
             }
         }
      });

      rootsRef.current.forEach(root => {
        try { root.unmount(); } catch {}
      });
      rootsRef.current = newRoots;
    });

    return () => {
       cancelAnimationFrame(handle);
    };
  }, [sanitizedHtml, LatexComponent, inlineLatexMap, uniqueId]);

  useEffect(() => {
    return () => {
      rootsRef.current.forEach(root => {
          try {
              root.unmount()
          } catch(e) {}
      });
      rootsRef.current.clear();
    };
  }, []);

  const allComponents = React.useMemo(() => new Map([...tables, ...codeBlocks, ...blockLatexMap, ...blockquotes]), [tables, codeBlocks, blockLatexMap, blockquotes]);

  const renderContent = () => {
    const parts = sanitizedHtml.split(/({{[^}]+}})/);

    return parts
      .map((part, index) => {
        if (part.match(/^{{[^}]+}}$/)) {
          const componentData = allComponents.get(part);
          if (componentData) {
            switch (componentData.type) {
              case 'blockquote':
                return (
                   <div key={`blockquote-${index}`} className="min-w-0 w-full">
                     {componentData.content}
                   </div>
                );
              case 'codeblock':
                return (
                  <CodeBlock
                    key={`codeblock-${index}`}
                    {...componentData.props}
                    theme={theme}
                    className="mb-5"
                  />
                );
              case 'table':
                return (
                  <div key={`table-${index}`} className="mb-5 min-w-0 w-full">
                    {renderTable(componentData.props)}
                  </div>
                );
              case 'latex':
                if (LatexComponent) {
                   return (
                     <div key={`latex-${index}`} className="mb-5 min-w-0 w-full">
                        <LatexComponent>
                          {componentData.props.content}
                        </LatexComponent>
                     </div>
                   )
                }
                return (
                  <div key={`latex-${index}`} className="mb-5 min-w-0 w-full">
                    {componentData.props.content}
                  </div>
                );
              default:
                return null;
            }
          }
          return null;
        }

        if (part.trim().length > 0) {
          return (
            <div
              key={`html-${index}`}
              className="min-w-0 w-full"
              dangerouslySetInnerHTML={{ __html: part }}
            />
          );
        }

        return null;
      })
      .filter(Boolean);
  };

  return (
    <article
      data-slot="markdown"
      className={cn(
        'grid [&>div:first-child_h1:first-of-type]:mt-0 [&>div:first-child_h2:first-of-type]:mt-0 [&>div:first-child_h3:first-of-type]:mt-0 [&>div:first-child_h4:first-of-type]:mt-0 [&>div:first-child_h5:first-of-type]:mt-0 [&>div:first-child_h6:first-of-type]:mt-0 [&>div:last-child_p:last-of-type]:mb-0 [&>div:last-child_ul:last-of-type]:mb-0 [&>div:last-child_ol:last-of-type]:mb-0',
        className
      )}
    >
      {renderContent()}
    </article>
  );
});

Markdown.displayName = 'Markdown';
