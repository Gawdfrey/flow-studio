import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
// @ts-expect-error no types for ws
import * as WebSocket from "ws";

interface ConfigFile {
  bpmnFiles: { [key: string]: string };
  basePath?: string;
}

const operations = {
  getConfig: async (ws: WebSocket, data: any) => {
    try {
      const configPath = data.configPath || "./config.json";

      if (!existsSync(configPath)) {
        ws.send(
          JSON.stringify({
            type: "error",
            ref: data.ref,
            message: `Config file not found: ${configPath}`,
          })
        );
        return;
      }

      const configContent = readFileSync(configPath, "utf8");
      const config: ConfigFile = JSON.parse(configContent);

      ws.send(
        JSON.stringify({
          type: "response",
          ref: data.ref,
          data: {
            config,
          },
        })
      );
    } catch (error) {
      ws.send(
        JSON.stringify({
          type: "error",
          ref: data.ref,
          message: `Error reading config: ${error}`,
        })
      );
    }
  },

  getBpmnFile: async (ws: WebSocket, data: any) => {
    try {
      const { configPath, bpmnKey } = data;

      if (!configPath || !bpmnKey) {
        ws.send(
          JSON.stringify({
            type: "error",
            ref: data.ref,
            message: "configPath and bpmnKey are required",
          })
        );
        return;
      }

      const configContent = readFileSync(configPath, "utf8");
      const config: ConfigFile = JSON.parse(configContent);

      const bpmnFilePath = config.bpmnFiles[bpmnKey];
      if (!bpmnFilePath) {
        ws.send(
          JSON.stringify({
            type: "error",
            ref: data.ref,
            message: `BPMN file key not found: ${bpmnKey}`,
          })
        );
        return;
      }

      const fullPath = config.basePath
        ? join(config.basePath, bpmnFilePath)
        : bpmnFilePath;

      if (!existsSync(fullPath)) {
        ws.send(
          JSON.stringify({
            type: "error",
            ref: data.ref,
            message: `BPMN file not found: ${fullPath}`,
          })
        );
        return;
      }

      const bpmnContent = readFileSync(fullPath, "utf8");

      ws.send(
        JSON.stringify({
          type: "response",
          ref: data.ref,
          data: {
            bpmnContent,
            filePath: fullPath,
          },
        })
      );
    } catch (error) {
      ws.send(
        JSON.stringify({
          type: "error",
          ref: data.ref,
          message: `Error reading BPMN file: ${error}`,
        })
      );
    }
  },
};

let wss: WebSocket.WebSocketServer;

export function initServer() {
  if (wss) {
    // already initialized
    return;
  }

  wss = new WebSocket.WebSocketServer({
    port: 1337,
    perMessageDeflate: false,
  });

  wss.on("connection", function connection(ws: WebSocket) {
    ws.on("message", function message(dataString: string) {
      const data = JSON.parse(dataString);
      console.log("received: %s", data);

      if (
        data.type === "request" &&
        operations[data.operation as keyof typeof operations]
      ) {
        const operation = operations[data.operation as keyof typeof operations];
        operation(ws, data);
        return;
      }

      ws.send(
        JSON.stringify({
          type: "error",
          ref: data.ref,
          message: `Unknown operation '${data.type}:${data.operation}'`,
        })
      );
    });
  });
}
