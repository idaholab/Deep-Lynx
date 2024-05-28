import {IsDate, IsOptional, validate} from 'class-validator';
import {Transform, Type} from 'class-transformer';
import 'reflect-metadata';
import {Errors, ValidationError} from 'io-ts';
import Result from './result';

/*
 NakedDomainClass should be used by all domain objects who don't need the metadata
 properties included in the BaseDomainClass. This class allows us to include often
 used functions such as the validation functionality
*/
export class NakedDomainClass {
    async validationErrors(): Promise<string[] | null> {
        const errors = await validate(this);
        if (errors.length > 0) return Promise.resolve(errors.map((e) => e.toString(false)));

        return Promise.resolve(null);
    }

    onDecodeError(resolve: (check: any) => void): (e: Errors) => void {
        return (e: ValidationError[]) => {
            const errorStrings: string[] = [];
            // init prevKeyName to first key name
            let prevKeyName = e[0].context[e[0].context.length - 2].key;
            let errorValue;
            let possibleTypes: string[] = [];

            for (const error of e) {
                const keyName = error.context[error.context.length - 2].key;
                errorValue = error.value;

                // if we are looking at a previous key, append the type and continue
                // else if we are looking at a new key, push previous to errorStrings and set new value and keyName
                if (keyName === prevKeyName) {
                    // concatenate possible types to handle union types
                    possibleTypes.push(error.context[error.context.length - 1].type.name);
                } else {
                    errorStrings.push(
                        `Invalid value '${errorValue}' supplied for field '${prevKeyName}'. ` + `Type supplied should be ${possibleTypes.join(' or ')}.`,
                    );

                    // reset possibleTypes and update prevKeyName
                    possibleTypes = [];
                    prevKeyName = keyName;

                    // the previous validation has been taken care of, handle this validation by adding to possibleTypes
                    possibleTypes.push(error.context[error.context.length - 1].type.name);
                }
            }

            // last error needs to be pushed to errorStrings
            errorStrings.push(`Invalid value '${errorValue}' supplied for '${prevKeyName}'. ` + `Type supplied should be ${possibleTypes.join(' or ')}.`);

            resolve(Result.Failure(errorStrings.join(' ')));
        };
    }
}

/*
 BaseDomainClass is a very small extension of the NakedDomainClass, but it is
 the more often used of the two as it contains the metadata properties such as
 created_by, created_at etc.
*/
export class BaseDomainClass extends NakedDomainClass {
    @IsOptional()
    created_by?: string;

    @IsOptional()
    modified_by?: string;

    @IsOptional()
    @Type(() => Date, {})
    @Transform(
        ({value}) => {
            return value.toUTCString();
        },
        {toPlainOnly: true},
    )
    created_at?: Date;

    @IsOptional()
    @Type(() => Date)
    modified_at?: Date;

    @IsOptional()
    @Type(() => Date)
    deleted_at?: Date;
}
