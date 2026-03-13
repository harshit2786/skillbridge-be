import type { Request, Response } from "express";
export declare const getProgress: (req: Request, res: Response) => Promise<void>;
export declare const startLearning: (req: Request, res: Response) => Promise<void>;
export declare const getCourseProgress: (req: Request, res: Response) => Promise<void>;
export declare const getCourseSectionQuestions: (req: Request, res: Response) => Promise<void>;
export declare const submitCourseAnswer: (req: Request, res: Response) => Promise<void>;
export declare const getQuizProgress: (req: Request, res: Response) => Promise<void>;
export declare const getQuizSectionQuestions: (req: Request, res: Response) => Promise<void>;
export declare const submitQuizResponse: (req: Request, res: Response) => Promise<void>;
export declare const completeQuiz: (req: Request, res: Response) => Promise<void>;
export declare const getQuizResult: (req: Request, res: Response) => Promise<void>;
export declare const getContentDetails: (req: Request, res: Response) => Promise<void>;
export declare const completeCourseSection: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=learn.controller.d.ts.map