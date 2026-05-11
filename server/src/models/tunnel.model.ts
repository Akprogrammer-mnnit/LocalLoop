import mongoose, { Schema } from "mongoose";

export interface ITunnel extends Document {
    subdomain: string;
    owner: mongoose.Types.ObjectId;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const tunnelSchema = new mongoose.Schema<ITunnel>({
    subdomain: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    isActive: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

tunnelSchema.index({ subdomain: 1 });
export const Tunnel = mongoose.model<ITunnel>("Tunnel", tunnelSchema);