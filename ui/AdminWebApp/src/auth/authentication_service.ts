import jwt_decode from "jwt-decode";
import { UserT } from "@/auth/types";
import Config from "../config";

import _Vue from "vue";
const axios = require("axios").default;
import buildURL from "build-url";

export class Authentication {
  IsLoggedIn(): boolean {
    const user = localStorage.getItem("user");

    if (user) {
      return true;
    }

    return false;
  }
  async Logout() {
    try {
      localStorage.removeItem("user");
      await axios.get("/logout");
    } catch (error) {
      console.error("error:", error);
    }
  }

  IsAdmin(): boolean {
    const user = localStorage.getItem("user");

    if (user) {
      const u: UserT = JSON.parse(user);

      return u.admin;
    }

    return false;
  }

  CurrentUser(): UserT | null {
    const user = localStorage.getItem("user");

    if (user) {
      const u: UserT = JSON.parse(user);

      return u;
    }
    return null;
  }

  // Verifies that a user has the proper permissions for performing a given action on
  // a resource. Keep in mind that this DOES NOT dictate what the user is authorized to do
  // on the DeepLynx backend. This is purely for display control purposes and should always
  // be taken with a grain of salt because as of July 2020 we do not have an auto-renew on
  // JWTs in place
  Auth(resource: string, action: string, containerID: string): boolean {
    const user = localStorage.getItem("user");

    if (!user) return false;

    const u: UserT = JSON.parse(user);
    if (u.admin) return true;

    // permissions are stored as an array of strings in the format of
    // domain(containerID), resource, action. We assume that if the initial array
    // has a value the subsequent value contains all three above specified values
    for (const set of u.permissions) {
      if (set[0] === containerID && set[1] === resource && set[2] === action) {
        return true;
      }
    }

    return false;
  }
}

// AuthPlugin exports a large majority of functions as prototype functionality
// on the Vue object. Saves us time from having to import the auth object and
// construct it each time we want to use it. Also allows us to set application
// level configuration later if we need it.
export default function AuthPlugin(Vue: typeof _Vue): void {
  Vue.prototype.$auth = new Authentication();
}

export async function IsAuthed() {
  try {
    const res = await fetch("/check-oidc");
    const isAuth = await res.json();
    return isAuth.authenticated === true;
  } catch (error) {
    console.error(
      "There has been a problem with your check auth operation:",
      error
    );
    return false; // Return false in case of an error
  }
}
export function IsLoggedIn(): boolean {
  const user = localStorage.getItem("user");

  if (user) {
    return true;
  }

  return false;
}

// used to refresh user permissions after login
export async function RefreshPermissions(): Promise<boolean> {
  // axios request configuration
  const config = {
    headers: {
      "Access-Control-Allow-Origin": "*",
      Authorization: "",
    },
    auth: {},
  };

  if (Config.deepLynxApiAuth === "basic") {
    config.auth = {
      username: Config.deepLynxApiAuthBasicUser,
      password: Config.deepLynxApiAuthBasicPass,
    };
  }

  // user for permissions call
  const user = localStorage.getItem("user");

  // get user permissions
  const resp = await axios.get(
    buildURL(`${Config.deepLynxApiUri}/users/permissions`),
    config
  );

  if (resp.status < 200 || resp.status > 299 || resp.data.isError) {
    return new Promise((resolve) => resolve(false));
  }

  localStorage.setItem("user", JSON.stringify(resp.data));

  return new Promise((resolve) => resolve(true));
}
