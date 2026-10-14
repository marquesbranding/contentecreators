import Image from "next/image";

const JOURNEY_LOGO_WIDTH = 1685;
const JOURNEY_LOGO_HEIGHT = 403;

/**
 * Selo da Jornada do Influenciador. O wordmark do cliente é azul (#0021A5),
 * então fica sobre pill branca fixa para continuar legível em qualquer fundo.
 * O arquivo tem 1685×403 px; a altura exibida é controlada pelas classes CSS.
 * O wordmark tem duas linhas, então 14/16 px ficaram ilegíveis na validação
 * visual (R04): sm = 20 px nos cards, md = 24 px no detalhe e no cabeçalho.
 */
export function InfluencerJourneyBadge({
  size = "sm",
}: {
  size?: "sm" | "md";
}) {
  const isMedium = size === "md";

  return (
    <span
      className="inline-flex items-center rounded-full bg-white px-2 py-0.5 ring-1 ring-black/10"
      title="Participante da Jornada do Influenciador"
    >
      <Image
        alt="Jornada do Influenciador"
        className={isMedium ? "h-6 w-auto" : "h-5 w-auto"}
        height={JOURNEY_LOGO_HEIGHT}
        src="/brand/partners/jornada-do-influenciador.png"
        width={JOURNEY_LOGO_WIDTH}
      />
    </span>
  );
}
