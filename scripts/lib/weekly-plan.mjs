const MS_PER_DAY = 24 * 60 * 60 * 1000;

const TITLE_SLUGS = new Map([
  ["订阅收入为什么更稳定", "subscription-revenue"],
  ["驿站网络为什么能加快信息传递", "post-station-network"],
  ["字体字重为什么会影响阅读感受", "font-weight"],
  ["飞机圆角窗为什么更安全", "rounded-airplane-windows"],
  ["洋流为什么会影响全球气候", "ocean-currents-climate"],
  ["数据库索引为什么能让查询变快", "database-index"],
  ["锚定效应为什么会影响价格判断", "anchoring-effect"],
]);

const WEEKDAY_CATEGORIES = [
  "综合冷知识",
  "自然科学",
  "工程技术",
  "人文社科",
  "商业金融",
  "历史文明",
  "艺术设计",
];

const TOPIC_TEMPLATES = [
  {
    category: "商业金融",
    subCategory: "商业模式",
    difficulty: "入门",
    title: "订阅收入为什么更稳定",
    subtitle: "可预测现金流如何提升业务韧性",
    summary: "用稳定复购替代一次性成交，企业更容易规划增长与成本。",
    keywords: ["订阅", "复购", "现金流"],
    coreMechanism: "客户按周期续费，收入会沿着订阅期持续累积，企业因此更容易预测未来现金流。",
    whyImportant: [
      "收入波动更小，预算安排更稳。",
      "更容易提前判断获客成本是否值得投入。",
      "续费率能直接反映产品长期价值。",
    ],
    processSteps: [
      { step: 1, title: "持续提供价值", desc: "先让用户愿意持续留下来，而不是只买一次。" },
      { step: 2, title: "形成续费节奏", desc: "把消费行为变成固定周期的复购习惯。" },
      { step: 3, title: "滚动累积收入", desc: "新老订阅同时贡献收入，波动会逐步变小。" },
    ],
    keywordDetails: [
      { term: "订阅", desc: "按月、按季或按年持续付费的商业安排。" },
      { term: "复购", desc: "同一客户在首次购买后再次付费。" },
      { term: "现金流", desc: "企业在一段时间内实际流入和流出的资金变化。" },
    ],
    misconception: {
      title: "常见误区",
      content: "不是只要改成订阅制就会稳定，前提仍是产品能持续创造价值。",
    },
    financeAngle: "财务上更容易做收入预测、回款排期和成本投入评估。",
    memoryHooks: ["把订阅想成每月自动续杯的咖啡卡。"],
    thinkingQuestions: [
      {
        level: "概念理解",
        question: "为什么订阅收入通常比一次性成交更容易预测？",
        answer: "因为续费行为会按周期重复出现，未来收入区间更容易估算。",
        keyPoint: "可预测性来自重复付费，不是来自定价更高。",
      },
    ],
    conclusion: "订阅收入更稳定，本质上是因为重复购买把未来现金流变得更可见。",
  },
  {
    category: "历史文明",
    subCategory: "基础设施",
    difficulty: "入门",
    title: "驿站网络为什么能加快信息传递",
    subtitle: "分段接力如何缩短长距离通信时间",
    summary: "把长途通信拆成标准化节点接力，速度和可靠性都会提升。",
    keywords: ["驿站", "接力", "网络"],
    coreMechanism: "信息和人员在固定节点换马、换人、换补给，减少单一路程中的持续损耗。",
    whyImportant: [
      "中央命令可以更快触达地方。",
      "节点标准化后，运输效率更容易复制。",
      "突发事件的反馈时间会明显缩短。",
    ],
    processSteps: [
      { step: 1, title: "设置节点", desc: "沿主要路线布设固定驿站。" },
      { step: 2, title: "分段接力", desc: "每一段由熟悉本地路况的人和马匹完成。" },
      { step: 3, title: "持续传递", desc: "把单次长途奔袭变成连续短途高频传递。" },
    ],
    keywordDetails: [
      { term: "驿站", desc: "负责换马、补给和交接信息的中转节点。" },
      { term: "接力", desc: "不同人或资源分段完成同一任务。" },
      { term: "网络", desc: "多个节点与线路连接形成的整体系统。" },
    ],
    misconception: {
      title: "常见误区",
      content: "快的关键不是单匹马跑得更快，而是系统减少了中途停顿。",
    },
    financeAngle: "这类似企业把流程拆成节点管理，用标准化交接提升整体周转效率。",
    memoryHooks: ["把驿站想成古代版高速服务区加快递分拨中心。"],
    thinkingQuestions: [
      {
        level: "迁移应用",
        question: "为什么分段交接比单人单程更高效？",
        answer: "因为每一段都能在最佳状态下完成，避免全程疲劳带来的效率下降。",
        keyPoint: "系统优化常常比单点提速更有效。",
      },
    ],
    conclusion: "驿站网络提速的核心，不是更拼命，而是把长链路改造成高效接力系统。",
  },
  {
    category: "艺术设计",
    subCategory: "视觉传达",
    difficulty: "入门",
    title: "字体字重为什么会影响阅读感受",
    subtitle: "视觉负担如何改变信息被理解的速度",
    summary: "字太轻或太重都会增加阅读阻力，合适字重能让信息更顺畅地进入大脑。",
    keywords: ["字重", "可读性", "层级"],
    coreMechanism: "字重改变笔画与背景的对比关系，也改变读者识别文字形状的难度。",
    whyImportant: [
      "影响正文是否轻松可读。",
      "影响标题与正文的层级区分。",
      "影响屏幕和印刷中的视觉疲劳。",
    ],
    processSteps: [
      { step: 1, title: "建立对比", desc: "先让文字与背景有足够分离度。" },
      { step: 2, title: "控制层级", desc: "用字重区分重点与普通信息。" },
      { step: 3, title: "匹配场景", desc: "根据屏幕、字号和密度微调字重。" },
    ],
    keywordDetails: [
      { term: "字重", desc: "字体笔画的粗细强度。" },
      { term: "可读性", desc: "读者识别和连续阅读文字的轻松程度。" },
      { term: "层级", desc: "页面中不同信息的重要性排序。" },
    ],
    misconception: {
      title: "常见误区",
      content: "不是越粗越清楚，过重反而会让字形黏连、阅读更累。",
    },
    financeAngle: "在图表和财务报告中，合适的字重能帮助读者更快抓住关键数字。",
    memoryHooks: ["把字重想成说话音量，太轻听不清，太重会吵。"],
    thinkingQuestions: [
      {
        level: "概念理解",
        question: "为什么同样内容换一个字重会让人感觉更好读或更难读？",
        answer: "因为字重影响笔画识别和视觉负担，大脑处理文字的成本会变化。",
        keyPoint: "阅读感受受视觉识别效率影响。",
      },
    ],
    conclusion: "字重影响阅读感受，本质上是它改变了文字识别成本和页面层级。",
  },
  {
    category: "综合冷知识",
    subCategory: "航空知识",
    difficulty: "入门",
    title: "飞机圆角窗为什么更安全",
    subtitle: "应力分散如何降低机身疲劳开裂风险",
    summary: "圆角能分散压力，减少尖角位置的应力集中，因此更不容易裂开。",
    keywords: ["应力", "疲劳", "圆角"],
    coreMechanism: "机舱反复增压减压时，尖角会让应力集中在局部，而圆角能把力量更均匀地分散开。",
    whyImportant: [
      "降低重复飞行后的材料疲劳风险。",
      "减少窗框周围裂纹扩展的概率。",
      "提升高压差环境下的结构安全余量。",
    ],
    processSteps: [
      { step: 1, title: "承受增压", desc: "机身每次起飞后都要承受舱内外压差。" },
      { step: 2, title: "分散应力", desc: "圆角让力量沿曲线过渡，不会在尖点堆积。" },
      { step: 3, title: "延缓疲劳", desc: "局部不过载，裂纹更难出现和扩散。" },
    ],
    keywordDetails: [
      { term: "应力", desc: "材料内部抵抗外力时产生的力分布。" },
      { term: "疲劳", desc: "材料在反复受力后逐步损伤的过程。" },
      { term: "圆角", desc: "用弧线替代直角的结构处理。" },
    ],
    misconception: {
      title: "常见误区",
      content: "圆角窗不是为了好看，首先是为了解决结构受力问题。",
    },
    financeAngle: "更安全的结构也意味着更低的故障成本和更可控的维护风险。",
    memoryHooks: ["把圆角想成水流过弯道，比撞上直角更顺。"],
    thinkingQuestions: [
      {
        level: "迁移应用",
        question: "为什么很多承压结构都尽量避免尖角？",
        answer: "因为尖角容易形成应力集中，长期更容易破损。",
        keyPoint: "结构设计要优先减少局部过载。",
      },
    ],
    conclusion: "飞机圆角窗更安全，因为它把压力从危险尖点摊开了。",
  },
  {
    category: "自然科学",
    subCategory: "气候系统",
    difficulty: "入门",
    title: "洋流为什么会影响全球气候",
    subtitle: "海水热量搬运如何改变区域冷暖与降水",
    summary: "洋流像地球的海上传送带，把热量和水汽搬到不同地区，进而改写气候。",
    keywords: ["洋流", "热量", "气候"],
    coreMechanism: "海水在风、温差和盐度差驱动下流动，把赤道和高纬度之间的热量不断重新分配。",
    whyImportant: [
      "决定沿海地区是偏暖还是偏冷。",
      "会影响降雨、雾气和风暴形成条件。",
      "长期改变渔业、农业和航运环境。",
    ],
    processSteps: [
      { step: 1, title: "积累热量", desc: "低纬海域吸收更多太阳能。" },
      { step: 2, title: "搬运热量", desc: "洋流把暖水或冷水带往别的区域。" },
      { step: 3, title: "改变气候", desc: "海气交换进一步影响气温、湿度和降水。" },
    ],
    keywordDetails: [
      { term: "洋流", desc: "大范围、持续性的海水流动。" },
      { term: "热量", desc: "决定海水和空气温度变化的重要能量。" },
      { term: "气候", desc: "某地区长期稳定的天气平均特征。" },
    ],
    misconception: {
      title: "常见误区",
      content: "气候不只由纬度决定，洋流会让同纬度地区冷热差很多。",
    },
    financeAngle: "气候变化会影响能源需求、航运成本和农产品供给预期。",
    memoryHooks: ["把洋流想成海里的中央空调送风系统。"],
    thinkingQuestions: [
      {
        level: "概念理解",
        question: "为什么同纬度的沿海城市气候也可能差很多？",
        answer: "因为它们受到的洋流类型不同，热量和水汽输入也不同。",
        keyPoint: "洋流会重新分配本该更平均的热量。",
      },
    ],
    conclusion: "洋流能影响全球气候，因为它持续在海洋和大气之间搬运热量。",
  },
  {
    category: "工程技术",
    subCategory: "软件基础",
    difficulty: "入门",
    title: "数据库索引为什么能让查询变快",
    subtitle: "先建目录为什么比全表逐行翻找更省时间",
    summary: "索引先把查找路径排好序，查询时就不用每次从头到尾扫描全部数据。",
    keywords: ["索引", "查询", "目录"],
    coreMechanism: "索引额外维护一份按规则排序的查找结构，让数据库先定位范围，再回到原数据取值。",
    whyImportant: [
      "大表查询速度差异会非常明显。",
      "能减少无效扫描带来的资源消耗。",
      "对常用筛选条件尤其有效。",
    ],
    processSteps: [
      { step: 1, title: "建立目录", desc: "为常查字段维护有序结构。" },
      { step: 2, title: "快速定位", desc: "查询时先通过目录找到目标位置。" },
      { step: 3, title: "回表取值", desc: "再读取真正需要的数据内容。" },
    ],
    keywordDetails: [
      { term: "索引", desc: "帮助数据库更快定位数据的辅助结构。" },
      { term: "查询", desc: "从数据库按条件取出目标数据。" },
      { term: "目录", desc: "先告诉你东西大概在哪，而不是从头找起。" },
    ],
    misconception: {
      title: "常见误区",
      content: "索引不是越多越好，过多索引会拖慢写入和占用更多空间。",
    },
    financeAngle: "报表系统和经营分析库常靠索引控制查询时延和算力成本。",
    memoryHooks: ["把索引想成书后的目录，不用每页翻。"],
    thinkingQuestions: [
      {
        level: "迁移应用",
        question: "为什么索引能加速查询，却可能拖慢写入？",
        answer: "因为新增或修改数据时，索引本身也要同步维护。",
        keyPoint: "索引是在读性能和写成本之间做交换。",
      },
    ],
    conclusion: "索引让查询变快，因为它把盲找变成了先定位再读取。",
  },
  {
    category: "人文社科",
    subCategory: "行为经济学",
    difficulty: "入门",
    title: "锚定效应为什么会影响价格判断",
    subtitle: "先看到的数字如何悄悄设定心理参照点",
    summary: "人不会从零判断价格，先出现的数字常常会成为后续比较的隐形起点。",
    keywords: ["锚定", "参照点", "定价"],
    coreMechanism: "大脑做快速判断时会抓住最先出现的信息作为参考，再围绕它做不完全修正。",
    whyImportant: [
      "会影响消费者对贵和便宜的感受。",
      "会影响谈判中的第一报价效果。",
      "会影响预算、估值和促销策略判断。",
    ],
    processSteps: [
      { step: 1, title: "先给锚点", desc: "先出现一个数字或范围。" },
      { step: 2, title: "形成参照", desc: "大脑默认围绕这个数字理解后续信息。" },
      { step: 3, title: "有限修正", desc: "即使知道不完全合理，也往往修正不够。" },
    ],
    keywordDetails: [
      { term: "锚定", desc: "判断时过度依赖最初信息的倾向。" },
      { term: "参照点", desc: "用来衡量后续信息高低的心理基线。" },
      { term: "定价", desc: "为商品或服务确定价格的过程。" },
    ],
    misconception: {
      title: "常见误区",
      content: "锚定效应不是冲动消费专属，专业人士也会受到影响。",
    },
    financeAngle: "估值谈判、预算编制和促销展示都可能被首个数字带偏。",
    memoryHooks: ["把锚点想成下单前先看到的划线价。"],
    thinkingQuestions: [
      {
        level: "概念理解",
        question: "为什么打折前先展示原价会影响你对现价的感觉？",
        answer: "因为原价先成了参照点，现价会被理解成更划算。",
        keyPoint: "先出现的数字会改变后续比较标准。",
      },
    ],
    conclusion: "锚定效应会影响价格判断，因为人的判断通常从参照点出发，而不是从零开始。",
  },
];

