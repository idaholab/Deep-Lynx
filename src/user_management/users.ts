import {pipe} from "fp-ts/lib/pipeable";
import {fold} from "fp-ts/lib/Either";
import {NewUserPayloadT, newUserPayloadT, UserT} from "../types/user_management/userT";
import Result, {ErrorUnauthorized} from "../result";
import UserStorage from "../data_storage/user_management/user_storage";
import Authorization from "./authorization/authorization";
import {assignRolePayloadT, AssignRolePayloadT} from "../types/user_management/assignRolePayloadT";
import {onDecodeError} from "../utilities";
import NodeRSA from "node-rsa";
import fs from "fs";
import Config from "../config";
import Logger from "./../logger";
import bcrypt from "bcrypt"
import KeyPairStorage from "../data_storage/user_management/keypair_storage";

export async function CreateDefaultSuperUser(): Promise<Result<UserT>>{
    // if the super user exists, don't recreate
    const user = await UserStorage.Instance.RetrieveByEmail(Config.superuser_email);
    if(!user.isError || user.value) {
        return new Promise(resolve => resolve(Result.Success(user.value)))
    }

    Logger.info("creating default superuser")
    const pass = await bcrypt.hash(Config.superuser_password, 14)

    const newUser = await UserStorage.Instance.Create("system", {
     id: "superuser",
     admin: true,
     display_name: "Superuser",
     identity_provider: "username_password",
     email: Config.superuser_email,
     password: pass,
   } as UserT)

    if(newUser.isError) {
        return new Promise(resolve => resolve(Result.Pass(newUser)))
    }

    // create a keypair for the new user and print to console, this only happens
    // once per super user creation. Make sure you write it down!
    const keyPair = await KeyPairStorage.Instance.Create(newUser.value.id!)
    if(keyPair.isError) {
        return new Promise(resolve => resolve(Result.Pass(keyPair)))
    }

    Logger.info("This is the API Key/Secret pair for the newly created Super User. This is the only time you will be given this pair, please write it down.")
    Logger.info(`API Key: ${keyPair.value.key}`)
    Logger.info(`API Secret: ${keyPair.value.secret_raw}`)

    return new Promise(resolve => resolve(Result.Success(newUser.value)))
}

export async function CreateNewUser(user: UserT, payload: any ): Promise<Result<UserT>> {
    const authed = await Authorization.AuthUser(user, 'write', 'users');
    if(!authed) return Promise.resolve(Result.Error(ErrorUnauthorized));

    return new Promise(resolve => {
        const onSuccess = (res: (r:any) => void): (u: NewUserPayloadT) => void => {
            return async (up: NewUserPayloadT) => {
                // encrypt the password before passing this on to the create function
                // we can pass this directly into the create function afterwards because
                // the NewUserPayloadT type is a subset of the UserT type
                const key = new NodeRSA(fs.readFileSync(Config.encryption_key_path));

                bcrypt.hash(up.password, 14)
                    .then(hashed => {
                        up.password = hashed
                        resolve(UserStorage.Instance.Create(user.id!, up))
                    })
                    .catch(e => resolve(Result.Failure(e)))
            }
        }

        pipe(newUserPayloadT.decode(payload), fold(onDecodeError(resolve), onSuccess(resolve)))
    })
}

export async function RetrieveUser(user: UserT | any, userID: string): Promise<Result<UserT>> {
   const authed = await Authorization.AuthUser(user, 'read', 'users');
   if(!authed) return Promise.resolve(Result.Error(ErrorUnauthorized));

   return UserStorage.Instance.Retrieve(userID)
}

export async function RetrieveUserRoles(userID: string, containerID: string): Promise<Result<string[]>> {
    const roles = await Authorization.RolesForUser(userID, containerID);

    return new Promise(resolve => resolve(Result.Success(roles)))
}

// Resource permissions returns an array of strings that designate what actions
// a user can take on which resources in which domain(container). The return follows this format
// containerID, resource, action
export async function RetrieveResourcePermissions(userID: string): Promise<string[][]> {
    return new Promise(resolve => resolve(Authorization.PermissionsForUser(userID)))
}

export async function AssignUserRole(user: UserT | any, payload: AssignRolePayloadT | any): Promise<Result<boolean>> {
   const authed = await Authorization.AuthUser(user, 'write', 'users');
   if(!authed) return Promise.resolve(Result.Error(ErrorUnauthorized));

   return new Promise(resolve => {
      const onSuccess = (res: (r:any) => void): (p: AssignRolePayloadT)=> void => {
         return async (pl: AssignRolePayloadT) => {

            resolve(Result.Success(await Authorization.AssignRole(pl.user_id, pl.role_name, pl.container_id)))
         }
      };

      pipe(assignRolePayloadT.decode(payload), fold(onDecodeError(resolve), onSuccess(resolve)))
   })
}

export async function RemoveAllUserRoles(user: UserT | any, domain:string): Promise<Result<boolean>> {
   const authed = await Authorization.AuthUser(user, 'write', 'users');
   if(!authed) return Promise.resolve(Result.Error(ErrorUnauthorized));

   const deleted = await Authorization.DeleteAllRoles((user as UserT).id!, domain);

   return Promise.resolve(Result.Success(deleted))
}
