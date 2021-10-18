import {NakedDomainClass} from '../../common_classes/base_domain_class';
import {IsArray, IsBoolean, IsObject, IsOptional, IsString, ValidateNested} from 'class-validator';
import { Type } from 'class-transformer';
import uuid from 'uuid';

export class SubjectCredentials extends NakedDomainClass {
    @IsString()
    methodId?: string = 'SECURID' || 'SECURID_NEXT_TOKENCODE';

    @IsArray()
    @ValidateNested()
    @Type(() => CollectedInput)
    collectedInputs?: CollectedInput[];
}

export class CollectedInput extends NakedDomainClass {
    @IsString()
    name? = 'SECURID' || 'SECURID_NEXT_TOKENCODE';

    @IsString()
    value?: string;
}

export class RSAContext extends NakedDomainClass {
    @IsString()
    authnAttemptId?: string;

    @IsOptional()
    @IsString()
    messageId?: string;

    @IsString()
    inResponseTo?: string;
}

// RSARequest encompasses the request body for the initialize
// and verify requests
export class RSARequest extends NakedDomainClass {
    @IsOptional()
    @IsString()
    clientID?: string;

    @IsOptional()
    @IsString()
    subjectName?: string;

    @IsArray()
    @ValidateNested()
    @Type(() => SubjectCredentials)
    subjectCredentials?: SubjectCredentials[];

    @ValidateNested()
    @Type(() => RSAContext)
    context?: RSAContext;

    constructor(input: {
        clientID?: string;
        subjectName?: string;
        securID?: string;
        authnAttemptId?: string;
        inResponseTo?: string;
        methodId?: string;
    }) {
        super();

        if (input) {
            if (input.clientID) this.clientID = input.clientID;
            if (input.subjectName) this.subjectName = input.subjectName;
            if (input.securID) {
                this.subjectCredentials = [new SubjectCredentials()]
                this.subjectCredentials[0].methodId = input.methodId
                this.subjectCredentials[0].collectedInputs = [new CollectedInput()]
                this.subjectCredentials[0].collectedInputs[0].name = input.methodId
                this.subjectCredentials[0].collectedInputs[0].value = input.securID
            }
            if (input.authnAttemptId && input.inResponseTo) {
                this.context = new RSAContext()
                this.context.authnAttemptId = input.authnAttemptId;
                this.context.inResponseTo = input.inResponseTo;
            }
        }

        // generate context if necessary and then create a unique messageId
        if (!this.context) this.context = new RSAContext()
        this.context.messageId = uuid.v4()
    }
}

// RSAResponse encompasses the response for the initialize
// and verify requests
export class RSAResponse extends NakedDomainClass {
    @IsString()
    attemptResponseCode?: string;

    @IsString()
    attemptReasonCode?: string;

    @IsObject()
    challengeMethods: {
        challenges: Challenge[]
    } = {
        challenges: [new Challenge()]
    }

    @IsArray()
    @ValidateNested()
    @Type(() => CredentialValidationResult)
    credentialValidationResults?: CredentialValidationResult[]

    @ValidateNested()
    @Type(() => RSAContext)
    context?: RSAContext
}

export class CredentialValidationResult extends NakedDomainClass {
    @IsString()
    methodId?: string;

    @IsString()
    methodResponseCode?: string;

    @IsOptional()
    @IsString()
    methodReasonCode?: string;

    @IsArray()
    authnAttributes?: string[];
}

export class Challenge extends NakedDomainClass {
    @IsOptional()
    @IsString()
    methodSetId?: string;

    @IsArray()
    @ValidateNested()
    @Type(() => RequiredMethods)
    requiredMethods?: RequiredMethods[];
}

export class RequiredMethods extends NakedDomainClass {
    @IsString()
    methodId?: string;

    @IsOptional()
    @IsString()
    priority?: string;

    @IsArray()
    @ValidateNested()
    @Type(() => Version)
    versions?: Version[];
}

export class Version extends NakedDomainClass {
    @IsString()
    versionId?: string;

    @IsArray()
    methodAttributes?: string[];

    @IsBoolean()
    valueRequired?: boolean;

    @IsOptional()
    @IsString()
    referenceId?: string;

    @ValidateNested()
    @Type(() => Prompt)
    prompt?: Prompt;
}

export class Prompt extends NakedDomainClass {
    @IsString()
    promptResourceId?: string;

    @IsString()
    defaultText?: string;

    @IsOptional()
    @IsString()
    formatRegex?: string;

    @IsOptional()
    @IsString()
    defaultValue?: string;

    @IsBoolean()
    valueBeingDefined?: boolean;

    @IsBoolean()
    sensitive?: boolean;

    @IsOptional()
    @IsString()
    minLength?: string;

    @IsOptional()
    @IsString()
    maxLength?: string;

    @IsArray()
    promptArgs?: string[];
}

// RSAStatusRequest defines the request body for the RSA status and cancel endpoints
export class RSAStatusRequest extends NakedDomainClass {
    @IsString()
    authnAttemptId?: string;

    @IsOptional()
    @IsBoolean()
    removeAttemptId?: boolean;
}

// RSAStatusResponse defines the response body for the RSA status endpoint
export class RSAStatusResponse extends NakedDomainClass {
    @IsString()
    attemptResponseCode?: string;

    @IsString()
    attemptReasonCode?: string;

    @IsOptional()
    @IsString()
    subjectName?: string;

    @IsOptional()
    @IsString()
    authnPolicyId?: string;

    @IsOptional()
    @IsArray()
    sessionAttributes?: string[];

    @IsOptional()
    @IsArray()
    successfulMethods?: string[];

    @IsOptional()
    @IsString()
    attemptExpires?: string;
}