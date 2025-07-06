import { initServer } from "../server";

export default (electronApp: any) => [
  {
    label: "Flow Studio",
    accelerator: "CommandOrControl+1",
    enabled: () => true,
    action: () => {
      initServer(electronApp);
      electronApp.mainWindow.webContents.send("plugin:flow-studio:open", {
        port: 1337,
      });
    },
  },
];
