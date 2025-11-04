import { type Request, type Response, type NextFunction } from "express";
export declare function validateApiKey(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
export declare function validateWsId(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=validateAPIKey.d.ts.map