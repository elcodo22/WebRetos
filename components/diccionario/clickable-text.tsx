"use client";

import {
  Fragment,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type FocusEvent,
} from "react";
import { tokenizeClickableText } from "@/lib/diccionario";
import { useDiccionario } from "./diccionario-provider";

type ClickableTextProps = {
  text: string;
  /** Si false, renderiza texto plano (p. ej. durante typewriter). */
  enabled?: boolean;
  className?: string;
};

function hoverPayloadFromElement(el: HTMLElement, text: string) {
  const rect = el.getBoundingClientRect();
  const screen = document.querySelector(".crt-screen")?.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  return {
    text,
    top: screen ? rect.top - screen.top : rect.top,
    left: screen ? rect.left - screen.left : rect.left,
    width: rect.width,
    height: rect.height,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    fontFamily: style.fontFamily,
    letterSpacing: style.letterSpacing,
    lineHeight: style.lineHeight,
    textTransform: style.textTransform,
    wordSpacing: style.wordSpacing,
  };
}

/**
 * Renderiza un texto con cada palabra clicable para abrir el diccionario.
 */
export function ClickableText({
  text,
  enabled = true,
  className,
}: ClickableTextProps) {
  const { open, setHoverWord } = useDiccionario();

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

  const showHover = (
    event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>,
    wordText: string,
  ) => {
    setHoverWord(hoverPayloadFromElement(event.currentTarget, wordText));
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
        onMouseEnter={(event) => showHover(event, token.text)}
        onMouseLeave={() => setHoverWord(null)}
        onFocus={(event) => showHover(event, token.text)}
        onBlur={() => setHoverWord(null)}
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
