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
                <div key={`comp-${i}-${partIndex}`} className="my-2">
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

  const processedContent = content.replace(
    /```(\w+)?(?:\s+filename="([^"]+)")?\n([\s\S]*?)```/g,
    (match, lang, filename, code) => {
      const placeholder = `{{CODEBLOCK${codeBlockCounter}}}`;

      codeBlocks.set(placeholder, {
        type: 'codeblock',
        props: {
          code: code.trim(),
          language: lang,
          filename: filename,
          hideLineNumbers: false,
        },
      });

      codeBlockCounter++;
      return placeholder;
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

  /**
   * Pattern for multiline $$...$$
   */
  let processedContent = content.replace(
    /\$\$([\s\S]+?)\$\$/g,
    (match, tex) => {
      const placeholder = `{{LATEX${latexCounter}}}`;
      latexMap.set(placeholder, {
        type: 'latex',
        props: {
          content: match,
          isInline: false,
        },
      });
      latexCounter++;
      return placeholder;
    }
  );

  /**
   * Pattern for inline $...$, \[ ... \] and \( ... \)
   */
  processedContent = processedContent.replace(
    /((?:^|[^\\]))(\$)([^$]+?)\2/g,
    (match, prefix, delimiter, tex) => {
      const placeholder = `{{LATEX${latexCounter}}}`;
      latexMap.set(placeholder, {
        type: 'latex',
        props: {
          content: `$${tex}$`,
          isInline: true,
        },
      });
      latexCounter++;
      return prefix + placeholder;
    }
  );
  
  /**
   * Pattern for \[ ... \]
   */
  processedContent = processedContent.replace(
    /\\\[([\s\S]+?)\\\]/g,
    (match, tex) => {
      const placeholder = `{{LATEX${latexCounter}}}`;
      latexMap.set(placeholder, {
        type: 'latex',
        props: {
          content: match,
          isInline: false,
        },
      });
      latexCounter++;
      return placeholder;
    }
  );
  
  /**
   * Pattern for \( ... \)
   */
  processedContent = processedContent.replace(
    /\\\(([\s\S]+?)\\\)/g,
    (match, tex) => {
      const placeholder = `{{LATEX${latexCounter}}}`;
      latexMap.set(placeholder, {
        type: 'latex',
        props: {
          content: match,
          isInline: true,
        },
      });
      latexCounter++;
      return placeholder;
    }
  );

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

    if (
      line?.includes('|') &&
      i + 1 < lines.length &&
      lines[i + 1]?.includes('|') &&
      lines[i + 1]?.includes('-')
    ) {
      const headerLine = line;
      const separatorLine = lines[i + 1];

      // Parse headers
      const headers = headerLine
        ?.split('|')
        .map((cell: string) => cell.trim())
        .filter((cell: string) => cell !== '');

      // Parse alignments
      const alignments = separatorLine
        ?.split('|')
        .map((cell: string) => {
          const trimmed = cell.trim();
          if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
          if (trimmed.endsWith(':')) return 'right';
          return 'left';
        })
        .filter((_: string, index: number) => index < headers.length);

      // Collect table rows
      const rows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && lines[j]?.includes('|')) {
        const rowLine = lines[j];
        const cells = rowLine
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

      result.push(placeholder);
      tableCounter++;
      i = j;
    } else {
      result.push(line || '');
      i++;
    }
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
export function Markdown({ content, theme = 'vs', className, useLatex: LatexComponent }: MarkdownProps) {
  const rootsRef = useRef<Map<string, Root>>(new Map());

  useEffect(() => {
    return () => {
      rootsRef.current.forEach(root => root.unmount());
      rootsRef.current.clear();
    };
  }, []);

  if (!content) return null;

  const { content: afterTables, tables } = extractTables(content);
  const { content: afterCodeBlocks, codeBlocks } =
    extractCodeBlocks(afterTables);
  
  // Conditionally extract Latex if component provided
  let afterLatex = afterCodeBlocks;
  let latexMap = new Map<string, ComponentData>();
  
  if (LatexComponent) {
    const latexResult = extractLatex(afterCodeBlocks);
    afterLatex = latexResult.content;
    latexMap = latexResult.latexMap;
  }

  const blockLatexMap = new Map<string, ComponentData>();
  const inlineLatexMap = new Map<string, ComponentData>();

  latexMap.forEach((data, key) => {
     if (data.type === 'latex' && data.props.isInline) {
         inlineLatexMap.set(key, data);
     } else {
         blockLatexMap.set(key, data);
     }
  });

  const renderLatex = (latexContent: string) => {
    if (LatexComponent) {
      return (
        <LatexComponent>{latexContent}</LatexComponent>
      );
    }
    return latexContent;
  };

  const { content: afterBlockquotes, blockquotes } =
    extractBlockquotes(afterLatex, new Map([...tables, ...codeBlocks, ...blockLatexMap]), theme, renderLatex);

  let html = parseMarkdown(afterBlockquotes);

  if (LatexComponent) {
      inlineLatexMap.forEach((data, key) => {
           const id = `latex-inline-${key.replace(/[{}]/g, '')}`;
           html = html.replace(key, `<span id="${id}" class="latex-inline-placeholder"></span>`);
      });
  }

  /**
   * Sanitize HTML to prevent XSS attacks
   * Only sanitize on client-side to avoid jsdom SSR issues
   */
  const sanitizeConfig = {
    ALLOWED_TAGS: [
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'p',
      'br',
      'strong',
      'em',
      'del',
      'code',
      'pre',
      'ul',
      'ol',
      'li',
      'hr',
      'a',
      'img',
      'div',
      'span',
      'sup',
      'kbd',
      'svg',
      'head',
      'body',
      'script',
      'path',
      'polyline',
    ],
    ALLOWED_ATTR: [
      'href',
      'target',
      'rel',
      'class',
      'src',
      'alt',
      'id',
      'defer',
      'async',
      'type',
      'viewBox',
      'fill',
      'stroke',
      'stroke-width',
      'stroke-linecap',
      'stroke-linejoin',
      'd',
      'points',
    ],
    ALLOWED_URI_REGEXP:
      /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  };

  let sanitizedHtml = html;
  if (typeof window !== 'undefined') {
    const DOMPurify = require('dompurify');

    sanitizedHtml = DOMPurify.sanitize(html, sanitizeConfig);
  }

  useEffect(() => {
    if (!LatexComponent) return;

    inlineLatexMap.forEach((data, key) => {
       const id = `latex-inline-${key.replace(/[{}]/g, '')}`;
       const element = document.getElementById(id);
       if (element && data.type === 'latex') {
           if (!rootsRef.current.has(id)) {
               const root = createRoot(element);
               rootsRef.current.set(id, root);
               root.render(<LatexComponent>{data.props.content}</LatexComponent>);
           } else {
               const root = rootsRef.current.get(id);
               root?.render(<LatexComponent>{data.props.content}</LatexComponent>);
           }
       }
    });
  }, [sanitizedHtml, LatexComponent, inlineLatexMap]);

  const allComponents = new Map([...tables, ...codeBlocks, ...blockLatexMap, ...blockquotes]);

  const renderContent = () => {
    const parts = sanitizedHtml.split(/({{[^}]+}})/);

    return parts
      .map((part, index) => {
        if (part.match(/^{{[^}]+}}$/)) {
          const componentData = allComponents.get(part);
          if (componentData) {
            switch (componentData.type) {
              case 'blockquote':
                return componentData.content;
              case 'codeblock':
                return (
                  <CodeBlock
                    key={`codeblock-${index}`}
                    {...componentData.props}
                    theme={theme}
                  />
                );
              case 'table':
                return (
                  <div key={`table-${index}`}>
                    {renderTable(componentData.props)}
                  </div>
                );
              case 'latex':
                if (LatexComponent) {
                   return (
                     <LatexComponent key={`latex-${index}`}>
                       {componentData.props.content}
                     </LatexComponent>
                   )
                }
                return componentData.props.content;
              default:
                return null;
            }
          }
          return null;
        }

        const textContent = part.replace(/<[^>]*>/g, '').trim();
        if (textContent) {
          return (
            <div
              key={`html-${index}`}
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
}
