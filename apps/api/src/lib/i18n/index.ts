import { en, zhCN } from "zod/locales";
import { autocode as enUSAutoCode } from "./en-US/admin/autocode";
import { auth as enUSAuth } from "./en-US/admin/auth";
import { departmentLeaders as enUSDepartmentLeaders } from "./en-US/admin/department-leaders";
import { departments as enUSDepartments } from "./en-US/admin/departments";
import { guard as enUSGuard } from "./en-US/admin/guard";
import { users as enUSUsers } from "./en-US/admin/users";
import { common as enUSCommon } from "./en-US/common";
import { autocode as zhCNAutoCode } from "./zh-CN/admin/autocode";
import { auth as zhCNAuth } from "./zh-CN/admin/auth";
import { departmentLeaders as zhCNDepartmentLeaders } from "./zh-CN/admin/department-leaders";
import { departments as zhCNDepartments } from "./zh-CN/admin/departments";
import { guard as zhCNGuard } from "./zh-CN/admin/guard";
import { users as zhCNUsers } from "./zh-CN/admin/users";
import { common as zhCNCommon } from "./zh-CN/common";

export type Locale = "zh-CN" | "en-US";

export function requestLocale(acceptLanguage: string | undefined): Locale {
  return acceptLanguage?.toLowerCase().startsWith("en") ? "en-US" : "zh-CN";
}

const messages = {
  "zh-CN": {
    common: zhCNCommon,
    admin: {
      autocode: zhCNAutoCode,
      auth: zhCNAuth,
      departmentLeaders: zhCNDepartmentLeaders,
      departments: zhCNDepartments,
      guard: zhCNGuard,
      users: zhCNUsers,
    },
  },
  "en-US": {
    common: enUSCommon,
    admin: {
      autocode: enUSAutoCode,
      auth: enUSAuth,
      departmentLeaders: enUSDepartmentLeaders,
      departments: enUSDepartments,
      guard: enUSGuard,
      users: enUSUsers,
    },
  },
} as const;

export function t(
  locale: Locale,
  key: "common.validationFailed" | "common.notFound" | "common.internalServerError"
): string;
export function t(locale: Locale, key: "admin.autocode.ruleRequired", value: string): string;
export function t(
  locale: Locale,
  key:
    | "admin.auth.invalidCredentials"
    | "admin.auth.invalidRefreshToken"
    | "admin.auth.invalidAccessToken"
    | "admin.departments.notFound"
    | "admin.departmentLeaders.notFound"
    | "admin.guard.invalidAppKey"
    | "admin.users.notFound"
): string;
export function t(locale: Locale, key: string, value?: string): string {
  if (key === "common.validationFailed") return messages[locale].common.validationFailed;
  if (key === "common.notFound") return messages[locale].common.notFound;
  if (key === "common.internalServerError") return messages[locale].common.internalServerError;
  if (key === "admin.autocode.ruleRequired")
    return messages[locale].admin.autocode.ruleRequired(value ?? "");
  if (key === "admin.auth.invalidCredentials")
    return messages[locale].admin.auth.invalidCredentials;
  if (key === "admin.auth.invalidRefreshToken")
    return messages[locale].admin.auth.invalidRefreshToken;
  if (key === "admin.auth.invalidAccessToken")
    return messages[locale].admin.auth.invalidAccessToken;
  if (key === "admin.departments.notFound") return messages[locale].admin.departments.notFound;
  if (key === "admin.departmentLeaders.notFound")
    return messages[locale].admin.departmentLeaders.notFound;
  if (key === "admin.guard.invalidAppKey") return messages[locale].admin.guard.invalidAppKey;
  if (key === "admin.users.notFound") return messages[locale].admin.users.notFound;
  throw new Error(`Unknown i18n key: ${key}`);
}

const zodLocaleError = {
  "zh-CN": zhCN().localeError,
  "en-US": en().localeError,
};

export function localizeValidationIssues(issues: unknown, locale: Locale) {
  if (!Array.isArray(issues)) return issues;

  return issues.map((issue) => {
    const message = zodLocaleError[locale](issue as never);
    return { ...issue, summary: message, message };
  });
}
