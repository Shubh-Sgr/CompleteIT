import { z } from "zod";

const optionalText = (max: number) => z.preprocess(
  value => value === null || value === "" ? undefined : value,
  z.string().max(max).optional()
);

export const VISIBILITIES = ["PRIVATE", "FOLLOWERS", "UNLISTED", "PUBLIC"] as const;
export const SET_STATUSES = ["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"] as const;
export const registerSchema = z.object({
  email: z.string().email(), username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/i),
  password: z.string().min(8), displayName: z.string().min(2).max(80), guestDraft: z.record(z.unknown()).optional()
});
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
export const recommendationSchema = z.object({
  outcome: z.string().min(2).max(120), budget: z.number().int().nonnegative().max(1_000_000),
  ownedProductIds: z.array(z.string()).default([]), detectedCategories: z.array(z.string()).default([]),
  desiredCategories: z.array(z.string()).default([]),
  ownedItems: z.array(z.object({label:z.string().min(1).max(120),category:z.string().min(1).max(80),brand:z.string().max(80).optional()})).max(100).default([]),
  plannedItems: z.array(z.object({label:z.string().min(1).max(120),category:z.string().min(1).max(80),brand:z.string().max(80).optional()})).max(100).default([]),
  widthCm: z.number().positive().optional(), depthCm: z.number().positive().optional(),
  style: z.string().max(50).optional(), preference: z.enum(["NEW", "USED", "EITHER"]).default("EITHER"),
  notes: z.string().max(1000).optional()
});
export const textAnalysisSchema = z.object({
  text: z.string().min(10).max(3000),
  currentBudget: z.number().int().positive().max(1_000_000).optional()
});
export const createSetSchema = z.object({
  title: z.string().min(3).max(120), description: z.string().max(2000).default(""),
  outcome: z.string().min(2), budget: z.number().int().nonnegative(), visibility: z.enum(VISIBILITIES).default("PRIVATE"),
  anchorProductId: z.string().optional(), templateId: z.string().optional(),
  items: z.array(z.object({ productId: z.string(), slotName: z.string(), owned: z.boolean().default(false), notes: z.string().max(500).optional() })).default([]),
  manualItems: z.array(z.object({
    label: z.string().min(1).max(120), category: optionalText(80), brand: optionalText(80),
    price: z.number().int().nonnegative().max(1_000_000).default(0), slotName: z.string().max(120).default("User-provided item"),
    owned: z.boolean().default(true), notes: optionalText(500)
  })).max(100).default([])
});
export const publishSetSchema = z.object({visibility:z.enum(VISIBILITIES)});
export const updateSetSchema = z.object({
  title:z.string().min(3).max(120).optional(), description:z.string().max(2000).optional(),
  outcome:z.string().min(2).max(120).optional(), budget:z.number().int().nonnegative().max(1_000_000).optional(),
  status:z.enum(SET_STATUSES).optional()
}).refine(value=>Object.keys(value).length>0,"Provide at least one field to update");
export const setItemSchema=z.object({productId:z.string().min(1),slotName:z.string().min(1).max(120),owned:z.boolean().default(false),notes:z.string().max(500).optional()});
export const setItemProgressSchema=z.object({owned:z.boolean()});
export const analyticsEventSchema=z.object({
  event:z.enum(["landing_view","create_started","input_submitted","ai_result","recommendation_selected","set_saved","share_clicked","item_progress_changed","search_submitted"]),
  anonymousId:z.string().min(8).max(80),
  path:z.string().max(240).default("/"),
  properties:z.record(z.union([z.string().max(240),z.number().finite(),z.boolean(),z.null()])).refine(value=>Object.keys(value).length<=20,"Too many analytics properties").default({})
});
export const swapSetItemSchema=z.object({itemId:z.string().min(1),replacementId:z.string().min(1)});
export const ratingSchema=z.object({
  outcome:z.number().int().min(1).max(5),value:z.number().int().min(1).max(5),compatibility:z.number().int().min(1).max(5),
  usefulness:z.number().int().min(1).max(5),comfort:z.number().int().min(1).max(5),appearance:z.number().int().min(1).max(5),durability:z.number().int().min(1).max(5),
  usageDays:z.number().int().min(0).max(36500),ownsSet:z.boolean(),explanation:z.string().min(10).max(1000)
});
export const suggestionSchema=z.object({type:z.enum(["ADD_PRODUCT","REMOVE_PRODUCT","REPLACE_PRODUCT","CHEAPER_ALTERNATIVE","CORRECT_COMPATIBILITY","FILL_MISSING_SLOT"]),productId:z.string().optional(),replacementId:z.string().optional(),reason:z.string().min(10).max(1000)});
export const suggestionDecisionSchema=z.object({status:z.enum(["ACCEPTED","REJECTED","DISCUSSING"]),discussion:z.string().max(1000).optional()});
export const commentSchema=z.object({body:z.string().min(2).max(2000),parentId:z.string().optional()});
export const setUpdateSchema=z.object({kind:z.enum(["STARTED_USING","STILL_USING","REPLACED","REMOVED_UNNECESSARY","BROKE","UPGRADED","WOULD_PURCHASE_AGAIN","WOULD_NOT_PURCHASE_AGAIN"]),note:z.string().min(5).max(1000),usageDays:z.number().int().min(0).max(36500)});
export type RecommendationInput = z.infer<typeof recommendationSchema>;
export type CreateSetInput = z.infer<typeof createSetSchema>;
