import { ArrowLeft, MessageSquareText } from "lucide-react";

import { AdPageChrome, DisplayAd } from "../ads/display-ad";
import { LanguageSwitcher } from "../i18n/language-switcher";
import { PageLanguage } from "../i18n/page-language";
import { formatPublicOperator, getPublicSiteInfo } from "../site/public-site-info";
import styles from "./page.module.css";

type Locale = "en" | "zh-CN";
type SupportRoute = "contact" | "feedback";

const englishFeedbackItems = [
  "The page URL where the issue happened, plus browser and device type.",
  "What you expected to do, and what actually happened.",
  "For time-result issues, include the schedule time zone, date range, and slot length.",
  "If you share a screenshot, remove management keys, edit keys, and private participant details."
];

const englishDeletionItems = [
  "Organizers can use the management link to archive a schedule and stop new submissions.",
  "For manual deletion, provide the public schedule link and the reason for the request.",
  "If organizer proof is needed, only share the management link through a private trusted channel.",
  "Participants who want to remove their own submission should contact the organizer and avoid posting their edit link publicly."
];

const chineseFeedbackItems = [
  "遇到问题的页面链接、浏览器和设备类型。",
  "你原本想完成的操作，以及实际发生了什么。",
  "如果问题和时间结果有关，请补充日程时区、日期范围和时间粒度。",
  "如果方便，可以附上不包含管理密钥或编辑密钥的截图。"
];

const chineseDeletionItems = [
  "组织者可以通过管理链接进入日程页并先归档日程，避免新参与者继续提交。",
  "需要人工删除时，请提供公开日程链接和请求原因。",
  "如需证明组织者身份，只在私信或受信任渠道提供管理链接，不要发到公开群聊。",
  "参与者想删除自己的提交时，请联系日程组织者，并避免公开发送自己的编辑链接。"
];

function routeHref(locale: Locale, route: SupportRoute) {
  const prefix = locale === "zh-CN" ? "/zh" : "";
  return `${prefix}/${route}`;
}

interface SupportPageViewProps {
  readonly locale: Locale;
  readonly route: SupportRoute;
}

