export const INFLUENCER_JOURNEY_URL =
  "https://www.jornadadoinfluenciador.com.br";

/**
 * Nota explicativa exibida ao lado do selo da Jornada do Influenciador, no
 * formulário e nas páginas de detalhe de criadores e empresas participantes.
 */
export function InfluencerJourneyNote({ className }: { className?: string }) {
  return (
    <p className={className ?? "text-muted-foreground text-xs leading-5"}>
      * A Jornada do Influenciador é uma iniciativa que capacita,
      profissionaliza e potencializa o perfil de influência de seus
      participantes. Para saber mais acesse:{" "}
      <a
        className="font-medium underline underline-offset-2"
        href={INFLUENCER_JOURNEY_URL}
        rel="noopener noreferrer"
        target="_blank"
      >
        www.jornadadoinfluenciador.com.br
      </a>
    </p>
  );
}
