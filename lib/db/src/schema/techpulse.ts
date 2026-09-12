import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const techpulseRepositories = pgTable("techpulse_repositories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  fullName: text("full_name").notNull(),
  description: text("description").notNull(),
  htmlUrl: text("html_url").notNull(),
  language: text("language").notNull(),
  stars: integer("stars").notNull().default(0),
  forks: integer("forks").notNull().default(0),
  watchers: integer("watchers").notNull().default(0),
  openIssues: integer("open_issues").notNull().default(0),
  ownerLogin: text("owner_login").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
});

export const techpulseAnalyses = pgTable("techpulse_analyses", {
  id: serial("id").primaryKey(),
  repositoryId: text("repository_id")
    .notNull()
    .references(() => techpulseRepositories.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(),
  payload: text("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertTechpulseRepositorySchema =
  createInsertSchema(techpulseRepositories);
export const insertTechpulseAnalysisSchema = createInsertSchema(techpulseAnalyses);

export type TechpulseRepository = typeof techpulseRepositories.$inferSelect;
export type TechpulseAnalysis = typeof techpulseAnalyses.$inferSelect;