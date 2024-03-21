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

    get deepLynxAppID(): string {
        return 'root';
    }

    get apiURI(): string {
        return 'http://localhost:8090';
    }

    get deepLynxApiAuth(): string | undefined {
        return 'token';
    }

    get timeSeriesEnabled(): boolean {
        return true;
    }

    get p6RedirectAddress(): string {
        return 'http://localhost:8181'
    }

    public static Instance(): Config {
        if (!Config.instance) {
            Config.instance = new Config();
        }

        return Config.instance;
    }
}

export const configInstance = new Config();