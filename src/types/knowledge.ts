export type ThinkingQuestion = {
  level: "概念理解" | "因果分析" | "迁移应用" | string;
  question: string;
  answer: string;
  keyPoint: string;
};

export type KnowledgePack = {
  title: string;
  subtitle: string;
  category: string;
  subCategory: string;
  difficulty: "入门" | "进阶" | "困难" | string;
  summary: string;
  coreMechanism: string;
  whyImportant: string[];
  processSteps?: Array<{
    step: number;
    title: string;
    desc: string;
  }>;
  keywords: Array<{
    term: string;
    desc: string;
  }>;
  misconception: {
    title: string;
    content: string;
  };
  financeAngle: string;
  memoryHooks: string[];
  thinkingQuestions: ThinkingQuestion[];
  conclusion: string;
};

export type KnowledgeCardRow = {
  id: string;
  title: string;
  subtitle: string | null;
  category: string;
  sub_category: string | null;
  difficulty: string | null;
  card_date: string;
  summary: string | null;
  keywords: string[] | null;
  content_json: KnowledgePack;
  image_prompt: string | null;
  image_url: string | null;
  image_storage_path: string | null;
  generation_status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type PodcastStatus = "none" | "draft" | "pending" | "processing" | "generated" | "published" | "archived" | "withdrawn" | "failed";

export type PodcastInfo = {
  status: PodcastStatus;
  version?: number;
  title?: string;
  duration?: number;
  audioUrl?: string;
  transcriptUrl?: string;
  sizeBytes?: number;
  checksum?: string;
  updatedAt?: string;
  archivedVersions?: Array<{
    version: number;
    status: string;
    audioUrl?: string;
    transcriptUrl?: string;
    archivedAt?: string;
    reason?: string;
  }>;
};

export type StudyRecordRow = {
  id: string;
  user_id: string;
  card_id: string;
  completed: boolean;
  completed_at: string | null;
  is_favorite: boolean;
  need_review: boolean;
  podcast_listened?: boolean;
  podcast_listened_at?: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type AppKnowledgeCard = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  subCategory: string;
  difficulty: string;
  cardDate: string;
  imageUrl: string;
  summary: string;
  keywords: string[];
  completed: boolean;
  favorite: boolean;
  needReview: boolean;
  podcastListened?: boolean;
  podcastListenedAt?: string | null;
  podcast?: PodcastInfo;
  content: KnowledgePack;
};

export type StatsSummary = {
  total: number;
  completed: number;
  favorites: number;
  needReview: number;
  streak: number;
  completedByCategory: Record<string, number>;
  cards: {
    completed: AppKnowledgeCard[];
    favorite: AppKnowledgeCard[];
    review: AppKnowledgeCard[];
  };
};
