/* tslint:disable:variable-name */
// Config is a singleton class
export class Config {
    private static instance: Config;

    get appUrl(): string {
        return process.env.VUE_APP_APP_URL
    }

    get deepLynxAppID(): string {
        return process.env.VUE_APP_DEEP_LYNX_APP_ID;
    }

    get deepLynxApiUri(): string {
        return process.env.VUE_APP_DEEP_LYNX_API_URL;
    }

    get deepLynxApiAuth(): string | undefined {
        return process.env.VUE_APP_DEEP_LYNX_API_AUTH_METHOD || "token"
    }

    get deepLynxApiAuthBasicUser(): string | undefined {
       return process.env.VUE_APP_DEEP_LYNX_API_AUTH_BASIC_USER
    }

    get deepLynxApiAuthBasicPass(): string | undefined {
        return process.env.VUE_APP_DEEP_LYNX_API_AUTH_BASIC_PASS
    }

    public static Instance(): Config {
        if (!Config.instance) {
            Config.instance = new Config();
        }

        return Config.instance;
    }
}

export default Config.Instance();
