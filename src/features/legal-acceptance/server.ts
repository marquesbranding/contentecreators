import "server-only";

export {
  acceptLegalDocumentsAction,
  type AcceptLegalDocumentsInput,
} from "./server/actions/legal-acceptance.actions";
export { loadPendingLegalDocuments } from "./server/queries/pending-legal-documents.queries";
export { createDrizzleLegalAcceptanceRepository } from "./server/repositories/drizzle-legal-acceptance.repository";
export type {
  AcceptLegalDocumentsActionResult,
  PendingLegalDocumentDto,
} from "./types/legal-acceptance.types";
