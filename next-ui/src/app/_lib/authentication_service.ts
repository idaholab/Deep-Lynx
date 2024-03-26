import jwt_decode from 'jwt-decode';
import {configInstance} from './config';
import buildURL from 'build-url';
import {UserT} from './types';
import {config} from 'process';
const axios = require('axios').default;
import Cookies from 'js-cookie';

export default class Authentication {
    IsAdmin(): boolean {
        const user = Cookies.get('user');
        if (user) {
            const userT: UserT = JSON.parse(user);
            return userT.admin;
        }
        return false;
    }

    CurrentUser(): UserT | null {
        const user = Cookies.get('user');
        if (user) {
            const userT: UserT = JSON.parse(user);
            return userT;
        }
        return null;
    }

    Auth(resource: string, action: string, containerID: string): boolean {
        const user = Cookies.get('user');

        if (user) {
            const userT: UserT = JSON.parse(user);
            // assume authorization if admin
            if (userT.admin) return true;
            // else check the permissions to see if any containerID, resource and action match
            for (const permSet of userT.permissions) {
                if (permSet[0] === containerID && permSet[1] === resource && permSet[2] === action) {
                    return true;
                }
            }
        }
        return false;
    }

    async LoginFromToken(token: string, state: string): Promise<boolean> {
        const storedState = Cookies.get('state');

        if (state !== storedState) return false;

        // exchange temp token for full access token from service
        const resp = await axios.post(
            buildURL(`${configInstance.rootURL}/oauth/exchange`),
            {
                grant_type: 'authorization_code',
                code: token,
                redirect_uri: `${configInstance.apiURI}`,
                client_id: configInstance.deepLynxAppID,
                code_verifier: Cookies.get('code_challenge'),
            },
            {headers: {'Access-Controle-Allow-Origin': '*'}},
        );

        if (resp.status < 200 || resp.status > 299 || resp.data.isError) {
            return new Promise((resolve) => resolve(false));
        }

        const decodedToken = jwt_decode(resp.data.access_token);

        // store user
        Cookies.set('user', JSON.stringify(decodedToken));
        Cookies.set('user.token', resp.data.access_token);
        return new Promise((resolve) => resolve(true));
    }

    RetrieveJWT(): string {
        const jwt = Cookies.get('user.token');
        return jwt ? jwt : '';
    }

    IsLoggedIn(): boolean {
        const user = Cookies.get('user');

        if (user) {
            const userT: UserT = JSON.parse(user);
            // check to see if login is expired
            if (Date.now() >= userT.exp * 1000) {
                this.Logout();
                return false;
            }
            return true;
        }
        return false;
    }

    Logout() {
        Cookies.remove('user');
        Cookies.remove('user.token');
    }

    // retrieve user perms after login
    async RefreshPermissions(): Promise<boolean> {
        // axios request config
        const axiosConfig = {
            headers: {
                'Access-Control-Allow-Origin': '*',
                Authorization: '',
            },
            auth: {},
        };

        axiosConfig.headers.Authorization = `Bearer ${this.RetrieveJWT()}`;
        // @ts-ignore
        delete config.auth;

        const user = Cookies.get('user');
        // get user permissions
        const resp = await axios.get(buildURL(`${configInstance.apiURI}/users/permissions`), axiosConfig);

        if (resp.status < 200 || resp.status > 299 || resp.data.isError) {
            return new Promise((resolve) => resolve(false));
        }

        if (user) {
            const userT: UserT = JSON.parse(user);
            userT.permissions = resp.data;
            Cookies.set('user', JSON.stringify(userT));
            Cookies.set('user.token', resp.data.access_token);
        }

        return new Promise((resolve) => resolve(true));
    }
}
