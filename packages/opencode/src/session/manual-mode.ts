import { Effect, Schema } from "effect"
import { SessionID, MessageID } from "./schema"
import { ProviderID, ModelID } from "@/provider/schema"

/**
 * ManualRequest represents a request that should be handled manually
 * instead of being sent to an API provider.
 */
export class ManualRequest extends Schema.Class<ManualRequest>("ManualRequest")({
  id: Schema.String,
  sessionId: SessionID,
  messageId: Schema.optional(MessageID),
  prompt: Schema.String,
  systemPrompt: Schema.optional(Schema.String),
  providerID: Schema.optional(ProviderID),
  modelID: Schema.optional(ModelID),
  createdAt: Schema.Number,
  status: Schema.Union([
    Schema.Literal("pending"),
    Schema.Literal("completed"),
    Schema.Literal("cancelled"),
  ]),
}) {}

/**
 * ManualResponse represents the user-submitted response from manual mode
 */
export class ManualResponse extends Schema.Class<ManualResponse>("ManualResponse")({
  requestId: Schema.String,
  sessionId: SessionID,
  messageId: Schema.optional(MessageID),
  content: Schema.String,
  submittedAt: Schema.Number,
}) {}

/**
 * ManualModeService provides functionality for manual request handling
 */
export interface ManualModeService {
  readonly isEnabled: () => boolean
  readonly toggle: (enabled: boolean) => Effect.Effect<void>
  readonly createRequest: (input: {
    sessionId: string
    messageId?: string
    prompt: string
    systemPrompt?: string
    providerID?: string
    modelID?: string
  }) => Effect.Effect<ManualRequest>
  readonly getRequest: (id: string) => Effect.Effect<ManualRequest | null>
  readonly getAllPendingRequests: () => Effect.Effect<readonly ManualRequest[]>
  readonly getAllRequests: () => Effect.Effect<readonly ManualRequest[]>
  readonly submitResponse: (input: {
    requestId: string
    content: string
  }) => Effect.Effect<ManualResponse>
  readonly cancelRequest: (id: string) => Effect.Effect<void>
}

const MANUAL_MODE_ENABLED_KEY = "__manualModeEnabled"

export class Service extends Effect.Service<ManualModeService>()("@opencode/ManualMode", {
  succeed: {
    isEnabled: () => Effect.sync(() => !!(globalThis as any)[MANUAL_MODE_ENABLED_KEY]),
    
    toggle: (enabled) =>
      Effect.sync(() => {
        ;(globalThis as any)[MANUAL_MODE_ENABLED_KEY] = enabled
      }),

    createRequest: ({ sessionId, messageId, prompt, systemPrompt, providerID, modelID }) =>
      Effect.sync(() => {
        const request = new ManualRequest({
          id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          sessionId,
          messageId,
          prompt,
          systemPrompt: systemPrompt ?? "",
          providerID,
          modelID,
          createdAt: Date.now(),
          status: "pending",
        })
        // Store in memory - could be persisted to database in future
        ;(globalThis as any).__manualRequests = (globalThis as any).__manualRequests || {}
        ;(globalThis as any).__manualRequests[request.id] = request
        return request
      }),

    getRequest: (id) =>
      Effect.sync(() => {
        const requests = (globalThis as any).__manualRequests || {}
        return requests[id] || null
      }),

    getAllPendingRequests: () =>
      Effect.sync(() => {
        const requests = (globalThis as any).__manualRequests || {}
        return Object.values(requests).filter((r: any) => r.status === "pending") as readonly ManualRequest[]
      }),

    getAllRequests: () =>
      Effect.sync(() => {
        const requests = (globalThis as any).__manualRequests || {}
        return Object.values(requests) as readonly ManualRequest[]
      }),

    submitResponse: ({ requestId, content }) =>
      Effect.sync(() => {
        const requests = (globalThis as any).__manualRequests || {}
        const request = requests[requestId]
        if (!request) {
          throw new Error(`Manual request ${requestId} not found`)
        }
        request.status = "completed"
        const response = new ManualResponse({
          requestId,
          sessionId: request.sessionId,
          messageId: request.messageId,
          content,
          submittedAt: Date.now(),
        })
        ;(globalThis as any).__manualResponses = (globalThis as any).__manualResponses || {}
        ;(globalThis as any).__manualResponses[requestId] = response
        return response
      }),

    cancelRequest: (id) =>
      Effect.sync(() => {
        const requests = (globalThis as any).__manualRequests || {}
        const request = requests[id]
        if (request) {
          request.status = "cancelled"
        }
      }),
  },
}) {}

export { Service as ManualModeService }
