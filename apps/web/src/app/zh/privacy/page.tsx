import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

import { AdPageChrome, DisplayAd } from "../../ads/display-ad";
import { LanguageSwitcher } from "../../i18n/language-switcher";
import { PageLanguage } from "../../i18n/page-language";
import { formatPublicOperator, getPublicSiteInfo } from "../../site/public-site-info";
import styles from "../../privacy/page.module.css";

export const metadata: Metadata = {
  title: "隐私与数据保留说明 | 日程表共享",
  description: "了解日程表共享 MVP 会保存哪些数据、用途、链接权限和默认保留时间。"
};

const dataItems = [
  "组织者填写的日程标题、说明、时区、日期范围和可选时间窗口。",
  "参与者填写的显示名称和选择的可用时间。",
  "浏览器本机会保存上次成功提交或编辑的显示名称，用于下次预填。",
  "浏览器本机会按日程保存自己的编辑链接，用于同一浏览器再次修改提交。",
  "浏览器本机会保存上次成功使用的每周模板星期和时间段，也会保存用户主动保存的多个本机每周模板，用于下次模板预填。",
  "浏览器本机会保存上次成功创建日程时使用的模式、时区、时间粒度和开放网格时间范围，用于下次预填。",
  "系统生成的分享链接、管理链接和编辑链接所需的随机标识或密钥哈希。",
  "创建时间、更新时间、过期时间和日程状态。"
];

const usageItems = [
  "创建和展示日程房间。",
  "让参与者提交或修改自己的可用时间。",
  "计算所有人都有空或多数人有空的候选时间。",
  "让组织者查看结果、导出 CSV、锁定或归档日程。"
];

const plannedAdItems = [
  "真实展示广告当前默认关闭；开启前会先配置广告平台账号、广告位、生产域名白名单和广告平台要求的 consent 或隐私消息。",
  "第三方广告供应商未来可能通过广告请求、cookie、web beacon、IP 地址、设备信息、浏览器信息、页面 URL、广告展示和互动数据来投放、衡量或防止无效流量。",
  "本工具不会主动把日程标题、参与者姓名、可用时间、上传图片、识别文本、管理密钥或编辑密钥作为广告定向字段发送给广告平台。",
  "带管理密钥或编辑密钥的页面在完成 URL 密钥迁移前不加载第三方广告脚本。"
];

const aiImportItems = [
  "图片识别当前不对公众开放；即使配置了 OpenAI API key，也必须同时通过功能开关、release mode、额度账本、成本护栏和广告验证后才会开放。",
  "如果用户主动使用图片识别，图片会被发送给配置的 AI provider，用来生成可编辑的可用时间预览。",
  "识别结果只作为草稿，用户确认提交前不会写入该日程。",
  "默认不保存原始图片、完整 OCR 文本或未确认的识别明细；后续额度系统只记录必要的状态、成本估算、文件类型、文件大小和失败/退款信息。"
];

export default function PrivacyPage() {
  const publicSiteInfo = getPublicSiteInfo();
  const operatorLine = formatPublicOperator(publicSiteInfo, "zh-CN");

  return (
    <main className={styles.page}>
      <PageLanguage lang="zh-CN" />
      <AdPageChrome pageContext="privacy">
        <div className={styles.shell}>
          <a className={styles.backLink} href="/zh">
            <ArrowLeft aria-hidden="true" size={17} />
            返回首页
          </a>
          <LanguageSwitcher chineseHref="/zh/privacy" current="zh-CN" englishHref="/privacy" />

          <header className={styles.header}>
            <p className={styles.eyebrow}>Privacy</p>
            <h1>隐私与数据保留说明</h1>
            <p>
              这是海外网页版 MVP
              的简版说明，用来解释这个工具会保存哪些数据、为什么保存，以及链接权限意味着什么。正式公开上线前仍需要按目标地区做法律审阅。
            </p>
          </header>

          <DisplayAd pageContext="privacy" placement="top-banner" />

          <section className={styles.section}>
            <h2>我们收集什么</h2>
            <p>当前版本不要求注册账号，不主动收集邮箱、手机号、微信号或日历账号。</p>
            <ul>
              {dataItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h2>这些数据用来做什么</h2>
            <ul>
              {usageItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>当前 MVP 不会把核心填写流程中的数据用于广告定向、第三方营销或训练模型。</p>
          </section>

          <DisplayAd pageContext="privacy" placement="inline-results" />

          <section className={styles.section}>
            <h2>广告与第三方技术</h2>
            <p>
              网站已经预留外围广告位和 <code>/ads.txt</code> 路由，但生产环境真实广告仍保持关闭。
              如果未来启用 Google AdSense
              或其他展示广告供应商，将先补齐正式广告配置、地区化同意机制和隐私说明。
            </p>
            <ul>
              {plannedAdItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>
              用户不需要点击广告来支持本站；也不应通过自动化、重复刷新或诱导点击来增加广告展示或点击。
            </p>
          </section>

          <section className={styles.section}>
            <h2>AI 图片识别</h2>
            <p>
              图片课表或排班识别属于可能产生成本的高级入口，当前只保留受闸门保护的代码路径，不作为公开功能开放。
            </p>
            <ul>
              {aiImportItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h2>链接就是权限</h2>
            <p>
              拿到公开分享链接的人可以查看日程和提交可用时间；拿到管理链接的人可以导出、锁定或归档日程；拿到编辑链接的人可以修改对应参与者的提交。
            </p>
            <p>请不要把管理链接或编辑链接公开发布。</p>
          </section>

          <section className={styles.section}>
            <h2>保留时间</h2>
            <p>
              MVP 默认日程在创建后 90
              天过期。过期日程可先归档，后续再删除。当前版本没有自助删除按钮；需要处理时请查看
              <a href="/zh/contact">联系与删除请求</a>。
            </p>
          </section>

          <section className={styles.section}>
            <h2>安全原则</h2>
            <p>
              数据库存储精确时间统一使用 UTC。服务端只保存管理密钥和编辑密钥的哈希，不保存明文密钥。
            </p>
          </section>

          <section className={styles.section}>
            <h2>运营主体与联系</h2>
            <p>
              {operatorLine ? (
                <>
                  公开运营主体：<strong>{operatorLine}</strong>。{" "}
                </>
              ) : (
                "公开运营主体尚未配置。"
              )}
              反馈、归档请求和删除请求可以通过<a href="/zh/contact">联系页面</a>发送。
            </p>
          </section>

          <section className={styles.section}>
            <h2>相关页面</h2>
            <p>
              你也可以查看 <a href="/zh/about">关于本工具</a>、<a href="/zh/terms">使用条款</a> 和{" "}
              <a href="/zh/contact">联系与删除请求</a>。 English version:{" "}
              <a href="/privacy">Privacy Policy</a>.
            </p>
          </section>
          <DisplayAd pageContext="privacy" placement="bottom-banner" />
        </div>
      </AdPageChrome>
    </main>
  );
}
