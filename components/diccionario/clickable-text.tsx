"use client";

import { Fragment, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { tokenizeClickableText } from "@/lib/diccionario";
import { useDiccionario } from "./diccionario-provider";

type ClickableTextProps = {
  text: string;
  /** Si false, renderiza texto plano (p. ej. durante typewriter). */
  enabled?: boolean;
  className?: string;
};

/**
 * Renderiza un texto con cada palabra clicable para abrir el diccionario.
 */
export function ClickableText({
  text,
  enabled = true,
  className,
}: ClickableTextProps) {
  const { open } = useDiccionario();

  if (!enabled) {
    return className ? <span className={className}>{text}</span> : <>{text}</>;
  }

  const tokens = tokenizeClickableText(text);

  const onWordClick = (event: MouseEvent, query: string) => {
    event.preventDefault();
    event.stopPropagation();
    open(query);
  };

  const onWordKeyDown = (event: KeyboardEvent, query: string) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    open(query);
  };

  const nodes: ReactNode[] = tokens.map((token, index) => {
    if (token.type === "other") {
      return <Fragment key={index}>{token.text}</Fragment>;
    }
    return (
      <span
        key={index}
        role="button"
        tabIndex={0}
        className="diccionario-word inline-block no-underline"
        style={{ cursor: 'url("/xp_link_xl.cur"), pointer' }}
        onClick={(event) => onWordClick(event, token.query)}
        onKeyDown={(event) => onWordKeyDown(event, token.query)}
      >
        {token.text}
      </span>
    );
  });

  if (className) {
    return <span className={className}>{nodes}</span>;
  }
  return <>{nodes}</>;
}

type ClickableMarkdownProps = {
  text: string;
  enabled?: boolean;
};

/** Como ClickableText, pero respeta `**negrita**` del markdown ligero del hero. */
export function ClickableMarkdown({
  text,
  enabled = true,
}: ClickableMarkdownProps) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <>
      {parts.map((part, index) => {
        const bold = part.match(/^\*\*([^*]+)\*\*$/);
        if (bold) {
          return (
            <strong key={index} className="font-bold">
              <ClickableText text={bold[1] ?? ""} enabled={enabled} />
            </strong>
          );
        }
        return <ClickableText key={index} text={part} enabled={enabled} />;
      })}
    </>
  );
}
