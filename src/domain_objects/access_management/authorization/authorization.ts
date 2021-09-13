import {Enforcer, newEnforcer} from 'casbin';
import Config from '../../../services/config';
import {User} from '../user';
import PostgresAdapter from 'casbin-pg-adapter';

/*
 Authorization in Deep Lynx uses the https://casbin.org/ library. Please use
 their documentation when attempting to make changes to the authorization layer.
*/
export class Authorization {
    private e!: Enforcer;

    private static instance: Authorization;

    // This class is a singleton due to the fact that we cannot create multiple
    // connections to the database for the casbin enforcer
    public static get Instance(): Authorization {
        if (!Authorization.instance) {
            Authorization.instance = new Authorization();
        }

        return Authorization.instance;
    }

    public async enforcer(): Promise<Enforcer> {
        if (!this.e) {
            const a = await PostgresAdapter.newAdapter({
                connectionString: Config.core_db_connection_string,
            });

            const e = await newEnforcer(Config.auth_config_file, a);
            await e.loadPolicy();

            this.e = e;
        }

        return new Promise((resolve) => resolve(this.e));
    }

    // Verifies that the provided user has the appropriate permissions for performing
    // an action. Note that the "domain" generally refers to a container and should
    // be the desired container's id
    async AuthUser(user: User | any, action: 'write' | 'read', resource: string, domain?: string): Promise<boolean> {
        await this.enforcer(); // insure it's connected
        if (user instanceof User) {
            if (user.admin) return true;

            if (!domain) {
                domain = 'all';
            }

            await this.e.loadPolicy();
            return await this.e.enforce(user.id, domain, resource, action);
        }

        return false;
    }

    async AssignRole(userID: string, role: string, domain?: string): Promise<boolean> {
        await this.enforcer(); // insure it's connected
        if (!domain) domain = 'all';

        // due to how casbin works, we need to remove all previous roles in the
        // domain in order to avoid double assignments. In the future this might
        // need to be updated if we do composite permissions based on multiple
        // roles - it is sufficient for now though
        await this.DeleteAllRoles(userID, domain);

        return this.e.addRoleForUser(userID, role, domain);
    }

    // fetch roles for user given a domain ( a reminder that domains are generally
    // containers and this parameter should be a containerID generally)
    async RolesForUser(userID: string, domainID: string): Promise<string[]> {
        await this.enforcer(); // insure it's connected
        return this.e.getRolesForUser(userID, domainID);
    }

    // permissions for user returns an array of strings with the following format
    // containerID, resource, allowed action
    async PermissionsForUser(userID: string): Promise<string[][]> {
        await this.enforcer(); // insure it's connected
        await this.e.loadPolicy();
        const permissionReturn: string[][] = [];

        // retrieves the containers in which the user has a role - response is an array of strings with the format
        // userID, role, containerID
        const roles = await this.e.getFilteredGroupingPolicy(0, userID);

        for (const role of roles) {
            // permissions return is an array of strings that follows the pattern of
            // role name, containerID, resource, actions - we only need resource and actions
            const permissions = await this.e.getImplicitPermissionsForUser(userID, role[2]);
            permissions.map((perm) => perm.shift());
            permissionReturn.push(...permissions);
        }

        return new Promise((resolve) => resolve(permissionReturn));
    }

    async DeleteAllRoles(userID: string, domain?: string): Promise<boolean> {
        await this.enforcer(); // insure it's connected
        if (!domain) domain = 'all';

        return this.e.deleteRolesForUser(userID, domain);
    }
}

export default Authorization.Instance;
