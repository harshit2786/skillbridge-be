import type { Request, Response } from "express";
export declare const createProject: (req: Request, res: Response) => Promise<void>;
export declare const getMyProjects: (req: Request, res: Response) => Promise<void>;
export declare const getProjectById: (req: Request, res: Response) => Promise<void>;
export declare const addTrainersToProject: (req: Request, res: Response) => Promise<void>;
export declare const addTraineesToProject: (req: Request, res: Response) => Promise<void>;
export declare const removeTrainerFromProject: (req: Request, res: Response) => Promise<void>;
export declare const updateProject: (req: Request, res: Response) => Promise<void>;
export declare const deleteProject: (req: Request, res: Response) => Promise<void>;
export declare const removeTraineeFromProject: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=project.controller.d.ts.map