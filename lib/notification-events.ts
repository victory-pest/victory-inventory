export type Channel = "inApp" | "push" | "email";

export type EventChannels = {
  inApp: boolean;
  push: boolean;
  email: boolean;
};

export type EventDefinition = {
  key: string;
  label: string;
  recipientHint: string;
  supportedChannels: Channel[];
  defaults: EventChannels;
};

export const NOTIFICATION_EVENTS: EventDefinition[] = [
  {
    key: "request_urgent",
    label: "Urgent request submitted",
    recipientHint: "Supervisors (location) + Managers",
    supportedChannels: ["inApp", "push", "email"],
    defaults: { inApp: true, push: true, email: true },
  },
  {
    key: "request_new",
    label: "New request submitted",
    recipientHint: "Supervisors (location) + Managers",
    supportedChannels: ["inApp", "push", "email"],
    defaults: { inApp: true, push: true, email: true },
  },
  {
    key: "request_auto_adjusted",
    label: "Request quantities auto-adjusted",
    recipientHint: "Supervisors (location) + Managers",
    supportedChannels: ["inApp", "push", "email"],
    defaults: { inApp: true, push: true, email: true },
  },
  {
    key: "request_approved",
    label: "Request approved",
    recipientHint: "Technician",
    supportedChannels: ["inApp", "push", "email"],
    defaults: { inApp: true, push: true, email: true },
  },
  {
    key: "request_rejected",
    label: "Request rejected",
    recipientHint: "Technician",
    supportedChannels: ["inApp", "push", "email"],
    defaults: { inApp: true, push: true, email: true },
  },
  {
    key: "request_cancelled",
    label: "Request cancelled",
    recipientHint: "Supervisors (location) + Managers",
    supportedChannels: ["inApp", "email"],
    defaults: { inApp: true, push: false, email: true },
  },
  {
    key: "stock_low",
    label: "Stock below minimum",
    recipientHint: "Supervisors (location) + Managers",
    supportedChannels: ["inApp", "push", "email"],
    defaults: { inApp: true, push: true, email: true },
  },
  {
    key: "reception_registered",
    label: "Reception registered",
    recipientHint: "Managers",
    supportedChannels: ["inApp", "email"],
    defaults: { inApp: true, push: false, email: true },
  },
  {
    key: "transfer_requested",
    label: "Transfer requested",
    recipientHint: "Managers",
    supportedChannels: ["inApp", "push", "email"],
    defaults: { inApp: true, push: true, email: true },
  },
  {
    key: "transfer_approved",
    label: "Transfer approved",
    recipientHint: "Requesting supervisor",
    supportedChannels: ["inApp", "push", "email"],
    defaults: { inApp: true, push: true, email: true },
  },
  {
    key: "transfer_rejected",
    label: "Transfer rejected",
    recipientHint: "Requesting supervisor",
    supportedChannels: ["inApp", "push", "email"],
    defaults: { inApp: true, push: true, email: true },
  },
];

export type NotificationSettings = Record<string, EventChannels>;

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings =
  Object.fromEntries(
    NOTIFICATION_EVENTS.map((e) => [e.key, { ...e.defaults }]),
  );

export function resolveEventChannels(
  eventKey: string,
  settings: NotificationSettings | null | undefined,
): EventChannels {
  const def = NOTIFICATION_EVENTS.find((e) => e.key === eventKey);
  const defaults = def?.defaults ?? { inApp: true, push: false, email: false };
  if (!settings || !settings[eventKey]) return defaults;
  return { ...defaults, ...settings[eventKey] };
}
