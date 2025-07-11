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
    console.log("🎯 FlowStudioPlugin constructor called with props:", props);
    super(props);

    this.state = defaultState;

    this.handleConfigClosed = this.handleConfigClosed.bind(this);
    this.handleCallActivity = this.handleCallActivity.bind(this);
    this.loadConfig = this.loadConfig.bind(this);
    this.saveSettings = this.saveSettings.bind(this);
    this.setupElementEventHandlers = this.setupElementEventHandlers.bind(this);
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

    // Subscribe to tab changes to set up event handlers when a tab becomes active
    this.props.subscribe("bpmn.modeler.created", (event: any) => {
      this.setupElementEventHandlers(event.modeler);
    });

    // retrieve plugin related information from the application configuration
    config
      .getForPlugin("flowStudio", "config")
      .then((config: any) => this.setState(config));
  }

  setupElementEventHandlers(modeler: any): void {
    try {
      const elementRegistry = modeler.get("elementRegistry");
      const eventBus = modeler.get("eventBus");

      if (!elementRegistry || !eventBus) {
        console.log("Missing required services, skipping event handler setup");
        return;
      }

      eventBus.once("import.done", () => {
        console.log("Import done, retrying element setup...");
        setTimeout(() => this.setupElementEventHandlers(modeler), 100);
      });

      // Use eventBus to listen for all double-click events
      eventBus.on("element.dblclick", (event: any) => {
        const { element } = event;
        console.log(
          `EventBus double-click on element: ${element.id}, type: ${element.type}`
        );

        if (element.type === "bpmn:CallActivity") {
          console.log(`Double-click on call activity: ${element.id}`);
          this.handleCallActivity({ element });
        }
      });
    } catch (error) {
      console.error("Error setting up element event handlers:", error);
    }
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
