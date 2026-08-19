import { en, zhCN } from "zod/locales";
import { autocode as enUSAutoCode } from "./en-US/admin/autocode";
import { auth as enUSAuth } from "./en-US/admin/auth";
import { departmentLeaders as enUSDepartmentLeaders } from "./en-US/admin/department-leaders";
import { departments as enUSDepartments } from "./en-US/admin/departments";
import { positions as enUSPositions } from "./en-US/admin/positions";
import { guard as enUSGuard } from "./en-US/admin/guard";
import { users as enUSUsers } from "./en-US/admin/users";
import { roles as enUSRoles } from "./en-US/admin/roles";
import { menus as enUSMenus } from "./en-US/admin/menus";
import { dicts as enUSDicts } from "./en-US/admin/dicts";
import { attachments as enUSAttachments } from "./en-US/admin/attachments";
import { common as enUSCommon } from "./en-US/common";
import { autocode as zhCNAutoCode } from "./zh-CN/admin/autocode";
import { auth as zhCNAuth } from "./zh-CN/admin/auth";
import { departmentLeaders as zhCNDepartmentLeaders } from "./zh-CN/admin/department-leaders";
import { departments as zhCNDepartments } from "./zh-CN/admin/departments";
import { positions as zhCNPositions } from "./zh-CN/admin/positions";
import { guard as zhCNGuard } from "./zh-CN/admin/guard";
import { users as zhCNUsers } from "./zh-CN/admin/users";
import { roles as zhCNRoles } from "./zh-CN/admin/roles";
import { menus as zhCNMenus } from "./zh-CN/admin/menus";
import { dicts as zhCNDicts } from "./zh-CN/admin/dicts";
import { attachments as zhCNAttachments } from "./zh-CN/admin/attachments";
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
      positions: zhCNPositions,
      guard: zhCNGuard,
      users: zhCNUsers,
      roles: zhCNRoles,
      menus: zhCNMenus,
      dicts: zhCNDicts,
      attachments: zhCNAttachments,
    },
  },
  "en-US": {
    common: enUSCommon,
    admin: {
      autocode: enUSAutoCode,
      auth: enUSAuth,
      departmentLeaders: enUSDepartmentLeaders,
      departments: enUSDepartments,
      positions: enUSPositions,
      guard: enUSGuard,
      users: enUSUsers,
      roles: enUSRoles,
      menus: enUSMenus,
      dicts: enUSDicts,
      attachments: enUSAttachments,
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
    | "admin.positions.notFound"
    | "admin.positions.notFound"
    | "admin.departmentLeaders.notFound"
    | "admin.guard.invalidAppKey"
    | "admin.guard.permissionForbidden"
    | "admin.users.notFound"
    | "admin.roles.notFound"
    | "admin.roles.userNotFound"
    | "admin.roles.departmentNotFound"
    | "admin.roles.departmentRoleNotFound"
    | "admin.roles.userDepartmentRoleNotFound"
    | "admin.menus.notFound"
    | "admin.menus.parentNotFound"
    | "admin.menus.permissionNotFound"
    | "admin.menus.hasChildren"
    | "admin.dicts.notFound"
    | "admin.dicts.itemNotFound"
    | "admin.dicts.hasItems"
    | "admin.attachments.notFound"
    | "admin.attachments.fileNotFound"
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
  if (key === "admin.positions.notFound") return messages[locale].admin.positions.notFound;
  if (key === "admin.positions.notFound") return messages[locale].admin.positions.notFound;
  if (key === "admin.departmentLeaders.notFound")
    return messages[locale].admin.departmentLeaders.notFound;
  if (key === "admin.guard.invalidAppKey") return messages[locale].admin.guard.invalidAppKey;
  if (key === "admin.guard.permissionForbidden")
    return messages[locale].admin.guard.permissionForbidden;
  if (key === "admin.users.notFound") return messages[locale].admin.users.notFound;
  if (key === "admin.roles.notFound") return messages[locale].admin.roles.notFound;
  if (key === "admin.roles.userNotFound") return messages[locale].admin.roles.userNotFound;
  if (key === "admin.roles.departmentNotFound")
    return messages[locale].admin.roles.departmentNotFound;
  if (key === "admin.roles.departmentRoleNotFound")
    return messages[locale].admin.roles.departmentRoleNotFound;
  if (key === "admin.roles.userDepartmentRoleNotFound")
    return messages[locale].admin.roles.userDepartmentRoleNotFound;
  if (key === "admin.menus.notFound") return messages[locale].admin.menus.notFound;
  if (key === "admin.menus.parentNotFound") return messages[locale].admin.menus.parentNotFound;
  if (key === "admin.menus.permissionNotFound")
    return messages[locale].admin.menus.permissionNotFound;
  if (key === "admin.menus.hasChildren") return messages[locale].admin.menus.hasChildren;
  if (key === "admin.dicts.notFound") return messages[locale].admin.dicts.notFound;
  if (key === "admin.dicts.itemNotFound") return messages[locale].admin.dicts.itemNotFound;
  if (key === "admin.dicts.hasItems") return messages[locale].admin.dicts.hasItems;
  if (key === "admin.attachments.notFound") return messages[locale].admin.attachments.notFound;
  if (key === "admin.attachments.fileNotFound")
    return messages[locale].admin.attachments.fileNotFound;
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
