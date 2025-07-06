import {
  createElement,
  Fragment,
  PureComponent,
} from "camunda-modeler-plugin-helpers/react";
import type {
  CamundaEvent,
  CamundaPluginProps,
  FlowStudioState,
} from "../types";
import * as client from "./client.js";

const defaultState: FlowStudioState = {
  enabled: false,
  configPath: "/Users/reinundheim/Documents/flow-studio/config.json",
  configOpen: false,
  config: null,
  error: null,
};

export class FlowStudioPlugin extends PureComponent<
  CamundaPluginProps,
  FlowStudioState
> {
  constructor(props: CamundaPluginProps) {
    super(props);

    this.state = defaultState;

    this.handleConfigClosed = this.handleConfigClosed.bind(this);
    this.handleCallActivity = this.handleCallActivity.bind(this);
    this.loadConfig = this.loadConfig.bind(this);
    this.testOpenFile = this.testOpenFile.bind(this);
  }

  componentDidMount() {
    /**
     * The component props include everything the Application offers plugins,
     * which includes:
     * - config: save and retrieve information to the local configuration
     * - subscribe: hook into application events, like <tab.saved>, <app.activeTabChanged> ...
     * - triggerAction: execute editor actions, like <save>, <open-diagram> ...
     * - log: log information into the Log panel
     * - displayNotification: show notifications inside the application
     */
    const { config } = this.props;

    this.props.config.backend.on(
      "plugin:flow-studio:open",
      (_: any, options: any) => {
        client.start(options);
        this.loadConfig();

        this.setState({
          configOpen: true,
        });
      }
    );

    // Listen for call activity clicks
    this.props.subscribe("element.click", this.handleCallActivity);

    // retrieve plugin related information from the application configuration
    config
      .getForPlugin("flowStudio", "config")
      .then((config: any) => this.setState(config));
  }

  async loadConfig(): Promise<void> {
    try {
      const { configPath } = this.state;
      const result = await client.getConfig(configPath);
      this.setState({ config: result.config, error: null });
    } catch (error) {
      console.error("Error loading config:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.setState({ error: errorMessage, config: null });
    }
  }

  async handleCallActivity(event: CamundaEvent): Promise<void> {
    const { element } = event;

    // Check if this is a call activity
    if (element.type === "bpmn:CallActivity") {
      const calledElement = element.businessObject.calledElement;

      if (calledElement && this.state.config) {
        try {
          const result = await client.getBpmnFile(
            this.state.configPath,
            calledElement
          );

          // Open the BPMN file in a new tab
          // Try multiple possible action names
          try {
            this.props.triggerAction("create-tab", {
              type: "bpmn",
              name: calledElement,
              xml: result.bpmnContent,
            });
          } catch (e1) {
            try {
              this.props.triggerAction("open-diagram", {
                xml: result.bpmnContent,
                name: calledElement,
              });
            } catch (e2) {
              try {
                this.props.triggerAction("create-bpmn-diagram", {
                  xml: result.bpmnContent,
                  name: calledElement,
                });
              } catch (e3) {
                console.error(
                  "Failed to open BPMN file with all tried actions:",
                  { e1, e2, e3 }
                );
                this.props.displayNotification({
                  type: "error",
                  title: "Error opening BPMN file",
                  content: "Could not open BPMN file - no working action found",
                  duration: 5000,
                });
                return;
              }
            }
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          this.props.displayNotification({
            type: "error",
            title: "Error opening BPMN file",
            content: `Could not open BPMN file for ${calledElement}: ${errorMessage}`,
            duration: 5000,
          });
        }
      }
    }
  }

  async testOpenFile(bpmnKey: string): Promise<void> {
    if (!this.state.config) return;

    try {
      const result = await client.getBpmnFile(this.state.configPath, bpmnKey);

      // Try different action names to find what works
      console.log("Available actions:", Object.keys(this.props));
      console.log("Props:", this.props);
      console.log("Attempting to open BPMN file:", bpmnKey, result);

      // Try multiple possible action names
      const actionsToTry = [
        "newTab",
        "new-tab", 
        "createTab",
        "create.tab",
        "openFile",
        "open-file",
        "importXML",
        "import-xml",
        "new.bpmn-diagram",
        "bpmn.create",
        "diagram.new"
      ];

      let success = false;
      for (const action of actionsToTry) {
        try {
          this.props.triggerAction(action, {
            type: "bpmn",
            name: bpmnKey,
            xml: result.bpmnContent,
          });
          console.log(`Success with ${action}`);
          success = true;
          break;
        } catch (error) {
          console.log(`Failed with ${action}:`, error.message);
        }
      }

      if (!success) {
        console.error("Failed to open BPMN file with all tried actions");
        this.props.displayNotification({
          type: "error",
          title: "Error opening BPMN file", 
          content: "Could not open BPMN file - no working action found",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Error loading BPMN file:", error);
    }
  }

  handleConfigClosed(newConfig: Partial<FlowStudioState> | null): void {
    this.setState({ configOpen: false });

    if (newConfig) {
      // via <config> it is also possible to save data into the application configuration
      this.props.config
        .setForPlugin("flowStudio", "config", newConfig)
        .catch(console.error);

      this.setState(newConfig);
    }
  }

  render() {
    console.log("Flow Studio render - state:", this.state);

    // we can use fills to hook React components into certain places of the UI
    return createElement(
      Fragment,
      null,
      createElement(
        "div",
        {
          style: {
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "white",
            padding: "20px",
            border: "1px solid #ccc",
            borderRadius: "8px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            zIndex: 1000,
          },
        },
        createElement("h3", null, "Flow Studio Configuration"),
        createElement("p", null, `Config Path: ${this.state.configPath}`),
        this.state.error &&
          createElement(
            "p",
            { style: { color: "red" } },
            `Error: ${this.state.error}`
          ),
        this.state.config &&
          createElement(
            "div",
            null,
            createElement("p", null, "Available BPMN Files:"),
            createElement(
              "ul",
              null,
              ...Object.keys(this.state.config.bpmnFiles).map((key) =>
                createElement(
                  "li",
                  { key },
                  `${key}: ${this.state.config!.bpmnFiles[key]}`
                )
              )
            )
          ),
        createElement(
          "button",
          { onClick: () => this.handleConfigClosed(null) },
          "Close"
        ),
        createElement(
          "button",
          { onClick: this.loadConfig, style: { marginLeft: "10px" } },
          "Reload"
        ),
        createElement(
          "button",
          {
            onClick: () => this.testOpenFile("process-order"),
            style: { marginLeft: "10px" },
          },
          "Test Open Order Process"
        )
      )
    );
  }
}
