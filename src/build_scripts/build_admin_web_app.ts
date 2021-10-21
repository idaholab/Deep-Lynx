/*
This script is intended to be called when a user runs npm run build or npm run start. It's purpose is to build, or fetch
an initial oauth application that isn't associated with any user. This OAuth application is meant to represent the Admin
Web App. Once it has built the application record it will then output that id as a string.
 */
import PostgresAdapter from '../data_access_layer/mappers/db_adapters/postgres/postgres';
import OAuthRepository from '../data_access_layer/repositories/access_management/oauth_repository';
import Config from '../services/config';
import {OAuthApplication} from '../domain_objects/access_management/oauth/oauth';
import {SuperUser} from '../domain_objects/access_management/user';
import ErrnoException = NodeJS.ErrnoException;
const exec = require('child_process').exec;

const postgresAdapter = PostgresAdapter.Instance;

void postgresAdapter.init().then(() => {
    const repo = new OAuthRepository();

    repo.where()
        .ownerID('is null')
        .and()
        .name('eq', Config.admin_web_app_name)
        .list()
        .then((results) => {
            if (results.isError) {
                console.log(`unable to list oauth applications ${results.error?.error}`);
                return;
            }

            // if we have an oauth app that matches that name, output it's id
            if (results.value.length > 0) {
                // output must be setting an environment variable
                process.env.VUE_APP_DEEP_LYNX_APP_ID = results.value[0].client_id;
                console.log('building Admin Web App....');
                buildAdminWebApp();
                return;
            }

            // if not, we have to create a new one - no user must be set
            const app = new OAuthApplication({
                name: Config.admin_web_app_name,
                description: 'This is a web interfaced packaged with DeepLynx',
            });

            repo.save(app, SuperUser)
                .then((result) => {
                    if (result.isError) {
                        console.log(`unable to create oauth application ${result.error?.error}`);
                        return;
                    }
                    // output must be setting an environment variable
                    process.env.VUE_APP_DEEP_LYNX_APP_ID = app.client_id;
                    console.log('building Admin Web App....');
                    buildAdminWebApp();
                })
                .catch((e) => console.log(`unable to create oauth application ${e}`));
        })
        .catch((e) => console.log(`unable to list or create oauth application ${e}`));
});

function buildAdminWebApp() {
    exec(
        'cd ./AdminWebApp && npm install && npm install --global --unsafe-perm @vue/cli && npm run build -- --dest ./../dist/http_server/web_gui',
        function (error: ErrnoException, stdout: string, stderr: string) {
            console.log(stdout);
            console.log(stderr);
            if (error !== null) {
                console.log(error);
            }
        },
    );
}
