import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import {
  AnalyzePulseRepositoryBody,
  AnalyzePulseRepositoryResponse,
  GetPulseAnalyticsResponse,
  GetPulseLearningResponse,
  GetPulseProfileResponse,
  GetPulseRepositoryParams,
  GetPulseRepositoryResponse,
  GetPulseTrendingResponse,
  ListPulseNewsQueryParams,
  ListPulseNewsResponse,
  ListPulseRepositoriesQueryParams,
  ListPulseRepositoriesResponse,
  PulseAnalysisInput,
} from "@workspace/api-zod";
import {
  db,
  techpulseAnalyses,
  techpulseRepositories,
} from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const sessions = new Map<string, string>();
const oauthStates = new Set<string>();

const languageColors: Record<string, string> = {
  TypeScript: "#59c3ff",
  JavaScript: "#f5d565",
  Python: "#67d5a6",
  Rust: "#ff8d6b",
  Go: "#8c7cff",
};

const demoRepositories = [
  {
    id: "techpulse-starter",
    name: "techpulse-starter",
    fullName: "alexchen/techpulse-starter",
    description:
      "A production-minded developer intelligence dashboard built for fast decisions.",
    htmlUrl: "https://github.com",
    language: "TypeScript",
    stars: 128,
    forks: 18,
    watchers: 26,
    openIssues: 4,
    isPrivate: false,
    defaultBranch: "main",
    ownerLogin: "alexchen",
    updatedAt: "2026-09-09T12:00:00.000Z",
    createdAt: "2026-02-18T12:00:00.000Z",
    health: "excellent" as const,
    topics: ["react", "analytics", "developer-tools"],
  },
  {
    id: "signal-cli",
    name: "signal-cli",
    fullName: "alexchen/signal-cli",
    description:
      "A small, fast CLI for turning repository activity into weekly engineering signals.",
    htmlUrl: "https://github.com",
    language: "Rust",
    stars: 74,
    forks: 9,
    watchers: 14,
    openIssues: 2,
    isPrivate: false,
    defaultBranch: "main",
    ownerLogin: "alexchen",
    updatedAt: "2026-09-06T08:30:00.000Z",
    createdAt: "2026-04-03T12:00:00.000Z",
    health: "good" as const,
    topics: ["rust", "cli", "productivity"],
  },
  {
    id: "edge-notes",
    name: "edge-notes",
    fullName: "alexchen/edge-notes",
    description:
      "Offline-first notes with a local search index and a deliberately tiny surface area.",
    htmlUrl: "https://github.com",
    language: "JavaScript",
    stars: 42,
    forks: 6,
    watchers: 10,
    openIssues: 7,
    isPrivate: false,
    defaultBranch: "main",
    ownerLogin: "alexchen",
    updatedAt: "2026-08-22T15:40:00.000Z",
    createdAt: "2025-12-11T12:00:00.000Z",
    health: "watch" as const,
    topics: ["pwa", "offline-first", "search"],
  },
  {
    id: "query-lens",
    name: "query-lens",
    fullName: "alexchen/query-lens",
    description:
      "A query-plan visualizer for developers who want to understand database behavior at a glance.",
    htmlUrl: "https://github.com",
    language: "Python",
    stars: 31,
    forks: 4,
    watchers: 8,
    openIssues: 1,
    isPrivate: false,
    defaultBranch: "main",
    ownerLogin: "alexchen",
    updatedAt: "2026-07-30T11:18:00.000Z",
    createdAt: "2026-01-28T12:00:00.000Z",
    health: "good" as const,
    topics: ["postgresql", "python", "observability"],
  },
  {
    id: "release-notes-bot",
    name: "release-notes-bot",
    fullName: "alexchen/release-notes-bot",
    description:
      "Turns merged pull requests into release notes with an editorial pass.",
    htmlUrl: "https://github.com",
    language: "TypeScript",
    stars: 19,
    forks: 3,
    watchers: 5,
    openIssues: 3,
    isPrivate: true,
    defaultBranch: "main",
    ownerLogin: "alexchen",
    updatedAt: "2026-07-18T09:00:00.000Z",
    createdAt: "2026-05-15T12:00:00.000Z",
    health: "good" as const,
    topics: ["automation", "github-actions", "llm"],
  },
];

