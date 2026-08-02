import { describe, expect, it } from "vitest";

import { apiErrorCodes } from "@schedule-share/api-client";

import { localizedApiErrorMessage } from "./api-error-messages";

describe("localized API error messages", () => {
  it("covers every declared API error code in Chinese and English", () => {
    for (const code of apiErrorCodes) {
      expect(localizedApiErrorMessage(code, "zh-CN")).not.toHaveLength(0);
      expect(localizedApiErrorMessage(code, "en")).not.toHaveLength(0);
    }
  });

  it("keeps cost-gated image recognition errors explicit", () => {
    expect(localizedApiErrorMessage("AI_CREDIT_REQUIRED", "en")).toContain(
      "Image recognition credits"
    );
    expect(localizedApiErrorMessage("IMPORT_PROVIDER_UNAVAILABLE", "zh-CN")).toContain(
      "图片识别服务暂未开放"
    );
  });
});
