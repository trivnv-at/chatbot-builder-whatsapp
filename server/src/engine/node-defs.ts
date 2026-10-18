export const FLOW_OUTPUTS: Record<string, string[]> = {
  onMessageNode: ['out'],
  keywordMatchNode: ['matched', 'unmatched'],
  ctwaNode: ['out'],
  webhookNode: ['out'],
  sendTextNode: ['out'],
  sendButtonsNode: ['btn1', 'btn2', 'btn3', 'timeout'],
  sendListNode: ['selected'],
  sendMediaNode: ['out'],
  conditionNode: ['true', 'false'],
  waitInputNode: ['reply', 'timeoutOut'],
  delayNode: ['out'],
  switchNode: ['caseA', 'caseB', 'caseC', 'default'],
  updateStageNode: ['out'],
  assignAgentNode: ['assigned', 'noAgent'],
  customFieldNode: ['out'],
  leadScoreNode: ['out'],
  appointmentNode: ['created', 'unavailable'],
  aiAgentNode: ['out'],
  sentimentNode: ['positive', 'neutral', 'negative'],
  httpRequestNode: ['success', 'error'],
  capiNode: ['out']
};

export const TRIGGER_TYPES = new Set(['onMessageNode', 'keywordMatchNode', 'ctwaNode', 'webhookNode']);
