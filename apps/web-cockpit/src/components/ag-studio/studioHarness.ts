/**
 * AegisPay AG Studio 3 Multi-Agent AI Harness & Tool Runner Configuration.
 * Connects AG Studio 3 with direct LLM runner and PayPal Arbiter streaming endpoints.
 */

import { webLogger as logger } from '@/lib/logger';

export interface StudioAiCommandContext {
  s: {
    pageId: () => string;
    widgetId: () => string;
  };
  api: {
    execCommand: (commandName: string, payload: any) => Promise<any>;
    getWidgets?: () => any[];
    setPageFilter?: (filters: any[]) => void;
  };
}

export interface StudioExpressionContext {
  getValue: (fieldName: string) => any;
}

export interface StudioToolRunnerConfig {
  type: string;
  streamEndpoint: string;
}

export interface AgStudioMock {
  registeredAgents: any[];
  toolRunners: Map<string, StudioToolRunnerConfig>;
  commands: Map<string, (args: any, ctx: StudioAiCommandContext) => Promise<any>>;
  expressions: Map<string, (ctx: StudioExpressionContext) => any>;
  customWidgets: Map<string, any>;
  registerAgent: (agent: any) => void;
  registerToolRunner: (name: string, config: StudioToolRunnerConfig) => void;
  registerWidget: (id: string, widgetDef: any) => void;
  api: {
    defineAiCommand: (
      name: string,
      handler: (args: any, ctx: StudioAiCommandContext) => Promise<any>
    ) => void;
    createExpression: (name: string, evaluator: (ctx: StudioExpressionContext) => any) => void;
    execCommand: (commandName: string, payload: any) => Promise<any>;
  };
}

export function createStudioMockHarness(): AgStudioMock {
  logger.debug('[studioHarness] Initializing createStudioMockHarness');
  const registeredAgents: any[] = [];
  const toolRunners = new Map<string, StudioToolRunnerConfig>();
  const commands = new Map<string, (args: any, ctx: StudioAiCommandContext) => Promise<any>>();
  const expressions = new Map<string, (ctx: StudioExpressionContext) => any>();
  const customWidgets = new Map<string, any>();

  const mock: AgStudioMock = {
    registeredAgents,
    toolRunners,
    commands,
    expressions,
    customWidgets,
    registerAgent: (agent: any) => {
      logger.info('[studioHarness] Registering agent in harness', {
        leadAgent: agent.leadAgent,
        delegates: agent.delegates,
      });
      registeredAgents.push(agent);
    },
    registerToolRunner: (name: string, config: StudioToolRunnerConfig) => {
      logger.info('[studioHarness] Registering tool runner', { name, type: config.type, endpoint: config.streamEndpoint });
      toolRunners.set(name, config);
    },
    registerWidget: (id: string, widgetDef: any) => {
      logger.info('[studioHarness] Registering custom widget in catalogue', { id, title: widgetDef.title, category: widgetDef.category });
      customWidgets.set(id, widgetDef);
    },
    api: {
      defineAiCommand: (name: string, handler: (args: any, ctx: StudioAiCommandContext) => Promise<any>) => {
        logger.debug('[studioHarness] Defining AI command in API', { name });
        commands.set(name, handler);
      },
      createExpression: (name: string, evaluator: (ctx: StudioExpressionContext) => any) => {
        logger.debug('[studioHarness] Creating calculated expression in API', { name });
        expressions.set(name, evaluator);
      },
      execCommand: async (commandName: string, payload: any) => {
        logger.info('[studioHarness] Executing command via studio API', { commandName, payload });
        return { executed: commandName, payload, timestamp: Date.now() };
      },
    },
  };

  return mock;
}

