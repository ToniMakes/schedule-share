import { CalendarPlus } from "lucide-react";

import styles from "./page.module.css";

const workflowSteps = [
  {
    title: "创建日程",
    description: "设置日期范围、每天可选时间和时间粒度。"
  },
  {
    title: "分享链接",
    description: "参与者无需注册，打开链接就能填写可用时间。"
  },
  {
    title: "查看交集",
    description: "系统自动高亮所有人都有空和多数人方便的时间段。"
  }
];

export default function HomePage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <p className={styles.eyebrow}>Schedule Share MVP</p>
        <h1 className={styles.title}>快速找出大家都有空的时间</h1>
        <p className={styles.intro}>
          面向跨时区群组的轻量日程协调工具。第一版先验证创建、分享、填写和结果计算这条核心链路。
        </p>
        <div className={styles.actions}>
          <a className={styles.primary} href="/new">
            <CalendarPlus aria-hidden="true" size={18} />
            创建日程
          </a>
        </div>
        <section className={styles.workflow} aria-label="核心流程">
          {workflowSteps.map((step, index) => (
            <article className={styles.step} key={step.title}>
              <span className={styles.stepNumber}>{index + 1}</span>
              <h2>{step.title}</h2>
              <p>{step.description}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
