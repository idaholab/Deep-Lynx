import {IsDate, IsOptional, validate, validateOrReject} from "class-validator";
import {Type} from "class-transformer";
import 'reflect-metadata';
import {Errors, ValidationError} from "io-ts";
import Result from "./result";

export class BaseDomainClass {
    @IsOptional()
    created_by?: string

    @IsOptional()
    modified_by? : string

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    created_at?: Date

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    modified_at?: Date

    async validationErrors(): Promise<string[] | null> {
        const errors = await validate(this)
        if(errors.length > 0) return Promise.resolve(errors.map(e => e.toString(true)))

        return Promise.resolve(null)
    }

    onDecodeError(resolve:((check: any) => void) ): ((e: Errors ) => void) {
        return ((e: ValidationError[]) => {
            const errorStrings: string[] = []
            for(const error of e) {
                const last = error.context[error.context.length - 1]

                errorStrings.push(`Invalid Value '${error.value}' supplied for field '${last.key}'`)
            }

            resolve(Result.Failure(errorStrings.join(",")))
        })
    }
}
