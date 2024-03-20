/* tslint:disable:variable-name */
// Config is a singleton class
export default class Config {
    private static instance: Config;

    get rootURL(): string {
        return 'http://localhost:8090';
    }

    get authMethod(): string {
        return 'token';
    }

    get username(): string {
        return 'username';
    }

    get password(): string {
        return 'password';
    }

    get deepLynxAppID(): string {
        return 'root';
    }

    get deepLynxApiUri(): string {
        return 'http://localhost:8090';
    }

    get deepLynxApiAuth(): string | undefined {
        return 'token';
    }

    public static Instance(): Config {
        if (!Config.instance) {
            Config.instance = new Config();
        }

        return Config.instance;
    }
}
