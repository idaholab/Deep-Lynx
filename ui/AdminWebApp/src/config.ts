/* tslint:disable:variable-name */
// Config is a singleton class
export class Config {
  private static instance: Config;

  get appUrl(): string {
    if (process.env.VUE_APP_BUNDLED_BUILD === "true") {
      return `${location.origin}/#`;
    } else {
      return process.env.VUE_APP_APP_URL || "http://localhost:8090";
    }
  }

  get deepLynxAppID(): string {
    return process.env.VUE_APP_DEEP_LYNX_APP_ID || "root";
  }

  get deepLynxApiUri(): string {
    if (process.env.VUE_APP_BUNDLED_BUILD === "true") {
      return `${location.origin}`;
    } else {
      return process.env.VUE_APP_DEEP_LYNX_API_URL || "http://localhost:8090";
    }
  }

  get deepLynxApiAuth(): string | undefined {
    return process.env.VUE_APP_DEEP_LYNX_API_AUTH_METHOD || "token";
  }

  get deepLynxApiAuthBasicUser(): string | undefined {
    return process.env.VUE_APP_DEEP_LYNX_API_AUTH_BASIC_USER;
  }

  get deepLynxApiAuthBasicPass(): string | undefined {
    return process.env.VUE_APP_DEEP_LYNX_API_AUTH_BASIC_PASS;
  }

  get timeSeriesEnabled(): boolean {
    return process.env.VUE_APP_TIME_SERIES_ENABLED === "true";
  }

  get p6RedirectAddress(): string {
    return process.env.VUE_APP_P6_REDIRECT_ADDRESS || "http://localhost:8181";
  }

  get oidcEnabled(): boolean {
    return process.env.OIDC_ENABLED === "true";
  }

  public static Instance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }

    return Config.instance;
  }
}

export default Config.Instance();
