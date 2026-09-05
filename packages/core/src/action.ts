import type {
  ActionRequest,
  ActionResult,
  Capability,
  DeviceState
} from "./types.js";

export interface ActionExecutor {
  execute(
    request: ActionRequest
  ): Promise<ActionResult>;

  getDeviceState(): Promise<DeviceState>;

  hasCapability(
    capability: Capability
  ): boolean;
}

export class PolicyEngine {
  check(
    request: ActionRequest,
    device: DeviceState
  ): {
    allowed: boolean;
    reason?: string;
  } {
    if (
      !device.permissions[request.capability] &&
      request.capability !== "READ_DEVICE_STATE"
    ) {
      return {
        allowed: false,
        reason: `القدرة ${request.capability} غير متاحة أو غير مصرح بها`
      };
    }

    return {
      allowed: true
    };
  }
}
