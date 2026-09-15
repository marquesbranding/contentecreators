import "server-only";
import { loadCurrentCompanyReviewProfile } from "../queries/company-review-profile.queries";
import { loadCurrentInfluencerReviewProfile } from "../queries/influencer-review-profile.queries";

export async function RegistrationReview({
  role,
}: {
  role: "COMPANY" | "INFLUENCER";
}) {
  const profile =
    role === "COMPANY"
      ? await loadCurrentCompanyReviewProfile()
      : await loadCurrentInfluencerReviewProfile();
  if (!profile) return null;
  const fields: [string, string][] = [
    ["Nome", "tradeName" in profile ? profile.tradeName : profile.legalName],
    ["WhatsApp", profile.whatsapp],
    ["Localização", `${profile.city}, ${profile.state}`],
    [
      "Apresentação",
      "description" in profile ? profile.description : profile.bio,
    ],
    ...profile.socialChannels.map((channel): [string, string] => [
      channel.platform,
      channel.url,
    ]),
  ];
  return (
    <details className="rounded-xl border p-4">
      <summary className="text-brand-blue cursor-pointer font-semibold">
        Revisar meus dados
      </summary>
      <dl className="mt-4 space-y-3 text-sm">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt className="font-semibold">{label}</dt>
            <dd className="text-muted-foreground break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