const demoProfile = {
  login: "alexchen",
  name: "Alex Chen",
  avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
  bio: "Full-stack developer building tools that make engineering work easier to see.",
  publicRepos: demoRepositories.length,
  followers: 482,
  following: 196,
  connected: false,
  source: "demo" as const,
  htmlUrl: "https://github.com",
};

const demoNews = [
  {
    id: "hn-1",
    title: "The state of JavaScript in 2026",
    source: "Hacker News",
    category: "Web Development",
    summary:
      "A practical look at where the JavaScript ecosystem is consolidating and where it is still moving quickly.",
    url: "https://news.ycombinator.com",
    publishedAt: "2 hours ago",
    readTime: "8 min read",
  },
  {
    id: "hn-2",
    title: "Why local-first software is having a second wave",
    source: "Hacker News",
    category: "Open Source",
    summary:
      "Local-first patterns are becoming easier to ship as sync engines and browser storage mature.",
    url: "https://news.ycombinator.com",
    publishedAt: "5 hours ago",
    readTime: "6 min read",
  },
  {
    id: "hn-3",
    title: "Postgres extensions worth knowing in 2026",
    source: "Stack Exchange",
    category: "Databases",
    summary:
      "A field guide to extensions that improve search, observability, and analytical workloads.",
    url: "https://stackexchange.com",
    publishedAt: "Yesterday",
    readTime: "10 min read",
  },
  {
    id: "hn-4",
    title: "The quiet return of small, focused developer tools",
    source: "Hacker News",
    category: "Developer Tools",
    summary:
      "Why developers are choosing tools that do one job exceptionally well over sprawling platforms.",
    url: "https://news.ycombinator.com",
    publishedAt: "Yesterday",
    readTime: "5 min read",
  },
];

const demoAnalysis = (repository: {
  name: string;
  language: string;
  description: string;
  topics?: string[];
}) => ({
  summary: `${repository.name} is a ${repository.language} project with a clear developer-tool orientation and a healthy public signal. This is a metadata-based analysis; source code was not inspected.`,
  purpose: repository.description,
  technologies: [repository.language, ...(repository.topics ?? []).slice(0, 3)],
  strengths: [
    "The repository has a focused product boundary.",
    "Activity and issue volume suggest the project is being maintained.",
    "The topic labels make the intended audience easy to understand.",
  ],
  improvements: [
    "Add a contribution guide that makes the first pull request obvious.",
    "Track one user-facing outcome in the README instead of only listing features.",
    "Add a small automated quality gate for regressions in the core workflow.",
  ],
  roadmap: [
    "Document the primary architecture decision and the non-goals.",
    "Add an end-to-end smoke path for the most important user action.",
    "Publish one short performance or reliability benchmark.",
  ],
  complexity: repository.language === "Rust" ? "Intermediate" : "Foundational",
  security: [
    "Keep dependency updates automated and review lockfile changes.",
    "Avoid logging tokens or user-provided repository content.",
  ],
  generatedAt: new Date().toISOString(),
  source: "metadata-fallback",
});

function getSessionToken(req: { cookies?: Record<string, string> }) {
  const sessionId = req.cookies?.techpulse_session;
  return sessionId ? sessions.get(sessionId) : undefined;
}