function parseIsoDate(dateText) {
  if (typeof dateText !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    throw new Error(`Invalid ISO date: ${dateText}`);
  }

  const date = new Date(`${dateText}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || formatIsoDate(date) !== dateText) {
    throw new Error(`Invalid ISO date: ${dateText}`);
  }

  return date;
}

function formatIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateText, days) {
  return formatIsoDate(new Date(parseIsoDate(dateText).getTime() + days * MS_PER_DAY));
}

function resolveNow(now) {
  if (now === undefined) {
    return new Date().toISOString();
  }

  const value = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
  if (value === "Invalid Date") {
    throw new Error(`Invalid now value: ${now}`);
  }
  return value;
}

function buildRelativeWeeklyPath(weekId, ...segments) {
  return ["automation", "weekly", weekId, ...segments].join("/");
}

function resolveCategoryForDate(cardDate) {
  return WEEKDAY_CATEGORIES[parseIsoDate(cardDate).getUTCDay()];
}

function resolveTemplateForCategory(category) {
  const template = TOPIC_TEMPLATES.find((candidate) => candidate.category === category);
  if (!template) {
    throw new Error(`No weekly topic template for category: ${category}`);
  }

  return template;
}

function createPlannedCard(cardDate, weekId, template, category) {
  const cardId = createCardId(cardDate, template.title);

  return {
    cardId,
    cardDate,
    category,
    subCategory: template.subCategory,
    difficulty: template.difficulty,
    title: template.title,
    subtitle: template.subtitle,
    summary: template.summary,
    keywords: [...template.keywords],
    content: {
      title: template.title,
      subtitle: template.subtitle,
      category,
      subCategory: template.subCategory,
      difficulty: template.difficulty,
      summary: template.summary,
      coreMechanism: template.coreMechanism,
      whyImportant: [...template.whyImportant],
      processSteps: template.processSteps.map((step) => ({ ...step })),
      keywords: template.keywordDetails.map((keyword) => ({ ...keyword })),
      misconception: { ...template.misconception },
      financeAngle: template.financeAngle,
      memoryHooks: [...template.memoryHooks],
      thinkingQuestions: template.thinkingQuestions.map((question) => ({ ...question })),
      conclusion: template.conclusion,
    },
    image: {
      status: "pending",
      rawPath: buildRelativeWeeklyPath(weekId, "images", "raw", `${cardId}.png`),
      publishedUrl: null,
      sizeBytes: null,
      checksum: null,
    },
    podcast: {
      status: "pending",
      version: 1,
      title: template.title,
      targetDurationSec: 180,
      pendingDir: buildRelativeWeeklyPath(weekId, "podcast_jobs", "pending", cardId),
      doneDir: buildRelativeWeeklyPath(weekId, "podcast_jobs", "done", cardId),
      audioUrl: null,
      transcriptUrl: null,
      duration: null,
      sizeBytes: null,
      checksum: null,
    },
  };
}

export function buildNextWeekDates(cards) {
  if (!Array.isArray(cards) || cards.length === 0) {
    throw new Error("cards must contain at least one card with cardDate");
  }

  const latestCardDate = cards.reduce((latest, card) => {
    const currentDate = card?.cardDate;
    parseIsoDate(currentDate);
    return latest === null || currentDate > latest ? currentDate : latest;
  }, null);

  return Array.from({ length: 7 }, (_, index) => addDays(latestCardDate, index + 1));
}

export function inferNextWeekId(cards) {
  const dates = buildNextWeekDates(cards);
  return `${dates[0]}_to_${dates[dates.length - 1]}`;
}

export function createCardId(cardDate, title) {
  parseIsoDate(cardDate);
  return `${cardDate}-${TITLE_SLUGS.get(title) ?? "topic"}`;
}

export function createWeeklyPlan(cards, { now } = {}) {
  const dates = buildNextWeekDates(cards);
  const weekId = `${dates[0]}_to_${dates[dates.length - 1]}`;
  const timestamp = resolveNow(now);

  return {
    weekId,
    createdAt: timestamp,
    updatedAt: timestamp,
    status: "created",
    cards: dates.map((cardDate) => {
      const category = resolveCategoryForDate(cardDate);
      return createPlannedCard(cardDate, weekId, resolveTemplateForCategory(category), category);
    }),
  };
}
