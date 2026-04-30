import { getOpenAIClient } from "@/lib/openai";
import type { KnowledgePack } from "@/types/knowledge";

function assertKnowledgePack(pack: any): asserts pack is KnowledgePack {
  const required = ["title", "subtitle", "category", "subCategory", "difficulty", "summary", "coreMechanism", "whyImportant", "keywords", "misconception", "financeAngle", "memoryHooks", "thinkingQuestions", "conclusion"];
  for (const key of required) {
    if (!(key in pack)) throw new Error(`knowledge pack missing field: ${key}`);
  }
  if (!Array.isArray(pack.thinkingQuestions) || pack.thinkingQuestions.length !== 3) {
    throw new Error("knowledge pack must include exactly 3 thinkingQuestions");
  }
}

export async function generateKnowledgePack(params: {
  cardDate: string;
  category: string;
  recentTitles: string[];
}) {
  const model = process.env.OPENAI_TEXT_MODEL || "gpt-5.4";
  const prompt = `
你是一个跨学科知识策展助手。请生成一份“陌生领域每日学习卡”的完整知识内容包。

日期：${params.cardDate}
类别：${params.category}
最近 30 天已生成主题：${params.recentTitles.join("、") || "无"}

要求：
1. 面向非专业成人学习者，3 到 5 分钟能理解。
2. 主题必须具体，不要泛泛而谈。
3. 不要重复最近主题。
4. 必须包含财务/商业视角。
5. 必须包含 3 个思考题，分别是：概念理解、因果分析、迁移应用。
6. 每个思考题必须包含 level、question、answer、keyPoint。
7. 输出严格 JSON，不要 Markdown，不要解释。

JSON 字段：
title, subtitle, category, subCategory, difficulty, summary,
coreMechanism, whyImportant, processSteps, keywords, misconception,
financeAngle, memoryHooks, thinkingQuestions, conclusion
`;

  const response = await getOpenAIClient().chat.completions.create({
    model,
    messages: [
      { role: "system", content: "你只输出合法 JSON。" },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("OpenAI returned empty knowledge pack");

  const parsed = JSON.parse(text);
  assertKnowledgePack(parsed);
  return parsed;
}