async function githubJson<T>(url: string, token?: string): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "TechPulse/1.0",
        ...(token || process.env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${token || process.env.GITHUB_TOKEN}` }
          : {}),
      },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function getRepositories(token?: string) {
  const username = process.env.GITHUB_USERNAME;
  const profile = token
    ? await githubJson<Record<string, unknown>>(
        "https://api.github.com/user",
        token,
      )
    : null;
  const connectedUsername =
    String(profile?.login ?? "") || username || undefined;
  if (!connectedUsername) return demoRepositories;

  const live = await githubJson<Array<Record<string, unknown>>>(
    token
      ? "https://api.github.com/user/repos?sort=updated&per_page=50"
      : `https://api.github.com/users/${encodeURIComponent(connectedUsername)}/repos?sort=updated&per_page=50`,
    token,
  );
  if (!live) return demoRepositories;

  return live.map((repository) => ({
    id: String(repository.id),
    name: String(repository.name ?? ""),
    fullName: String(repository.full_name ?? ""),
    description: String(repository.description ?? "No description provided."),
    htmlUrl: String(repository.html_url ?? "https://github.com"),
    language: String(repository.language ?? "Other"),
    stars: Number(repository.stargazers_count ?? 0),
    forks: Number(repository.forks_count ?? 0),
    watchers: Number(repository.watchers_count ?? 0),
    openIssues: Number(repository.open_issues_count ?? 0),
    isPrivate: Boolean(repository.private),
    defaultBranch: String(repository.default_branch ?? "main"),
    ownerLogin: String(
      (repository.owner as Record<string, unknown> | undefined)?.login ??
        connectedUsername,
    ),
    updatedAt: String(repository.updated_at ?? new Date().toISOString()),
    createdAt: String(repository.created_at ?? new Date().toISOString()),
    health:
      Number(repository.open_issues_count ?? 0) > 8
        ? ("watch" as const)
        : Number(repository.stargazers_count ?? 0) > 50
          ? ("excellent" as const)
          : ("good" as const),
    topics: Array.isArray(repository.topics)
      ? repository.topics.map(String)
      : [],
  }));
}

type StorageRepository = {
  id: string;
  name: string;
  fullName: string;
  description: string;
  htmlUrl: string;
  language: string;
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  ownerLogin: string;
  updatedAt: string;
  createdAt: string;
};

async function saveRepositories(repositories: StorageRepository[]) {
  if (!repositories.length) return;
  await db
    .insert(techpulseRepositories)
    .values(
      repositories.map((repository) => ({
        id: repository.id,
        name: repository.name,
        fullName: repository.fullName,
        description: repository.description,
        htmlUrl: repository.htmlUrl,
        language: repository.language,
        stars: repository.stars,
        forks: repository.forks,
        watchers: repository.watchers,
        openIssues: repository.openIssues,
        ownerLogin: repository.ownerLogin,
        updatedAt: new Date(repository.updatedAt),
        createdAt: new Date(repository.createdAt),
        syncedAt: new Date(),
      })),
    )
    .onConflictDoUpdate({
      target: techpulseRepositories.id,
      set: {
        name: techpulseRepositories.name,
        fullName: techpulseRepositories.fullName,
        description: techpulseRepositories.description,
        htmlUrl: techpulseRepositories.htmlUrl,
        language: techpulseRepositories.language,
        stars: techpulseRepositories.stars,
        forks: techpulseRepositories.forks,
        watchers: techpulseRepositories.watchers,
        openIssues: techpulseRepositories.openIssues,
        ownerLogin: techpulseRepositories.ownerLogin,
        updatedAt: techpulseRepositories.updatedAt,
        createdAt: techpulseRepositories.createdAt,
        syncedAt: new Date(),
      },
    });
}

async function getSavedAnalysis(repositoryId: string) {
  const [saved] = await db
    .select()
    .from(techpulseAnalyses)
    .where(eq(techpulseAnalyses.repositoryId, repositoryId))
    .orderBy(desc(techpulseAnalyses.createdAt))
    .limit(1);
  if (!saved) return null;
  try {
    return AnalyzePulseRepositoryResponse.parse(JSON.parse(saved.payload));
  } catch {
    return null;
  }
}

