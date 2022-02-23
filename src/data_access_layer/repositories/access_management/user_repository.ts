import RepositoryInterface, {QueryOptions, Repository} from '../repository';
import {AssignUserRolePayload, ContainerUserInvite, KeyPair, ResetUserPasswordPayload, User} from '../../../domain_objects/access_management/user';
import Result, {ErrorUnauthorized} from '../../../common_classes/result';
import bcrypt from 'bcryptjs';
import UserMapper from '../../mappers/access_management/user_mapper';
import Logger from '../../../services/logger';
import {Emailer} from '../../../services/email/email';
import {ResetPasswordEmailTemplate} from '../../../services/email/templates/reset_password';
import Authorization from '../../../domain_objects/access_management/authorization/authorization';
import ContainerUserInviteMapper from '../../mappers/access_management/container_user_invite_mapper';
import {ContainerInviteEmailTemplate} from '../../../services/email/templates/container_invite';
import ContainerRepository from '../data_warehouse/ontology/container_respository';
import Config from '../../../services/config';
import KeyPairMapper from '../../mappers/access_management/keypair_mapper';
import {plainToClass} from 'class-transformer';
import {PoolClient} from 'pg';
import {ValidateEmailTemplate} from '../../../services/email/templates/validate_email';

const UIDGenerator = require('uid-generator');
const uidgen = new UIDGenerator();

/*
    UserRepository contains methods for persisting and retrieving users and key-pairs
    to storage as well as managing things like password forgot/reset and email
    validation. Users should interact with repositories when possible and not
    the mappers as the repositories contain additional logic such as validation
    or transformation prior to storage or returning.
 */
export default class UserRepository extends Repository implements RepositoryInterface<User> {
    #mapper: UserMapper = UserMapper.Instance;
    #keyMapper: KeyPairMapper = KeyPairMapper.Instance;

    delete(u: User): Promise<Result<boolean>> {
        if (u.id) {
            return this.#mapper.Delete(u.id);
        }

        return Promise.resolve(Result.Failure(`user must have id`));
    }

    archive(u: User, toArchive: User): Promise<Result<boolean>> {
        if (toArchive.id) {
            return this.#mapper.Archive(u.id!, toArchive.id);
        }

        return Promise.resolve(Result.Failure(`user must have id`));
    }

    async findByID(id: string, requestingUser?: User): Promise<Result<User>> {
        // generally the route authorization methods in http_server would handle
        // authentication, but I've found that in a few places we need this additional
        // check as the route might not have all the information needed to make a
        // permissions check when retrieving a user.
        if (requestingUser) {
            const authed = await Authorization.AuthUser(requestingUser, 'read', 'users');
            if (!authed) return Promise.resolve(Result.Error(ErrorUnauthorized));
        }

        const r = await this.#mapper.Retrieve(id);
        if (r.isError) return Promise.resolve(Result.Failure(`unable to find user`, 404));

        // always load the KeyPairs
        const keysLoaded = await this.loadKeys(r.value);
        if (keysLoaded.isError) Logger.error(`unable to load key pairs for user ${r.value.id}: ${keysLoaded.error?.error}`);

        return Promise.resolve(Result.Success(r.value));
    }

