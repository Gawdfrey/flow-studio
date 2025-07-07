import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
// @ts-expect-error no types for ws
import * as WebSocket from "ws";

interface ConfigFile {
  api?: { [key: string]: string };
  processes: { [key: string]: string };
  stateSchema?: string;
  indexFile?: string;
  views?: any;
  metrics?: any;
}

// Store electronApp reference
let electronApp: any = null;

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

  openBpmnFile: async (ws: WebSocket, data: any) => {
    try {
      const { configPath, bpmnKey } = data;

      if (!electronApp) {
        ws.send(
          JSON.stringify({
            type: "error",
            ref: data.ref,
            message: "ElectronApp not available",
          })
        );
        return;
      }

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

      if (!config.processes) {
        ws.send(
          JSON.stringify({
            type: "error",
            ref: data.ref,
            message: "No processes found in config",
          })
        );
        return;
      }

      const bpmnFilePath = config.processes[bpmnKey];
      const filename = `${bpmnKey}.bpmn`;
      if (!bpmnFilePath) {
        ws.send(
          JSON.stringify({
            type: "error",
            ref: data.ref,
            message: `Process not found: ${bpmnKey}`,
          })
        );
        return;
      }

      // Files are relative to config location
      const configDir = require("path").dirname(configPath);
      const fullPath = join(configDir, bpmnFilePath, "diagrams", filename);

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

      // Use electronApp.openFiles to open the BPMN file in a new tab
      electronApp.openFiles([fullPath]);

      ws.send(
        JSON.stringify({
          type: "response",
          ref: data.ref,
          data: {
            success: true,
            filePath: fullPath,
            message: `Opened ${bpmnKey} in new tab`,
          },
        })
      );
    } catch (error) {
      ws.send(
        JSON.stringify({
          type: "error",
          ref: data.ref,
          message: `Error opening BPMN file: ${error}`,
        })
      );
    }
  },
};

let wss: WebSocket.WebSocketServer;

export function initServer(electronAppRef?: any) {
  if (wss) {
    // already initialized
    return;
  }

  // Store electronApp reference if provided
  if (electronAppRef) {
    electronApp = electronAppRef;
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
