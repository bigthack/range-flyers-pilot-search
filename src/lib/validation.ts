import { z } from "zod";
export const SearchQuery = z.object({
  aircraft: z.string().optional(),
  state: z.string().length(2).optional(),
  minLevel: z.enum(["S","T","V","P","C","A"]).default("C"),
  instrument: z.coerce.boolean().default(true),
  multi: z.coerce.boolean().default(true),
});
