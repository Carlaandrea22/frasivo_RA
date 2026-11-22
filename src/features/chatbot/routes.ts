import type { RouteDefinition } from '../../shared/navegacion';
import { Chatbot } from './Chatbot';

export const routes = [
  { path: 'chatbot', tab: 'chatbot', Screen: Chatbot },
] satisfies RouteDefinition[];