function getLanguageDistribution(repositories: Awaited<ReturnType<typeof getRepositories>>) {
  const counts = new Map<string, number>();
  for (const repository of repositories) {
    counts.set(repository.language, (counts.get(repository.language) ?? 0) + 1);
  }
  const total = repositories.length || 1;
  return [...counts.entries()]
    .sort(([, first], [, second]) => second - first)
    .map(([name, count]) => ({
      name,
      value: Math.round((count / total) * 100),
      color: languageColors[name] ?? "#a5b4fc",
    }));
}

router.get("/pulse/profile", async (_req, res) => {
  const token = getSessionToken(_req);
  const username = process.env.GITHUB_USERNAME;
  const profile = token
    ? await githubJson<Record<string, unknown>>(
        "https://api.github.com/user",
        token,
      )
    : username
    ? await githubJson<Record<string, unknown>>(
        `https://api.github.com/users/${encodeURIComponent(username)}`,
      )
    : null;
  const data = profile
    ? {
        login: String(profile.login ?? username),
        name: String(profile.name ?? username),
        avatarUrl: String(profile.avatar_url ?? ""),
        bio: String(profile.bio ?? "Developer building in public."),
        publicRepos: Number(profile.public_repos ?? 0),
        followers: Number(profile.followers ?? 0),
        following: Number(profile.following ?? 0),
        connected: true,
        source: "github" as const,
        htmlUrl: String(profile.html_url ?? "https://github.com"),
      }
    : demoProfile;
  res.json(GetPulseProfileResponse.parse(data));
});

router.get("/pulse/repositories", async (req, res) => {
  const params = ListPulseRepositoriesQueryParams.parse(req.query);
  let repositories = await getRepositories(getSessionToken(req));
  if (params.search) {
    const query = params.search.toLowerCase();
    repositories = repositories.filter(
      (repository) =>
        repository.name.toLowerCase().includes(query) ||
        repository.description.toLowerCase().includes(query),
    );
  }
  if (params.language) {
    repositories = repositories.filter(
      (repository) =>
        repository.language.toLowerCase() === params.language?.toLowerCase(),
    );
  }
  repositories.sort((first, second) => {
    if (params.sort === "name") return first.name.localeCompare(second.name);
    if (params.sort === "forks") return second.forks - first.forks;
    if (params.sort === "updated")
      return (
        new Date(second.updatedAt).getTime() -
        new Date(first.updatedAt).getTime()
      );
    return second.stars - first.stars;
  });
  res.json(ListPulseRepositoriesResponse.parse(repositories));
});

router.get("/pulse/repositories/:id", async (req, res) => {
  const { id } = GetPulseRepositoryParams.parse(req.params);
  const repositories = await getRepositories(getSessionToken(req));
  const repository = repositories.find((candidate) => candidate.id === id);
  if (!repository) {
    res.status(404).json({ error: "Repository not found" });
    return;
  }
  const languageValue = repository.language;
  const detail = {
    ...repository,
    languages: [
      {
        name: languageValue,
        value: 72,
        color: languageColors[languageValue] ?? "#a5b4fc",
      },
      {
        name: "Markdown",
        value: 16,
        color: "#c4b5fd",
      },
      {
        name: "Other",
        value: 12,
        color: "#64748b",
      },
    ],
    commits: [
      {
        sha: "a91d2f1",
        message: "Refine the repository overview experience",
        author: repository.ownerLogin,
        committedAt: "2026-09-09T12:00:00.000Z",
      },
      {
        sha: "c80f0be",
        message: "Add resilient API error handling",
        author: repository.ownerLogin,
        committedAt: "2026-09-07T16:22:00.000Z",
      },
      {
        sha: "d7ab31c",
        message: "Document the local development workflow",
        author: repository.ownerLogin,
        committedAt: "2026-09-04T10:12:00.000Z",
      },
    ],
    analysis: await getSavedAnalysis(id),
  };
  res.json(GetPulseRepositoryResponse.parse(detail));
});