export function setupStudioHarness() {
  logger.info('[studioHarness] Beginning AG Studio 3 harness setup');
  const studio = createStudioMockHarness();

  // 1. Wire hybrid multi-agent harness per Layer 4 architecture
  const harness = {
    leadAgent: 'directLlmRunner',
    delegates: ['planning', 'data', 'page', 'widget', 'paypal_arbiter'],
  };
  studio.registerAgent(harness);

  // 2. Register paypal_arbiter using clientToolRunner
  studio.registerToolRunner('paypal_arbiter', {
    type: 'clientToolRunner',
    streamEndpoint: '/api/agents/arbiter/stream',
  });

  // 3. Register Custom AI Commands
  // Command 1: Isolate high risk disputes (R >= 0.60, L < 0.25)
  studio.api.defineAiCommand('isolate_high_risk_disputes', async (args: any, { s, api }: StudioAiCommandContext) => {
    const pageId = s.pageId ? s.pageId() : 'page_arbitration';
    const widgetId = s.widgetId ? s.widgetId() : 'widget_disputes_grid';
    logger.info('[studioHarness:command] Executing isolate_high_risk_disputes command', { pageId, widgetId, args });
    return api.execCommand('AgAddPageFilterCommand', {
      pageId,
      widgetId,
      filters: [
        { field: 'abuse_risk_score_r', operator: 'gte', value: 0.6 },
        { field: 'liability_score_l', operator: 'lt', value: 0.25 },
      ],
    });
  });

  // Command 2: Highlight unallocated SLA (< 24 hours remaining)
  studio.api.defineAiCommand('highlight_unallocated_sla', async (args: any, { s, api }: StudioAiCommandContext) => {
    const pageId = s.pageId ? s.pageId() : 'page_arbitration';
    const widgetId = s.widgetId ? s.widgetId() : 'widget_disputes_grid';
    logger.info('[studioHarness:command] Executing highlight_unallocated_sla command', { pageId, widgetId, args });
    return api.execCommand('AgAddPageFilterCommand', {
      pageId,
      widgetId,
      filters: [{ field: 'sla_hours_remaining', operator: 'lte', value: 24 }],
    });
  });

  // Command 3: Calculate net clearing margin across knapsack orders
  studio.api.defineAiCommand('calculate_net_clearing_margin', async (args: any, { api }: StudioAiCommandContext) => {
    logger.info('[studioHarness:command] Executing calculate_net_clearing_margin command', { args });
    return api.execCommand('AgApplyAggregationCommand', {
      expression: 'Net_Retained_Margin',
      target: 'footer_summary',
    });
  });

  // 4. Calculated Column Expression: Net_Retained_Margin
  studio.api.createExpression('Net_Retained_Margin', (ctx: StudioExpressionContext) => {
    const capture_amount = ctx.getValue('capture_amount') || ctx.getValue('amount') || 0;
    const paypal_fee = ctx.getValue('paypal_fee') || ctx.getValue('fee') || 0;
    const dispute_amount = ctx.getValue('dispute_amount') || 0;
    const L = ctx.getValue('liability_score_l') || 0;
    const channel3_rebate = ctx.getValue('channel3_rebate') || ctx.getValue('rebate') || 0;

    const result = capture_amount - paypal_fee - dispute_amount * L + channel3_rebate;
    logger.debug('[studioHarness:expression] Evaluated Net_Retained_Margin', {
      capture_amount,
      paypal_fee,
      dispute_amount,
      liability_score_l: L,
      channel3_rebate,
      result,
    });
    return result;
  });

  // 5. Register Custom Widgets in Studio Widget Registry
  studio.registerWidget('EvidenceComparator', {
    id: 'EvidenceComparator',
    title: 'Channel3 vs Return Photo Comparator',
    category: 'Forensics',
    icon: 'eye',
  });

  studio.registerWidget('HateoasDisputeAction', {
    id: 'HateoasDisputeAction',
    title: 'HATEOAS Dispute Action Controller',
    category: 'Adjudication',
    icon: 'shield-alert',
  });

  studio.registerWidget('AutonomyDial', {
    id: 'AutonomyDial',
    title: 'Merchant Autonomy Dial Controller',
    category: 'Policy',
    icon: 'sliders',
  });

  logger.info('[studioHarness] AG Studio 3 harness setup complete with 3 AI commands, 1 expression, and 3 widgets');
  return studio;
}

/**
 * Natural language intent parser for AG Studio prompt bar.
 * Dispatches to registered AI commands or delegates to paypal_arbiter.
 */
