/**
 * Enquiry — one submission from the "Start a project" form.
 *
 * `status` is the delivery state machine used by the retry algorithm:
 *   pending  → stored, email not sent yet (or a retry is due)
 *   notified → email accepted by the SMTP server
 *   failed   → all retry attempts exhausted; needs manual attention
 */
import mongoose from "mongoose";

const { Schema } = mongoose;

const EnquirySchema = new Schema(
  {
    // ── what the visitor sent ───────────────────────────
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    company: { type: String, trim: true, maxlength: 160, default: "" },
    budget: { type: String, trim: true, maxlength: 60, default: "" },
    message: { type: String, required: true, trim: true, maxlength: 5000 },

    // ── delivery state ──────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "notified", "failed"],
      default: "pending",
      index: true,
    },
    mail: {
      attempts: { type: Number, default: 0 },
      lastAttemptAt: { type: Date, default: null },
      nextAttemptAt: { type: Date, default: null, index: true },
      notifiedAt: { type: Date, default: null },
      messageId: { type: String, default: "" },
      lastError: { type: String, default: "" },
      autoReplySent: { type: Boolean, default: false },
    },

    // ── request context (useful for spam triage) ────────
    meta: {
      ip: { type: String, default: "" },
      userAgent: { type: String, default: "" },
      referer: { type: String, default: "" },
      source: { type: String, default: "start-a-project" },
    },
  },
  { timestamps: true, collection: "enquiries" },
);

// Newest-first listing in the admin script / dashboard.
EnquirySchema.index({ createdAt: -1 });

/** Short human-readable handle used in email subjects and logs. */
EnquirySchema.virtual("ref").get(function ref() {
  return String(this._id).slice(-6).toUpperCase();
});

export const Enquiry = mongoose.models.Enquiry || mongoose.model("Enquiry", EnquirySchema);
export default Enquiry;
