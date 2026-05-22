import { HttpApi, HttpApiEndpoint, HttpApiError, HttpApiGroup, OpenApi } from "effect/unstable/httpapi"
import { Schema } from "effect"
import { Authorization } from "../middleware/authorization"
import { InstanceContextMiddleware } from "../middleware/instance-context"
import {
  WorkspaceRoutingMiddleware,
  WorkspaceRoutingQuery,
  WorkspaceRoutingQueryFields,
} from "../middleware/workspace-routing"
import { described } from "./metadata"
import { ManualPaths, ManualTogglePayload, ManualRequestPayload, ManualResponsePayload } from "../handlers/manual-mode"
import { ManualModeService } from "@/session/manual-mode"

const ManualStatusResponse = Schema.Struct({
  enabled: Schema.Boolean,
  pendingCount: Schema.Number,
  totalCount: Schema.Number,
}).annotate({ identifier: "ManualStatus" })

const ManualRequestList = Schema.Array(
  Schema.Struct({
    id: Schema.String,
    sessionId: Schema.String,
    messageId: Schema.optional(Schema.String),
    prompt: Schema.String,
    systemPrompt: Schema.optional(Schema.String),
    providerID: Schema.optional(Schema.String),
    modelID: Schema.optional(Schema.String),
    createdAt: Schema.Number,
    status: Schema.Union(Schema.Literal("pending"), Schema.Literal("completed"), Schema.Literal("cancelled")),
  }),
).annotate({ identifier: "ManualRequestList" })

export const ManualApi = HttpApi.make("manual")
  .add(
    HttpApiGroup.make("manual")
      .add(
        HttpApiEndpoint.post("toggle", ManualPaths.toggle, {
          query: WorkspaceRoutingQuery,
          payload: ManualTogglePayload,
          success: described(Schema.Void, "Manual mode toggled"),
          error: HttpApiError.InternalServerError,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "manual.toggle",
            summary: "Toggle manual mode",
            description: "Enable or disable manual mode for request handling",
          }),
        ),
        HttpApiEndpoint.get("status", ManualPaths.status, {
          query: WorkspaceRoutingQuery,
          success: described(ManualStatusResponse, "Manual mode status"),
          error: HttpApiError.InternalServerError,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "manual.status",
            summary: "Get manual mode status",
            description: "Get the current status of manual mode including pending and total request counts",
          }),
        ),
        HttpApiEndpoint.get("listRequests", ManualPaths.requests, {
          query: Schema.Struct({
            ...WorkspaceRoutingQueryFields,
            pending: Schema.optional(Schema.String),
          }),
          success: described(ManualRequestList, "List of manual requests"),
          error: HttpApiError.InternalServerError,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "manual.requests.list",
            summary: "List manual requests",
            description: "Get all manual requests, optionally filtered to pending only",
          }),
        ),
        HttpApiEndpoint.get("getRequest", ManualPaths.get, {
          query: WorkspaceRoutingQuery,
          success: described(Schema.Unknown, "Manual request details"),
          error: HttpApiError.NotFound,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "manual.request.get",
            summary: "Get manual request",
            description: "Get details of a specific manual request by ID",
          }),
        ),
        HttpApiEndpoint.post("createRequest", ManualPaths.create, {
          query: WorkspaceRoutingQuery,
          payload: ManualRequestPayload,
          success: described(Schema.Unknown, "Manual request created"),
          error: HttpApiError.InternalServerError,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "manual.request.create",
            summary: "Create manual request",
            description: "Create a new manual request",
          }),
        ),
        HttpApiEndpoint.post("submitResponse", ManualPaths.submit, {
          query: WorkspaceRoutingQuery,
          payload: ManualResponsePayload,
          success: described(Schema.Unknown, "Response submitted"),
          error: HttpApiError.NotFound,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "manual.response.submit",
            summary: "Submit manual response",
            description: "Submit a response for a manual request",
          }),
        ),
        HttpApiEndpoint.delete("cancelRequest", ManualPaths.cancel, {
          query: WorkspaceRoutingQuery,
          success: described(Schema.Void, "Request cancelled"),
          error: HttpApiError.NotFound,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "manual.request.cancel",
            summary: "Cancel manual request",
            description: "Cancel a pending manual request",
          }),
        ),
      )
      .annotateMerge(
        OpenApi.annotations({
          title: "manual",
          description: "Manual mode API for handling requests without automatic AI responses",
        }),
      )
      .middleware(InstanceContextMiddleware)
      .middleware(WorkspaceRoutingMiddleware)
      .middleware(Authorization),
  )
  .annotateMerge(
    OpenApi.annotations({
      title: "opencode manual mode HttpApi",
      version: "0.0.1",
      description: "API surface for manual mode request handling",
    }),
  )
