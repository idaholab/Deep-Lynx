import {IsDate, IsOptional, validateOrReject, ValidationError} from "class-validator";
import {Type} from "class-transformer";

export class BaseDataClass {
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
        try {
            await validateOrReject(this)
            return null
        } catch(errors) {
            return ["", ""]
        }
    }
}
