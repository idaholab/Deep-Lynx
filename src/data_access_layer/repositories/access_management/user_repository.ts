import RepositoryInterface from "../repository";
import User, {
    AssignUserRolePayload,
    ContainerUserInvite,
    KeyPair,
    ResetUserPasswordPayload
} from "../../../access_management/user";
import Result, {ErrorUnauthorized} from "../../../result";
import bcrypt from "bcrypt";
import UserMapper from "../../mappers/access_management/user_mapper";
import Logger from "../../../services/logger";
import {Emailer} from "../../../services/email/email";
import {ResetPasswordEmailTemplate} from "../../../services/email/templates/reset_password";
import Authorization from "../../../access_management/authorization/authorization";
import ContainerUserInviteMapper from "../../mappers/access_management/container_user_invite_mapper";
import {ContainerInviteEmailTemplate} from "../../../services/email/templates/container_invite";
import ContainerRepository from "../data_warehouse/ontology/container_respository";
import Config from "../../../services/config";
import KeyPairMapper from "../../mappers/access_management/keypair_mapper";
import uuid from "uuid";
import {plainToClass} from "class-transformer";
import {PoolClient} from "pg";
import {ValidateEmailTemplate} from "../../../services/email/templates/validate_email";

const UIDGenerator = require('uid-generator');
const uidgen = new UIDGenerator();

export default class UserRepository implements RepositoryInterface<User> {
    #mapper: UserMapper = UserMapper.Instance
    #keyMapper: KeyPairMapper = KeyPairMapper.Instance

    delete(u: User): Promise<Result<boolean>> {
        if(u.id){
            return this.#mapper.PermanentlyDelete(u.id)
        }

        return Promise.resolve(Result.Failure(`user must have id`))
    }

    archive(u: User, toArchive: User): Promise<Result<boolean>> {
        if(toArchive.id){
            return this.#mapper.Archive(u.id!, toArchive.id)
        }

        return Promise.resolve(Result.Failure(`user must have id`))
    }

    async findByID(id: string, requestingUser?: User): Promise<Result<User>> {
        if(requestingUser) {
            const authed = await Authorization.AuthUser(requestingUser, 'read', 'users');
            if(!authed) return Promise.resolve(Result.Error(ErrorUnauthorized));
        }

        const r = await this.#mapper.Retrieve(id)
        if(r.isError) return Promise.resolve(Result.Failure(`unable to find user`, 404))

        const keysLoaded = await this.loadKeys(r.value)
        if(keysLoaded.isError) Logger.error(`unable to load key pairs for user ${r.value.id}: ${keysLoaded.error?.error}`)

        return Promise.resolve(Result.Success(r.value))
    }

    async save(user: User, u: User, saveKeys: boolean = true): Promise<Result<boolean>> {
        const errors = await u.validationErrors()
        if(errors) {
            return Promise.resolve(Result.Failure(`user does not pass validation ${errors.join(",")}`))
        }

        // we run the save in a transaction so that on failure we don't get
        // stuck figuring out what user's keys didn't update
        const transaction = await this.#mapper.startTransaction()
        if(transaction.isError) return Promise.resolve(Result.Failure(`unable to initiate db transaction`))

        try {
            u.password = await bcrypt.hash(u.password, 10)
            u.email_validation_token = await uidgen.generate()
        } catch(error) {
            await this.#mapper.rollbackTransaction(transaction.value)
            return Promise.resolve(Result.Failure(`unable to encrypt password ${error}`))
        }

        const result = await this.#mapper.Create(user.id!, u)
        if(result.isError) {
            await this.#mapper.rollbackTransaction(transaction.value)
            return Promise.resolve(Result.Pass(result))
        }

        Object.assign(u, result.value)

        if(saveKeys) {
            const keys = await this.saveKeys(u, transaction.value)
            if(keys.isError) {
                await this.#mapper.rollbackTransaction(transaction.value)
                return Promise.resolve(Result.Failure(`unable to save user's keypairs ${keys.error?.error}`))
            }
        }

        const committed = await this.#mapper.completeTransaction(transaction.value)
        if(committed.isError) {
            await this.#mapper.rollbackTransaction(transaction.value)
            return Promise.resolve(Result.Failure(`unable to commit changes to database ${committed.error}`))
        }

        // we send the email after the transaction has completed, as we won't actually be failing on email failure
        if(Config.email_validation_enforced) {
            Emailer.Instance.send(u.email,
                'Validate Deep Lynx Email Address',
                ValidateEmailTemplate(u.id!,u.email_validation_token!))
                .then(result => {
                    if(result.isError) Logger.error(`unable to send email verification email ${result.error?.error}`)
                })
        }

        return Promise.resolve(Result.Success(true))
    }

