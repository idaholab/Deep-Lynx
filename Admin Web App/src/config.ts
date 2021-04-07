/* tslint:disable:variable-name */
// Config is a singleton class
export class Config {
    private static instance: Config;

    private readonly _deep_lynx_api_uri: string;
    private readonly _deep_lynx_app_id: string;
    private readonly _deep_lynx_api_auth_method?: string
    private readonly _deep_lynx_api_auth_basic_user?: string
    private readonly _deep_lynx_api_auth_basic_pass?: string

    private readonly _app_url: string


    private constructor() {
        // Either assign a sane default if the env var is missing, or create your
        // own checks on process.env. There is most likely a more elegant way but
        // I like including sane defaults in the app itself vs. an env-sample file

        this._deep_lynx_api_uri = process.env.VUE_APP_DEEP_LYNX_API_URI || "http://localhost:8090"
        this._deep_lynx_app_id = process.env.VUE_APP_DEEP_LYNX_APP_ID
        this._deep_lynx_api_auth_method = process.env.VUE_APP_DEEP_LYNX_API_AUTH_METHOD || "token"
        this._deep_lynx_api_auth_basic_user = process.env.VUE_APP_DEEP_LYNX_API_AUTH_BASIC_USER
        this._deep_lynx_api_auth_basic_pass = process.env.VUE_APP_DEEP_LYNX_API_AUTH_BASIC_PASS

        this._app_url = process.env.VUE_APP_APP_URL || "http://localhost:8080"
    }

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
