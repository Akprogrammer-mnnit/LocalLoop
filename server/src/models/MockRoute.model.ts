import mongoose, { Schema, Document } from "mongoose";

export interface IMock extends Document {
    subdomain: string;
    method: string;
    path: string;
    status: number;
    body: string;
    createdAt: Date;
}

const mockSchema = new Schema<IMock>({
    subdomain: { type: String, required: true, index: true },
    method: { type: String, required: true, uppercase: true },
    path: { type: String, required: true },
    status: { type: Number, required: true, default: 200 },
    body: { type: String, default: "{}" }
}, { timestamps: true });

mockSchema.index({ subdomain: 1, method: 1, path: 1 }, { unique: true });

export const Mock = mongoose.model<IMock>("Mock", mockSchema);