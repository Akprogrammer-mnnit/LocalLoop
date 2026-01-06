import { Request } from "express";
import { IUserDocument } from "../models/user.model";

export interface AuthRequest extends Request {
  user?: IUserDocument;
}