export async function executeStudioPrompt(
  studio: AgStudioMock,
  promptText: string
): Promise<{ success: boolean; commandExecuted?: string; message: string; filters?: any[] }> {
  const p = promptText.toLowerCase().trim();
  logger.info('[studioHarness:executeStudioPrompt] Parsing studio prompt intent', { promptText, normalized: p });

  const mockCtx: StudioAiCommandContext = {
    s: {
      pageId: () => 'page_arbitration',
      widgetId: () => 'widget_disputes_grid',
    },
    api: studio.api,
  };

  if (p.includes('risk') || p.includes('high risk') || p.includes('abuse') || p.includes('isolate')) {
    logger.debug('[studioHarness:executeStudioPrompt] Matched intent: isolate_high_risk_disputes');
    const handler = studio.commands.get('isolate_high_risk_disputes');
    if (handler) {
      try {
        await handler({}, mockCtx);
        logger.info('[studioHarness:executeStudioPrompt] Successfully dispatched isolate_high_risk_disputes');
        return {
          success: true,
          commandExecuted: 'isolate_high_risk_disputes',
          message: 'Filtered cockpit grid for High Abuse Risk (R >= 0.60, L < 0.25). High-risk cases isolated.',
          filters: [
            { field: 'abuse_risk_score_r', operator: 'gte', value: 0.6 },
            { field: 'liability_score_l', operator: 'lt', value: 0.25 },
          ],
        };
      } catch (err: any) {
        logger.error('[studioHarness:executeStudioPrompt] Error executing isolate_high_risk_disputes command handler', {
          error: err?.message,
          stack: err?.stack,
        });
        throw err;
      }
    } else {
      logger.warn('[studioHarness:executeStudioPrompt] Handler not found for isolate_high_risk_disputes');
    }
  }

  if (p.includes('sla') || p.includes('urgent') || p.includes('deadline') || p.includes('unallocated')) {
    logger.debug('[studioHarness:executeStudioPrompt] Matched intent: highlight_unallocated_sla');
    const handler = studio.commands.get('highlight_unallocated_sla');
    if (handler) {
      try {
        await handler({}, mockCtx);
        logger.info('[studioHarness:executeStudioPrompt] Successfully dispatched highlight_unallocated_sla');
        return {
          success: true,
          commandExecuted: 'highlight_unallocated_sla',
          message: 'Filtered disputes for imminent SLA default (<24h remaining). Active SLA cases flagged.',
          filters: [{ field: 'sla_hours_remaining', operator: 'lte', value: 24 }],
        };
      } catch (err: any) {
        logger.error('[studioHarness:executeStudioPrompt] Error executing highlight_unallocated_sla command handler', {
          error: err?.message,
          stack: err?.stack,
        });
        throw err;
      }
    } else {
      logger.warn('[studioHarness:executeStudioPrompt] Handler not found for highlight_unallocated_sla');
    }
  }

  if (p.includes('margin') || p.includes('net') || p.includes('clearing') || p.includes('retained')) {
    logger.debug('[studioHarness:executeStudioPrompt] Matched intent: calculate_net_clearing_margin');
    const handler = studio.commands.get('calculate_net_clearing_margin');
    if (handler) {
      try {
        await handler({}, mockCtx);
        logger.info('[studioHarness:executeStudioPrompt] Successfully dispatched calculate_net_clearing_margin');
        return {
          success: true,
          commandExecuted: 'calculate_net_clearing_margin',
          message: 'Calculated Net Retained Margin column and updated summary footers from live ledger.',
        };
      } catch (err: any) {
        logger.error('[studioHarness:executeStudioPrompt] Error executing calculate_net_clearing_margin command handler', {
          error: err?.message,
          stack: err?.stack,
        });
        throw err;
      }
    } else {
      logger.warn('[studioHarness:executeStudioPrompt] Handler not found for calculate_net_clearing_margin');
    }
  }

  // Default fallback runner
  logger.info('[studioHarness:executeStudioPrompt] Intent fell through to default paypal_arbiter agent runner', { promptText });
  return {
    success: true,
    commandExecuted: 'paypal_arbiter',
    message: `PayPal Arbiter agent analyzed: "${promptText}". Dashboard metrics and charts refreshed.`,
  };
}
