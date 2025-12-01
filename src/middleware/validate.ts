import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';
import { AppError } from './errorHandler';

export class ValidationError extends AppError {
  public details: Array<{ field: string; message: string }>;

  constructor(issues: ZodError['issues']) {
    super('Invalid request data', 400, 'VALIDATION_ERROR');
    this.details = issues.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));
  }
}

export const validate = (schema: ZodTypeAny) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    return next();
  } catch (error) {
    if (error instanceof ZodError) {
      // Throw a ValidationError instead of sending response directly
      // This ensures it goes through the error handler middleware
      return next(new ValidationError(error.issues));
    }
    return next(error);
  }
};
