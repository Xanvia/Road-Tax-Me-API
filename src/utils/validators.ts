import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

export const validateDTO = async <T extends object>(
  dtoClass: new () => T,
  plainObj: object
): Promise<{ isValid: boolean; errors?: Record<string, string[]> }> => {
  const dto = plainToClass(dtoClass, plainObj);
  const errors = await validate(dto);

  if (errors.length > 0) {
    const errorMap: Record<string, string[]> = {};
    errors.forEach((error: any) => {
      if (error.property) {
        errorMap[error.property] = Object.values(error.constraints || {});
      }
    });
    return { isValid: false, errors: errorMap };
  }

  return { isValid: true };
};
