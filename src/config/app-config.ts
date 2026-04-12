import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Asset Project",
  version: packageJson.version,
  copyright: `© ${currentYear}, Asset Project.`,
  meta: {
    title: "Asset Project",
    description:
      "Asset Project is a web app for managing subscriptions, protected asset access, and Chrome extension sessions across member and admin flows.",
  },
};
