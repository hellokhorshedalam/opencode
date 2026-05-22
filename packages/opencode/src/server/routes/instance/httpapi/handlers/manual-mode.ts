import { HttpApiEndpoint, HttpApiSchema, OpenApi } from "effect/unstable/httpapi"
import { HttpServerResponse } from "effect/unstable/http"
import { Effect, Schema } from "effect"
import { SessionID, MessageID } from "@/session/schema"
import { ProviderID, ModelID } from "@/provider/schema"
import { ManualModeService } from "@/session/manual-mode"

// API Schemas
export const ManualRequestPayload = Schema.Struct({
  sessionId: SessionID,
  messageId: Schema.optional(MessageID),
  prompt: Schema.String,
  systemPrompt: Schema.optional(Schema.String),
  providerID: Schema.optional(ProviderID),
  modelID: Schema.optional(ModelID),
})

export const ManualResponsePayload = Schema.Struct({
  requestId: Schema.String,
  content: Schema.String,
})

export const ManualTogglePayload = Schema.Struct({
  enabled: Schema.Boolean,
})

// API Paths
export const ManualPaths = {
  toggle: "/manual/toggle",
  status: "/manual/status",
  requests: "/manual/requests",
  create: "/manual/request",
  get: "/manual/request/:requestId",
  submit: "/manual/request/:requestId/submit",
  cancel: "/manual/request/:requestId/cancel",
} as const

// API Group definition
export const ManualApiGroup = (handlers: any) =>
  handlers
    .handle("toggle", toggleHandler)
    .handle("status", statusHandler)
    .handle("listRequests", listRequestsHandler)
    .handle("getRequest", getRequestHandler)
    .handle("createRequest", createRequestHandler)
    .handle("submitResponse", submitResponseHandler)
    .handle("cancelRequest", cancelRequestHandler)

// Handlers
const toggleHandler = Effect.fn("ManualModeHttpApi.toggle")(function* (ctx: {
  payload: typeof ManualTogglePayload.Type
}) {
  const manualMode = yield* ManualModeService
  yield* manualMode.toggle(ctx.payload.enabled)
  return HttpApiSchema.NoContent.make()
})

const statusHandler = Effect.fn("ManualModeHttpApi.status")(function* () {
  const manualMode = yield* ManualModeService
  const isEnabled = yield* manualMode.isEnabled()
  const pendingCount = (yield* manualMode.getAllPendingRequests()).length
  const totalCount = (yield* manualMode.getAllRequests()).length
  return {
    enabled: isEnabled,
    pendingCount,
    totalCount,
  }
})

const listRequestsHandler = Effect.fn("ManualModeHttpApi.listRequests")(function* (ctx: {
  query?: { pending?: boolean }
}) {
  const manualMode = yield* ManualModeService
  if (ctx.query?.pending) {
    return yield* manualMode.getAllPendingRequests()
  }
  return yield* manualMode.getAllRequests()
})

const getRequestHandler = Effect.fn("ManualModeHttpApi.getRequest")(function* (ctx: {
  params: { requestId: string }
}) {
  const manualMode = yield* ManualModeService
  const request = yield* manualMode.getRequest(ctx.params.requestId)
  if (!request) {
    return new HttpApiSchema.NotFound({ message: `Request ${ctx.params.requestId} not found` })
  }
  return request
})

const createRequestHandler = Effect.fn("ManualModeHttpApi.createRequest")(function* (ctx: {
  payload: typeof ManualRequestPayload.Type
}) {
  const manualMode = yield* ManualModeService
  const request = yield* manualMode.createRequest(ctx.payload)
  return request
})

const submitResponseHandler = Effect.fn("ManualModeHttpApi.submitResponse")(function* (ctx: {
  params: { requestId: string }
  payload: typeof ManualResponsePayload.Type
}) {
  const manualMode = yield* ManualModeService
  const response = yield* manualMode.submitResponse({
    requestId: ctx.params.requestId,
    content: ctx.payload.content,
  })
  return response
})

const cancelRequestHandler = Effect.fn("ManualModeHttpApi.cancelRequest")(function* (ctx: {
  params: { requestId: string }
}) {
  const manualMode = yield* ManualModeService
  yield* manualMode.cancelRequest(ctx.params.requestId)
  return HttpApiSchema.NoContent.make()
})
