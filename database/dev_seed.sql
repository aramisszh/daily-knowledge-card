-- Minimal seed for MVP verification.
-- Run this after database/schema.sql.

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
  'Why EUV Lithography Matters',
  'A simple card for MVP verification',
  'Engineering',
  'Semiconductor',
  'Beginner',
  (now() at time zone 'Asia/Singapore')::date,
  'EUV lithography enables smaller chip features and is a useful MVP demo topic.',
  array['EUV', 'chips', 'lithography', 'semiconductor'],
  '{
    "title": "Why EUV Lithography Matters",
    "subtitle": "A simple card for MVP verification",
    "category": "Engineering",
    "subCategory": "Semiconductor",
    "difficulty": "Beginner",
    "summary": "EUV lithography enables smaller chip features and is a useful MVP demo topic.",
    "coreMechanism": "Shorter light wavelengths make it possible to print smaller circuit patterns on wafers.",
    "whyImportant": [
      "Advanced chips need smaller features.",
      "Manufacturing bottlenecks affect the whole supply chain.",
      "It is easy to recognize in an MVP demo."
    ],
    "processSteps": [
      { "step": 1, "title": "Generate light", "desc": "Create the EUV light source." },
      { "step": 2, "title": "Project pattern", "desc": "Project the circuit pattern onto the wafer." },
      { "step": 3, "title": "Form features", "desc": "Develop and etch the printed structures." }
    ],
    "keywords": [
      { "term": "EUV", "desc": "Extreme ultraviolet lithography." },
      { "term": "Wafer", "desc": "The base material used to build chips." },
      { "term": "Patterning", "desc": "Printing circuit structures onto wafers." }
    ],
    "misconception": {
      "title": "Not every chip needs EUV",
      "content": "Mature process chips can still be made without EUV."
    },
    "financeAngle": "High equipment cost and limited supply can affect capex and production planning.",
    "memoryHooks": [
      "Shorter wavelength, smaller features.",
      "A key bottleneck can limit an entire industry."
    ],
    "thinkingQuestions": [
      {
        "level": "Concept",
        "question": "Why does shorter wavelength help chip manufacturing?",
        "answer": "Because it supports printing smaller and denser circuit features.",
        "keyPoint": "Link wavelength to feature size."
      },
      {
        "level": "Causality",
        "question": "Why can one machine type affect the wider chip industry?",
        "answer": "Because a bottleneck in critical equipment limits advanced manufacturing capacity.",
        "keyPoint": "Connect equipment supply to industry output."
      },
      {
        "level": "Application",
        "question": "What business indicators might improve if EUV supply increases?",
        "answer": "Advanced foundry output, downstream chip availability, and some AI hardware delivery capacity.",
        "keyPoint": "Translate technical capacity into business outcomes."
      }
    ],
    "conclusion": "EUV is a good MVP example because it is concrete, visual, and clearly tied to industry value."
  }'::jsonb,
  'Create a clean educational poster about why EUV lithography matters for advanced semiconductor manufacturing.',
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
