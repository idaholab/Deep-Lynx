/* eslint-disable @typescript-eslint/ban-ts-comment */
import RepositoryInterface, {QueryOptions, Repository} from '../repository';
import OAuthMapper from '../../mappers/access_management/oauth_mapper';
import Result from '../../../common_classes/result';
import {v4 as uuidv4} from 'uuid';
import Cache from '../../../services/cache/cache';
import UserRepository from './user_repository';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {classToPlain, plainToClass} from 'class-transformer';
import Config from '../../../services/config';
import {Request} from 'express';
import {OAuthApplication, OAuthRequest, OAuthTokenExchangeRequest} from '../../../domain_objects/access_management/oauth/oauth';
import {SuperUser, User} from '../../../domain_objects/access_management/user';
import base64url from 'base64url';
import Logger from '../../../services/logger';

const crypto = require('crypto');

/*
    OAuthRepository contains methods for persisting and retrieving OAuthApplications
    to storage as well as managing OAuth Request/Responses from Deep Lynx's OAuth2
    compliant identity service. Users should interact with repositories when
    possible and not the mappers as the repositories contain additional logic such
    as validation or transformation prior to storage or returning.
 */
export default class OAuthRepository extends Repository implements RepositoryInterface<OAuthApplication> {
    #mapper: OAuthMapper = OAuthMapper.Instance;

    delete(o: OAuthApplication): Promise<Result<boolean>> {
        if (o.id) {
            return this.#mapper.Delete(o.id);
        }

        return Promise.resolve(Result.Failure(`oauth application does not have an id`));
    }

    findByID(id: string): Promise<Result<OAuthApplication>> {
        return this.#mapper.Retrieve(id);
    }

    async save(t: OAuthApplication, user: User): Promise<Result<boolean>> {
        // we never store the raw secret of the oauth application so as to
        // avoid security issues.
        try {
            const hashedSecret = await bcrypt.hash(t.client_secret_raw, 10);
            t.client_secret = hashedSecret;
        } catch (error) {
            return Promise.resolve(Result.Failure(`unable to encrypt client secret ${error}`));
        }

        const errors = await t.validationErrors();
        if (errors) return Promise.resolve(Result.Failure(`oauth application fails validation ${errors.join(',')}`));

        if (t.id) {
            // to allow partial updates we must first fetch the original object
            const original = await this.findByID(t.id);
            if (original.isError) return Promise.resolve(Result.Failure(`unable to fetch original for update ${original.error}`));

            Object.assign(original.value, t);

            const updated = await this.#mapper.Update(user.id!, original.value);
            if (updated.isError) return Promise.resolve(Result.Pass(updated));

            Object.assign(t, updated.value);
            return Promise.resolve(Result.Success(true));
        }

        const created = await this.#mapper.Create(user.id!, t);
        if (created.isError) return Promise.resolve(Result.Pass(created));

        Object.assign(t, created.value);

        return Promise.resolve(Result.Success(true));
    }

    // createDefaultApplication is used primarily at startup to create a default
    // oauth app for the bundled admin web gui. This allows us to override the auto
    // generated id and instead set our own, configured id instead
    async createDefaultApplication(appID: string): Promise<void> {
        Logger.debug('creating default oauth application');

        const results = await this.where().ownerID('is null').and().name('eq', Config.admin_web_app_name).list();
        if (results.isError) {
            Logger.error(`unable to list potential matches for default oauth application`);
            return Promise.resolve();
        }

        if (results.value.length >= 1) {
            Logger.debug('initial oauth application already created, skipping');
            return Promise.resolve();
        }

        const app = new OAuthApplication({
            name: Config.admin_web_app_name,
            description: 'This is the web interface packaged with DeepLynx.',
            clientID: appID,
        });

        const saved = await this.save(app, SuperUser);
        if (saved.isError) {
            Logger.error(`unable to save default oauth application ${saved.error?.error}`);
        } else {
            Logger.debug('initial oauth application created successfully');
        }

        return Promise.resolve();
    }

    constructor() {
        super(OAuthMapper.tableName);
    }

    // operations specific to managing whether or not a user has approved an
    // applications access to their information for login/authentication
    async markApprovedForUser(u: User, o: OAuthApplication): Promise<Result<boolean>> {
        return this.#mapper.MarkApplicationApproved(o.id!, u.id!);
    }

    async isApplicationApproved(u: User, o: OAuthApplication): Promise<Result<boolean>> {
        return this.#mapper.ApplicationIsApproved(o.id!, u.id!);
    }

    async listForUser(u: User): Promise<Result<OAuthApplication[]>> {
        return this.#mapper.ListForUser(u.id!);
    }

    // makAuthorizationRequest will make and store a request in cache for 10 minutes. It will
    // return a token which then must be used to exchange for the final access token
    async makeAuthorizationRequest(userID: string, request: OAuthRequest): Promise<Result<string>> {
        const token = Buffer.from(uuidv4()).toString('base64');
        request.user_id = userID;

        const errors = await request.validationErrors();
        if (errors) return Promise.resolve(Result.Failure(`oauth request does not pass validation ${errors.join(',')}`));

        const set = await Cache.set(token, request, 60 * 10);
        if (!set) return Promise.resolve(Result.Failure(`unable to store request in cache`));

        return Promise.resolve(Result.Success(token));
    }

