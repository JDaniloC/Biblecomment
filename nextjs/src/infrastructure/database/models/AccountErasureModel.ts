import mongoose, { Schema, Model } from "mongoose";

/**
 * One document per deleted account, keyed by the id the account had. Holds
 * nothing else that identifies the person (see IAccountErasureRepository).
 */
export interface IAccountErasureDocument {
	_id: mongoose.Types.ObjectId;
	erasedAt: Date;
}

const AccountErasureSchema = new Schema<IAccountErasureDocument>(
	{
		_id: { type: Schema.Types.ObjectId, required: true },
		erasedAt: { type: Date, required: true },
	},
	{ timestamps: false, versionKey: false, collection: "accounterasures" },
);

export const AccountErasureModel: Model<IAccountErasureDocument> =
	mongoose.models.AccountErasure ||
	mongoose.model<IAccountErasureDocument>(
		"AccountErasure",
		AccountErasureSchema,
	);
