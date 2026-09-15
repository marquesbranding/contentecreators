"use client";
import { Controller, useFormContext } from "react-hook-form";
import { Clock3, Globe2 } from "lucide-react";
import { Field, FieldLabel, FieldError } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { SearchableSelect } from "@/shared/components/ui/searchable-select";
import type { PlacementFormValues } from "../schemas/placement-form.schema";
import { PlacementTextField } from "./placement-content-step.client";
export function PlacementAudienceStep({
  isPublic,
  editing,
}: {
  isPublic: boolean;
  editing: boolean;
}) {
  const form = useFormContext<PlacementFormValues>();
  return (
    <section className="space-y-6" aria-labelledby="audience-step-title">
      <div>
        <h3 id="audience-step-title" className="text-xl font-bold">
          Público e agenda
        </h3>
        <p className="text-muted-foreground mt-1 text-sm leading-6">
          Defina quem vai ver e quando a campanha poderá aparecer.
        </p>
      </div>
      <Field>
        <FieldLabel htmlFor="sponsorship-placement-audience" required>
          Audiência
        </FieldLabel>
        <Controller
          control={form.control}
          name="audience"
          render={({ field }) => (
            <SearchableSelect
              id="sponsorship-placement-audience"
              items={{
                ALL: isPublic ? "Todos os visitantes" : "Todos os aprovados",
                COMPANY: "Empresas aprovadas",
                INFLUENCER: "Influenciadores aprovados",
              }}
              value={field.value}
              onValueChange={field.onChange}
              disabled={isPublic}
            />
          )}
        />
        {isPublic ? (
          <p className="bg-brand-blue-soft text-brand-blue flex items-start gap-2 rounded-xl p-3 text-sm leading-6">
            <Globe2 className="mt-1 size-4 shrink-0" />A página inicial é
            pública. Esta posição sempre aparece para todos, sem precisar de
            login.
          </p>
        ) : null}
      </Field>
      <div className="space-y-4 rounded-2xl border p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Clock3 className="text-brand-blue size-4" />
          Horário de Brasília (UTC−03:00)
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["startsAt", "Início (opcional)"],
              ["endsAt", "Término (opcional)"],
            ] as const
          ).map(([name, label]) => (
            <Field
              key={name}
              data-invalid={Boolean(form.formState.errors[name])}
            >
              <FieldLabel htmlFor={`sponsorship-${name}`}>{label}</FieldLabel>
              <Input
                className="min-w-0"
                id={`sponsorship-${name}`}
                type="datetime-local"
                {...form.register(name)}
              />
              <FieldError errors={[form.formState.errors[name]]} />
            </Field>
          ))}
        </div>
        <p className="text-muted-foreground text-sm leading-6">
          Sem datas, o patrocínio pode aparecer assim que for ativado. Fora do
          período, ele deixa de ser exibido automaticamente.
        </p>
      </div>
      {editing ? (
        <PlacementTextField
          name="reason"
          label="Nota interna (opcional)"
          max={500}
          multiline
          hint="Se preencher, use pelo menos 3 caracteres. Autor, data e alterações continuam registrados na auditoria."
        />
      ) : null}
      <p className="text-muted-foreground text-sm leading-6">
        Salvar não ativa um rascunho. A publicação é feita na lista, após a
        validação dos requisitos.
      </p>
    </section>
  );
}