    // save will automatically save the user's KeyPairs unless told otherwise
    async save(u: User, user: User, saveKeys = true): Promise<Result<boolean>> {
        let userID = 'system';

        if (user) {
            userID = user.id!;
        }

        const errors = await u.validationErrors();
        if (errors) {
            return Promise.resolve(Result.Failure(`user does not pass validation ${errors.join(',')}`));
        }

        // we run the save in a transaction so that on failure we don't get
        // stuck figuring out what user's keys didn't update
        const transaction = await this.#mapper.startTransaction();
        if (transaction.isError) return Promise.resolve(Result.Failure(`unable to initiate db transaction`));

        // we must wrap the hashing in a try/catch block as we're using await when
        // attempting to hash the password
        try {
            if (u.password && u.password !== '') u.password = await bcrypt.hash(u.password, 10);
            u.email_validation_token = await uidgen.generate();
        } catch (error) {
            await this.#mapper.rollbackTransaction(transaction.value);
            return Promise.resolve(Result.Failure(`unable to encrypt password ${error}`));
        }

        if (u.id) {
            // to allow partial updates we must first fetch the original object
            const original = await this.findByID(u.id);
            if (original.isError) return Promise.resolve(Result.Failure(`unable to fetch original for update ${original.error}`));

            Object.assign(original.value, u);

            const result = await this.#mapper.Update(userID, original.value, transaction.value);
            if (result.isError) {
                await this.#mapper.rollbackTransaction(transaction.value);
                return Promise.resolve(Result.Pass(result));
            }

            Object.assign(u, result.value);
        } else {
            const result = await this.#mapper.Create(userID, u, transaction.value);
            if (result.isError) {
                await this.#mapper.rollbackTransaction(transaction.value);
                return Promise.resolve(Result.Pass(result));
            }

            Object.assign(u, result.value);

            // we send the email after the transaction has completed, as we won't actually be failing on email failure
            if (Config.email_validation_enforced) {
                void Emailer.Instance.send(u.email, 'Validate Deep Lynx Email Address', ValidateEmailTemplate(u.id!, u.email_validation_token!)).then(
                    (result) => {
                        if (result.isError) Logger.error(`unable to send email verification email ${result.error?.error}`);
                    },
                );
            }
        }

        if (saveKeys) {
            const keys = await this.saveKeys(u, transaction.value);
            if (keys.isError) {
                await this.#mapper.rollbackTransaction(transaction.value);
                return Promise.resolve(Result.Failure(`unable to save user's keypairs ${keys.error?.error}`));
            }
        }

        const committed = await this.#mapper.completeTransaction(transaction.value);
        if (committed.isError) {
            await this.#mapper.rollbackTransaction(transaction.value);
            return Promise.resolve(Result.Failure(`unable to commit changes to database ${committed.error}`));
        }

        return Promise.resolve(Result.Success(true));
    }

