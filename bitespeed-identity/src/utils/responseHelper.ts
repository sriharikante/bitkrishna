import { Response } from "express";

export function sendSuccess(res: Response, statusCode: number, data: object): void {
  res.status(statusCode).json(data);
}

export function sendError(res: Response, statusCode: number, message: string): void {
  res.status(statusCode).json({ error: message });
}
