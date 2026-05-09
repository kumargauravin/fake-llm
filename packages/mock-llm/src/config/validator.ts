import { z } from 'zod';

export const KeywordSchema = z.object({
  keyword: z.string(),
  aliases: z.array(z.string()),
  category: z.string(),
  data_source: z.string(),
  schema: z.record(z.string()).optional()
});

export const RelationSchema = z.object({
  from_keyword: z.string(),
  to_keyword: z.string(),
  cardinality: z.enum(['one-to-one', 'one-to-many', 'many-to-many']),
  join_via: z.string().optional()
});

export const ResolutionStepSchema = z.object({
  step: z.number(),
  action: z.enum(['fetch', 'filter', 'enrich', 'compare', 'diff']),
  keyword: z.string().optional(),
  from_source: z.string().optional(),
  on: z.string().optional(),
  left: z.string().optional(),
  right: z.string().optional()
});

export const StorySchema = z.object({
  story_id: z.string(),
  description: z.string(),
  keywords: z.array(z.string()),
  relations: z.array(RelationSchema),
  resolution_steps: z.array(ResolutionStepSchema)
});

export function validateKeyword(data: unknown) {
  return KeywordSchema.parse(data);
}

export function validateStory(data: unknown) {
  return StorySchema.parse(data);
}
