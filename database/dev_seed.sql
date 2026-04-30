insert into knowledge_cards (
  title,
  subtitle,
  category,
  sub_category,
  difficulty,
  card_date,
  summary,
  keywords,
  content_json,
  image_prompt,
  image_url,
  generation_status
)
values (
  'EUV 光刻机为什么是芯片产业链瓶颈',
  '一张图看懂先进制程背后的关键设备',
  '工程技术',
  '半导体制造',
  '入门',
  (now() at time zone 'Asia/Singapore')::date,
  'EUV 光刻机利用极紫外光，把极其微细的电路图案转移到晶圆表面，是先进芯片制造的核心设备。',
  array['EUV', '晶圆', '掩膜版', '光刻胶', '制程节点'],
  '{
    "title": "EUV 光刻机为什么是芯片产业链瓶颈",
    "subtitle": "一张图看懂先进制程背后的关键设备",
    "category": "工程技术",
    "subCategory": "半导体制造",
    "difficulty": "入门",
    "summary": "EUV 光刻机利用极紫外光，把极其微细的电路图案转移到晶圆表面，是先进芯片制造的核心设备。",
    "coreMechanism": "它通过光源、掩膜版、投影光学系统、光刻胶晶圆、显影与蚀刻等环节协同工作，把电路图案精确转移到晶圆上。",
    "whyImportant": ["波长更短，能刻更细的电路线条。", "先进制程如 7nm、5nm 高度依赖它。", "设备极其复杂，制造门槛极高。", "高端设备稀缺，会限制芯片产能扩张。"],
    "processSteps": [
      { "step": 1, "title": "光源产生", "desc": "先生成极紫外光源。" },
      { "step": 2, "title": "图案投影", "desc": "将掩膜版图案缩小投射到晶圆上。" },
      { "step": 3, "title": "显影蚀刻", "desc": "通过显影和蚀刻形成精细电路。" }
    ],
    "keywords": [
      { "term": "EUV", "desc": "极紫外光刻技术。" },
      { "term": "晶圆", "desc": "芯片制造的基础材料。" },
      { "term": "掩膜版", "desc": "承载电路图案的模板。" },
      { "term": "光刻胶", "desc": "对光敏感的材料。" },
      { "term": "制程节点", "desc": "描述芯片精细程度的指标。" }
    ],
    "misconception": {
      "title": "不是所有芯片都需要 EUV",
      "content": "只有先进制程芯片高度依赖 EUV，成熟制程仍可使用其他光刻技术。"
    },
    "financeAngle": "EUV 设备昂贵且供应稀缺，会影响晶圆厂资本开支、折旧压力、扩产节奏，以及先进制程芯片的供给能力。",
    "memoryHooks": ["波长越短，线条越细。", "高端设备稀缺会卡住整个产业链。"],
    "thinkingQuestions": [
      {
        "level": "概念理解",
        "question": "为什么 EUV 比传统光刻更适合先进制程？",
        "answer": "因为 EUV 使用更短波长的极紫外光，理论上可以刻画更细的电路线条，从而支持更高密度、更先进的芯片制程。",
        "keyPoint": "理解波长、线宽和先进制程之间的关系"
      },
      {
        "level": "因果分析",
        "question": "为什么一台设备的稀缺会影响整个芯片产业链？",
        "answer": "因为高端光刻机是先进芯片制造中的关键瓶颈设备。如果设备供给有限，晶圆厂即使有资金和厂房，也难以快速扩大先进制程产能，进而影响芯片设计公司、封测厂和下游电子产品厂商。",
        "keyPoint": "理解关键设备瓶颈如何传导到产业链"
      },
      {
        "level": "迁移应用",
        "question": "如果 EUV 设备供应大幅增加，哪些企业可能最先受益？",
        "answer": "最先受益的通常是先进制程晶圆厂，其次是依赖先进制程的芯片设计公司，再往后是服务器、AI 芯片、手机芯片等下游应用厂商。",
        "keyPoint": "把技术瓶颈迁移到商业和产业链分析"
      }
    ],
    "conclusion": "EUV 光刻机是先进制程的咽喉，其稀缺与复杂性直接制约芯片产业链的上限。"
  }'::jsonb,
  'Create a clean educational poster about why EUV lithography is a bottleneck in advanced semiconductor manufacturing.',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop',
  'completed'
)
on conflict (card_date) do update
set
  title = excluded.title,
  subtitle = excluded.subtitle,
  category = excluded.category,
  sub_category = excluded.sub_category,
  difficulty = excluded.difficulty,
  summary = excluded.summary,
  keywords = excluded.keywords,
  content_json = excluded.content_json,
  image_prompt = excluded.image_prompt,
  image_url = excluded.image_url,
  generation_status = excluded.generation_status,
  updated_at = now();

insert into study_records (
  user_id,
  card_id,
  completed,
  completed_at,
  is_favorite,
  need_review
)
select
  'default_user',
  id,
  false,
  null,
  false,
  false
from knowledge_cards
where card_date = (now() at time zone 'Asia/Singapore')::date
on conflict (user_id, card_id) do nothing;
