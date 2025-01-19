import { Request, User } from "@prisma/client";
import { generate } from "./generate";

export const questions = {
    generate: ({user, request, currentQuestionsCount}: {user: Partial<User>, request: Request, currentQuestionsCount: number}) => ({
        execute: async () => await generate({user, request, currentQuestionsCount})
    })
}