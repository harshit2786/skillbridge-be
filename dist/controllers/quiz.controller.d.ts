import type { Request, Response } from "express";
export declare const createQuiz: (req: Request, res: Response) => Promise<void>;
export declare const getQuizzesByProject: (req: Request, res: Response) => Promise<void>;
export declare const getQuizById: (req: Request, res: Response) => Promise<void>;
export declare const addCreatorsToQuiz: (req: Request, res: Response) => Promise<void>;
export declare const removeCreatorFromQuiz: (req: Request, res: Response) => Promise<void>;
export declare const toggleQuizPublish: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=quiz.controller.d.ts.map