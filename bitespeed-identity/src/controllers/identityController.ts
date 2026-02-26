import { Request, Response, NextFunction } from "express";
import { processIdentity } from "../services/identityService";
import { sendSuccess, sendError } from "../utils/responseHelper";

export const identifyContact = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, phoneNumber } = req.body;

    // Validate: at least one field must be provided and non-empty
    const hasEmail =
      email !== undefined && email !== null && String(email).trim() !== "";
    const hasPhone =
      phoneNumber !== undefined && phoneNumber !== null && String(phoneNumber).trim() !== "";

    if (!hasEmail && !hasPhone) {
      sendError(res, 400, "At least one of email or phoneNumber must be provided");
      return;
    }

    // Normalize inputs
    const normalizedEmail: string | null = hasEmail
      ? String(email).trim().toLowerCase()
      : null;

    const normalizedPhone: string | null = hasPhone
      ? String(phoneNumber).trim()
      : null;

    const result = await processIdentity(normalizedEmail, normalizedPhone);
    sendSuccess(res, 200, result);
  } catch (error) {
    next(error);
  }
};
