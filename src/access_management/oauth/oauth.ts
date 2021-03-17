import {BaseDomainClass} from "../../base_domain_class";
import {IsIn, IsOptional, IsString, IsUrl, IsUUID} from "class-validator";
import uuid from "uuid";
import Result from "../../result";
import bcrypt from "bcrypt";
import {User} from "../user";
import {Exclude} from "class-transformer";

export class OAuthApplication extends BaseDomainClass{
    @IsOptional()
    @IsUUID()
    id?: string

    @IsString()
    name: string = ""

    @IsString()
    description: string = ""

    @IsUUID()
    owner_id?: string

    @IsString()
    client_id: string = Buffer.from(uuid.v4()).toString('base64')

    @IsString()
    client_secret?: string

    @IsString()
    client_secret_raw: string = Buffer.from(uuid.v4()).toString('base64')

    constructor(input: {
        name: string,
        description: string,
        owner?: string | User,
        secret?: string}) {
        super()

        if(input){
            this.name = input.name;
            this.description = input.description;
            (input.owner instanceof User) ? this.owner_id = input.owner.id! : this.owner_id = input.owner as string;
            if(input.secret) this.client_secret_raw = input.secret
        }
    }

    async setSecret(): Promise<Result<boolean>> {
        try {
            const hashedSecret = await bcrypt.hash(this.client_secret_raw, 10)
            this.client_secret = hashedSecret

            return Promise.resolve(Result.Success(true))
        } catch(error) {
            return Promise.resolve(Result.Failure(`unable to hash secret ${error}`))
        }
    }
}

export class OAuthRequest extends BaseDomainClass {
    @IsString()
    @IsIn(["code"])
    response_type: string = "code"

    @IsString()
    client_id?: string

    @IsUrl()
    redirect_uri?: string

    @IsString()
    state?: string

    @IsString()
    @IsIn(["all"])
    scope: string = "all"

    @IsUUID()
    user_id?: string

    @IsOptional()
    @IsString()
    code_challenge?: string

    @IsOptional()
    @IsIn(["plain", "S256"])
    code_challenge_method?: string

    constructor(input: {
        responseType: string,
        clientID: string,
        redirectURI: string,
        state: string,
        scope: string,
        userID?: string,
        codeChallenge?: string,
        codeChallengeMethod?: string
    }) {
        super();

        if(input) {
            if(input.userID) this.user_id = input.userID
            if(input.codeChallenge) this.code_challenge = input.codeChallenge
            if(input.codeChallengeMethod) this.code_challenge_method = input.codeChallengeMethod
            this.response_type = input.responseType
            this.client_id = input.clientID
            this.redirect_uri = input.redirectURI
            this.state = input.state
            this.scope = input.scope
        }
    }
}

export class OAuthTokenExchangeRequest extends BaseDomainClass {
    @IsString()
    @IsIn(["authorization_code"])
    grant_type: string = "authorization_code"

    @IsString()
    code?: string

    @IsString()
    client_id?: string

    @IsUrl()
    redirect_uri?: string

    @IsOptional()
    @IsString()
    @Exclude({toPlainOnly: true})
    client_secret?: string

    @IsOptional()
    @IsString()
    code_verifier?: string
}
