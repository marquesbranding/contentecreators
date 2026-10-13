import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import type {
  LegalBlock,
  LegalChapter,
  LegalDocument,
} from "@/features/legal/types/legal-document.types";
import { BrandLogo } from "@/shared/components/brand-logo";

type LegalDocumentPageProps = {
  document: LegalDocument;
};

export function itemAnchor(number: string) {
  return `item-${number.replaceAll(".", "-")}`;
}

function BulletList({ bullets }: { bullets?: readonly string[] }) {
  if (!bullets?.length) {
    return null;
  }

  return (
    <ul className="mt-3 list-disc space-y-2 pl-6">
      {bullets.map((bullet) => (
        <li key={bullet}>{bullet}</li>
      ))}
    </ul>
  );
}

function Block({ block }: { block: LegalBlock }) {
  switch (block.kind) {
    case "item":
      return (
        <div
          className="scroll-mt-24 leading-7 text-[#333] target:rounded-md target:bg-[#fff5df] target:outline-2 target:outline-offset-4 target:outline-[#b86800] focus:outline-2 focus:outline-offset-4 focus:outline-[#0059db]"
          id={itemAnchor(block.number)}
          tabIndex={-1}
        >
          <p>
            <span className="font-extrabold text-black">{block.number}.</span>{" "}
            {block.text}
          </p>
          <BulletList bullets={block.bullets} />
        </div>
      );
    case "paragraph":
      return (
        <div className="leading-7 text-[#333]">
          <p>{block.text}</p>
          <BulletList bullets={block.bullets} />
        </div>
      );
    case "subheading":
      return (
        <h3
          className="scroll-mt-24 pt-2 text-lg font-extrabold"
          id={block.number ? itemAnchor(block.number) : undefined}
        >
          {block.number ? `${block.number}. ` : null}
          {block.text}
        </h3>
      );
    case "callout":
      return (
        <p
          className="border-2 border-black bg-white p-4 leading-7 font-semibold"
          role="note"
        >
          {block.text}
        </p>
      );
    case "table":
      return (
        <div
          aria-label={block.caption}
          className="overflow-x-auto border-2 border-black bg-white"
          role="region"
          tabIndex={0}
        >
          <table className="w-full min-w-[34rem] border-collapse text-left text-sm leading-6">
            <caption className="sr-only">{block.caption}</caption>
            <thead className="bg-black text-white">
              <tr>
                {block.headers.map((header) => (
                  <th className="p-3 font-extrabold" key={header} scope="col">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr className="border-t border-black/20" key={row[0]}>
                  {row.map((cell, index) =>
                    index === 0 ? (
                      <th
                        className="p-3 align-top font-bold"
                        key={cell}
                        scope="row"
                      >
                        {cell}
                      </th>
                    ) : (
                      <td className="p-3 align-top" key={cell}>
                        {cell}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

function Chapter({ chapter }: { chapter: LegalChapter }) {
  return (
    <section
      aria-labelledby={`cap-${chapter.number}`}
      className="scroll-mt-24 border-t-2 border-black pt-8"
      id={`cap-${chapter.number}-section`}
    >
      <h2
        className="text-2xl font-extrabold tracking-[-0.025em]"
        id={`cap-${chapter.number}`}
      >
        {chapter.number}. {chapter.title}
      </h2>
      <div className="mt-5 space-y-4">
        {chapter.blocks.map((block, index) => (
          <Block
            block={block}
            key={`${chapter.number}-${index}-${"number" in block ? block.number : block.kind}`}
          />
        ))}
      </div>
    </section>
  );
}

export function LegalDocumentPage({ document }: LegalDocumentPageProps) {
  return (
    <div className="min-h-screen bg-[#f7f6f2] text-black">
      <header className="border-b border-white/15 bg-black">
        <div className="mx-auto flex h-20 max-w-5xl items-center justify-between px-5 sm:px-8">
          <Link
            aria-label="Contente Creators — início"
            className="rounded-md focus-visible:ring-3 focus-visible:ring-white/80 focus-visible:outline-none"
            href="/"
          >
            <BrandLogo />
          </Link>
          <Link
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 font-semibold text-white focus-visible:ring-3 focus-visible:ring-white/80 focus-visible:outline-none"
            href="/"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Voltar
          </Link>
        </div>
      </header>
      <main
        className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16"
        id="main-content"
        tabIndex={-1}
      >
        <p className="text-sm font-extrabold tracking-[0.12em] text-[#0059db] uppercase">
          Documento legal
        </p>
        <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl">
          {document.title}
        </h1>
        <p className="mt-4 font-semibold text-[#555]">
          Versão {document.versionLabel} · Atualizado em {document.updatedLabel}
        </p>
        <div className="mt-8 space-y-4 leading-7 text-[#333]">
          {document.intro.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        {document.summary ? (
          <section
            aria-labelledby="summary-heading"
            className="mt-10 border-2 border-black bg-white p-5"
          >
            <h2
              className="text-2xl font-extrabold tracking-[-0.025em]"
              id="summary-heading"
            >
              Em resumo
            </h2>
            <dl className="mt-4 divide-y divide-black/15">
              {document.summary.map((row) => (
                <div
                  className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr] sm:gap-4"
                  key={row.question}
                >
                  <dt className="font-extrabold">{row.question}</dt>
                  <dd className="leading-7 text-[#333]">{row.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        <nav
          aria-labelledby="toc-heading"
          className="mt-10 border-y-2 border-black py-6"
        >
          <h2 className="text-xl font-extrabold" id="toc-heading">
            Índice
          </h2>
          <ol className="mt-4 columns-1 gap-8 sm:columns-2">
            {document.chapters.map((chapter) => (
              <li className="break-inside-avoid py-1" key={chapter.number}>
                <a
                  className="font-semibold text-[#0059db] underline underline-offset-2 focus-visible:ring-3 focus-visible:ring-[#0059db]/40 focus-visible:outline-none"
                  href={`#cap-${chapter.number}`}
                >
                  {chapter.number}. {chapter.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10">
          {document.chapters.map((chapter) => (
            <Chapter chapter={chapter} key={chapter.number} />
          ))}
        </div>

        <footer className="mt-12 border-t-2 border-black pt-6 text-center text-sm leading-6 text-[#555]">
          {document.closing.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </footer>
      </main>
    </div>
  );
}
