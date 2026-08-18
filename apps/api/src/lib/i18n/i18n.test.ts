import { describe, expect, test } from "bun:test";
import { localizeValidationIssues, requestLocale, t } from "./index";

describe("requestLocale", () => {
  test("defaults unsupported request languages to zh-CN", () => {
    expect(requestLocale("ja-JP")).toBe("zh-CN");
  });

  test("uses English for English request languages", () => {
    expect(requestLocale("en-US,en;q=0.9")).toBe("en-US");
  });
});

describe("localizeValidationIssues", () => {
  test("localizes Zod issue messages", () => {
    expect(
      localizeValidationIssues(
        [{ code: "too_small", origin: "string", minimum: 8, inclusive: true, path: [] }],
        "zh-CN"
      )
    ).toEqual([
      {
        code: "too_small",
        origin: "string",
        minimum: 8,
        inclusive: true,
        path: [],
        summary: "数值过小：期望 string >=8 字符",
        message: "数值过小：期望 string >=8 字符",
      },
    ]);
  });
});

test("loads a custom message from its admin module dictionary", () => {
  expect(t("zh-CN", "admin.autocode.ruleRequired", "USERNAME")).toBe(
    "自动编码规则 USERNAME 未配置"
  );
});
