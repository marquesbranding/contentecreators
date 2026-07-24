export interface CompanyLookupData {
  city: string;
  complement: string;
  legalName: string;
  neighborhood: string;
  number: string;
  postalCode: string;
  segment: string;
  state: string;
  street: string;
  tradeName: string;
}

export type CnpjLookupResult =
  | { data: CompanyLookupData; status: "success" }
  | {
      status:
        | "invalid"
        | "malformed_response"
        | "not_found"
        | "rate_limited"
        | "timeout"
        | "unavailable";
    };
