import type { KnowledgePack } from "@/types/knowledge";

export function buildImagePrompt(pack: KnowledgePack) {
  const keywords = pack.keywords.map((item) => `- ${item.term}：${item.desc}`).join("\n");
  const questions = pack.thinkingQuestions.map((item, index) => `${index + 1}. ${item.question}`).join("\n");
  const steps = pack.processSteps?.length
    ? pack.processSteps.map((item) => `${item.step}. ${item.title}：${item.desc}`).join("\n")
    : pack.coreMechanism;

  return `
生成一张中文“一图流”知识海报，主题为《${pack.title}》。

定位：
- 面向非专业成人学习者
- 竖版 4:5 或接近竖版，适合手机阅读
- 风格为现代杂志级信息图
- 信息密度高但不拥挤
- 简体中文尽量准确、清晰、可读

必须包含：
1. 大标题：${pack.title}
2. 副标题：${pack.subtitle}
3. 类别角标：陌生领域每日学习卡 · ${pack.category}
4. 一句话定义：${pack.summary}
5. 核心机制/流程：
${steps}
6. 为什么重要：
${pack.whyImportant.map((x) => `- ${x}`).join("\n")}
7. 关键词：
${keywords}
8. 一个容易误解的点：
${pack.misconception.content}
9. 财务视角：
${pack.financeAngle}
10. 3 个记忆钩子：
${pack.memoryHooks.map((x) => `- ${x}`).join("\n")}
11. 3 个思考题，只展示问题，不展示答案：
${questions}
12. 核心结论：
${pack.conclusion}

视觉要求：
- 模块分区明显
- 有流程箭头、图标、小示意图
- 不要做成纯艺术海报
- 优先保证知识信息清晰
- 输出完整成品图
`;
}
