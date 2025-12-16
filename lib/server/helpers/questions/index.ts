import { Request } from "@prisma/client";
import { generate } from "./generate";

export const questions = {
    generate: ({request, currentQuestionsCount}: {request: Request, currentQuestionsCount: number}) => ({
        execute: async () => await generate({request, currentQuestionsCount})
    })
}
