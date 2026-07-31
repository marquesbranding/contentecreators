"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { readAdditionalCompanyLocations } from "../domain/company-location-form-data";
import type {
  CompanyOnboardingDraftPayload,
  CreatorOnboardingDraftPayload,
} from "../schemas/onboarding-draft-schema";
import type {
  OnboardingDraftAction,
  OnboardingDraftClientDto,
  OnboardingDraftPayload,
  OnboardingDraftRole,
} from "../types/onboarding-draft.types";

const autosaveDelayMilliseconds = 800;

const creatorTypes = new Set(["INFLUENCER", "UGC"]);
const employeeRanges = new Set([
  "UP_TO_10",
  "11_TO_50",
  "51_TO_200",
  "201_TO_500",
  "MORE_THAN_500",
]);
const socialPlatforms = new Set([
  "INSTAGRAM",
  "TIKTOK",
  "YOUTUBE",
  "FACEBOOK",
  "X",
  "LINKEDIN",
  "OTHER",
]);

function readText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function readOptionalNumber(formData: FormData, name: string) {
  const rawValue = readText(formData, name).replace(",", ".").trim();

  if (!rawValue) {
    return undefined;
  }

  const value = Number(rawValue);
  return Number.isFinite(value) ? value : undefined;
}

function readSafeUrl(formData: FormData, name: string) {
  const value = readText(formData, name).trim();

  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}

function collectCreatorPayload(formData: FormData) {
  const payload: CreatorOnboardingDraftPayload = {};
  const creatorType = readText(formData, "creatorType");
  const engagementRate = readOptionalNumber(formData, "engagementRate");
  const followers = readOptionalNumber(formData, "followers");
  const socialPlatform = readText(formData, "socialPlatform");

  if (formData.has("bio")) {
    payload.bio = readText(formData, "bio");
  }
  if (formData.has("city")) {
    payload.city = readText(formData, "city");
  }
  if (creatorTypes.has(creatorType)) {
    payload.creatorType = creatorType as "INFLUENCER" | "UGC";
  }
  if (formData.has("displayName")) {
    payload.displayName = readText(formData, "displayName");
  }
  if (engagementRate !== undefined) {
    payload.engagementRate = engagementRate;
  }
  if (followers !== undefined) {
    payload.followers = Math.trunc(followers);
  }
  if (formData.has("legalName")) {
    payload.legalName = readText(formData, "legalName");
  }
  if (formData.has("nicheSlugs")) {
    payload.nicheSlugs = formData
      .getAll("nicheSlugs")
      .filter((value): value is string => typeof value === "string");
  }
  if (formData.has("otherNiche")) {
    payload.otherNiche = readText(formData, "otherNiche");
  }
  if (socialPlatforms.has(socialPlatform)) {
    payload.socialPlatform =
      socialPlatform as CreatorOnboardingDraftPayload["socialPlatform"];
  }
  if (formData.has("socialUrl")) {
    const socialUrl = readSafeUrl(formData, "socialUrl");
    if (socialUrl !== undefined) {
      payload.socialUrl = socialUrl;
    }
  }
  if (formData.has("state")) {
    payload.state = readText(formData, "state");
  }
  if (formData.has("whatsapp")) {
    payload.whatsapp = readText(formData, "whatsapp");
  }

  return payload;
}

function collectCompanyPayload(formData: FormData) {
  const payload: CompanyOnboardingDraftPayload = {};
  const employeeRange = readText(formData, "employeeRange");
  const socialPlatform = readText(formData, "socialPlatform");

  if (formData.has("additionalLocationsPresent")) {
    payload.additionalLocations = readAdditionalCompanyLocations(formData);
  }
  if (formData.has("city")) {
    payload.city = readText(formData, "city");
  }
  if (formData.has("cnpj")) {
    payload.cnpj = readText(formData, "cnpj");
  }
  if (formData.has("complement")) {
    payload.complement = readText(formData, "complement");
  }
  if (formData.has("description")) {
    payload.description = readText(formData, "description");
  }
  if (employeeRanges.has(employeeRange)) {
    payload.employeeRange =
      employeeRange as CompanyOnboardingDraftPayload["employeeRange"];
  }
  if (formData.has("legalName")) {
    payload.legalName = readText(formData, "legalName");
  }
  if (formData.has("neighborhood")) {
    payload.neighborhood = readText(formData, "neighborhood");
  }
  if (formData.has("number")) {
    payload.number = readText(formData, "number");
  }
  if (formData.has("postalCode")) {
    payload.postalCode = readText(formData, "postalCode");
  }
  if (formData.has("segment")) {
    payload.segment = readText(formData, "segment");
  }
  if (socialPlatforms.has(socialPlatform)) {
    payload.socialPlatform =
      socialPlatform as CompanyOnboardingDraftPayload["socialPlatform"];
  }
  if (formData.has("socialUrl")) {
    const socialUrl = readSafeUrl(formData, "socialUrl");
    if (socialUrl !== undefined) {
      payload.socialUrl = socialUrl;
    }
  }
  if (formData.has("state")) {
    payload.state = readText(formData, "state");
  }
  if (formData.has("street")) {
    payload.street = readText(formData, "street");
  }
  if (formData.has("tradeName")) {
    payload.tradeName = readText(formData, "tradeName");
  }
  if (formData.has("websiteUrl")) {
    const websiteUrl = readSafeUrl(formData, "websiteUrl");
    if (websiteUrl !== undefined) {
      payload.websiteUrl = websiteUrl;
    }
  }
  if (formData.has("whatsapp")) {
    payload.whatsapp = readText(formData, "whatsapp");
  }

  return payload;
}