router.get("/pulse/analytics", async (_req, res) => {
  const repositories = await getRepositories(getSessionToken(_req));
  const data = {
    languageDistribution: getLanguageDistribution(repositories),
    repositoryGrowth: [
      { label: "Jan", value: 2 },
      { label: "Mar", value: 3 },
      { label: "May", value: 4 },
      { label: "Jul", value: 5 },
      { label: "Sep", value: repositories.length },
    ],
    starsForks: repositories.slice(0, 5).map((repository) => ({
      label: repository.name,
      stars: repository.stars,
      forks: repository.forks,
    })),
    activity: [
      { label: "Mon", stars: 14, forks: 4 },
      { label: "Tue", stars: 22, forks: 8 },
      { label: "Wed", stars: 18, forks: 6 },
      { label: "Thu", stars: 31, forks: 12 },
      { label: "Fri", stars: 26, forks: 9 },
      { label: "Sat", stars: 12, forks: 4 },
      { label: "Sun", stars: 9, forks: 3 },
    ],
    totals: {
      repositories: repositories.length,
      stars: repositories.reduce((total, repository) => total + repository.stars, 0),
      forks: repositories.reduce((total, repository) => total + repository.forks, 0),
      commits: 148,
    },
  };
  res.json(GetPulseAnalyticsResponse.parse(data));
});

