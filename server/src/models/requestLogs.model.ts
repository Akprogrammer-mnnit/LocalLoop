import mongoose, { Schema, Document } from "mongoose";

export interface IRequestLog extends Document {
  owner: mongoose.Types.ObjectId;
  subdomain: string;
  method: string;
  path: string;
  headers: any;
  body: any;
  query: any;
  createdAt: Date;
}

const RequestLogSchema = new Schema<IRequestLog>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User", 
      required: true,
    },
    subdomain: {
      type: String,
      required: true,
    },
    method: {
      type: String,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    headers: {
      type: Object, 
    },
    body: {
      type: Object, 
    },
    query: {
      type: Object,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: "7d"
    },
  },
  { timestamps: true }
);

export const RequestLog = mongoose.model<IRequestLog>("RequestLog", RequestLogSchema);