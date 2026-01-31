import mongoose, { Schema, Document, Types } from "mongoose";

export interface ISession extends Document {
    owner?: Types.ObjectId;
    subdomain: string;
    name: string;
    requests: any[];
    createdAt: Date;
}



const sessionSchema = new Schema<ISession>({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false,
    },
    subdomain: { type: String, required: true },
    name: { type: String, required: true },
    requests: { type: [Object], required: true },
}, { timestamps: true });


export const Session = mongoose.model<ISession>("Session", sessionSchema);