import type { Request, Response } from "express";
export declare const createCourse: (req: Request, res: Response) => Promise<void>;
export declare const getCoursesByProject: (req: Request, res: Response) => Promise<void>;
export declare const getCourseById: (req: Request, res: Response) => Promise<void>;
export declare const addCreatorsToCourse: (req: Request, res: Response) => Promise<void>;
export declare const removeCreatorFromCourse: (req: Request, res: Response) => Promise<void>;
export declare const toggleCoursePublish: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=course.controller.d.ts.map