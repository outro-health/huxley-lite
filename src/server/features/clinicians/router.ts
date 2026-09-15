import { publicProcedure, router } from "../../trpc"
import { cliniciansRepository } from "./repository"

export const cliniciansRouter = router({
  list: publicProcedure.query(() => cliniciansRepository.list()),
})
