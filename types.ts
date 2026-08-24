export enum FieldType {
  STRING = 'string',
  INTEGER = 'integer',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  RELATIONSHIP = 'relationship',
  REPEATER = 'repeater',
}

export interface MetaField {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  description: string;
  required: boolean;
  showInRest: boolean;
  targetPostType?: string; // For relationship types
  subFields?: MetaField[]; // For repeater types
}

export interface Taxonomy {
  id: string;
  slug: string;
  singularName: string;
  pluralName: string;
  hierarchical: boolean;
  showInRest: boolean;
  connectedPostTypes: string[]; // CPT slugs
  ui?: { x: number; y: number };
}

export interface CustomPostType {
  id: string;
  slug: string;
  singularName: string;
  pluralName: string;
  description: string;
  icon: string; 
  supports: string[];
  taxonomies: string[]; 
  metaFields: MetaField[];
  showInRest: boolean;
  restBase: string;
  ui?: { x: number; y: number };
}

export type EndpointMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface EndpointParameter {
  id: string;
  key: string;
  required: boolean;
  type: string;
  description: string;
}

export interface StorageMapping {
  enabled: boolean;
  targetCptSlug: string;
  fieldMapping: Record<string, string>;
}

export interface EndpointMiddleware {
  id: string;
  name: string;
  type: 'auth' | 'permission' | 'rate_limit' | 'custom';
  enabled: boolean;
  callbackSnippet: string;
  description?: string;
}

export interface CustomEndpoint {
  id: string;
  route: string;
  method: EndpointMethod;
  callbackFunction: string;
  description: string;
  parameters: EndpointParameter[];
  hookName?: string;
  storage?: StorageMapping;
  customPhp?: string;
  middlewares?: EndpointMiddleware[];
  ui?: { x: number; y: number };
}

export type GlobalLogicType = 'function' | 'action' | 'filter' | 'middleware' | 'class';

export interface GlobalHelper {
  id: string;
  name: string;
  type?: GlobalLogicType;
  hookName?: string;
  priority?: number;
  acceptedArgs?: number;
  parameters: string; // Comma separated string for simplicity in UI
  phpCode: string;
  description: string;
  enabled?: boolean;
}

export interface ProjectState {
  name: string;
  namespace: string;
  apiVersion?: string;
  postTypes: CustomPostType[];
  taxonomies: Taxonomy[];
  customEndpoints: CustomEndpoint[];
  globalHelpers: GlobalHelper[];
}

export type ViewMode = 'editor' | 'openapi' | 'php' | 'flow' | 'settings' | 'blueprint' | 'code' | 'playground';
export type ResourceType = 'postType' | 'endpoint' | 'taxonomy' | 'helper';

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  type: ResourceType | null;
  id: string | null;
}

export enum AIProvider {
  GEMINI = 'gemini',
  CHROME_LOCAL = 'chrome_local'
}

export interface AppSettings {
  provider: AIProvider;
  apiKey: string;
  model: string;
  temperature: number;
  customPrompt?: string;
}

export type LogLevel = 'info' | 'success' | 'warning' | 'error';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  details?: any;
}