    private async saveKeys(u: User, transaction?: PoolClient): Promise<Result<boolean>> {
        let internalTransaction = false;
        const keysCreate: KeyPair[] = [];

        // we wrap this in a transaction so we don't get partially updated keys
        if (!transaction) {
            const newTransaction = await this.#mapper.startTransaction();
            if (newTransaction.isError) return Promise.resolve(Result.Failure('unable to initiate database transaction'));

            transaction = newTransaction.value;
            internalTransaction = true; // let the function know this is a generated transaction
        }

        if (u.removedKeys && u.removedKeys.length > 0) {
            const removedKeys = await this.#keyMapper.BulkDelete(u.removedKeys);
            if (removedKeys.isError) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Failure(`unable to delete key pairs ${removedKeys.error?.error}`));
            }
        }

        if (u.keys && u.keys.length <= 0) {
            if (internalTransaction) {
                const commit = await this.#mapper.completeTransaction(transaction);
                if (commit.isError) return Promise.resolve(Result.Pass(commit));
            }

            return Promise.resolve(Result.Success(true));
        }

        if (u.keys)
            for (const key of u.keys) {
                if (key.secret) continue; // pass if we've already hashed and saved
                // set key's userID to equal its parent
                key.user_id = u.id!;

                const errors = await key.validationErrors();
                if (errors) {
                    if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                    return Promise.resolve(Result.Failure(`one or more user key pairs not pass validation ${errors.join(',')}`));
                }

                try {
                    const hashedSecret = await bcrypt.hash(key.secret_raw, 10);
                    key.secret = hashedSecret;
                } catch (error) {
                    return Promise.resolve(Result.Failure(`unable to hash key's secret ${error}`));
                }

                keysCreate.push(key);
            }

        if (keysCreate.length > 0) {
            const results = await this.#keyMapper.BulkCreate(keysCreate, transaction);
            if (results.isError) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Pass(results));
            }
        }

        if (internalTransaction) {
            const commit = await this.#mapper.completeTransaction(transaction);
            if (commit.isError) return Promise.resolve(Result.Pass(commit));
        }

        return Promise.resolve(Result.Success(true));
    }

    private async loadKeys(u: User): Promise<Result<boolean>> {
        const keys = await this.#keyMapper.KeysForUser(u.id!);
        if (keys.isError) return Promise.resolve(Result.Pass(keys));

        u.addKey(...keys.value);
        return Promise.resolve(Result.Success(true));
    }

    // allows us to use the environment variables to create a default admin on
    // initial startup
    async createDefaultSuperUser(): Promise<Result<User>> {
        const user = await UserMapper.Instance.RetrieveByEmail(Config.superuser_email);
        if (!user.isError || user.value) {
            return new Promise((resolve) => resolve(Result.Success(user.value)));
        }

        Logger.info('creating default superuser');
        const superUser = new User({
            identity_provider: 'username_password',
            display_name: 'Super User',
            email: Config.superuser_email,
            password: Config.superuser_password,
            active: true,
            admin: true,
        });

        const created = await this.save(superUser, plainToClass(User, {id: 'system'}));
        if (created.isError) {
            return new Promise((resolve) => resolve(Result.Pass(created)));
        }

        // create a keypair for the new user and print to console, this only happens
        // once per super user creation. Make sure you write it down!
        const keyPair = new KeyPair(superUser.id);
        await keyPair.setSecret();

        const saved = await KeyPairMapper.Instance.Create(keyPair);
        if (saved.isError) {
            return new Promise((resolve) => resolve(Result.Pass(saved)));
        }

        Logger.info(
            'This is the API Key/Secret pair for the newly created Super User. This is the only time you will be given this pair, please write it down.',
        );
        Logger.info(`API Key: ${keyPair.key}`);
        Logger.info(`API Secret: ${keyPair.secret_raw}`);

        return new Promise((resolve) => resolve(Result.Success(superUser)));
    }

    // note that this is the final step in the reset password chain, you must have
    // the reset token in order to use this function
    async resetPassword(payload: ResetUserPasswordPayload): Promise<Result<boolean>> {
        const errors = await payload.validationErrors();
        if (errors) return Promise.resolve(Result.Failure(`reset user password payload fails validation ${errors.join(',')}`));

        return new Promise((resolve) => {
            void bcrypt.hash(payload.new_password!, 14).then((hashed) => {
                resolve(UserMapper.Instance.ResetPassword(payload.token!, payload.email!, hashed));
            });
        });
    }

    // password reset tokens are only valid for 10 minutes
    async initiateResetPassword(email: string): Promise<Result<boolean>> {
        const user = await UserMapper.Instance.RetrieveByEmail(email);
        if (user.isError) return new Promise((resolve) => resolve(Result.Success(true)));

        const reset = await UserMapper.Instance.SetResetToken(user.value.id!);
        if (reset.isError) {
            Logger.error(`unable to set reset password token for user ${reset.error}`);
            return new Promise((resolve) => resolve(Result.Pass(reset)));
        }

        // re-pull from storage to get the new reset token
        const resetUser = await UserMapper.Instance.RetrieveByEmail(email);
        if (resetUser.isError) {
            Logger.error(`unable to retrieve user ${resetUser.error}`);
            return new Promise((resolve) => resolve(Result.Success(true)));
        }

        // we won't error out if the email sends, just inform the log of the problem
        // we don't want an outside caller to know whether or not a user's email
        // is valid by virtue of it failing to send
        const sentEmail = await Emailer.Instance.send(
            resetUser.value.email,
            'Reset Password Deep Lynx',
            ResetPasswordEmailTemplate(resetUser.value.email, resetUser.value.reset_token!),
        );
        if (sentEmail.isError) {
            Logger.error(`unable to send password reset email ${sentEmail.error}`);
        }

        return new Promise((resolve) => resolve(Result.Success(true)));
    }

    async assignRole(user: User, payload: AssignUserRolePayload): Promise<Result<boolean>> {
        const errors = await payload.validationErrors();
        if (errors) return Promise.resolve(Result.Failure(`assign user role payload fails validation ${errors.join(',')}`));

        // generally the route authorization methods in http_server would handle
        // authentication, but I've found that in a few places we need this additional
        // check as the route might not have all the information needed to make a
        // permissions check when assigning roles
        const authed = await Authorization.AuthUser(user, 'write', 'users', payload.container_id);
        if (!authed) return Promise.resolve(Result.Error(ErrorUnauthorized));

        return Promise.resolve(Result.Success(await Authorization.AssignRole(payload.user_id!, payload.role_name!, payload.container_id)));
    }

    async removeAllRoles(user: User, domain: string): Promise<Result<boolean>> {
        // generally the route authorization methods in http_server would handle
        // authentication, but I've found that in a few places we need this additional
        // check as the route might not have all the information needed to make a
        // permissions check when removing roles
        const authed = await Authorization.AuthUser(user, 'write', 'users');
        if (!authed) return Promise.resolve(Result.Error(ErrorUnauthorized));

        const deleted = await Authorization.DeleteAllRoles(user.id!, domain);

        return Promise.resolve(Result.Success(deleted));
    }

    async rolesInContainer(user: User, containerID: string): Promise<Result<string[]>> {
        const roles = await Authorization.RolesForUser(user.id!, containerID);

        return new Promise((resolve) => resolve(Result.Success(roles)));
    }

    async isAdminForContainer(user: User, containerID: string): Promise<boolean> {
        if (user.admin) return Promise.resolve(true);

        const roles = await Authorization.RolesForUser(user.id!, containerID);

        return Promise.resolve(roles.includes('admin'));
    }

    // visit the Authorization domain object to see exactly what the permission
    // return consists of when dealing with this function
    async retrievePermissions(user: User): Promise<Result<string[][]>> {
        const permissions = await Authorization.PermissionsForUser(user.id!);
        user.permissions = permissions;

        return Promise.resolve(Result.Success(permissions));
    }

    // this allows authorized users to invite either registered or new users to an
    // existing Deep Lynx container by providing their email. Currently this is only
    // used by the Admin Web App
    async inviteUserToContainer(user: User, invite: ContainerUserInvite): Promise<Result<boolean>> {
        const containerRepo = new ContainerRepository();
        // set the token first, if it's not already created or empty string
        if (invite.token === '') invite.token = await uidgen.generate();

        // set the originUser if it's not set already
        if (!invite.origin_user) invite.origin_user = user.id!;

        const errors = await invite.validationErrors();
        if (errors) return Promise.resolve(Result.Failure(`the invite does not pass validation ${errors.join(',')}`));

        const created = await ContainerUserInviteMapper.Instance.Create(invite);
        if (created.isError) return new Promise((resolve) => resolve(Result.Pass(created)));

        const container = await containerRepo.findByID(created.value.container!.id!);

        // like most emails, don't error out if this doesn't send. API methods
        // exist for retrieving a user's invites if they somehow didn't get the
        // invite
        void Emailer.Instance.send(
            created.value.email,
            'Invitation to Deep Lynx Container',
            ContainerInviteEmailTemplate(created.value.token!, container.isError ? created.value.container!.id! : container.value.name),
        ).then((result) => {
            if (result.isError) Logger.error(`unable to send container invitation email`);
        });

        return Promise.resolve(Result.Success(true));
    }

    // allows the current user to accept a container invite, assigning the default
    // user role on acceptance
    async acceptContainerInvite(user: User, inviteToken: string): Promise<Result<boolean>> {
        const invite = await ContainerUserInviteMapper.Instance.RetrieveByTokenAndEmail(inviteToken, user.email);

        if (invite.isError) {
            Logger.error(`unable to retrieve user container invite ${invite.error}`);
            return new Promise((resolve) => resolve(Result.Pass(invite)));
        }

        // we default the user to the lowest role in the container they're accepting an invite to
        // we do this to avoid bad actors abusing invites to gain admin access to a container
        // we also enforce the match of email to the original invite so that someone can't
        // hijack another's email invitation
        const assigned = await Authorization.AssignRole(user.id!, 'user', invite.value.container!.id);

        if (!assigned) {
            Logger.error(`unable to assign user role`);
            return new Promise((resolve) => resolve(Result.Failure('unable to assign user role ')));
        }

        return ContainerUserInviteMapper.Instance.MarkAccepted(inviteToken, user.email);
    }

    async usersForContainer(containerID: string): Promise<Result<User[]>> {
        const e = await Authorization.enforcer();

        // using the casbin filtered grouping function, fetch all permission sets for
        // container. Those permissions sets will contain all users associated with that container.
        // grouping policies follow the pattern of user id, role, domain id. In this
        // case we are fetching all grouping policies(permission sets) with a given
        // domain(container)
        const permissionSets = await e.getFilteredGroupingPolicy(2, containerID);

        const userIDs: string[] = [];

        permissionSets.map((set) => {
            if (set[0]) userIDs.push(set[0]);
        });

        return UserMapper.Instance.ListFromIDs(userIDs);
    }

    constructor() {
        super(UserMapper.tableName);
    }

    async list(loadKeys = true, options?: QueryOptions): Promise<Result<User[]>> {
        const results = await super.findAll<object>(options);

        if (results.isError) return Promise.resolve(Result.Pass(results));

        const users = plainToClass(User, results.value);

        if (loadKeys) {
            await Promise.all(
                users.map(async (user) => {
                    const keys = await this.loadKeys(user);
                    if (keys.isError) Logger.error(`unable to load keys for user ${user.id}: ${keys.error?.error}`);
                }),
            );
        }

        return Promise.resolve(Result.Success(users));
    }
}
