/**
 * ChatAssistant - Agent IA Conversationnel pour Import PDF
 *
 * Utilise Mistral OCR + Small pour analyser les bulletins de commande SNCF
 * et permettre une validation conversationnelle avant import.
 */

export { default as ChatWindow } from './ChatWindow';
export { default as MessageBubble } from './MessageBubble';
export { default as FileUploadZone } from './FileUploadZone';
export { default as QuickReplyButtons } from './QuickReplyButtons';
export { default as ServicePreviewTable } from './ServicePreviewTable';
export { useChatAssistant } from './useChatAssistant';

// Export par défaut du composant principal
export { default } from './ChatWindow';
