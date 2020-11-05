import {pipe} from "fp-ts/lib/pipeable";
import {fold} from "fp-ts/lib/Either";
import {
    NewUserPayloadT,
    newUserPayloadT,
    resetPasswordPayload,
    ResetPasswordPayloadT,
    UserT
} from "../types/user_management/userT";
import Result, {ErrorUnauthorized} from "../result";
import UserStorage from "../data_storage/user_management/user_storage";
import Authorization from "./authorization/authorization";
import {assignRolePayloadT, AssignRolePayloadT} from "../types/user_management/assignRolePayloadT";
import {onDecodeError} from "../utilities";
import Config from "../config";
import Logger from "./../logger";
import bcrypt from "bcrypt"
import KeyPairStorage from "../data_storage/user_management/keypair_storage";
import {Emailer} from "../services/email/email";
import {ValidateEmailTemplate} from "../services/email/templates/validate_email";
import {ResetPasswordEmailTemplate} from "../services/email/templates/reset_password";
import {ContainerInviteEmailTemplate} from "../services/email/templates/container_invite";
import UserContainerInviteStorage from "../data_storage/user_management/user_container_invite_storage";
import ContainerStorage from "../data_storage/container_storage";

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

export async function CreateNewUser(payload: any ): Promise<Result<UserT>> {
    return new Promise(resolve => {
        const onSuccess = (res: (r:any) => void): (u: NewUserPayloadT) => void => {
            return async (up: NewUserPayloadT) => {
                // encrypt the password before passing this on to the create function
                // we can pass this directly into the create function afterwards because
                // the NewUserPayloadT type is a subset of the UserT type
                bcrypt.hash(up.password, 14)
                    .then(hashed => {
                        up.password = hashed
                        UserStorage.Instance.Create('user registration', up)
                            .then(user => {
                                if(user.isError) {
                                    resolve(new Promise(r=> r(Result.Pass(user))))
                                    return;
                                }

                                // you don't need to worry about checking to see if email is enabled
                                // the emailer itself will do that and send the email only if required
                                if(Config.email_validation_enforced) {
                                    Emailer.Instance.send(user.value.email,
                                        'Validate Deep Lynx Email Address',
                                        ValidateEmailTemplate(user.value.id!,user.value.email_validation_token!))
                                }

                                resolve(new Promise(r=> r(user)))
                            })
                    })
                    .catch(e => resolve(Result.Failure(e)))
            }
        }

        pipe(newUserPayloadT.decode(payload), fold(onDecodeError(resolve), onSuccess(resolve)))
    })
}

export async function InviteUserToContainer(originUser: UserT, containerID:string, payload: any): Promise<Result<boolean>> {
    const invite = await UserContainerInviteStorage.Instance.Create(originUser.id!, containerID, payload)

    if(invite.isError) return new Promise(resolve => resolve(Result.Pass(invite)))

    const container = await ContainerStorage.Instance.Retrieve(invite.value.container_id!)
    if(container.isError) return new Promise(resolve => resolve(Result.Pass(container)))

    return Emailer.Instance.send(invite.value.email,
        'Invitation to Deep Lynx Container',
        ContainerInviteEmailTemplate(invite.value.token!, container.value.name)
        )
}

// ResetPassword will always return 200 as long as the payload is of a valid shape
// and there are no database errors. This is done so that an outside user cannot use
// this endpoint to intuit usernames and tokens.
export async function ResetPassword(payload: any): Promise<Result<boolean>> {
    return new Promise(resolve => {
        const onSuccess = (res: (r: any) => void): (r: ResetPasswordPayloadT) => void => {
            return async (rp: ResetPasswordPayloadT) => {
                bcrypt.hash(rp.new_password, 14)
                    .then(hashed => {
                        resolve(UserStorage.Instance.ResetPassword(rp.token, rp.email, hashed))
                    })
            }
        }

        pipe(resetPasswordPayload.decode(payload), fold(onDecodeError(resolve), onSuccess(resolve)))
    })
}

// InitiateResetPassword will always return true, even if an error occurs. This is
// so that someone can't use this endpoint to intuit if an email has been registered
export async function InitiateResetPassword(email: string): Promise<Result<boolean>> {
    const user = await UserStorage.Instance.RetrieveByEmail(email)
    if(user.isError) return new Promise(resolve => resolve(Result.Success(true)))

    const reset = await UserStorage.Instance.SetResetToken(user.value.id!)
    if(reset.isError) {
        Logger.error(`unable to set reset password token for user ${reset.error}`)
        return new Promise(resolve => resolve(Result.Success(true)))
    }

    const resetUser = await UserStorage.Instance.RetrieveByEmail(email)
    if(resetUser.isError) {
        Logger.error(`unable to retrieve user ${resetUser.error}`)
        return new Promise(resolve => resolve(Result.Success(true)))
    }

    const sentEmail = await Emailer.Instance.send(resetUser.value.email, 'Reset Password Deep Lynx', ResetPasswordEmailTemplate(resetUser.value.email, resetUser.value.reset_token!));
    if(sentEmail.isError) {
        Logger.error(`unable to send password reset email ${sentEmail.error}`)
        return new Promise(resolve => resolve(Result.Success(true)))
    }

    return new Promise(resolve => resolve(Result.Success(true)))
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
