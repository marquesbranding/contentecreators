import AxiosMockAdapter from "axios-mock-adapter";

import { createHttpClient } from "@/shared/api/http-client";

export function createHttpMock() {
  const client = createHttpClient({
    requestIdFactory: () => "request-test-fixture",
  });
  const mock = new AxiosMockAdapter(client);

  return {
    client,
    mock,
    restore: () => mock.restore(),
  };
}
