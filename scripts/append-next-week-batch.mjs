import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const cardsFile = path.join(projectRoot, "data", "cards.json");

const nextBatch = [
  {
    id: "2026-05-07-concert-pricing",
    title: "为什么演唱会门票喜欢分区定价",
    subtitle: "同一场演出卖出不同价格，本质是在管理支付意愿差异",
    category: "商业金融",
    subCategory: "定价策略",
    difficulty: "进阶",
    cardDate: "2026-05-07",
    imageUrl: "/generated-cards/2026-05-07-concert-pricing.svg",
    summary: "演唱会把座位分区、权益分层，本质上是在用价格梯度回收不同观众的支付意愿，而不是简单按成本定价。",
    keywords: ["价格歧视", "支付意愿", "分区定价", "收益管理"],
    completed: false,
    favorite: false,
    needReview: false,
    content: {
      title: "为什么演唱会门票喜欢分区定价",
      subtitle: "同一场演出卖出不同价格，本质是在管理支付意愿差异",
      category: "商业金融",
      subCategory: "定价策略",
      difficulty: "进阶",
      summary: "演唱会把座位分区、权益分层，本质上是在用价格梯度回收不同观众的支付意愿，而不是简单按成本定价。",
      coreMechanism: "同一场演出的边际成本差异不大，但不同观众对视野、距离、体验和稀缺感的支付意愿差异很大。主办方通过内场、看台、VIP 和附加权益，把原本统一的需求曲线切成多个价格层，尽量减少高意愿用户的消费者剩余流失。",
      whyImportant: [
        "帮助理解为什么热门消费品常常不是一个价格卖给所有人。",
        "能看懂票务、酒店、航空等行业如何用分层定价提升收入。",
        "理解价格不是只看成本，而是看需求弹性和支付意愿。 "
      ],
      processSteps: [
        { step: 1, title: "识别差异", desc: "区分不同观众对座位和体验的支付意愿。" },
        { step: 2, title: "设计分层", desc: "把位置、权益和稀缺感打包成多个票档。" },
        { step: 3, title: "回收价值", desc: "让高意愿用户支付更高价格，从而提升总收入。" }
      ],
      keywords: [
        { term: "价格歧视", desc: "针对不同用户收取不同价格的策略。" },
        { term: "支付意愿", desc: "消费者愿意为某项体验支付的最高价格。" },
        { term: "分区定价", desc: "根据位置或体验差异设置不同价格档位。" },
        { term: "收益管理", desc: "通过定价与容量分配优化整体收入。" }
      ],
      misconception: {
        title: "不是越贵的票成本越高",
        content: "更贵的票未必对应更高服务成本，更多反映的是用户愿意为稀缺位置和更好体验付多少钱。"
      },
      financeAngle: "从财务角度看，分区定价是在固定容量约束下提高单场收入和毛利率。分析这类业务时，要看高价档售罄率、整体上座率、附加权益收入以及动态调价能力。",
      memoryHooks: [
        "同一场演出，不同票价，本质是不同支付意愿。",
        "定价不是算成本，而是管理需求。 "
      ],
      thinkingQuestions: [
        {
          level: "概念理解",
          question: "为什么演唱会不直接卖统一票价？",
          answer: "因为观众对位置和体验的支付意愿差异很大，统一票价会浪费高意愿用户愿意支付的那部分价值。",
          keyPoint: "理解支付意愿差异是分层定价的前提。"
        },
        {
          level: "因果分析",
          question: "为什么内场和看台价格差能拉得很开？",
          answer: "因为靠近舞台的体验更稀缺、更容易被高意愿用户竞争，主办方会用更高价格来回收这部分稀缺价值。",
          keyPoint: "理解稀缺性如何转化为价格差。"
        },
        {
          level: "迁移应用",
          question: "这个逻辑还能迁移到哪些行业？",
          answer: "酒店房型、航空舱位、游戏皮肤和会员体系都在用类似逻辑，把同一底层服务分层卖给不同支付意愿的人群。",
          keyPoint: "把分区定价抽象成更通用的收益管理方法。"
        }
      ],
      conclusion: "演唱会门票分区定价的本质，不是位置不同这么简单，而是在固定座位容量下，把不同观众的支付意愿尽量转化成收入。"
    }
  },
  {
    id: "2026-05-08-grand-canal",
    title: "大运河为什么能把北方王朝和江南财富连起来",
    subtitle: "一条人工水路，背后是粮食、税收和统治成本的重组",
    category: "历史文明",
    subCategory: "国家能力",
    difficulty: "入门",
    cardDate: "2026-05-08",
    imageUrl: "/generated-cards/2026-05-08-grand-canal.svg",
    summary: "大运河的重要性不只是运输便利，而是让国家能更低成本地调运粮食、整合税源，并维持跨区域统治。",
    keywords: ["大运河", "漕运", "国家能力", "统治成本"],
    completed: false,
    favorite: false,
    needReview: false,
    content: {
      title: "大运河为什么能把北方王朝和江南财富连起来",
      subtitle: "一条人工水路，背后是粮食、税收和统治成本的重组",
      category: "历史文明",
      subCategory: "国家能力",
      difficulty: "入门",
      summary: "大运河的重要性不只是运输便利，而是让国家能更低成本地调运粮食、整合税源，并维持跨区域统治。",
      coreMechanism: "政治中心常在北方，经济和粮食优势却越来越集中在江南。大运河把高产区、商税区和首都用低成本水运连接起来，使国家能稳定获取粮食和财政资源，降低对陆路长距离运输的依赖。",
      whyImportant: [
        "能理解基础设施为什么会改变国家治理半径。",
        "有助于看懂古代财政与交通系统之间的深层联系。",
        "说明政治中心与经济中心分离时，需要靠物流系统弥补。 "
      ],
      processSteps: [
        { step: 1, title: "连接产区", desc: "把江南粮食和税赋来源接入国家运输网络。" },
        { step: 2, title: "降低成本", desc: "用水运替代高成本陆运，提高运输规模和稳定性。" },
        { step: 3, title: "支撑统治", desc: "让首都、军队和官僚体系稳定获得物资与财政支持。" }
      ],
      keywords: [
        { term: "漕运", desc: "通过水路向政治中心调运粮食和物资的体系。" },
        { term: "国家能力", desc: "国家动员、征收和调配资源的能力。" },
        { term: "统治成本", desc: "维持大范围政治控制所需付出的成本。" },
        { term: "经济中心", desc: "财富、人口和税源较为集中的地区。" }
      ],
      misconception: {
        title: "不是单纯方便商人做生意",
        content: "大运河当然促进商业，但对王朝来说更关键的是它降低了国家征收、供养和统治的总体成本。"
      },
      financeAngle: "放到财税视角，大运河相当于一条降低物流成本、提高税源可提取性的国家级基础设施。它的价值不只在直接运输量，更在于对财政稳定性和政治控制力的放大。",
      memoryHooks: [
        "江南有钱粮，北方有朝廷。",
        "运河不是路，而是国家的输血管。 "
      ],
      thinkingQuestions: [
        {
          level: "概念理解",
          question: "为什么大运河对王朝统治这么重要？",
          answer: "因为它把经济和粮食优势地区与政治中心稳定连接起来，让国家能持续获得资源供给。",
          keyPoint: "理解交通网络和国家能力的关系。"
        },
        {
          level: "因果分析",
          question: "如果没有大运河，北方王朝会遇到什么问题？",
          answer: "会面临更高的运输成本、更不稳定的粮食供给，以及跨区域整合能力下降的问题。",
          keyPoint: "把基础设施缺失和统治成本上升联系起来。"
        },
        {
          level: "迁移应用",
          question: "今天看大型基础设施时，可以借鉴什么逻辑？",
          answer: "要看它是否实质性降低了资源流动成本，并增强了一个体系调动财富和物资的能力，而不只是看表面流量。",
          keyPoint: "把历史案例迁移到现代基建判断。"
        }
      ],
      conclusion: "大运河真正连接的不是南北两端，而是政治权力和经济资源之间的长期供给关系。"
    }
  },
  {
    id: "2026-05-09-grid-system",
    title: "网格系统为什么能让版面更耐看",
    subtitle: "看似拘束的线框，其实是在帮信息建立秩序",
    category: "艺术设计",
    subCategory: "版式系统",
    difficulty: "入门",
    cardDate: "2026-05-09",
    imageUrl: "/generated-cards/2026-05-09-grid-system.svg",
    summary: "网格系统的作用不是把设计做得死板，而是让文字、图片和留白有统一节奏，降低阅读负担。",
    keywords: ["网格系统", "版式", "对齐", "视觉秩序"],
    completed: false,
    favorite: false,
    needReview: false,
    content: {
      title: "网格系统为什么能让版面更耐看",
      subtitle: "看似拘束的线框，其实是在帮信息建立秩序",
      category: "艺术设计",
      subCategory: "版式系统",
      difficulty: "入门",
      summary: "网格系统的作用不是把设计做得死板，而是让文字、图片和留白有统一节奏，降低阅读负担。",
      coreMechanism: "人的视觉系统天生更容易处理有规律的对齐和重复。网格通过统一栏宽、边距、间距和模块关系，减少页面元素的随机摆放，让信息层级更稳定、扫描路径更清晰。",
      whyImportant: [
        "能帮助非设计背景的人快速提高页面整洁度。",
        "理解为什么很多高质量杂志、海报和产品界面都离不开网格。",
        "知道美观很多时候来自秩序，而不是装饰。 "
      ],
      processSteps: [
        { step: 1, title: "先划结构", desc: "先确定栏数、边距和主次区域。" },
        { step: 2, title: "统一对齐", desc: "让标题、正文、图片和说明遵循同一坐标体系。" },
        { step: 3, title: "形成节奏", desc: "通过重复间距和模块比例建立稳定阅读感受。" }
      ],
      keywords: [
        { term: "网格系统", desc: "用于安排版面元素的隐形结构框架。" },
        { term: "对齐", desc: "让元素共享统一边界或轴线。" },
        { term: "模块", desc: "网格中可复用的信息单元。" },
        { term: "视觉秩序", desc: "元素之间形成清晰规则后的整体观感。" }
      ],
      misconception: {
        title: "不是用了网格就会很无聊",
        content: "真正单调的不是网格，而是没有主次和变化。网格提供秩序，变化仍然可以发生在比例、字体和留白上。"
      },
      financeAngle: "在商业表达里，网格会直接影响理解效率和专业感。报表、汇报页和宣传页如果没有网格，往往会增加阅读成本，降低信息传达效率。",
      memoryHooks: [
        "网格不是束缚，是秩序的底盘。",
        "好看很多时候来自对齐。 "
      ],
      thinkingQuestions: [
        {
          level: "概念理解",
          question: "为什么网格能让版面更耐看？",
          answer: "因为它减少了元素摆放的随机性，让页面更容易形成清晰层级和稳定节奏。",
          keyPoint: "理解视觉秩序与阅读体验的关系。"
        },
        {
          level: "因果分析",
          question: "为什么没有对齐的页面会让人觉得乱？",
          answer: "因为每个元素都像在争夺注意力，读者需要额外花精力判断从哪里看、先看什么。",
          keyPoint: "理解认知负担会被坏布局放大。"
        },
        {
          level: "迁移应用",
          question: "做工作汇报时怎样借用网格系统？",
          answer: "先固定标题区、数字区和说明区的位置，再统一边距和行距，页面会立刻更清楚。",
          keyPoint: "把设计原则迁移到日常表达场景。"
        }
      ],
      conclusion: "网格系统的价值，不在于把页面做成同一种样子，而在于先建立秩序，再允许有控制的变化。"
    }
  },
  {
    id: "2026-05-10-spicy-pain",
    title: "为什么辣其实不是味觉而是痛觉",
    subtitle: "舌头感到的火辣，更像神经在报警而不是在品尝",
    category: "综合冷知识",
    subCategory: "人体与感知",
    difficulty: "入门",
    cardDate: "2026-05-10",
    imageUrl: "/generated-cards/2026-05-10-spicy-pain.svg",
    summary: "辣味并不属于酸甜苦咸鲜这类经典味觉，而是辣椒素刺激痛觉和温度受体后形成的灼热感。",
    keywords: ["辣椒素", "痛觉", "TRPV1", "味觉"],
    completed: false,
    favorite: false,
    needReview: false,
    content: {
      title: "为什么辣其实不是味觉而是痛觉",
      subtitle: "舌头感到的火辣，更像神经在报警而不是在品尝",
      category: "综合冷知识",
      subCategory: "人体与感知",
      difficulty: "入门",
      summary: "辣味并不属于酸甜苦咸鲜这类经典味觉，而是辣椒素刺激痛觉和温度受体后形成的灼热感。",
      coreMechanism: "辣椒素会激活口腔和皮肤中的 TRPV1 受体。这类受体原本负责感知高温和刺激，所以大脑会把信号解释成灼烧、刺痛和发热，而不是一种传统味觉。",
      whyImportant: [
        "能解释为什么喝冰水有时比喝温水更能缓解辣感。",
        "有助于理解味觉、嗅觉和体感其实是不同系统。",
        "让冷知识背后真正连到生理机制。 "
      ],
      processSteps: [
        { step: 1, title: "化学刺激", desc: "辣椒素进入口腔并接触神经末梢。" },
        { step: 2, title: "激活受体", desc: "TRPV1 把这种刺激误判成高温和疼痛。" },
        { step: 3, title: "形成体验", desc: "大脑把信号整合成灼热、刺痛和出汗反应。" }
      ],
      keywords: [
        { term: "辣椒素", desc: "辣椒中引起辛辣感的主要化学成分。" },
        { term: "TRPV1", desc: "能感知高温和刺激的一类神经受体。" },
        { term: "痛觉", desc: "机体对潜在损伤性刺激的感知。" },
        { term: "味觉", desc: "舌头对甜酸苦咸鲜等化学信号的识别。" }
      ],
      misconception: {
        title: "不是所有“味道强烈”都属于味觉",
        content: "薄荷的凉、花椒的麻、辣椒的辣，很多都不是传统味觉，而是体感或神经刺激。"
      },
      financeAngle: "食品行业做辣味产品时，真正设计的不是“味道强度”本身，而是刺激阈值、耐受度和复购体验之间的平衡。",
      memoryHooks: [
        "辣不是尝到的，是神经报警。",
        "舌头在吃，大脑在误判。 "
      ],
      thinkingQuestions: [
        {
          level: "概念理解",
          question: "为什么说辣不是真正的味觉？",
          answer: "因为它主要来自痛觉和温度受体被激活，而不是经典味觉受体识别出的味道。",
          keyPoint: "区分味觉系统和体感系统。"
        },
        {
          level: "因果分析",
          question: "为什么越辣越会出汗、流泪？",
          answer: "因为身体把这种刺激当成高温和威胁，会启动降温和防御反应。",
          keyPoint: "理解感觉信号会触发生理反应。"
        },
        {
          level: "迁移应用",
          question: "这个知识能怎么帮助理解食品体验设计？",
          answer: "它说明口感体验不只是味道配方，还涉及神经刺激阈值和身体反应。",
          keyPoint: "把生理机制迁移到产品体验理解。"
        }
      ],
      conclusion: "辣之所以让人上瘾，恰恰因为它不是单纯味道，而是一种被大脑加工后的刺激体验。"
    }
  },
  {
    id: "2026-05-11-coral-bleaching",
    title: "珊瑚为什么会白化",
    subtitle: "看似一夜变白，背后是共生系统被环境压力打断",
    category: "自然科学",
    subCategory: "地球系统",
    difficulty: "入门",
    cardDate: "2026-05-11",
    imageUrl: "/generated-cards/2026-05-11-coral-bleaching.svg",
    summary: "珊瑚白化不是简单褪色，而是珊瑚在高温等压力下失去共生藻类后，透明组织下露出白色骨骼。",
    keywords: ["珊瑚白化", "共生藻", "海温", "生态压力"],
    completed: false,
    favorite: false,
    needReview: false,
    content: {
      title: "珊瑚为什么会白化",
      subtitle: "看似一夜变白，背后是共生系统被环境压力打断",
      category: "自然科学",
      subCategory: "地球系统",
      difficulty: "入门",
      summary: "珊瑚白化不是简单褪色，而是珊瑚在高温等压力下失去共生藻类后，透明组织下露出白色骨骼。",
      coreMechanism: "健康珊瑚依赖体内共生藻进行光合作用，为自己提供能量并带来颜色。当海水温度异常升高或环境压力过大时，珊瑚会排出这些共生藻，短期内看起来变白，长期则可能因能量供应中断而死亡。",
      whyImportant: [
        "能帮助理解生态系统里很多关系是靠脆弱共生维持的。",
        "白化是气候变化影响海洋生态的直观信号之一。",
        "让“环境变化”从抽象概念变成可观察机制。 "
      ],
      processSteps: [
        { step: 1, title: "环境升温", desc: "海水温度或其他压力因素超过珊瑚耐受范围。" },
        { step: 2, title: "共生断裂", desc: "珊瑚排出体内共生藻，失去主要能量来源。" },
        { step: 3, title: "白化与衰退", desc: "白色骨骼显露，若压力持续则可能大规模死亡。" }
      ],
      keywords: [
        { term: "珊瑚白化", desc: "珊瑚失去共生藻后显现白色骨骼的现象。" },
        { term: "共生藻", desc: "为珊瑚提供能量并带来颜色的微小藻类。" },
        { term: "海温异常", desc: "海水温度长期高于生态系统正常波动范围。" },
        { term: "共生关系", desc: "两个生物通过合作彼此受益的关系。" }
      ],
      misconception: {
        title: "白化不等于立刻死亡",
        content: "白化说明系统出了大问题，但如果压力缓解得足够快，珊瑚仍有机会重新恢复共生关系。"
      },
      financeAngle: "珊瑚白化会影响海洋旅游、渔业和沿海生态服务。对依赖海岛旅游和渔业的地区来说，这不是纯环境新闻，而是经济韧性问题。",
      memoryHooks: [
        "珊瑚变白，不是上色褪了，是搭档走了。",
        "白化是共生系统断线。 "
      ],
      thinkingQuestions: [
        {
          level: "概念理解",
          question: "珊瑚为什么会变白？",
          answer: "因为它失去了体内提供颜色和能量的共生藻，透明组织下的白色骨骼显露出来。",
          keyPoint: "理解白化的直接生物机制。"
        },
        {
          level: "因果分析",
          question: "为什么海温升高会触发白化？",
          answer: "因为高温会破坏珊瑚与共生藻之间的稳定合作关系，迫使珊瑚排出这些藻类。",
          keyPoint: "把环境压力和生态响应连接起来。"
        },
        {
          level: "迁移应用",
          question: "这个案例能迁移出什么更一般的认识？",
          answer: "很多系统看起来稳定，其实高度依赖脆弱协作，一旦外部压力超过阈值，崩溃会非常快。",
          keyPoint: "把生态共生机制迁移到系统思维。"
        }
      ],
      conclusion: "珊瑚白化真正揭示的，不是颜色变化，而是一个高依赖共生系统在环境压力下的脆弱性。"
    }
  },
  {
    id: "2026-05-12-cdn-acceleration",
    title: "CDN为什么能让网页打开更快",
    subtitle: "速度提升的关键，不只是带宽，而是把内容提前搬近用户",
    category: "工程技术",
    subCategory: "网络系统",
    difficulty: "进阶",
    cardDate: "2026-05-12",
    imageUrl: "/generated-cards/2026-05-12-cdn-acceleration.svg",
    summary: "CDN 通过把静态内容缓存到离用户更近的节点，减少长距离传输和源站压力，从而降低延迟并提升稳定性。",
    keywords: ["CDN", "缓存", "延迟", "边缘节点"],
    completed: false,
    favorite: false,
    needReview: false,
    content: {
      title: "CDN为什么能让网页打开更快",
      subtitle: "速度提升的关键，不只是带宽，而是把内容提前搬近用户",
      category: "工程技术",
      subCategory: "网络系统",
      difficulty: "进阶",
      summary: "CDN 通过把静态内容缓存到离用户更近的节点，减少长距离传输和源站压力，从而降低延迟并提升稳定性。",
      coreMechanism: "用户访问网页时，如果每次都回源到一个中心服务器，请求距离长、网络抖动大、源站也容易拥堵。CDN 把图片、脚本、样式等内容分发到多个边缘节点，用户优先从最近节点获取资源，因此首屏更快、峰值更稳。",
      whyImportant: [
        "能帮助理解为什么同一个网站在不同地区速度差异很大。",
        "看懂现代互联网性能优化不只是堆服务器，而是重构内容分发路径。",
        "理解缓存命中率为什么会直接影响用户体验和成本。 "
      ],
      processSteps: [
        { step: 1, title: "内容分发", desc: "把可缓存资源同步到多个边缘节点。" },
        { step: 2, title: "就近访问", desc: "用户请求优先命中离自己更近的节点。" },
        { step: 3, title: "减轻回源", desc: "减少源站重复传输和峰值负载，整体更稳。" }
      ],
      keywords: [
        { term: "CDN", desc: "内容分发网络，用多个节点就近服务用户。" },
        { term: "边缘节点", desc: "靠近用户部署、承接内容访问请求的服务器节点。" },
        { term: "缓存命中", desc: "请求直接在缓存节点拿到内容，无需回源。" },
        { term: "延迟", desc: "请求发出到收到响应所经历的时间。" }
      ],
      misconception: {
        title: "不是所有内容都能靠 CDN 自动加速",
        content: "动态内容、个性化数据和频繁变化的数据不一定适合简单缓存，CDN 主要优势在可复用内容的就近分发。"
      },
      financeAngle: "CDN 不只是速度工具，也是成本和稳定性工具。命中率提高意味着源站带宽和计算压力下降，高峰期扩容需求也会减轻。",
      memoryHooks: [
        "不是网更快了，是内容更近了。",
        "回源越少，体验越稳。 "
      ],
      thinkingQuestions: [
        {
          level: "概念理解",
          question: "CDN 为什么能让网页更快？",
          answer: "因为它把可缓存内容放到离用户更近的节点，减少了长距离请求和源站等待。",
          keyPoint: "理解就近分发和缓存命中的作用。"
        },
        {
          level: "因果分析",
          question: "为什么高并发访问时 CDN 的价值更明显？",
          answer: "因为它能分散请求压力，避免所有用户都挤向同一个源站，从而提高峰值稳定性。",
          keyPoint: "把性能优化和容量管理联系起来。"
        },
        {
          level: "迁移应用",
          question: "如果一个页面依然很慢，说明只上 CDN 还不够，可能还要看什么？",
          answer: "还要看首屏资源大小、接口响应、图片压缩、前端渲染和数据库回源等环节。",
          keyPoint: "理解 CDN 解决的是分发，不是全部性能问题。"
        }
      ],
      conclusion: "CDN 的核心价值，不是神奇地让网络变快，而是把内容和用户之间的距离尽量缩短。"
    }
  },
  {
    id: "2026-05-13-loss-aversion",
    title: "损失厌恶为什么让人更怕失去而不是更想得到",
    subtitle: "同样一块钱，失去时带来的痛感常常强于得到时的快感",
    category: "人文社科",
    subCategory: "行为经济",
    difficulty: "入门",
    cardDate: "2026-05-13",
    imageUrl: "/generated-cards/2026-05-13-loss-aversion.svg",
    summary: "损失厌恶指的是人们对损失的心理反应通常强于同等收益，这会影响消费、投资和决策行为。",
    keywords: ["损失厌恶", "行为经济", "决策偏差", "前景理论"],
    completed: false,
    favorite: false,
    needReview: false,
    content: {
      title: "损失厌恶为什么让人更怕失去而不是更想得到",
      subtitle: "同样一块钱，失去时带来的痛感常常强于得到时的快感",
      category: "人文社科",
      subCategory: "行为经济",
      difficulty: "入门",
      summary: "损失厌恶指的是人们对损失的心理反应通常强于同等收益，这会影响消费、投资和决策行为。",
      coreMechanism: "前景理论认为，人们不是按绝对财富水平感受结果，而是相对参考点感受“得失”。同样金额下，损失带来的痛苦曲线通常比收益带来的愉悦曲线更陡，因此人会更努力避免失去，而不是积极追求同等规模的获得。",
      whyImportant: [
        "能解释很多看似不理性的拖延、套牢和保守决策。",
        "有助于理解为什么营销常用“错过损失”而不是“新增收益”来打动人。",
        "让人更警惕自己在投资和消费中的心理偏差。 "
      ],
      processSteps: [
        { step: 1, title: "建立参考点", desc: "人先把当前状态当作默认基准。" },
        { step: 2, title: "感知得失", desc: "任何变化都会被解释成相对基准的收益或损失。" },
        { step: 3, title: "放大损失", desc: "对损失的心理权重更高，于是行为更偏向避免失去。" }
      ],
      keywords: [
        { term: "损失厌恶", desc: "人对损失的痛感通常强于同等收益的快感。" },
        { term: "前景理论", desc: "描述人在风险和不确定情境下如何作决策的理论。" },
        { term: "参考点", desc: "个体判断得失时默认使用的心理基准。" },
        { term: "决策偏差", desc: "人类决策偏离完全理性的稳定模式。" }
      ],
      misconception: {
        title: "不是所有保守行为都因为理性",
        content: "很多时候，人不是算清楚了更优方案，而是单纯更害怕承认和接受损失。"
      },
      financeAngle: "损失厌恶在投资里非常常见，例如不愿止损、过早止盈、对回撤异常敏感。理解这一点，有助于把投资纪律和情绪管理分开看。",
      memoryHooks: [
        "失去一块钱，往往比捡到一块钱更有感觉。",
        "人怕失去，常常胜过想得到。 "
      ],
      thinkingQuestions: [
        {
          level: "概念理解",
          question: "什么叫损失厌恶？",
          answer: "就是同样规模的损失带来的痛苦，通常比收益带来的快乐更强烈。",
          keyPoint: "抓住“同额损失更痛”这个核心。"
        },
        {
          level: "因果分析",
          question: "为什么很多人会长期拿着亏损资产不卖？",
          answer: "因为卖出会把账面亏损变成现实损失，而损失厌恶让人更难接受这个结果。",
          keyPoint: "理解心理偏差如何影响投资行为。"
        },
        {
          level: "迁移应用",
          question: "日常消费里有哪些典型的损失厌恶利用方式？",
          answer: "限时折扣、会员即将过期、错过涨价提醒，都是用“怕失去”而不是“想得到”来推动行动。",
          keyPoint: "把行为经济迁移到营销场景。"
        }
      ],
      conclusion: "损失厌恶最重要的启发，不是人不理性，而是人对“失去”的感受权重往往高得超出自己想象。"
    }
  }
];

async function main() {
  const raw = await fs.readFile(cardsFile, "utf8");
  const cards = JSON.parse(raw);
  const existingIds = new Set(cards.map((card) => card.id));

  for (const card of nextBatch) {
    if (existingIds.has(card.id)) {
      throw new Error(`Card already exists: ${card.id}`);
    }
  }

  const nextCards = [...cards, ...nextBatch];
  await fs.writeFile(cardsFile, `${JSON.stringify(nextCards, null, 2)}\n`, "utf8");
  console.log(`Appended ${nextBatch.length} cards to ${cardsFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