    private async saveKeys(u: User, transaction?: PoolClient): Promise<Result<boolean>> {
        // you have to hash the secret before saving
        // const hashedSecret = await bcrypt.hash(secret.toString('base64'), 10)
        let internalTransaction: boolean = false
        const keysCreate: KeyPair[] = []
        const returnKeys: KeyPair[] = []

        // we wrap this in a transaction so we don't get partially updated keys
        if(!transaction) {
            const newTransaction = await this.#mapper.startTransaction()
            if(newTransaction.isError) return Promise.resolve(Result.Failure('unable to initiate database transaction'))

            transaction = newTransaction.value
            internalTransaction = true // let the function know this is a generated transaction
        }

        if(u.removedKeys && u.removedKeys.length > 0) {
            const removedKeys = await this.#keyMapper.BulkDelete(u.removedKeys)
            if(removedKeys.isError) {
                if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
                return Promise.resolve(Result.Failure(`unable to delete key pairs ${removedKeys.error?.error}`))
            }
        }

        if(u.keys && u.keys.length <= 0) {
            if(internalTransaction) {
                const commit = await this.#mapper.completeTransaction(transaction)
                if(commit.isError) return Promise.resolve(Result.Pass(commit))
            }

            return Promise.resolve(Result.Success(true))
        }

        if(u.keys) for(const key of u.keys) {
            // set key's userID to equal its parent
            key.user_id = u.id!

            const errors = await key.validationErrors();
            if(errors) {
                if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
                return Promise.resolve(Result.Failure(`one or more user key pairs not pass validation ${errors.join(",")}`))
            }

            keysCreate.push(key)
        }

        if(keysCreate.length > 0) {
            const results = await this.#keyMapper.BulkCreate(keysCreate, transaction)
            if(results.isError) {
                if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
                return Promise.resolve(Result.Pass(results))
            }

            returnKeys.push(...results.value)
        }

        if(internalTransaction) {
            const commit = await this.#mapper.completeTransaction(transaction)
            if(commit.isError) return Promise.resolve(Result.Pass(commit))
        }

        u.replaceKeys(returnKeys)

        return Promise.resolve(Result.Success(true))
    }

    private async loadKeys(u: User): Promise<Result<boolean>> {
        const keys = await this.#keyMapper.KeysForUser(u.id!)
        if(keys.isError) return Promise.resolve(Result.Pass(keys))

        u.addKey(...keys.value)
        return Promise.resolve(Result.Success(true))
    }

    async createDefaultSuperUser(): Promise<Result<User>> {
        const user = await UserMapper.Instance.RetrieveByEmail(Config.superuser_email);
        if(!user.isError || user.value) {
            return new Promise(resolve => resolve(Result.Success(user.value)))
        }

        Logger.info("creating default superuser")
        const superUser = new User({
            id: uuid.v4(),
            identity_provider: "username_password",
            display_name: "Super User",
            email: Config.superuser_email,
            password: Config.superuser_password,
            active: true,
            admin: true
        })

        const created = await this.save(plainToClass(User, {id: "system"}), superUser)
        if(created.isError) {
            return new Promise(resolve => resolve(Result.Pass(created)))
        }

        // create a keypair for the new user and print to console, this only happens
        // once per super user creation. Make sure you write it down!
        const keyPair = await KeyPairMapper.Instance.Create(new KeyPair(superUser.id!))
        if(keyPair.isError) {
            return new Promise(resolve => resolve(Result.Pass(keyPair)))
        }

        Logger.info("This is the API Key/Secret pair for the newly created Super User. This is the only time you will be given this pair, please write it down.")
        Logger.info(`API Key: ${keyPair.value.key}`)
        Logger.info(`API Secret: ${keyPair.value.secret_raw}`)

        return new Promise(resolve => resolve(Result.Success(superUser)))
    }

    async resetPassword(payload: ResetUserPasswordPayload): Promise<Result<boolean>> {
        const errors = await payload.validationErrors()
        if (errors) return Promise.resolve(Result.Failure(`reset user password payload fails validation ${errors.join(",")}`))

        return new Promise(resolve => {
            bcrypt.hash(payload.new_password, 14)
                .then(hashed => {
                    resolve(UserMapper.Instance.ResetPassword(payload.token!, payload.email!, hashed))
                })
        })
    }

