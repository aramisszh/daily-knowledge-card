import { getSingaporeWeekdayIndex } from "@/lib/date";

export const categoryRotation: Record<number, string> = {
  1: "自然科学",
  2: "工程技术",
  3: "人文社科",
  4: "商业金融",
  5: "历史文明",
  6: "艺术设计",
  0: "综合冷知识",
};

export function getCategoryByCardDate(cardDate: string) {
  return categoryRotation[getSingaporeWeekdayIndex(cardDate)];
}