export function SupportPageView({ locale, route }: SupportPageViewProps) {
  const publicSiteInfo = getPublicSiteInfo();
  const supportEmail = publicSiteInfo.supportEmail;
  const operatorLine = formatPublicOperator(publicSiteInfo, locale);
  const isChinese = locale === "zh-CN";
  const englishHref = routeHref("en", route);
  const chineseHref = routeHref("zh-CN", route);

  const copy = isChinese
    ? {
        backHref: "/zh",
        backLabel: "返回首页",
        eyebrow: route === "contact" ? "Contact" : "Feedback",
        title: route === "contact" ? "联系与删除请求" : "反馈与删除请求",
        intro:
          route === "contact"
            ? "这里是公开联系入口，用于产品反馈、归档请求和删除请求。正式公开测试前，应配置专用邮箱或站内表单，并明确处理时限。"
            : "这里先作为内测阶段的处理说明。正式公开测试前，应补充专用联系邮箱或站内表单，并明确处理时限。",
        contactAria: "当前联系渠道",
        contactTitle: supportEmail ? "当前联系渠道" : "当前还没有公开表单",
        contactBody: supportEmail ? (
          <p>
            反馈、归档或删除请求可以发送到 <a href={`mailto:${supportEmail}`}>{supportEmail}</a>。
            不要在邮件主题、公开群聊、论坛或评论区发布管理链接、编辑链接或含有密钥的截图。
          </p>
        ) : (
          <p>
            内测期间请通过组织者提供的私下渠道提交反馈。正式公开测试前会补充专用联系邮箱或站内表单。
            不要在公开群聊、论坛或评论区发布管理链接、编辑链接或含有密钥的截图。
          </p>
        ),
        feedbackHeading: "提交问题反馈时请包含",
        deletionHeading: "归档或删除请求",
        doNotSendHeading: "请不要发送",
        doNotSend:
          "不要发送数据库连接、后台配置、与日程无关的身份证件信息，或包含管理链接和编辑链接完整地址的公开截图。",
        footerAbout: "关于本工具",
        footerPrivacy: "查看隐私与数据保留说明",
        footerTerms: "使用条款",
        footerLanguage: "English",
        feedbackItems: chineseFeedbackItems,
        deletionItems: chineseDeletionItems
      }
    : {
        backHref: "/",
        backLabel: "Back to home",
        eyebrow: route === "contact" ? "Contact" : "Feedback",
        title:
          route === "contact" ? "Contact and Deletion Requests" : "Feedback and Deletion Requests",
        intro:
          route === "contact"
            ? "Use this public contact path for product feedback, archive requests, and deletion requests. A dedicated public support email or form should be finalized before broad public testing."
            : "This page describes how feedback, archive requests, and deletion requests are handled during the MVP stage. A dedicated public support email or form should be finalized before broad public testing.",
        contactAria: "Current contact status",
        contactTitle: supportEmail ? "Current contact channel" : "No public form yet",
        contactBody: supportEmail ? (
          <p>
            Feedback, archive requests, or deletion requests can be sent to{" "}
            <a href={`mailto:${supportEmail}`}>{supportEmail}</a>. Do not put management links, edit
            links, or screenshots containing keys in public posts, forums, or group chats.
          </p>
        ) : (
          <p>
            During internal testing, please use the private channel provided by the organizer. Do
            not publish management links, edit links, or screenshots containing keys in public
            posts, forums, or group chats.
          </p>
        ),
        feedbackHeading: "When Reporting an Issue, Include",
        deletionHeading: "Archive or Deletion Requests",
        doNotSendHeading: "Please Do Not Send",
        doNotSend:
          "Do not send database URLs, backend configuration, unrelated identity documents, or public screenshots that contain complete management or edit links.",
        footerAbout: "About",
        footerPrivacy: "Privacy and Data Retention",
        footerTerms: "Terms",
        footerLanguage: "中文",
        feedbackItems: englishFeedbackItems,
        deletionItems: englishDeletionItems
      };

  return (
    <main className={styles.page}>
      <PageLanguage lang={locale} />
      <AdPageChrome pageContext="feedback">
        <div className={styles.shell}>
          <a className={styles.backLink} href={copy.backHref}>
            <ArrowLeft aria-hidden="true" size={17} />
            {copy.backLabel}
          </a>
          <LanguageSwitcher chineseHref={chineseHref} current={locale} englishHref={englishHref} />

          <header className={styles.header}>
            <p className={styles.eyebrow}>{copy.eyebrow}</p>
            <h1>{copy.title}</h1>
            <p>{copy.intro}</p>
          </header>

          <DisplayAd pageContext="feedback" placement="top-banner" />

          <section className={styles.notice} aria-label={copy.contactAria}>
            <MessageSquareText aria-hidden="true" size={22} />
            <div>
              <h2>{copy.contactTitle}</h2>
              {copy.contactBody}
              {operatorLine ? (
                <p className={styles.metaLine}>
                  {isChinese ? "公开运营主体：" : "Public operator: "}
                  <strong>{operatorLine}</strong>
                </p>
              ) : null}
            </div>
          </section>

          <section className={styles.section}>
            <h2>{copy.feedbackHeading}</h2>
            <ul>
              {copy.feedbackItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <DisplayAd pageContext="feedback" placement="inline-results" />

          <section className={styles.section}>
            <h2>{copy.deletionHeading}</h2>
            <ul>
              {copy.deletionItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h2>{copy.doNotSendHeading}</h2>
            <p>{copy.doNotSend}</p>
          </section>

          <footer className={styles.footer}>
            <a href={isChinese ? "/zh/about" : "/about"}>{copy.footerAbout}</a>
            <a href={isChinese ? "/zh/privacy" : "/privacy"}>{copy.footerPrivacy}</a>
            <a href={isChinese ? "/zh/terms" : "/terms"}>{copy.footerTerms}</a>
            <a href={isChinese ? englishHref : chineseHref}>{copy.footerLanguage}</a>
          </footer>
          <DisplayAd pageContext="feedback" placement="bottom-banner" />
        </div>
      </AdPageChrome>
    </main>
  );
}
