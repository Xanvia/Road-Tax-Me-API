import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

export interface AuthRequest extends Request {
  admin?: {
    adminId: string;
    email: string;
    role: 'admin' | 'super_admin';
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    req.admin = {
      adminId: payload.adminId,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      res.status(401).json({ status: 'error', message: error.message });
    } else {
      res.status(401).json({ status: 'error', message: 'Invalid token' });
    }
  }
};

export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(401).json({ status: 'error', message: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.admin.role)) {
      throw new ForbiddenError('You do not have permission to access this resource');
    }

    next();
  };
};