    async initiateResetPassword(email: string): Promise<Result<boolean>> {
        const user = await UserMapper.Instance.RetrieveByEmail(email)
        if (user.isError) return new Promise(resolve => resolve(Result.Success(true)))

        const reset = await UserMapper.Instance.SetResetToken(user.value.id!)
        if (reset.isError) {
            Logger.error(`unable to set reset password token for user ${reset.error}`)
            return new Promise(resolve => resolve(Result.Pass(reset)))
        }

        // re-pull from storage to get the new reset token
        const resetUser = await UserMapper.Instance.RetrieveByEmail(email)
        if (resetUser.isError) {
            Logger.error(`unable to retrieve user ${resetUser.error}`)
            return new Promise(resolve => resolve(Result.Success(true)))
        }

        const sentEmail = await Emailer.Instance.send(resetUser.value.email, 'Reset Password Deep Lynx', ResetPasswordEmailTemplate(resetUser.value.email, resetUser.value.reset_token!));
        if (sentEmail.isError) {
            Logger.error(`unable to send password reset email ${sentEmail.error}`)
            return new Promise(resolve => resolve(Result.Success(true)))
        }

        return new Promise(resolve => resolve(Result.Success(true)))
    }

    async assignRole(user: User, payload: AssignUserRolePayload): Promise<Result<boolean>> {
        const errors = await payload.validationErrors()
        if (errors) return Promise.resolve(Result.Failure(`assign user role payload fails validation ${errors.join(",")}`))

        const authed = await Authorization.AuthUser(user, 'write', 'users');
        if(!authed) return Promise.resolve(Result.Error(ErrorUnauthorized));

        return Promise.resolve(Result.Success(await Authorization.AssignRole(payload.user_id!, payload.role_name!, payload.container_id!)))
    }

    async removeAllRoles(user: User, domain:string): Promise<Result<boolean>> {
        const authed = await Authorization.AuthUser(user, 'write', 'users');
        if(!authed) return Promise.resolve(Result.Error(ErrorUnauthorized));

        const deleted = await Authorization.DeleteAllRoles(user.id!, domain);

        return Promise.resolve(Result.Success(deleted))
    }

    async rolesInContainer(user: User, containerID: string): Promise<Result<string[]>> {
        const roles = await Authorization.RolesForUser(user.id!, containerID);

        return new Promise(resolve => resolve(Result.Success(roles)))
    }

    async retrievePermissions(user: User): Promise<Result<boolean>> {
        user.permissions = await Authorization.PermissionsForUser(user.id!)

        return Promise.resolve(Result.Success(true))
    }

    async inviteUserToContainer(user: User, invite: ContainerUserInvite): Promise<Result<boolean>> {
        const containerRepo = new ContainerRepository()
        // set the token first, if it's not already created or empty string
        if(invite.token === "") invite.token = await uidgen.generate()

        // set the originUser if it's not set already
        if(!invite.origin_user) invite.origin_user = user.id!

        const errors = await invite.validationErrors()
        if(errors) return Promise.resolve(Result.Failure(`the invite does not pass validation ${errors.join(',')}`))

        const created = await ContainerUserInviteMapper.Instance.Create(invite)
        if(created.isError) return new Promise(resolve => resolve(Result.Pass(created)))

        const container = await containerRepo.findByID(created.value.container!.id!)

        return Emailer.Instance.send(created.value.email,
            'Invitation to Deep Lynx Container',
            ContainerInviteEmailTemplate(created.value.token!, (container.isError) ? created.value.container!.id! : container.value.name )
        )
    }

    async acceptContainerInvite(user: User, inviteToken: string): Promise<Result<boolean>> {
        const invite = await ContainerUserInviteMapper.Instance.RetrieveByTokenAndEmail(inviteToken, user.email)

        if(invite.isError) {
            Logger.error(`unable to retrieve user container invite ${invite.error}`)
            return new Promise(resolve => resolve(Result.Pass(invite)))
        }

        // we default the user to the lowest role in the container they're accepting an invite to
        // we do this to avoid bad actors abusing invites to gain admin access to a container
        // we also enforce the match of email to the original invite so that someone can't
        // hijack another's email invitation
        const assigned = await Authorization.AssignRole(user.id!, 'user', invite.value.container!.id!)

        if(!assigned) {
            Logger.error(`unable to assign user role`)
            return new Promise(resolve => resolve(Result.Failure('unable to assign user role ')))
        }

        return ContainerUserInviteMapper.Instance.MarkAccepted(inviteToken, user.email)
    }

    async usersForContainer(containerID: string): Promise<Result<User[]>> {
        const e = await Authorization.enforcer()

        // using the casbin filtered grouping function, fetch all permission sets for
        // container. Those permissions sets will contain all users associated with that container.
        // grouping policies follow the pattern of user id, role, domain id. In this
        // case we are fetching all grouping policies(permission sets) with a given
        // domain(container)
        const permissionSets = await e.getFilteredGroupingPolicy(2, containerID)

        const userIDs: string[] = [];

        permissionSets.map(set => {
            if(set[0]) userIDs.push(set[0])
        })

        return UserMapper.Instance.ListFromIDs(userIDs)
    }
}
