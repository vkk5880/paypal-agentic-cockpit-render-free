import { createLogger, type Logger } from '@aegispay/shared-types';

export const webLogger: Logger = createLogger('Web:Cockpit');
export const apiLogger: Logger = createLogger('Web:API');
export const chaosLogger: Logger = createLogger('Web:Chaos');

export { createLogger };
