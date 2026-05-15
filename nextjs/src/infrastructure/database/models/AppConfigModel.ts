import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAppConfigDocument extends Document {
  key: string;
  /** Free-form JSON payload — schema is per-key, validated by callers. */
  value: unknown;
  updatedAt?: Date;
}

/**
 * Generic key/value store for runtime-configurable app settings (the kind
 * a moderator should be able to tweak without a deploy). First user:
 * the Reavivados Por Sua Palavra reading-plan anchor.
 *
 * Keeping it generic avoids a one-table-per-setting explosion as more
 * configurable knobs land.
 */
const AppConfigSchema = new Schema<IAppConfigDocument>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const AppConfigModel: Model<IAppConfigDocument> =
  mongoose.models.AppConfig ||
  mongoose.model<IAppConfigDocument>("AppConfig", AppConfigSchema);
