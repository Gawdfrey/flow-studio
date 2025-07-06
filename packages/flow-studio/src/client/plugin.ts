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
    this.saveSettings = this.saveSettings.bind(this);
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

    this.props.subscribe("element.dblclick", this.handleCallActivity);

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
          await client.openBpmnFile(this.state.configPath, calledElement);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          this.props.displayNotification({
            type: "error",
            title: "Error opening process",
            content: `Could not open process "${calledElement}": ${errorMessage}`,
            duration: 5000,
          });
        }
      } else if (element.type === "bpmn:CallActivity" && !calledElement) {
        // Show helpful message for call activities without calledElement
        this.props.displayNotification({
          type: "warning",
          title: "Call Activity Configuration",
          content:
            "This call activity doesn't have a 'Called Element' configured",
          duration: 4000,
        });
      }
    }
  }

  async testOpenFile(bpmnKey: string): Promise<void> {
    if (!this.state.config) return;

    try {
      const result = await client.openBpmnFile(this.state.configPath, bpmnKey);

      console.log("Opening BPMN file:", bpmnKey, result);

      this.props.displayNotification({
        type: "success",
        title: "Opening BPMN file",
        content: result.message,
        duration: 3000,
      });
    } catch (error) {
      console.error("Error opening BPMN file:", error);
      this.props.displayNotification({
        type: "error",
        title: "Error opening BPMN file",
        content: "Could not open BPMN file",
        duration: 5000,
      });
    }
  }

  async saveSettings(): Promise<void> {
    try {
      await this.props.config.setForPlugin("flowStudio", "config", {
        configPath: this.state.configPath,
      });

      this.props.displayNotification({
        type: "success",
        title: "Settings Saved",
        content: "Config path has been saved successfully",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      this.props.displayNotification({
        type: "error",
        title: "Error saving settings",
        content: "Could not save settings",
        duration: 5000,
      });
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
      this.state.configOpen &&
        createElement(
          "div",
          {
            className: "flow-studio-modal",
          },
          createElement("h3", null, "Flow Studio Configuration"),
          createElement(
            "div",
            null,
            createElement("label", null, "Config File Path:"),
            createElement("input", {
              type: "text",
              value: this.state.configPath,
              onChange: (e: any) =>
                this.setState({ configPath: e.target.value }),
              style: {
                width: "100%",
                padding: "8px",
                marginTop: "5px",
                marginBottom: "10px",
                border: "1px solid #ccc",
                borderRadius: "4px",
              },
              placeholder: "Enter path to config.json file",
            })
          ),
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
              createElement("p", null, "Available Processes:"),
              this.state.config.processes &&
                createElement(
                  "ul",
                  null,
                  ...Object.keys(this.state.config.processes).map((key) =>
                    createElement(
                      "li",
                      { key },
                      `${key}: ${this.state.config!.processes![key]}`
                    )
                  )
                ),
              !this.state.config.processes &&
                createElement(
                  "p",
                  { style: { color: "orange" } },
                  "No processes found in config file"
                )
            ),
          createElement(
            "div",
            {
              style: {
                marginTop: "20px",
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              },
            },
            createElement(
              "button",
              { onClick: this.loadConfig },
              "Load Config"
            ),
            createElement(
              "button",
              { onClick: () => this.saveSettings() },
              "Save Settings"
            ),
            this.state.config?.processes &&
              createElement(
                "button",
                {
                  onClick: () => {
                    const firstProcess = Object.keys(
                      this.state.config!.processes!
                    )[0];
                    this.testOpenFile(firstProcess);
                  },
                },
                "Test Open First Process"
              ),
            createElement(
              "button",
              { onClick: () => this.handleConfigClosed(null) },
              "Close"
            )
          )
        )
    );
  }
}