    // exchanges a token for a JWT to act on behalf of the user
    async authorizationCodeExchange(exchangeReq: OAuthTokenExchangeRequest): Promise<Result<string>> {
        const userRepo = new UserRepository();
        const cached = await Cache.get<object>(exchangeReq.code!);
        if (!cached) return new Promise((resolve) => resolve(Result.Failure('unable to retrieve original request from cache')));

        const originalReq = plainToClass(OAuthRequest, cached);

        const user = await userRepo.findByID(originalReq.user_id!);
        if (user.isError) return new Promise((resolve) => resolve(Result.Pass(user)));

        // quick verification between requests
        if (originalReq.redirect_uri !== exchangeReq.redirect_uri) return new Promise((resolve) => resolve(Result.Failure('non-matching redirect uri')));
        if (originalReq.client_id !== exchangeReq.client_id) return new Promise((resolve) => resolve(Result.Failure('non-matching client ids')));

        // if PKCE flow, verify the code
        if (exchangeReq.code_verifier) {
            if (originalReq.code_challenge_method === 'S256') {
                const hash = base64url(crypto.createHash('sha256').update(exchangeReq.code_verifier).digest());

                if (hash !== decodeURIComponent(originalReq.code_challenge!))
                    return new Promise((resolve) => resolve(Result.Failure('PKCE code challenge does not match')));
            } else {
                // for whatever reason we have to run the decode URI component twice on the original req, don't ask
                // why - just don't remove it or you'll break it
                if (exchangeReq.code_verifier !== decodeURIComponent(decodeURIComponent(originalReq.code_challenge!)))
                    return new Promise((resolve) => resolve(Result.Failure('PKCE code challenge does not match')));
            }
        } else {
            // if we're not doing PKCE there must be a client secret present
            const application = await OAuthMapper.Instance.Retrieve(exchangeReq.client_id!);
            if (application.isError) return new Promise((resolve) => resolve(Result.Pass(application)));

            const valid = await bcrypt.compare(exchangeReq.client_secret!, application.value.client_secret!);

            if (!valid) return new Promise((resolve) => resolve(Result.Failure('invalid client')));
        }

        // with all verification done generate and return a valid JWT after assigning user permissions
        await userRepo.retrievePermissions(user.value);

        const token = jwt.sign(classToPlain(user.value), Config.encryption_key_secret, {expiresIn: '720m'});

        return new Promise((resolve) => resolve(Result.Success(token)));
    }

    // ease of use method for converting from an express.js request
    authorizationFromRequest(req: Request): OAuthRequest | undefined {
        const r: {[key: string]: any} = {};

        // pull from query
        if (req.query.response_type) r.response_type = req.query.response_type as 'code';
        if (req.query.client_id) r.client_id = req.query.client_id as string;
        if (req.query.redirect_uri) r.redirect_uri = req.query.redirect_uri as string;
        if (req.query.state) r.state = req.query.state as string;
        if (req.query.scope) r.scope = req.query.scope as 'all';
        if (req.query.code_challenge) {
            // we need to maintain the raw, unparsed query param
            // @ts-ignore
            const queryParams = req._parsedUrl.query;
            queryParams.split('&').map((param: string) => {
                if (param.includes('code_challenge') && !param.includes('code_challenge_method')) {
                    const codeChallenge = param.split('=');
                    r.code_challenge = codeChallenge[1];
                }
            });
        }
        if (req.query.code_challenge_method) r.code_challenge_method = req.query.code_challenge_method as 'plain' | 'S256';

        // pull from form
        if (req.body.response_type) r.response_type = req.body.response_type as 'code';
        if (req.body.client_id) r.client_id = req.body.client_id as string;
        if (req.body.redirect_uri) r.redirect_uri = req.body.redirect_uri as string;
        if (req.body.state) r.state = req.body.state as string;
        if (req.body.scope) r.scope = req.body.scope as 'all';
        if (req.body.code_challenge) r.code_challenge = req.body.code_challenge as string;
        if (req.body.code_challenge_method) r.code_challenge_method = req.body.code_challenge_method as 'plain' | 'S256';

        return Object.keys(r).length > 0 ? plainToClass(OAuthRequest, r) : undefined;
    }

    // retrieve an OAuthRequest from the cache by using the provided token
    async authorizationFromToken(token: string): Promise<OAuthRequest | undefined> {
        const cached = Cache.get<object>(token);
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        if (!cached) return Promise.resolve(undefined);

        return Promise.resolve(plainToClass(OAuthRequest, cached));
    }

    name(operator: string, value: any) {
        super.query('name', operator, value);
        return this;
    }

    ownerID(operator: string, value?: any) {
        super.query('owner_id', operator, value);
        return this;
    }

    async list(options?: QueryOptions): Promise<Result<OAuthApplication[]>> {
        const results = await super.findAll<object>(options);
        if (results.isError) return Promise.resolve(Result.Pass(results));

        const applications = plainToClass(OAuthApplication, results.value);

        return Promise.resolve(Result.Success(applications));
    }
}
