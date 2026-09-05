export type CognitiveMode =
  | "IDLE"
  | "OBSERVING"
  | "UNDERSTANDING"
  | "RECALLING"
  | "PLANNING"
  | "PREDICTING"
  | "DECIDING"
  | "EXECUTING"
  | "VERIFYING"
  | "REFLECTING"
  | "LEARNING"
  | "WAITING"
  | "BLOCKED"
  | "OFFLINE";

export type MissionState =
  | "CREATED"
  | "PLANNING"
  | "RUNNING"
  | "WAITING"
  | "BLOCKED"
  | "REPLANNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type MemoryType =
  | "USER_FACT"
  | "USER_PREFERENCE"
  | "CONVERSATION"
  | "GOAL"
  | "TASK"
  | "PLAN"
  | "ACTION"
  | "RESULT"
  | "FAILURE"
  | "SUCCESS"
  | "LESSON"
  | "BEHAVIOR_PATTERN"
  | "IMPORTANT_EVENT";

export type EventType =
  | "USER_INPUT"
  | "VOICE_INPUT"
  | "OBSERVATION"
  | "MEMORY_RETRIEVED"
  | "MEMORY_UPDATED"
  | "GOAL_CREATED"
  | "GOAL_UPDATED"
  | "PLAN_CREATED"
  | "PREDICTION_CREATED"
  | "DECISION_MADE"
  | "ACTION_REQUESTED"
  | "PERMISSION_REQUIRED"
  | "ACTION_STARTED"
  | "ACTION_COMPLETED"
  | "ACTION_FAILED"
  | "VERIFICATION_COMPLETED"
  | "REFLECTION_COMPLETED"
  | "LESSON_LEARNED"
  | "DEVICE_EVENT"
  | "NOTIFICATION_EVENT"
  | "ERROR";

export type Capability =
  | "OPEN_APP"
  | "LAUNCH_INTENT"
  | "READ_NOTIFICATION"
  | "MANAGE_NOTIFICATION"
  | "READ_DEVICE_STATE"
  | "READ_BATTERY"
  | "CONTROL_MEDIA"
  | "MANAGE_FILES"
  | "CREATE_REMINDER"
  | "USE_ACCESSIBILITY"
  | "VOICE_INPUT"
  | "TEXT_TO_SPEECH"
  | "SYSTEM_INFORMATION";

export interface JarvisEvent<T = unknown> {
  id: string;
  type: EventType;
  timestamp: number;
  source: "web" | "android" | "core";
  payload: T;
}

export interface Memory {
  id: string;
  type: MemoryType;
  text: string;
  tags: string[];
  importance: number;
  confidence: number;
  createdAt: number;
  updatedAt: number;
  lastAccessedAt: number;
  metadata?: Record<string, unknown>;
}

export interface Goal {
  id: string;
  title: string;
  objective: string;
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "FAILED" | "CANCELLED";
  priority: number;
  createdAt: number;
  updatedAt: number;
}

export interface Plan {
  id: string;
  label: "FAST" | "BALANCED" | "DEEP";
  steps: string[];
  dependencies: string[];
  estimatedEffort: number;
  expectedOutcome: string;
  risk: number;
  confidence: number;
  recoveryStrategy: string;
}

export interface Prediction {
  planId: string;
  benefit: number;
  cost: number;
  risk: number;
  probabilityOfSuccess: number;
  dependencies: string[];
  failureModes: string[];
  recoveryPossibilities: string[];
}

export interface Decision {
  planId: string;
  score: number;
  reasons: string[];
  confidence: number;
  reversible: boolean;
}

export interface ActionRequest {
  id: string;
  capability: Capability;
  action: string;
  args: Record<string, unknown>;
  requiresPermission?: string;
}

export interface ActionResult {
  id: string;
  success: boolean;
  result?: unknown;
  error?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface DeviceState {
  platform: "web" | "android";
  online: boolean;
  battery?: number;
  network?: string;
  foregroundApp?: string;
  notificationAccess?: boolean;
  accessibility?: boolean;
  permissions: Record<string, boolean>;
}

export interface WorldModel {
  user: string;
  time: number;
  currentRequest: string;
  activeGoal?: Goal;
  activeTask?: string;
  currentPlan?: Plan;
  availableTools: string[];
  permissions: Record<string, boolean>;
  recentEvents: JarvisEvent[];
  relevantMemory: Memory[];
  deviceState: DeviceState;
  pendingActions: ActionRequest[];
  results: ActionResult[];
  constraints: string[];
  uncertainty: number;
}

export interface SelfModel {
  currentMode: CognitiveMode;
  currentGoal?: string;
  currentTask?: string;
  currentAction?: string;
  currentThoughtState: string;
  confidence: number;
  uncertainty: number;
  attention: number;
  capabilities: Capability[];
  limitations: string[];
  recentSuccess?: string;
  recentFailure?: string;
  lastObservation?: string;
  lastDecision?: string;
}

export interface PersonalitySettings {
  tone: "calm" | "professional" | "friendly" | "futuristic";
  formality: number;
  verbosity: number;
  humor: number;
  address: string;
  explanationLevel: number;
}
