import { IsArray, IsString } from "class-validator";
import { NakedDomainClass } from "../../../common_classes/base_domain_class";

export default class VectorData extends NakedDomainClass {
    @IsArray()
    embedding?: number[];

    @IsString()
    text?: string;
}

export class TextResult extends NakedDomainClass {
    @IsString()
    text?: string;
}