import {BaseDomainClass} from "../../common_classes/base_domain_class";
import {IsIn, IsOptional, IsString, IsUrl, IsUUID} from "class-validator";
import uuid from "uuid";
import Result from "../../common_classes/result";
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

    // for some reason the IsURL validator fails here, even on valid values so we stuck with IsString
    @IsString()
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
        response_type: string,
        client_id: string,
        redirect_uri: string,
        state: string,
        scope: string,
        user_id?: string,
        code_challenge?: string,
        code_challenge_method?: string
    }) {
        super();

        if(input) {
            if(input.user_id) this.user_id = input.user_id
            if(input.code_challenge) this.code_challenge = input.code_challenge
            if(input.code_challenge_method) this.code_challenge_method = input.code_challenge_method
            this.response_type = input.response_type
            this.client_id = input.client_id
            this.redirect_uri = input.redirect_uri
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