function collectDraftPayload(form: HTMLFormElement, role: OnboardingDraftRole) {
  const formData = new FormData(form);

  if (role === "COMPANY") {
    return collectCompanyPayload(formData);
  }

  const payload = collectCreatorPayload(formData);

  if (
    !formData.has("nicheSlugs") &&
    form.querySelector('[name="nicheSlugs"]')
  ) {
    payload.nicheSlugs = [];
  }

  return payload;
}

type AutosaveStatusKind =
  "idle" | "pending" | "saving" | "saved" | "conflict" | "error";

const statusMessages: Record<AutosaveStatusKind, string> = {
  conflict: "Atualizado em outra aba",
  error: "Não foi possível salvar",
  idle: "Rascunho ainda não salvo",
  pending: "Alterações pendentes",
  saved: "Rascunho salvo",
  saving: "Salvando rascunho...",
};

function createStatus(kind: AutosaveStatusKind) {
  return { kind, message: statusMessages[kind] };
}

export function useOnboardingAutosave({
  action,
  initialDraft,
  role,
}: {
  action: OnboardingDraftAction;
  initialDraft: OnboardingDraftClientDto | null;
  role: OnboardingDraftRole;
}) {
  const [status, setStatus] = useState(() =>
    createStatus(initialDraft ? "saved" : "idle"),
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const basePayloadRef = useRef<OnboardingDraftPayload>(
    initialDraft?.payload ?? {},
  );
  const mountedRef = useRef(true);
  const processingRef = useRef(false);
  const queuedPayloadRef = useRef<OnboardingDraftPayload | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const versionRef = useRef(initialDraft?.version ?? 0);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const flush = useCallback(async () => {
    if (processingRef.current) {
      return;
    }

    processingRef.current = true;

    while (queuedPayloadRef.current) {
      const payload = queuedPayloadRef.current;
      queuedPayloadRef.current = null;

      if (mountedRef.current) {
        setStatus(createStatus("saving"));
      }

      let result: Awaited<ReturnType<OnboardingDraftAction>>;

      try {
        result = await action({
          expectedVersion: versionRef.current,
          payload,
          role,
        });
      } catch {
        queuedPayloadRef.current = null;
        if (mountedRef.current) {
          setHasUnsavedChanges(true);
          setStatus(createStatus("error"));
        }
        break;
      }

      if (!mountedRef.current) {
        processingRef.current = false;
        return;
      }

      if (result.kind === "saved") {
        basePayloadRef.current = result.draft.payload;
        versionRef.current = result.draft.version;

        if (!queuedPayloadRef.current) {
          setHasUnsavedChanges(false);
          setStatus(createStatus("saved"));
        }
        continue;
      }

      queuedPayloadRef.current = null;
      setHasUnsavedChanges(true);
      setStatus(
        createStatus(result.kind === "conflict" ? "conflict" : "error"),
      );
    }

    processingRef.current = false;
  }, [action, role]);

  const onFormInput = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      queuedPayloadRef.current = {
        ...basePayloadRef.current,
        ...collectDraftPayload(event.currentTarget, role),
      };
      setHasUnsavedChanges(true);
      setStatus(createStatus("pending"));

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        void flush();
      }, autosaveDelayMilliseconds);
    },
    [flush, role],
  );

  return {
    hasUnsavedChanges,
    onFormInput,
    status,
  };
}
