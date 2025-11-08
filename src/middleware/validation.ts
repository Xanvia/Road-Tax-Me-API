import { Request, Response, NextFunction } from 'express';
import { validate as classValidate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { ValidationError } from '../utils/errors';

export const validateRequest = (dtoClass: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = plainToClass(dtoClass, req.body);
      const errors = await classValidate(dto);

      if (errors.length > 0) {
        const errorMap: Record<string, string[]> = {};
        errors.forEach((error) => {
          if (error.property) {
            errorMap[error.property] = Object.values(error.constraints || {});
          }
        });
        throw new ValidationError('Validation failed', errorMap);
      }

      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({
          status: 'error',
          message: error.message,
          errors: error.errors,
        });
      }
      next(error);
    }
  };
};