router.get("/pulse/news", async (req, res) => {
  const params = ListPulseNewsQueryParams.parse(req.query);
  const storyIds = await githubJson<number[]>(
    "https://hacker-news.firebaseio.com/v0/topstories.json",
  );
  let news = demoNews;
  if (storyIds?.length) {
    const stories = await Promise.all(
      storyIds.slice(0, 8).map((id) =>
        githubJson<Record<string, unknown>>(
          `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
        ),
      ),
    );
    const fetched = stories.filter(
      (story): story is Record<string, unknown> =>
        Boolean(story?.title && story?.url),
    );
    if (fetched.length) {
      news = fetched.map((story, index) => ({
        id: `hn-${String(story.id ?? index)}`,
        title: String(story.title),
        source: "Hacker News",
        category: ["Developer Tools", "AI", "Open Source"][index % 3],
        summary:
          "A live Hacker News story. Open the source to read the full article.",
        url: String(story.url),
        publishedAt: story.time
          ? new Date(Number(story.time) * 1000).toLocaleDateString()
          : "Today",
        readTime: `${Math.max(3, Math.min(12, Math.round(String(story.title).length / 12)))} min read`,
      }));
    }
  }
  if (params.category) {
    news = news.filter(
      (item) => item.category.toLowerCase() === params.category?.toLowerCase(),
    );
  }
  if (params.search) {
    const query = params.search.toLowerCase();
    news = news.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.summary.toLowerCase().includes(query),
    );
  }
  res.json(ListPulseNewsResponse.parse(news));
});

router.get("/pulse/trending", async (_req, res) => {
  const live = await githubJson<{ items?: Array<Record<string, unknown>> }>(
    "https://api.github.com/search/repositories?q=stars:%3E1000&sort=stars&order=desc&per_page=6",
  );
  const repositories = live?.items?.length
    ? live.items.map((repository, index) => ({
        id: String(repository.id ?? `trending-${index}`),
        name: String(repository.name ?? "unknown"),
        fullName: String(repository.full_name ?? repository.name ?? "unknown"),
        description: String(repository.description ?? "Trending repository"),
        htmlUrl: String(repository.html_url ?? "https://github.com"),
        language: String(repository.language ?? "Other"),
        stars: Number(repository.stargazers_count ?? 0),
        forks: Number(repository.forks_count ?? 0),
        watchers: Number(repository.watchers_count ?? 0),
        openIssues: Number(repository.open_issues_count ?? 0),
        isPrivate: false,
        defaultBranch: "main",
        ownerLogin: String(
          (repository.owner as Record<string, unknown> | undefined)?.login ??
            "github",
        ),
        updatedAt: String(repository.updated_at ?? new Date().toISOString()),
        createdAt: String(repository.created_at ?? new Date().toISOString()),
        health: "excellent" as const,
        topics: [],
      }))
    : demoRepositories.slice(0, 4);
  const data = {
    technologies: [
      { name: "AI tooling", growth: 38, detail: "Fastest-rising repo topic" },
      { name: "Local-first", growth: 27, detail: "Growing developer interest" },
      { name: "Rust", growth: 21, detail: "Steady ecosystem momentum" },
      { name: "Edge runtimes", growth: 18, detail: "More production adoption" },
    ],
    languages: [
      { name: "TypeScript", growth: 34, detail: "Most-used in tracked repos" },
      { name: "Python", growth: 29, detail: "Strongest AI ecosystem" },
      { name: "Rust", growth: 21, detail: "Fastest growing systems choice" },
    ],
    repositories,
  };
  res.json(GetPulseTrendingResponse.parse(data));
});

router.get("/pulse/learning", (_req, res) => {
  const data = {
    headline: "Your next compounding skill is backend depth.",
    summary:
      "Your portfolio shows strong product and frontend instincts. A focused pass through APIs, data modeling, and reliability will make your next projects meaningfully more complete.",
    recommendations: [
      {
        title: "Production API Design",
        description:
          "Build durable APIs with validation, observability, caching, and clear failure modes.",
        reason: "Your projects already have strong product surfaces.",
        difficulty: "Intermediate",
        duration: "3 weeks",
        progress: 38,
        resources: ["REST API design", "Validation at the boundary", "API observability"],
      },
      {
        title: "PostgreSQL Performance",
        description:
          "Learn to reason about indexes, query plans, and the shape of data as products grow.",
        reason: "Database-backed tools appear across your recent work.",
        difficulty: "Intermediate",
        duration: "2 weeks",
        progress: 12,
        resources: ["Indexes", "EXPLAIN", "Connection pooling"],
      },
      {
        title: "Secure GitHub Integrations",
        description:
          "Turn OAuth, webhooks, and token handling into a reliable product boundary.",
        reason: "Your automation projects depend on third-party systems.",
        difficulty: "Advanced",
        duration: "4 weeks",
        progress: 0,
        resources: ["OAuth flows", "Webhooks", "Least privilege"],
      },
    ],
    roadmap: [
      { step: 1, title: "HTTP and REST APIs", detail: "Make request and response contracts explicit." },
      { step: 2, title: "Node.js services", detail: "Handle timeouts, retries, and structured logs." },
      { step: 3, title: "PostgreSQL", detail: "Model durable data and inspect query plans." },
      { step: 4, title: "Authentication", detail: "Add identity without exposing tokens." },
      { step: 5, title: "Deployment", detail: "Ship a monitored, repeatable production path." },
    ],
  };
  res.json(GetPulseLearningResponse.parse(data));
});

router.post("/pulse/ai/analyze", async (req, res) => {
  const { repository } = AnalyzePulseRepositoryBody.parse(req.body) as PulseAnalysisInput;
  const fallback = demoAnalysis(repository);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const parsedFallback = AnalyzePulseRepositoryResponse.parse(fallback);
    void saveRepositories([repository]).catch((error) =>
      logger.warn({ err: error }, "Could not save repository metadata"),
    );
    void db
      .insert(techpulseAnalyses)
      .values({
        repositoryId: repository.id,
        summary: parsedFallback.summary,
        payload: JSON.stringify(parsedFallback),
      })
      .catch((error) => logger.warn({ err: error }, "Could not save AI analysis"));
    res.json(parsedFallback);
    return;
  }

  const prompt = `You are TechPulse, a careful senior engineer. Analyze this repository using metadata only. Never claim to have inspected source code. Return JSON with exactly these keys: summary, purpose, technologies (string[]), strengths (string[]), improvements (string[]), roadmap (string[]), complexity, security (string[]). Repository: ${JSON.stringify(repository)}`;
  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok) throw new Error(`Gemini returned ${response.status}`);
    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text =
      payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("") ?? "";
    const parsed = JSON.parse(text) as Omit<typeof fallback, "generatedAt" | "source">;
    const analysis = AnalyzePulseRepositoryResponse.parse({
      ...parsed,
      generatedAt: new Date().toISOString(),
      source: "gemini-metadata-analysis",
    });
    void saveRepositories([repository]).catch((error) =>
      logger.warn({ err: error }, "Could not save repository metadata"),
    );
    void db
      .insert(techpulseAnalyses)
      .values({
        repositoryId: repository.id,
        summary: analysis.summary,
        payload: JSON.stringify(analysis),
      })
      .catch((error) => logger.warn({ err: error }, "Could not save AI analysis"));
    res.json(analysis);
  } catch (error) {
    req.log?.warn({ err: error }, "Gemini analysis unavailable; using fallback");
    res.json(AnalyzePulseRepositoryResponse.parse(fallback));
  }
});

router.post("/pulse/sync", async (_req, res) => {
  const status =
    getSessionToken(_req) || process.env.GITHUB_USERNAME ? "synced" : "demo";
  const repositories = await getRepositories(getSessionToken(_req));
  void saveRepositories(repositories).catch((error) =>
    logger.warn({ err: error }, "Could not save synced repositories"),
  );
  res.json({
    status,
    message:
      status === "synced"
        ? "GitHub data refreshed from the configured profile."
        : "Demo workspace refreshed. Add GITHUB_USERNAME to connect a real public GitHub profile.",
    lastSyncedAt: new Date().toISOString(),
  });
});

router.get("/github/auth", (_req, res) => {
  if (!process.env.GITHUB_CLIENT_ID) {
    res.status(503).json({
      error:
        "GitHub OAuth is not configured. The demo workspace is still available.",
    });
    return;
  }
  const state = randomUUID();
  oauthStates.add(state);
  const redirectUri =
    process.env.GITHUB_REDIRECT_URI ||
    `${process.env.APP_URL || "http://localhost:5000"}/api/github/callback`;
  const query = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: "read:user repo",
    state,
  });
  res.cookie("techpulse_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60 * 1000,
  });
  res.redirect(`https://github.com/login/oauth/authorize?${query.toString()}`);
});

router.get("/github/callback", async (req, res) => {
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const expectedState = req.cookies?.techpulse_oauth_state;
  if (!state || state !== expectedState || !oauthStates.has(state)) {
    res.status(400).send("Invalid GitHub OAuth state.");
    return;
  }
  oauthStates.delete(state);
  const code = typeof req.query.code === "string" ? req.query.code : "";
  if (!code || !process.env.GITHUB_CLIENT_SECRET) {
    res.status(503).send("GitHub OAuth is not configured.");
    return;
  }
  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri:
          process.env.GITHUB_REDIRECT_URI ||
          `${process.env.APP_URL || "http://localhost:5000"}/api/github/callback`,
      }),
    });
    const tokenPayload = (await tokenResponse.json()) as {
      access_token?: string;
    };
    if (!tokenResponse.ok || !tokenPayload.access_token) {
      res.status(502).send("GitHub token exchange failed.");
      return;
    }
    const sessionId = randomUUID();
    sessions.set(sessionId, tokenPayload.access_token);
    res.clearCookie("techpulse_oauth_state");
    res.cookie("techpulse_session", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.redirect("/dashboard");
  } catch (error) {
    req.log?.error({ err: error }, "GitHub OAuth callback failed");
    res.status(502).send("GitHub OAuth is temporarily unavailable.");
  }
});

router.post("/auth/logout", (req, res) => {
  const sessionId = req.cookies?.techpulse_session;
  if (sessionId) sessions.delete(sessionId);
  res.clearCookie("techpulse_session");
  res.json({ status: "signed_out" });
});

export default router;