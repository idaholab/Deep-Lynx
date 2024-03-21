import jwt_decode from 'jwt-decode';
import { configInstance } from './config';
import buildURL from 'build-url';
import { UserT } from './types';
import { config } from 'process';
const axios = require('axios').default;

export default class Authentication {
    IsAdmin(): boolean {
        const user = window.localStorage.getItem('user');
        if (user) {
            const userT: UserT = JSON.parse(user);
            return userT.admin;
        }
        return false;
    }

    CurrentUser(): UserT | null {
        const user = window.localStorage.getItem('user');
        if (user) {
            const userT: UserT = JSON.parse(user);
            return userT;
        }
        return null;
    }

    Auth(resource: string, action: string, containerID: string): boolean {
        const user = window.localStorage.getItem('user');

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
        const storedState = window.localStorage.getItem('state');

        if (state !== storedState) return false;

        // exchange temp token for full access token from service
        const resp = await axios.post(
            buildURL(`${configInstance.rootURL}/oauth/exchange`),
            {
                grant_type: 'authorization_code',
                code: token,
                redirect_uri: `${configInstance.apiURI}`,
                client_id: configInstance.deepLynxAppID,
                code_verifier: window.localStorage.getItem('code_challenge'),
            },
            { headers: { 'Access-Controle-Allow-Origin': '*' } },
        );

        if (resp.status < 200 || resp.status > 299 || resp.data.isError) {
            return new Promise((resolve) => resolve(false));
        }

        const decodedToken = jwt_decode(resp.data.access_token);

        // store user
        localStorage.setItem('user', JSON.stringify(decodedToken));
        localStorage.setItem('user.token', resp.data.access_token);
        return new Promise((resolve) => resolve(true));
    }

    RetrieveJWT(): string {
        const jwt = localStorage.getItem('user.token');
        return jwt ? jwt : '';
    }

    IsLoggedIn(): boolean {
        const user = window.localStorage.getItem('user');

        if (user) {
            const userT: UserT = JSON.parse(user);
            // check to see if login is expired
            if (Date.now() >= userT.exp * 1000) {
                this.Logout()
                return false
            };
            return true;
        }
        return false;
    }

    Logout() {
        window.localStorage.removeItem('user');
        window.localStorage.removeItem('user.token');
    }

    // retrieve user perms after login
    async RefreshPermissions(): Promise<boolean> {
        // axios request config
        const axiosConfig = {
            headers: {
                'Access-Control-Allow-Origin': '*',
                Authorization: '',
            },
            auth: {}
        };

        axiosConfig.headers.Authorization = `Bearer ${this.RetrieveJWT()}`;
        // @ts-ignore
        delete config.auth;

        const user = localStorage.getItem('user');
        // get user permissions
        const resp = await axios.get(
            buildURL(`${configInstance.apiURI}/users/permissions`),
            axiosConfig
        );

        if (resp.status < 200 || resp.status > 299 || resp.data.isError) {
            return new Promise((resolve) => resolve(false));
        }

        if (user) {
            const userT: UserT = JSON.parse(user);
            userT.permissions = resp.data;
            window.localStorage.setItem('user', JSON.stringify(userT));
            window.localStorage.setItem('user.token', resp.data.access_token);
        }

        return new Promise((resolve) => resolve(true));
    }
}