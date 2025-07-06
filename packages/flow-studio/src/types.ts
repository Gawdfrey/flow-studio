export interface ConfigFile {
  api?: { [key: string]: string };
  processes: { [key: string]: string };
  stateSchema?: string;
  indexFile?: string;
  views?: any;
  metrics?: any;
}

export interface BpmnFileResponse {
  bpmnContent: string;
  filePath: string;
}

export interface ConfigResponse {
  config: ConfigFile;
}

export interface WebSocketMessage {
  type: "request" | "response" | "error";
  ref: string;
  operation?: string;
  data?: any;
  message?: string;
  configPath?: string;
  bpmnKey?: string;
}

export interface AwaitResponse {
  ref: string;
  time: number;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

export interface FlowStudioState {
  enabled: boolean;
  configPath: string;
  configOpen: boolean;
  config: ConfigFile | null;
  error: string | null;
}

export interface CamundaElement {
  type: string;
  businessObject: {
    calledElement?: string;
  };
}

export interface CamundaEvent {
  element: CamundaElement;
}

export interface CamundaPluginProps {
  config: {
    backend: {
      on: (event: string, callback: (event: any, options: any) => void) => void;
    };
    getForPlugin: (plugin: string, key: string) => Promise<any>;
    setForPlugin: (plugin: string, key: string, value: any) => Promise<void>;
  };
  subscribe: (event: string, callback: (event: CamundaEvent) => void) => void;
  triggerAction: (action: string, options: any) => void;
  displayNotification: (notification: {
    type: string;
    title: string;
    content: string;
    duration: number;
  }) => void;
}