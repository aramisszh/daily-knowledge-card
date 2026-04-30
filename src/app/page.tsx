"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { categoryRotation, mockCards } from "@/lib/mock-cards";
import type { AppKnowledgeCard, StatsSummary, ThinkingQuestion } from "@/types/knowledge";

const iconPaths = {
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
  check: "M20 6 9 17l-5-5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z",
  search: "m21 21-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z",
  filter: "M3 5h18M6 12h12M10 19h4",
  star: "m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z",
  refresh: "M21 12a9 9 0 0 1-15.32 6.36M3 12A9 9 0 0 1 18.32 5.64M21 3v6h-6M3 21v-6h6",
  brain: "M9 3a3 3 0 0 0-3 3v1a3 3 0 0 0 0 6v1a3 3 0 0 0 3 3M15 3a3 3 0 0 1 3 3v1a3 3 0 0 1 0 6v1a3 3 0 0 1-3 3M9 3v18M15 3v18M9 9h6M9 15h6",
  chart: "M4 19V5M4 19h16M8 16V9M12 16V6M16 16v-4",
  flame: "M12 22c4 0 7-3 7-7 0-3-2-5-4-8 0 3-2 4-3 4-2 0-3-2-2-5-3 3-5 6-5 9 0 4 3 7 7 7Z",
  image: "M4 5h16v14H4V5ZM8 13l2.5-3 3 4 2-2.5L20 17M8 8h.01",
  down: "m6 9 6 6 6-6",
  up: "m18 15-6-6-6 6",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2",
  tags: "M20 12 12 20 4 12V4h8l8 8ZM7 7h.01",
};

type IconName = keyof typeof iconPaths;
type CardStatus = "全部" | "已完成" | "未完成" | "收藏" | "待复习";
type TabKey = "today" | "library" | "progress" | "detail";
type DataMode = "api" | "mock";

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={iconPaths[name] || iconPaths.book} />
    </svg>
  );
}

function classNames(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

function calculateStats(cards: AppKnowledgeCard[]) {
  const safeCards = Array.isArray(cards) ? cards : [];
  const completedCards = safeCards.filter((card) => card.completed);
  const completedByCategory = completedCards.reduce<Record<string, number>>((acc, card) => {
    acc[card.category] = (acc[card.category] || 0) + 1;
    return acc;
  }, {});

  return {
    total: safeCards.length,
    completed: completedCards.length,
    favorites: safeCards.filter((card) => card.favorite).length,
    needReview: safeCards.filter((card) => card.needReview).length,
    streak: completedCards.length >= 2 ? 2 : completedCards.length,
    completedByCategory,
  };
}

function filterCards(cards: AppKnowledgeCard[], { category = "全部", status = "全部", query = "" }: { category?: string; status?: CardStatus; query?: string } = {}) {
  return cards.filter((card) => {
    const matchCategory = category === "全部" || card.category === category;
    const matchStatus =
      status === "全部" ||
      (status === "已完成" && card.completed) ||
      (status === "未完成" && !card.completed) ||
      (status === "收藏" && card.favorite) ||
      (status === "待复习" && card.needReview);
    const matchQuery =
      !query ||
      card.title.includes(query) ||
      card.summary.includes(query) ||
      card.keywords.some((keyword) => keyword.includes(query));
    return matchCategory && matchStatus && matchQuery;
  });
}

function getProgressCards(cards: AppKnowledgeCard[], type: string | null) {
  if (type === "completed") return cards.filter((card) => card.completed);
  if (type === "favorite") return cards.filter((card) => card.favorite);
  if (type === "review") return cards.filter((card) => card.needReview);
  return [];
}

function getCardPosterUrl(card: AppKnowledgeCard) {
  if (card.imageUrl.startsWith("/")) return card.imageUrl;
  return `/generated-cards/${card.id}.svg`;
}

function runSelfTests() {
  const stats = calculateStats(mockCards);
  console.assert(stats.total === 3, "stats.total should be 3");
  console.assert(stats.completed === 2, "stats.completed should be 2");
  console.assert(stats.favorites === 2, "stats.favorites should be 2");
  console.assert(stats.needReview === 1, "stats.needReview should be 1");
  console.assert(stats.completedByCategory["自然科学"] === 1, "自然科学 completed count should be 1");
  console.assert(filterCards(mockCards, { status: "已完成" }).length === 2, "completed filter should return 2 cards");
  console.assert(filterCards(mockCards, { status: "未完成" }).length === 1, "incomplete filter should return 1 card");
  console.assert(filterCards(mockCards, { category: "工程技术" }).length === 1, "category filter should return 1 card");
  console.assert(filterCards(mockCards, { query: "EUV" }).length === 1, "query filter should return EUV card");
  console.assert(getProgressCards(mockCards, "completed").length === 2, "completed progress cards should return 2 cards");
  console.assert(getProgressCards(mockCards, "favorite").length === 2, "favorite progress cards should return 2 cards");
  console.assert(getProgressCards(mockCards, "review").length === 1, "review progress cards should return 1 card");
  console.assert(getProgressCards(mockCards, "unknown").length === 0, "unknown progress type should return 0 cards");
  console.assert(categoryRotation.length === 7, "category rotation should cover 7 days");
  console.assert(categoryRotation[1].category === "工程技术", "Tuesday category should be 工程技术");
}

if (typeof window !== "undefined") runSelfTests();

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage = payload?.error || "请求失败";
    throw new Error(errorMessage);
  }

  return payload as T;
}

