export const MessageKind = {
  TEXT: 'TEXT',
  SYSTEM_RED_FLAG: 'SYSTEM_RED_FLAG',
  ACCESS_REQUEST: 'ACCESS_REQUEST',
  ACCESS_RESPONSE: 'ACCESS_RESPONSE',
  MEAL_PLAN: 'MEAL_PLAN',
  WORKOUT_PLAN: 'WORKOUT_PLAN',
} as const;

export type MessageKind = (typeof MessageKind)[keyof typeof MessageKind];
