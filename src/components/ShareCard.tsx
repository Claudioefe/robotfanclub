"use client";

import { useRef } from "react";
import { fmtDate } from "@/lib/format";
import { rankText, slackText, type CardText } from "@/lib/cards";
import { Badge, buttonClass } from "./ui";
import { CopyButton } from "./CopyButton";

function CardBody({ card }: { card: CardText }) {
  return (
    <article className="flex flex-col gap-1.5 rounded-l border border-l-[5px] border-line border-l-cite bg-surface px-[18px] py-4">
      <p className="text-[13px] font-medium text-muted">Cited in Google’s AI answer</p>
      <p className="text-[17px] font-semibold leading-snug tracking-tight">“{card.query}”</p>
      {card.url && <p className="break-words font-medium text-cite">{card.url.replace(/^https?:\/\//, "")}</p>}
      <p className="text-[13.5px] text-muted">
        Source {card.position ?? "?"} of {card.total ?? "?"}. {rankText(card.organicRank)}.
      </p>
      <p className="text-[13.5px] text-muted">
        {card.offTop10 ? <Badge kind="off">Outside top 10</Badge> : <Badge kind="top">Top 10 page</Badge>} First seen {fmtDate(card.firstSeen)}
      </p>
    </article>
  );
}

// A Citation Card with a "Share" button that opens it in a dialog with "Copy for Slack".
export function ShareCard({ card, label = "Share", showCard = false }: { card: CardText; label?: string; showCard?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      {showCard && <CardBody card={card} />}
      <button type="button" className={`${buttonClass(true, true)} ${showCard ? "mt-1.5 self-start" : ""}`} onClick={() => dialog.current?.showModal()}>
        {label}
      </button>
      <dialog
        ref={dialog}
        aria-label="Citation card"
        className="m-auto w-[min(440px,calc(100%-32px))] bg-transparent p-0 text-ink backdrop:bg-black/50"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      >
        <div className="shadow-2xl">
          <CardBody card={card} />
        </div>
        <div className="mt-3.5 flex gap-2.5">
          <CopyButton text={slackText(card)} label="Copy for Slack" small={false} ghost={false} />
          <button type="button" className={buttonClass(true)} onClick={() => dialog.current?.close()}>
            Close
          </button>
        </div>
      </dialog>
    </>
  );
}

export { CardBody };