function ProgressBar({ value }: { value: number }) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return (
    <div className="h-2 w-full rounded-full bg-slate-100">
      <div className="h-2 rounded-full bg-slate-900 transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, safeValue))}%` }} />
    </div>
  );
}

function StatCard({ icon, label, value, hint, onClick, active = false, actionLabel }: { icon: IconName; label: string; value: string; hint: string; onClick?: () => void; active?: boolean; actionLabel?: string }) {
  const content = (
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">{label}</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3">
          <Icon name={icon} className="h-5 w-5 text-slate-700" />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
        <span>{hint}</span>
        {actionLabel ? <span className="font-medium text-slate-700">{actionLabel}</span> : null}
      </div>
    </CardContent>
  );

  if (!onClick) {
    return <div className="w-full rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition">{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "w-full rounded-2xl border bg-white text-left shadow-sm transition hover:border-slate-400 hover:shadow-md",
        active ? "border-slate-900 ring-2 ring-slate-900/10" : "border-slate-200"
      )}
    >
      {content}
    </button>
  );
}

function ProgressCardList({ title, cards, emptyText, onOpenCard }: { title: string; cards: AppKnowledgeCard[]; emptyText: string; onOpenCard: (id: string) => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="rounded-3xl border-slate-200 shadow-sm">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="font-semibold">{title}</div>
            <div className="text-sm text-slate-500">{cards.length} 张</div>
          </div>
          {cards.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">{emptyText}</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {cards.map((card) => (
                <button key={card.id} className="group rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-slate-400 hover:shadow-sm" onClick={() => onOpenCard(card.id)}>
                  <div className="flex gap-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      <img src={getCardPosterUrl(card)} alt={card.title} className="h-full w-full object-contain object-top" />
                    </div>
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap gap-1">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{card.category}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{card.cardDate}</span>
                      </div>
                      <div className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:underline">{card.title}</div>
                      <div className="mt-1 line-clamp-1 text-xs text-slate-500">{card.subCategory} · {card.difficulty}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function QuestionItem({ item, index }: { item: ThinkingQuestion; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <button className="flex w-full items-start justify-between gap-4 text-left" onClick={() => setOpen((v) => !v)}>
        <div>
          <div className="mb-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {index + 1}. {item.level}
          </div>
          <div className="text-base font-semibold text-slate-900">{item.question}</div>
        </div>
        <Icon name={open ? "up" : "down"} className="h-5 w-5 text-slate-500" />
      </button>
      {open ? (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          <div><span className="font-semibold text-slate-900">参考答案：</span>{item.answer}</div>
          <div className="mt-2"><span className="font-semibold text-slate-900">考察点：</span>{item.keyPoint}</div>
        </motion.div>
      ) : null}
    </div>
  );
}

export default function DailyKnowledgeCardMVP() {
  const [cards, setCards] = useState<AppKnowledgeCard[]>(mockCards);
  const [selectedId, setSelectedId] = useState(mockCards[0]?.id ?? "");
  const [todayCardId, setTodayCardId] = useState(mockCards[0]?.id ?? "");
  const [tab, setTab] = useState<TabKey>("today");
  const [category, setCategory] = useState("全部");
  const [status, setStatus] = useState<CardStatus>("全部");
  const [query, setQuery] = useState("");
  const [expandedProgress, setExpandedProgress] = useState<string | null>(null);
  const [dataMode, setDataMode] = useState<DataMode>("mock");
  const [isLoading, setIsLoading] = useState(true);
  const [bannerMessage, setBannerMessage] = useState("正在加载真实数据...");
  const [actionMessage, setActionMessage] = useState("");
  const [statsSummary, setStatsSummary] = useState<StatsSummary | null>(null);

  const selectedCard = cards.find((card) => card.id === selectedId) || cards[0];
  const todayCard = cards.find((card) => card.id === todayCardId) || cards[0];
  const todayPosterUrl = getCardPosterUrl(todayCard);
  const selectedPosterUrl = getCardPosterUrl(selectedCard);

  const localStats = calculateStats(cards);
  const stats = {
    ...localStats,
    streak: statsSummary?.streak ?? localStats.streak,
  };

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const categories = useMemo(() => ["全部", ...Array.from(new Set(cards.map((card) => card.category)))], [cards]);
  const filteredCards = useMemo(() => filterCards(cards, { category, status, query }), [cards, category, status, query]);
  const expandedProgressCards = useMemo(() => getProgressCards(cards, expandedProgress), [cards, expandedProgress]);
  const progressPanelTitle = expandedProgress === "completed" ? "累计完成的知识卡" : expandedProgress === "favorite" ? "收藏的知识卡" : expandedProgress === "review" ? "待复习的知识卡" : "";

  async function loadData() {
    setIsLoading(true);
    setActionMessage("");

    const [cardsResult, statsResult, todayResult] = await Promise.allSettled([
      requestJson<{ cards: AppKnowledgeCard[] }>("/api/cards"),
      requestJson<StatsSummary>("/api/stats"),
      requestJson<AppKnowledgeCard>("/api/cards/today"),
    ]);

    if (cardsResult.status === "fulfilled" && cardsResult.value.cards.length > 0) {
      const nextCards = cardsResult.value.cards;
      const nextTodayId = todayResult.status === "fulfilled" ? todayResult.value.id : nextCards[0].id;

      setCards(nextCards);
      setTodayCardId(nextTodayId);
      setSelectedId((current) => (nextCards.some((card) => card.id === current) ? current : nextTodayId));
      setDataMode("api");
      setBannerMessage(todayResult.status === "fulfilled" ? "" : "今天还没有对应日期的卡片，当前先显示这一批中的第一张。");
    } else if (cardsResult.status === "fulfilled" && cardsResult.value.cards.length === 0) {
      setCards(mockCards);
      setTodayCardId(mockCards[0].id);
      setSelectedId((current) => (mockCards.some((card) => card.id === current) ? current : mockCards[0].id));
      setDataMode("mock");
      setBannerMessage("数据库还没有卡片，当前显示示例数据。先执行 database/dev_seed.sql，再刷新页面。");
    } else {
      const reason = cardsResult.status === "rejected" ? cardsResult.reason.message : "接口不可用";
      setCards(mockCards);
      setTodayCardId(mockCards[0].id);
      setSelectedId((current) => (mockCards.some((card) => card.id === current) ? current : mockCards[0].id));
      setDataMode("mock");
      setBannerMessage(`真实数据暂时不可用，当前显示示例数据。原因：${reason}`);
    }

    if (statsResult.status === "fulfilled") {
      setStatsSummary(statsResult.value);
    } else {
      setStatsSummary(null);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function performCardAction(cardId: string, endpoint: string, updater: (card: AppKnowledgeCard) => AppKnowledgeCard) {
    setActionMessage("");

    if (dataMode === "mock") {
      setCards((prev) => prev.map((card) => (card.id === cardId ? updater(card) : card)));
      return;
    }

    const previousCards = cards;
    setCards((prev) => prev.map((card) => (card.id === cardId ? updater(card) : card)));

    try {
      await requestJson(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId }),
      });
      await loadData();
    } catch (error) {
      setCards(previousCards);
      setActionMessage(error instanceof Error ? error.message : "操作失败");
    }
  }

  const completeToday = () => {
    if (!todayCard) return;
    void performCardAction(todayCard.id, "/api/study/complete", (card) => ({ ...card, completed: true }));
  };

  const toggleFavorite = (id: string) => {
    void performCardAction(id, "/api/study/favorite", (card) => ({ ...card, favorite: !card.favorite }));
  };

  const toggleReview = (id: string) => {
    void performCardAction(id, "/api/study/review", (card) => ({ ...card, needReview: !card.needReview }));
  };

  const openCardDetail = (id: string) => {
    setSelectedId(id);
    setTab("detail");
  };

  if (!selectedCard || !todayCard) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-600">
        正在准备页面数据...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col justify-between gap-4 rounded-3xl bg-white p-5 shadow-sm md:flex-row md:items-center">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
              <Icon name="book" className="h-4 w-4" /> 陌生领域每日学习卡
            </div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">每日一图流知识学习系统</h1>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm md:w-80">
            {categoryRotation.map((item) => (
              <div key={item.day} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="text-slate-500">{item.day}</span>
                <span className="ml-2 font-medium text-slate-900">{item.category}</span>
              </div>
            ))}
          </div>
        </header>

        {bannerMessage || actionMessage ? (
          <div className={classNames("mb-6 rounded-2xl border px-4 py-3 text-sm", actionMessage ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-100 text-slate-700")}>
            {actionMessage || bannerMessage}
          </div>
        ) : null}

        <nav className="mb-6 flex flex-wrap gap-2">
          {[["today", "今日学习"], ["library", "知识图库"], ["progress", "学习进度"], ["detail", "知识详情"]].map(([key, label]) => (
            <Button key={key} variant={tab === key ? "default" : "outline"} className="rounded-2xl" onClick={() => setTab(key as TabKey)}>{label}</Button>
          ))}
        </nav>

        {tab === "today" ? (
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
                <div className="aspect-[4/5] bg-slate-100">
                  <img src={todayPosterUrl} alt={todayCard.title} className="h-full w-full object-contain object-top" />
                </div>
              </Card>
            </motion.div>

            <div className="space-y-4">
              <Card className="rounded-3xl border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-sm text-white">{todayCard.category}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{todayCard.subCategory}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{todayCard.difficulty}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{todayCard.cardDate}</span>
                  </div>
                  <h2 className="text-2xl font-semibold text-slate-900">{todayCard.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{todayCard.subtitle}</p>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm text-slate-500">今日状态</div>
                      <div className="mt-1 text-xl font-semibold">{todayCard.completed ? "已完成学习" : "等待打卡"}</div>
                    </div>
                    <div className={classNames("rounded-2xl p-3", todayCard.completed ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700")}>
                      <Icon name="check" className="h-6 w-6" />
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{todayCard.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {todayCard.keywords.map((keyword) => <span key={keyword} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{keyword}</span>)}
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <Button className="rounded-2xl" onClick={completeToday} disabled={todayCard.completed}>{todayCard.completed ? "已打卡" : "完成今日学习"}</Button>
                    <Button variant="outline" className="rounded-2xl" onClick={() => setTab("detail")}>查看补充内容</Button>
                    <Button variant="outline" className="rounded-2xl" onClick={() => toggleFavorite(todayCard.id)}><Icon name="star" className="mr-2 h-4 w-4" /> {todayCard.favorite ? "取消收藏" : "收藏"}</Button>
                    <Button variant="outline" className="rounded-2xl" onClick={() => toggleReview(todayCard.id)}><Icon name="refresh" className="mr-2 h-4 w-4" /> {todayCard.needReview ? "取消复习" : "标记复习"}</Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <StatCard icon="flame" label="连续学习" value={`${stats.streak} 天`} hint="优先采用数据库统计" />
                <StatCard icon="chart" label="完成率" value={`${completionRate}%`} hint={`${stats.completed}/${stats.total} 张`} />
              </div>

              <Card className="rounded-3xl border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="mb-4 flex items-center gap-2 font-semibold"><Icon name="brain" className="h-5 w-5" /> 今日三道思考题</div>
                  <div className="space-y-3">{todayCard.content.thinkingQuestions.map((item, index) => <QuestionItem key={item.question} item={item} index={index} />)}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}

        {tab === "library" ? (
          <div className="space-y-5">
            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_180px_180px]">
                <div className="relative">
                  <Icon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索标题、摘要或关键词" className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-slate-400" />
                </div>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none">{categories.map((item) => <option key={item}>{item}</option>)}</select>
                <select value={status} onChange={(e) => setStatus(e.target.value as CardStatus)} className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none">{["全部", "已完成", "未完成", "收藏", "待复习"].map((item) => <option key={item}>{item}</option>)}</select>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredCards.map((card) => (
                <Card key={card.id} className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
                  <div className="aspect-[4/3] bg-slate-100">
                    <img src={getCardPosterUrl(card)} alt={card.title} className="h-full w-full object-contain object-top" />
                  </div>
                  <CardContent className="p-4">
                    <div className="mb-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">{card.category}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">{card.subCategory}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">{card.cardDate}</span>
                      {card.completed ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">已完成</span> : null}
                    </div>
                    <h3 className="line-clamp-2 text-lg font-semibold text-slate-900">{card.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{card.summary}</p>
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" className="rounded-xl" onClick={() => openCardDetail(card.id)}>查看</Button>
                      <Button size="sm" variant="outline" className="rounded-xl" onClick={() => toggleFavorite(card.id)}>{card.favorite ? "已收藏" : "收藏"}</Button>
                      <Button size="sm" variant="outline" className="rounded-xl" onClick={() => toggleReview(card.id)}>{card.needReview ? "待复习" : "复习"}</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : null}

        {tab === "progress" ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard icon="check" label="累计完成" value={`${stats.completed} 张`} hint="已完成知识卡" actionLabel={expandedProgress === "completed" ? "收起" : "展开"} active={expandedProgress === "completed"} onClick={() => setExpandedProgress((prev) => (prev === "completed" ? null : "completed"))} />
              <StatCard icon="flame" label="连续学习" value={`${stats.streak} 天`} hint="按学习日期计算" />
              <StatCard icon="star" label="收藏" value={`${stats.favorites} 张`} hint="重点回看内容" actionLabel={expandedProgress === "favorite" ? "收起" : "展开"} active={expandedProgress === "favorite"} onClick={() => setExpandedProgress((prev) => (prev === "favorite" ? null : "favorite"))} />
              <StatCard icon="refresh" label="待复习" value={`${stats.needReview} 张`} hint="后续复盘池" actionLabel={expandedProgress === "review" ? "收起" : "展开"} active={expandedProgress === "review"} onClick={() => setExpandedProgress((prev) => (prev === "review" ? null : "review"))} />
            </div>

            {expandedProgress ? (
              <ProgressCardList title={progressPanelTitle} cards={expandedProgressCards} emptyText="当前没有对应的知识卡。" onOpenCard={openCardDetail} />
            ) : null}

            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="font-semibold">总体完成率</div>
                  <div className="text-sm text-slate-500">{completionRate}%</div>
                </div>
                <ProgressBar value={completionRate} />
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2 font-semibold"><Icon name="filter" className="h-5 w-5" /> 分类完成情况</div>
                <div className="space-y-4">
                  {categoryRotation.map((item) => {
                    const count = stats.completedByCategory[item.category] || 0;
                    const total = cards.filter((card) => card.category === item.category).length || 1;
                    return <div key={item.category}><div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium text-slate-800">{item.day} · {item.category}</span><span className="text-slate-500">{count}/{total}</span></div><ProgressBar value={(count / total) * 100} /></div>;
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {tab === "detail" ? (
          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm"><div className="aspect-[4/5] bg-slate-100"><img src={selectedPosterUrl} alt={selectedCard.title} className="h-full w-full object-contain object-top" /></div></Card>
            <div className="space-y-4">
              <Card className="rounded-3xl border-slate-200 shadow-sm"><CardContent className="p-5"><div className="mb-3 flex flex-wrap gap-2"><span className="rounded-full bg-slate-900 px-3 py-1 text-sm text-white">{selectedCard.category}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{selectedCard.subCategory}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{selectedCard.difficulty}</span></div><h2 className="text-2xl font-semibold">{selectedCard.title}</h2><p className="mt-2 text-slate-500">{selectedCard.subtitle}</p><p className="mt-4 leading-7 text-slate-700">{selectedCard.summary}</p></CardContent></Card>
              <Card className="rounded-3xl border-slate-200 shadow-sm"><CardContent className="p-5"><div className="mb-3 flex items-center gap-2 font-semibold"><Icon name="image" className="h-5 w-5" /> 核心机制</div><p className="leading-7 text-slate-700">{selectedCard.content.coreMechanism}</p></CardContent></Card>
              <Card className="rounded-3xl border-slate-200 shadow-sm"><CardContent className="p-5"><div className="mb-3 flex items-center gap-2 font-semibold"><Icon name="clock" className="h-5 w-5" /> 为什么重要</div><div className="grid gap-2 md:grid-cols-2">{selectedCard.content.whyImportant.map((item, index) => <div key={item} className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700"><span className="mr-2 font-semibold text-slate-900">{index + 1}.</span>{item}</div>)}</div></CardContent></Card>
              <Card className="rounded-3xl border-slate-200 shadow-sm"><CardContent className="p-5"><div className="mb-3 font-semibold">财务视角</div><p className="leading-7 text-slate-700">{selectedCard.content.financeAngle}</p></CardContent></Card>
              <Card className="rounded-3xl border-slate-200 shadow-sm"><CardContent className="p-5"><div className="mb-4 flex items-center gap-2 font-semibold"><Icon name="brain" className="h-5 w-5" /> 三道思考题与参考答案</div><div className="space-y-3">{selectedCard.content.thinkingQuestions.map((item, index) => <QuestionItem key={item.question} item={item} index={index} />)}</div></CardContent></Card>
              <Card className="rounded-3xl border-slate-200 bg-slate-900 text-white shadow-sm"><CardContent className="p-5"><div className="mb-2 font-semibold">核心结论</div><p className="leading-7 text-white/80">{selectedCard.content.conclusion}</p></CardContent></Card>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
