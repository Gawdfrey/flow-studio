import type {
  AwaitResponse,
  BpmnFileResponse,
  ConfigResponse,
  WebSocketMessage,
} from "../types";

let ws: WebSocket | null = null;
let wsPromise: Promise<void> | null = null;

// TODO: set interval to clean awaits
const awaitResponses: AwaitResponse[] = [];

export async function start(options: { port?: number }): Promise<void> {
  if (ws) {
    return Promise.resolve(); // do not start another client
  }

  options.port = options.port || 1337;

  wsPromise = new Promise((resolve, reject) => {
    ws = new WebSocket(`ws://localhost:${options.port}`);

    ws.onopen = function open() {
      resolve();
    };

    ws.onerror = function error(err) {
      reject(err);
    };

    ws.onmessage = function message({ data }) {
      console.log("received: %s", data);
      const parsedData: WebSocketMessage = JSON.parse(data as string);

      awaitResponses
        .filter((expectedResponse) => expectedResponse.ref === parsedData.ref)
        .forEach((expectedResponse) => {
          const index = awaitResponses.indexOf(expectedResponse);
          awaitResponses.splice(index, 1);

          if (parsedData.type === "error") {
            expectedResponse.reject(
              new Error(parsedData.message || "Unknown error")
            );
          } else {
            expectedResponse.resolve(parsedData.data);
          }
        });
    };
  });

  return wsPromise;
}

export async function getConfig(
  configPath = "./config.json"
): Promise<ConfigResponse> {
  if (!wsPromise) {
    throw new Error("WebSocket not initialized");
  }
  await wsPromise;

  if (!ws) {
    throw new Error("WebSocket connection not available");
  }

  const opId = `config-${Date.now()}`;

  const promise = new Promise<ConfigResponse>((resolve, reject) => {
    awaitResponses.push({
      ref: opId,
      time: Date.now(),
      resolve,
      reject,
    });
  });

  ws.send(
    JSON.stringify({
      type: "request",
      operation: "getConfig",
      ref: opId,
      configPath,
    })
  );

  return promise;
}

export async function getBpmnFile(
  configPath: string,
  bpmnKey: string
): Promise<BpmnFileResponse> {
  if (!wsPromise) {
    throw new Error("WebSocket not initialized");
  }
  await wsPromise;

  if (!ws) {
    throw new Error("WebSocket connection not available");
  }

  const opId = `bpmn-${Date.now()}`;

  const promise = new Promise<BpmnFileResponse>((resolve, reject) => {
    awaitResponses.push({
      ref: opId,
      time: Date.now(),
      resolve,
      reject,
    });
  });

  ws.send(
    JSON.stringify({
      type: "request",
      operation: "getBpmnFile",
      ref: opId,
      configPath,
      bpmnKey,
    })
  );

  return promise;
}
