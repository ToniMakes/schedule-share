import type { ApiErrorCode } from "@schedule-share/api-client";

import type { SiteLocale } from "./language-preference";

const apiErrorMessageCopy = {
  "zh-CN": {
    AI_CREDIT_REQUIRED: "图片识别额度暂时不可用，请稍后再试或改用手动填写。",
    CANDIDATE_OPTION_NOT_FOUND: "候选时间不存在或已经更新，请刷新后再试。",
    DATABASE_UNAVAILABLE: "数据库尚未配置。",
    FORBIDDEN: "你没有权限执行这个操作。",
    INTERNAL_ERROR: "服务暂时出错，请稍后再试。",
    INVALID_EDIT_KEY: "编辑链接无效或缺少密钥。",
    INVALID_OWNER_KEY: "管理链接无效或缺少密钥。",
    IMPORT_FILE_TOO_LARGE: "上传文件过大，请压缩后再试。",
    IMPORT_LOW_CONFIDENCE: "识别结果置信度太低，请换一张更清晰的图片或改用手动填写。",
    IMPORT_PROVIDER_UNAVAILABLE: "图片识别服务暂未开放，请先用文本导入或手动填写。",
    IMPORT_UNSUPPORTED_FILE_TYPE: "文件类型不支持，请上传 PNG、JPG、WebP、ICS 或 CSV 文件。",
    PARTICIPANT_NOT_FOUND: "这个参与者提交不存在或链接有误。",
    SCHEDULE_LOCKED: "这个日程已经停止接收修改。",
    SCHEDULE_NOT_FOUND: "这个日程不存在或链接有误。",
    SLOT_OUT_OF_RANGE: "提交的时间不在这个日程范围内。",
    TEMPLATE_NOT_FOUND: "这个模板不存在或已经被删除。",
    UNAUTHENTICATED: "请先登录后再继续。",
    UNSUPPORTED_ENTRY_METHOD: "这个导入方式暂不支持。",
    UNSUPPORTED_SLOT_MINUTES: "这个时间粒度暂不支持。",
    VALIDATION_ERROR: "请检查填写内容。"
  },
  en: {
    AI_CREDIT_REQUIRED:
      "Image recognition credits are not available right now. Try again later or fill the grid manually.",
    CANDIDATE_OPTION_NOT_FOUND: "This candidate time no longer exists. Refresh and try again.",
    DATABASE_UNAVAILABLE: "The database is not configured yet.",
    FORBIDDEN: "You do not have permission to perform this action.",
    INTERNAL_ERROR: "Something went wrong. Try again later.",
    INVALID_EDIT_KEY: "The edit link is invalid or missing its key.",
    INVALID_OWNER_KEY: "The organizer link is invalid or missing its key.",
    IMPORT_FILE_TOO_LARGE: "The uploaded file is too large. Compress it and try again.",
    IMPORT_LOW_CONFIDENCE:
      "The recognition confidence was too low. Try a clearer image or fill the grid manually.",
    IMPORT_PROVIDER_UNAVAILABLE:
      "Image recognition is not enabled yet. Use text import or the manual grid for now.",
    IMPORT_UNSUPPORTED_FILE_TYPE: "Upload a PNG, JPG, WebP, ICS, or CSV file.",
    PARTICIPANT_NOT_FOUND: "This participant submission does not exist, or the link is incorrect.",
    SCHEDULE_LOCKED: "This schedule is no longer accepting changes.",
    SCHEDULE_NOT_FOUND: "This schedule does not exist, or the link is incorrect.",
    SLOT_OUT_OF_RANGE: "The submitted time is outside this schedule.",
    TEMPLATE_NOT_FOUND: "This template does not exist or has been deleted.",
    UNAUTHENTICATED: "Sign in before continuing.",
    UNSUPPORTED_ENTRY_METHOD: "This import method is not supported yet.",
    UNSUPPORTED_SLOT_MINUTES: "This slot length is not supported yet.",
    VALIDATION_ERROR: "Check the form contents."
  }
} satisfies Record<SiteLocale, Record<ApiErrorCode, string>>;

export function localizedApiErrorMessage(code: ApiErrorCode, locale: SiteLocale): string {
  return apiErrorMessageCopy[locale][code];
}
