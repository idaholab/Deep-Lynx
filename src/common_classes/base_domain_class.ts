import {IsDate, IsOptional, validate} from "class-validator";
import {Type} from "class-transformer";
import 'reflect-metadata';
import {Errors, ValidationError} from "io-ts";
import Result from "./result";

/*
 NakedDomainClass should be used by all domain objects who don't need the metadata
 properties included in the BaseDomainClass. This class allows us to include often
 used functions such as the validation functionality
*/
export class NakedDomainClass {
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

/*
 BaseDomainClass is a very small extension of the NakedDomainClass, but it is
 the more often used of the two as it contains the metadata properties such as
 created_by, created_at etc.
*/
export class BaseDomainClass extends NakedDomainClass {
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
}
